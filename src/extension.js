const { window, workspace, Position, Range } = require('vscode');

const getCommitInfo = require('./commit.js');
const getDecorationType = require('./decoration.js');
const { isGitRepo } = require('./utils.js');

const defaultWorkspaceFolder = { uri: { path: workspace.rootPath } };
let decorationTypeCache = [];
let editorCache = null;
let lineCache = null;
let activeTextEditorChanged = false;
let textDocumentInputing = false;

function getRootPath(uri) {
    const workspaceFolder = workspace.getWorkspaceFolder(uri) || defaultWorkspaceFolder;
    const rootPath = workspaceFolder.uri.path;
    return rootPath;
}

function crossSelection(selection) {
    return selection.start.line !== selection.end.line;
}

function generateRange(line, character) {
    const startPos = new Position(line, character);
    const endPos = new Position(line, character);
    const range = new Range(startPos, endPos);
    return range;
}

function disposeDecoration(keepLastDisposeDecoration=false) {
    if (editorCache) {
        while (true) {
            if (decorationTypeCache.length == 0 || keepLastDisposeDecoration && decorationTypeCache.length == 1) {
                break;
            }
            editorCache.setDecorations(decorationTypeCache.shift(), []);
        }
    }
}

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
        const document = editor.document;
        const rootPath = getRootPath(document.uri);
        if (!isGitRepo(rootPath)) {
            disposeDecoration();
            return;
        }
        const selection = editor.selection;
        if (crossSelection(selection)) {
            // 选中多个字符
            disposeDecoration();
            return;
        }
        const line = selection.active.line;
        const lineCount = document.lineCount - 1;
        if (line === lineCount) {
            // 超出最大行
            disposeDecoration();
            return;
        }
        if (line === lineCache) {
            // 同一行触发事件
            return;
        } else {
            disposeDecoration();
            lineCache = line;
        }
        const commitPromise = getCommitInfo({ rootPath, filePath: document.uri.path, line: line + 1 });
        commitPromise.then(commit => {
            const decorationType = getDecorationType(commit);
            decorationTypeCache.push(decorationType);
            const character = editor.document.lineAt(line).text.length;
            const range = generateRange(line, character);
            editor.setDecorations(decorationType, [range]);
            disposeDecoration(true)
        });
        commitPromise.catch(err => {
            window.showWarningMessage(err);
        });
    }, null, context.subscriptions);

    window.onDidChangeActiveTextEditor(() => {
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

module.exports = { activate };
