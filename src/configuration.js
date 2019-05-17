const { workspace } = require('vscode');

function getConfiguration(key) {
    let config = workspace.getConfiguration('lineblame');
    if (!key) {
        return config;
    } else {
        return config[key];
    }
}

module.exports = getConfiguration;
