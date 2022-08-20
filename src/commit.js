const { spawn } = require('child_process');
const { window, extensions } = require('vscode');
const { getFormattedDate, correctFilePath } = require('./utils.js');
const { dirname } = require('path');
const NOT_COMMITTED_YET = 'Not Committed Yet';
let preFilePath = null;
let preRootPath = null;

async function getCommitInfo({ signal, filePath, line }) {
    if (signal.aborted) {
        return Promise.reject('');
    }
    if (filePath != preFilePath) {
        preRootPath = correctFilePath(await getGitRootDir(filePath));
        preFilePath = filePath;
    }
    if (signal.aborted) {
        return Promise.reject('');
    }
    const rootPath = preRootPath;
    const stdmsg = await new Promise((resolve, reject) => {
        if (!rootPath) {
            reject('')
        }
        const cli = spawn(getGitCommand(), ['blame', '-pL', `${line},${line}`, filePath.substring(rootPath.length + 1)], { cwd: rootPath, });
        cli.stdout.on('data', data => {
            if (signal.aborted) {
                reject('');
            }
            const commit = data.toString();
            let committer, time, info, committed = true;
            const committerMatch = commit.match(/committer ([^\n]+)/);
            if (Array.isArray(committerMatch)) {
                const v = committerMatch[1].trim();
                if (v !== NOT_COMMITTED_YET) {
                    committer = v;
                } else {
                    committer = 'You';
                    committed = false;
                }
            } else {
                reject('[LineBlame] committer not found.');
            }
            const timeMatch = commit.match(/committer-time ([^\n]+)/);
            if (Array.isArray(timeMatch)) {
                time = getFormattedDate(Number(timeMatch[1].trim()) * 1000);
            } else {
                reject('[LineBlame] committer-time not found.');
            }
            const infoMatch = commit.match(/summary ([^\n]+)/);
            if (Array.isArray(infoMatch)) {
                const v = infoMatch[1].trim();
                info = committed ? v : `[${NOT_COMMITTED_YET}]`;
            } else {
                reject('[LineBlame] commit-message not found.');
            }
            const commitInfo = `${committer} • ${time} • ${info}`;
            resolve(commitInfo);
        });
        cli.stderr.on('data', data => {
            reject('')
        });
    });
    return stdmsg;
}

async function getGitRootDir(filePath) {
    const stdmsg = await new Promise(resolve => {
        const cli = spawn(getGitCommand(), ['rev-parse', '--show-toplevel'], { cwd: dirname(filePath), });
        cli.stdout.on('data', data => {
            const s = data.toString();
            // 去掉一个 \n
            resolve(s.slice(0, s.length - 1));
        });
        cli.stderr.on('data', data => {
            resolve('');
        });
    });
    return stdmsg;
}

function getGitCommand() {
    const vscodeGit = extensions.getExtension('vscode.git');
    if (vscodeGit?.exports.enabled) {
        return vscodeGit.exports.getAPI(1).git.path;
    }
    return 'git';
}

module.exports = getCommitInfo;
