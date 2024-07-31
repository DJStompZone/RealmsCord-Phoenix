function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeString(str, numbersOnly = true) {
    str = (numbersOnly) ? str.replace(/[^0-9]/gim, '') : str.replace(/[^0-9a-zA-Z_\- ]/gm, '');
    return str.trim();
}

function sanitizeCommand(str) {
    str = str.replace(/[^0-9a-zA-Z_\- \/\{\}\[\]\:\?\.\!\=\@\(\)\"]/gm, '');
    return str.trim();
}

function getDevice(deviceType) {
    let device = parseInt(deviceType);
    switch (device) {
    case 1:
        return 'Android';
    case 2:
        return 'iOS';
    case 3:
        return 'iOS';
    case 4:
        return 'Kindle Fire';
    case 7:
        return 'Windows';
    case 11:
        return 'PlayStation';
    case 12:
        return 'Switch';
    case 13:
        return 'Xbox';
    default:
        return `Unknown ID: ${deviceType}`;
    }
}

function allTrue(...args) {
    truthy = [];
    args.forEach((e) => truthy.push(!!e));
    return truthy.every(e => e == true);
}

function filterDevice(deviceType) {
    let device = parseInt(deviceType);
    switch (device) {
    case 11:
    case 13:
        return false;
    default:
        return true;
    }
}

module.exports = {
    timeout,
    sanitizeString,
    sanitizeCommand,
    getDevice,
    allTrue,
    filterDevice
};

