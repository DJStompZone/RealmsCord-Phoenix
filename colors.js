const chalk = require('chalk');

function purple(txt) {
    return chalk.rgb(130, 20, 200).bold(txt);
}

function orange(txt) {
    return chalk.rgb(255, 130, 0).bold(txt);
}

function red(txt) {
    return chalk.rgb(225, 0, 0).bold(txt);
}

function green(txt) {
    return chalk.rgb(30, 225, 0).bold(txt);
}

function OPO(f, m, l) {
    console.log(orange(f) + " " + purple(m) + " " + orange(l));
}

function POP(f, m, l) {
    console.log(purple(f) + " " + orange(m) + " " + purple(l));
}

module.exports = {
    purple,
    orange,
    red,
    green,
    OPO,
    POP
};

