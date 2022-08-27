const { window, workspace, Position, Range } = require('vscode');
const getCommitInfo = require('./commit.js');
const getDecorationType = require('./decoration.js');
const { correctFilePath } = require('./utils.js');

let decorationTypeCache = [];
let editorCache = null;
let lineCache = null;
let blameController = null;

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

function blameActiveLine(editor, refresh=false) {
    editorCache = editor;
    const document = editor.document;
    const line = editor.selection.active.line;
    const text = document.lineAt(line).text;

    if (line === lineCache && !refresh) {
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
    const commitPromise = getCommitInfo({ signal: singal, filePath: correctFilePath(document.uri.path), line: line + 1, text: text});
    commitPromise.then(commit => {
        if (!singal.aborted) {
            const decorationType = getDecorationType(commit);
            const character = editor.document.lineAt(line).text.length;
            const range = generateRange(line, character);
            if (!singal.aborted) {
                editor.setDecorations(decorationType, [range]);
                decorationTypeCache.push(decorationType);
                disposeDecoration(true);
            }
        }
    });
    commitPromise.catch(err => {
        if (err) {
            window.showWarningMessage(err);
        }
    });
}

function activate(context) {
    window.onDidChangeTextEditorSelection(event => {
        const editor = event.textEditor;
        blameActiveLine(editor);
    }, null, context.subscriptions);

    window.onDidChangeActiveTextEditor(() => {
        disposeDecoration();
    });

    workspace.onDidChangeTextDocument(() => {
        disposeDecoration();
    });

    workspace.onDidSaveTextDocument(() => {
        const editor = window.activeTextEditor;
        if (editor) {
            blameActiveLine(editor, true);
        }
    });
    
    workspace.onDidCloseTextDocument(() => {
        decorationTypeCache.length = 0;
    });
}

module.exports = { activate };
