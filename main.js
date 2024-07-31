const axios = require("axios");
const bedrock = require('bedrock-protocol');
const fs = require('fs');
var utils = require('./utils');
const chalk = require('chalk');
const {
    Authflow
} = require('prismarine-auth');
const {
    RealmAPI
} = require('prismarine-realms');
const crypto = require('crypto');
const curve = 'secp384r1';
const {
    Client,
    GatewayIntentBits,
    Intents,
    EmbedBuilder,
    MessageAttachment,
	version
} = require("discord.js");

const config = require('./config');
const { logAccess, logErrorAccess, lastLogMessage, pm2log, customConsoleLog } = require('./logger');
const colors = require('./colors');
const {
    fancyMSG
} = require('./embeds');
const {
    tRegex,
    findFirstMatch
} = require('./regex');
const {
    removeEntry,
    removeEntryByParam
} = require('./array');

const {
    compendium
} = require('./indexed_compendium');
const {
    playerDied,
    parseLocalText,
    loc
} = require('./translate');
const {
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
} = require('./utils');

console.log(`Discord.JS v${version}`);

const {
    logOrIgnore
} = require('./packet');
const {
    timeout,
    sanitizeString,
    sanitizeCommand,
    getDevice,
    allTrue,
    filterDevice
} = require('./misc');

const { initialize } = require('./phoenix');

const bot = initialize();
