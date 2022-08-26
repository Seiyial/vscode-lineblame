const { window, workspace, Position, Range } = require('vscode');
const getCommitInfo = require('./commit.js');
const getDecorationType = require('./decoration.js');
const { correctFilePath } = require('./utils.js');

let decorationTypeCache = [];
let editorCache = null;
let lineCache = null;
let activeTextEditorChanged = false;
let textDocumentInputing = false;
let blameController = null;

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
            // return;
        }
        const document = editor.document;
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
        if (blameController) {
            blameController.abort();
        }
        blameController = new AbortController();
        const singal = blameController.signal;
        const commitPromise = getCommitInfo({ signal: singal, filePath: correctFilePath(document.uri.path), line: line + 1 });
        commitPromise.then(commit => {
            if (!singal.aborted) {
                const decorationType = getDecorationType(commit);
                const character = editor.document.lineAt(line).text.length;
                const range = generateRange(line, character);
                if (!singal.aborted) {
                    editor.setDecorations(decorationType, [range]);
                    decorationTypeCache.push(decorationType);
                    disposeDecoration(true)
                }
            }
        });
        commitPromise.catch(err => {
            if (err) {
                window.showWarningMessage(err);
            }
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

    window.showInformationMessage("LineBlame is active.")
}

module.exports = { activate };
