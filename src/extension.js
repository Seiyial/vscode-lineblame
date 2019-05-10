const { window, workspace, Position, Range } = require('vscode');

const getCommitInfo = require('./commit.js');
const getDecorationType = require('./decoration.js');
const { isGitRepo } = require('./utils.js');

const defaultWorkspaceFolder = { uri: { path: workspace.rootPath } };
let disposableDecorationType = null;
let activeTextEditorChanged = false;
let textDocumentInputing = false;
let editorCache = null;

function activate(context) {
    window.onDidChangeTextEditorSelection(event => {
        const editor = editorCache = event.textEditor;
        if (textDocumentInputing) {
            // 正在输入
            return;
        }
        if (activeTextEditorChanged) {
            // 切换文件
            activeTextEditorChanged = false;
            return;
        }
        disposeDecoration();
        const document = editor.document;
        const filePath = document.uri.path;
        const lineCount = document.lineCount - 1;
        const workspaceFolder = workspace.workspaceFolders.filter(v => filePath.includes(v.name))[0] || defaultWorkspaceFolder;
        const rootPath = workspaceFolder.uri.path;
        if (!isGitRepo(rootPath)) {
            return;
        }
        const selection = editor.selection;
        if (
            selection.start.line !== selection.end.line
            ||
            selection.start.character !== selection.end.character
        ) {
            // 选中多个字符
            return;
        }
        const line = selection.active.line;
        if (line === lineCount) {
            // 超出最大行
            return;
        }
        const character = editor.document.lineAt(line).text.length;
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
        disposeDecoration();
    });

    workspace.onDidChangeTextDocument(() => {
        textDocumentInputing = true;
        disposeDecoration();
    });

    workspace.onDidSaveTextDocument(() => {
        textDocumentInputing = false;
    });
}

function disposeDecoration() {
    if (editorCache && disposableDecorationType) {
        // 清空上一次的 decoration
        editorCache.setDecorations(disposableDecorationType, []);
    }
}

module.exports = { activate };
