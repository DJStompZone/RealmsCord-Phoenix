// ==========================================
//                IMPORTS
// ==========================================
const chalk = require('chalk');

// ==========================================
//                CONSTANTS
// ==========================================

const pktrgx = new RegExp(/(entity|map|block|tick|level_chunk|update|inventory|sound|update_attributes|level_event|motion_prediction_hints|spawn_particle_effect)/)

const ignorepackets = ["event", "set_time", "mob_equipment", "mob_armor_equipment", "mob_effect", "set_last_hurt_by", "animate", "move_player", "set_title", "spawn_particle_effect"]
const logpaknames = 1
const welcomeMessage = 'Realmscord: Phoenix has been connected.'
const conceptArt = "https://i.imgur.com/FJ4yR0P.png"
const colormap = {
    "0": "a",
    "1": "1",
    "2": "2",
    "3": "4",
    "4": "5",
    "5": "6",
    "6": "b",
    "7": "c",
    "8": "d"
};
const textPacketTypes = ['chat', 'translation', 'popup', 'jukebox popup', 'tip', 'system', 'whisper', 'announcement', 'json whisper', 'json', 'json announcement', 'raw'];
const commandPrefix = "!";
const hexColor = new RegExp(/^#[0-9a-f]{6}$/i);
const tRegex = [/^[mc].+sleep/i, /changeTo/, /r\.player\.l/, /r\.player\.j/, /^d.+h\.[af]/];
const panRegex = new RegExp(/^((.*?(@Pan|Pan)[^0-9A-Za-z].*?)|(.+?@?pan))$/i)

// ==========================================
//             LOGGING FUNCTIONS
// ==========================================

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

// ==========================================
//         TEXT PROCESSING FUNCTIONS
// ==========================================

function panTest(str) {
    let rslt = panRegex.exec(str);
    if (rslt?.length) {
        console.log(rslt[0]);
        return rslt[0]
    };
    return null
}

function findFirstMatch(str) {
    let match = -1;
    tRegex.forEach((r) => {
        if (r.exec(str)) {
            match = tRegex.indexOf(r);
        }
    });
    return match;
}

function removeEntry(entry, ary) {
    let newAry = [];
    for (let e of ary) {
        newAry.push(e);
    }
    delete newAry[(newAry.findIndex((e) => {
        return e === entry;
    }))];
    newAry = newAry.filter((e) => {
        return e;
    });
    return newAry;
}

function removeEntryByParam(param, pValue, ary) {
    let newAry = [];
    ary.forEach((e) => {
        if (e[param] != pValue) {
            newAry.push(e);
        }
    });
    return newAry;
}

// ==========================================
//             PACKET FUNCTIONS
// ==========================================

function logOrIgnore(packetname) {
    try {
        if (logpaknames !== 1 || rtest(packetname) === true || ignorepackets.includes(packetname)) {
            return;
        }
        OPO("Recieved a", packetname, "packet.");
    } catch (e) {
        console.log(e);
    }
}

function rtest(t) {
    return !!pktrgx.exec(t);
}

// ==========================================
//          MISC UTILITY FUNCTIONS
// ==========================================

function hasMentions(st) {
    const m = /<@[0-9]+>/.exec(st);
    if (m?.length) {
        return m[0];
    }
    return null;
}

function chkMsg(msg) {
    const emojex = new RegExp(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g)
    let matches = [...msg.matchAll(emojex)];
    if (matches.length == undefined || matches?.length === 0) {
        return msg;
    }
    let newMsg = `${msg}`
    for (const i of Array(matches?.length ?? 0).keys()) {
        newMsg = msg.replace(matches[i][0], `(${matches[i][0].split(":")[1].toLowerCase()} emoji)`);
    }
    return newMsg;
}

function stringToColor(str) {
    let hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (var i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color += ("00" + value.toString(16)).substr(-2);
    }
    return color;
};

function fancyHash(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [
        (h1 ^ h2 ^ h3 ^ h4) >>> 0,
        (h2 ^ h1) >>> 0,
        (h3 ^ h1) >>> 0,
        (h4 ^ h1) >>> 0,
    ];
};

function mcColor(str) {
    const pick = fancyHash(str)[0].toString()[5];
    if (parseInt(pick) === 8) {
        return colormap["0"];
    }
    else if (parseInt(pick) === 9) {
        return colormap["7"];
    }
    else
        return colormap[pick];
};


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


// ==========================================
//        COMMAND HANDLING FUNCTIONS
// ==========================================

let commandRegistry = {
    'tonether': 0,
    'fromnether': 1,
    'fm': 2,
    'py': 3,
    'js': 4
};
const chatOffset = 10240;
function handleCSZE(msg) {
    let resp = { message: "", img: null }
    try {
        for (let ch of Array.from(msg)) {
            if (ch.charCodeAt(0) > 59647) {
                resp.img = "\nhttps://djstomp.win/" + ch.charCodeAt(0) + '\n';
                continue;
            } else if (ch === ' ') {
                resp.message += ' ';
                continue;
            } else if ((31 < (ch.charCodeAt(0) - chatOffset) < 127) || [9, 10, 13].includes(ch.charCodeAt(0) - chatOffset)) {
                // It's probably fine
                if ((ch.charCodeAt(0) - chatOffset) > 0) {
                    resp.message += String.fromCharCode(ch.charCodeAt(0) - chatOffset);
                    continue;
                } else {
                    resp.message += String.fromCharCode(ch.charCodeAt(0));
                }
            } else {
                resp.message += ch;
            }
        }
        return resp
    } catch (e) {
        console.log(`Error parsing CSZE: ${e}\nresp=${JSON.stringify(resp)}`)
        return resp
    }
}

// ==========================================
//                  EXPORTS
// ==========================================

module.exports = {
    handleCSZE, commandRegistry, hasMentions, chkMsg, stringToColor, fancyHash,
    mcColor, pktrgx, ignorepackets, logpaknames, welcomeMessage, conceptArt,
    colormap, textPacketTypes, commandPrefix, purple, orange, red, green, OPO,
    POP, hexColor, tRegex, panTest, panRegex, findFirstMatch, removeEntry,
    removeEntryByParam, logOrIgnore, rtest, timeout, sanitizeString, sanitizeCommand,
    getDevice, allTrue, filterDevice
}
