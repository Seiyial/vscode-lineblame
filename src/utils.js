const fs = require('fs');
const path = require('path');

const getConfiguration = require('./configuration.js');
const packageJson = require('../package.json');

const dateFormatEnum = packageJson.contributes.configuration.properties['lineblame.dateFormat'].enum;

function isGitRepo(rootPath) {
    return fs.existsSync(path.join(rootPath, '.git'));
}

function doubleDigitFormat(n) {
    return n < 10 ? `0${n}` : n;
}

function getFormattedDate(timestamp) {
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = doubleDigitFormat(date.getMonth() + 1);
    const d = doubleDigitFormat(date.getDate());
    const dateFormat = getConfiguration('dateFormat');
    switch (true) {
        case dateFormat === dateFormatEnum[1]:
            return `${m}/${d}/${y}`;
        case dateFormat === dateFormatEnum[2]:
            return `${d}/${m}/${y}`;
        default:
            return `${y}/${m}/${d}`;
    }
}

module.exports = { isGitRepo, getFormattedDate };
