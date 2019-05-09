const fs = require('fs');
const path = require('path');

function isGitRepo(rootPath) {
    return fs.existsSync(path.join(rootPath, '.git'));
}

function doubleDigitFormat(n) {
    return n < 10 ? `0${n}` : n;
}

module.exports = { isGitRepo, doubleDigitFormat };
