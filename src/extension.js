const { window, workspace, Position, Range } = require('vscode');

const getCommitInfo = require('./commit.js');
const getDecorationType = require('./decoration.js');
const { isGitRepo } = require('./utils.js');

const defaultWorkspaceFolder = { uri: { path: workspace.rootPath } };
let disposableDecorationType = '';
let activeTextEditorChanged = false;

function activate(context) {
    window.onDidChangeTextEditorSelection(event => {
        const editor = event.textEditor;
        if (activeTextEditorChanged) {
            // 切换文件
            activeTextEditorChanged = false;
            return;
        }
        oldEditorId = editor._id;
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
        const line = activeInfo.line;
        const character = activeInfo.character;
        if (line === lineCount) {
            // 超出最大行
            return;
        }
        const characterCount = editor.document.lineAt(line).text.length;
        if (character < characterCount) {
            // 焦点在文本内部
            return;
        }
        const startPos = new Position(line, character);
        const endPos = new Position(line, character);
        const range = new Range(startPos, endPos);
        const commitPromise = getCommitInfo({ rootPath, filePath, line: line + 1 });
        commitPromise.then(commit => {
            const decorationType = getDecorationType(commit);
            disposableDecorationType = decorationType;
            editor.setDecorations(decorationType, [range]);
        });
        commitPromise.catch(err => {
            window.showWarningMessage(err);
        });
    }, null, context.subscriptions);

    window.onDidChangeActiveTextEditor(editor => {
        activeTextEditorChanged = true;
        if (editor && disposableDecorationType) {
            // 清空上一次的 decoration
            editor.setDecorations(disposableDecorationType, []);
        }
    });
}

module.exports = { activate };
