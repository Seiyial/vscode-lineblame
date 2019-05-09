const { window, DecorationRangeBehavior } = require('vscode');

function getDecorationType(commit) {
    return window.createTextEditorDecorationType({
        after: {
            margin: '0 0 0 2em',
            textDecoration: 'none',
            contentText: commit,
        },
        dark: {
            after: {
                color: '#555',
            },
        },
        light: {
            after: {
                color: '#bbb',
            },
        },
        rangeBehavior: DecorationRangeBehavior.ClosedOpen,
    });
}

module.exports = getDecorationType;
