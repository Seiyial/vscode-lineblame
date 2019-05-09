const { window, workspace, Position, Range } = require('vscode');

const getCommitInfo = require('./commit.js');
const getDecorationType = require('./decoration.js');
const { isGitRepo } = require('./utils.js');

const defaultWorkspaceFolder = { uri: { path: workspace.rootPath } };
let disposableDecorationType = '';

function activate(context) {
    window.onDidChangeTextEditorSelection(e => {
        const editor = e.textEditor;
        if (disposableDecorationType) {
            // 清空上一次的 decoration
            editor.setDecorations(disposableDecorationType, []);
        }
        const document = editor.document;
        const filePath = document.uri.path;
        const lineCount = document.lineCount - 1;
        const workspaceFolder = workspace.workspaceFolders.filter(v => filePath.includes(v.name))[0] || defaultWorkspaceFolder;
        const rootPath = workspaceFolder.uri.path;
        if (!isGitRepo(rootPath)) {
            return;
        }
        const activeInfo = editor.selection.active;
        const l = activeInfo.line;
        const s = activeInfo.character;
        if (l === lineCount) {
            // 超出最大行
            return;
        }
        const startPos = new Position(l, s);
        const endPos = new Position(l, s);
        const range = new Range(startPos, endPos);
        const commitPromise = getCommitInfo({ rootPath, filePath, line: l + 1 });
        commitPromise.then(commit => {
            const decorationType = getDecorationType(commit);
            disposableDecorationType = decorationType;
            editor.setDecorations(decorationType, [range]);
        });
        commitPromise.catch(err => {
            window.showWarningMessage(err);
        });
    }, null, context.subscriptions);
}

module.exports = { activate };
