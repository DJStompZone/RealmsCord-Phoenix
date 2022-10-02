const chalk = require('chalk');




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
    if (!matches?.length) {
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



const pktrgx = new RegExp(/(entity|map|block|tick|level_chunk|update|inventory|sound|update_attributes|level_event)/)

const ignorepackets = ["event", "set_time", "mob_equipment", "mob_effect", "set_last_hurt_by", "animate", "move_player", "set_title"]
const logpaknames = 0
const welcomeMessage = '§a§l§oRealmscord: Phoenix has been connected.§r'
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


module.exports = {
    hasMentions, 
    chkMsg, 
    stringToColor, 
    fancyHash, 
    mcColor,
    pktrgx, 
    ignorepackets, 
    logpaknames, 
    welcomeMessage, 
    conceptArt, 
    colormap
}