const fs = require('fs');
const util = require('util');
const io = require('@pm2/io');
const pm2 = require('pm2');

const bootTimeDay = Math.floor(new Date().getTime() / 60 / 60000 / 24);
const todaysLog = `./logs/phoenix_${bootTimeDay.toString()}.log`;
const todaysErrorLog = `./logs/phoenix_err_${bootTimeDay.toString()}.log`;
const logAccess = fs.createWriteStream(todaysLog, {
    flags: 'a'
});
const logErrorAccess = fs.createWriteStream(todaysErrorLog, {
    flags: 'a'
});
let lastLogMessage = '';
const pm2log = io.metric({
    name: 'Last log message',
    value: () => {
        return lastLogMessage;
    }
});
const customConsoleLog = function (d) {
    let now = new Date();
    let log_format = `[${now.toTimeString().split(' ')[0]}] ` + util.format(d) + '\n';
    lastLogMessage = log_format;
    logAccess.write(log_format);
    process.stdout.write(log_format);
};

process.stderr.write = logErrorAccess.write.bind(logErrorAccess);
process.on('uncaughtException', function (err) {
    let now = new Date();
    customConsoleLog((err && err.stack) ? err.stack : err);
    let log_format = `[${now.toTimeString().split(' ')[0]}] ` + util.format((err && err.stack) ? err.stack : err) + '\n';
    logErrorAccess.write(log_format);
    lastLogMessage = log_format;
});

module.exports = {
    logAccess,
    logErrorAccess,
    lastLogMessage,
    pm2log,
    customConsoleLog
};
