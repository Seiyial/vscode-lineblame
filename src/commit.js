const { spawn } = require('child_process');

const { doubleDigitFormat } = require('./utils.js');

const NOT_COMMITTED_YET = 'Not Committed Yet';

async function getCommitInfo({ rootPath, filePath, line }) {
    process.chdir(rootPath);
    const userName = await getGitUserName();
    const stdmsg = await new Promise((resolve, reject) => {
        const cli = spawn('git', ['blame', '-pL', `${line},${line}`, filePath]);
        cli.stdout.on('data', data => {
            const commit = data.toString();
            let committer, time, info, committed = true;
            const committerMatch = commit.match(/committer ([^\n]+)/);
            if (Array.isArray(committerMatch)) {
                const v = committerMatch[1].trim();
                if (v !== NOT_COMMITTED_YET) {
                    committer = v;
                } else {
                    committer = userName;
                    committed = false;
                }
            } else {
                reject('[LineBlame] committer not found.');
            }
            const timeMatch = commit.match(/committer-time ([^\n]+)/);
            if (Array.isArray(timeMatch)) {
                const d = new Date(Number(timeMatch[1].trim()) * 1000);
                time = `${d.getFullYear()}-${doubleDigitFormat(d.getMonth() + 1)}-${doubleDigitFormat(d.getDate())}`;
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
    });
    return stdmsg;
}

async function getGitUserName() {
    const stdmsg = await new Promise(resolve => {
        const cli = spawn('git', ['config', 'user.name']);
        cli.stdout.on('data', data => {
            const s = data.toString();
            // 去掉一个 \n
            resolve(s.slice(0, s.length - 1));
        });
    });
    return stdmsg;
}

module.exports = getCommitInfo;
