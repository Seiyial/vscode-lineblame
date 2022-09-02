const fs = require('fs');
const path = require('path');

const getConfiguration = require('./configuration.js');
const packageJson = require('../package.json');

const dateFormatEnum = packageJson.contributes.configuration.properties['lineblame.dateFormat'].enum;

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

function correctFilePath(filePath) {
    if (filePath && process.platform == 'win32') {
        if (filePath.startsWith('/')) {
            return filePath.substring(1).replaceAll('/', '\\');
        } else if (filePath.includes('/')) {
            return filePath.replaceAll('/', '\\');
        }
    }
    return filePath;
}

module.exports = { getFormattedDate, correctFilePath };
