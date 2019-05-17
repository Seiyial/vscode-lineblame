const { window, DecorationRangeBehavior } = require('vscode');

function getDecorationType(commit) {
    return window.createTextEditorDecorationType({
        after: {
            margin: '0 0 0 1em',
            textDecoration: 'none',
            contentText: commit,
        },
        dark: {
            after: {
                color: '#7f848e',
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
