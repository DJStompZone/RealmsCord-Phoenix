const axios = require("axios");
const bedrock = require('bedrock-protocol')
const chalk = require('chalk');
const { Client, Intents, MessageEmbed, MessageAttachment, } = require("discord.js");
const { realmId, realmName, token, channelId, clientId, guildId, botName, useServer, host, port } = require("./config.json");
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
} = require('./utils')
const discordToken = token
const realmid = realmId

function purple(txt) { return chalk.rgb(130, 20, 200).bold(txt) }
function orange(txt) { return chalk.rgb(255, 130, 0).bold(txt) }
function red(txt) { return chalk.rgb(225, 0, 0).bold(txt) }
function green(txt) { return chalk.rgb(30, 225, 0).bold(txt) }
function OPO(f, m, l) { console.log(orange(f) + " " + purple(m) + " " + orange(l)) }
function POP(f, m, l) { console.log(purple(f) + " " + orange(m) + " " + purple(l)) }
const hexColor = new RegExp(/^#[0-9a-f]{6}$/i)

function fancyMSG(message, sender, title = null, image = null) {
    let color = "#000000"
    if (!!(sender)) {
        color = hexColor.test(sender) ? sender : stringToColor(sender)
    }
    const newEmbed = new MessageEmbed()
        .setColor(color)
        .setDescription(message);
    if (title) { newEmbed.setTitle(title); }
    if (image) { newEmbed.setImage(image); }
    return newEmbed
}

function logOrIgnore(packetname) {
    try {
        if (logpaknames !== 1) { return }
        if (rtest(packetname) === true) { return }
        if (ignorepackets.includes(packetname)) { return }
        OPO("Recieved a", packetname, "packet.")
    } catch (e) { console.log(e) }
}
function rtest(t) {
    return !!pktrgx.exec(t)
}

function sanitizeString(str) {
    str = str.replace(/[^0-9]/gim, '');
    return str.trim()
}

class DiscBot {
    constructor() {
        this.connectionReady = false
        this.client = null
        this.discordClient = new Client({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.GUILD_MEMBERS,
            ],
        });
        this.getRealmClient = function () {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        var connection = { connectTimeout: 15000, realms: { realmId: realmid } }
                        if(useServer){
                            connection = { connectTimeout: 15000, host: host, port: port }
                        }
                        const c = bedrock.createClient(connection)
                        resolve(c)
                    } catch (e) { console.log(e); reject(e.message) }

                }, 3000)
            })
        }
        this.getRealmClient().then((c) => { this.client = c })
    }

    onStartup() {
        // Minecraft client logic (Packet listeners)
        setTimeout(() => {
            this.client.on('text', (packet) => {
                try {
                    if ((packet.source_name != this.client.username) && (packet.type === "chat")) {
                        POP("Game chat: message from", `${packet.source_name}:`, packet.message)
                        try {
                            this.handleMCMessage({ sender: packet.source_name, message: packet.message })
                        } catch (e) { console.log(e) }
                    }
                } catch (e) { console.log(e) }
            })
            this.client.on('player_list', (packet) => {
                try {
                    let wasJoin = (packet.records.type === "add")
                    let plrs = packet.records.records_count
                    for (const i of Array(plrs).keys()){
                        let pName = (!!wasJoin) ? packet.records.records[i].username:"A player"
                        if (pName !== this.client.username){
                            this.handleJoinLeave(pName, wasJoin)
                        }
                    }
                } catch(e) { console.log(e) }
            })
            this.client.on('packet', (packet) => { logOrIgnore(packet.data.name) })
            this.client.on('spawn', (packet) => {
                this.connectionReady = true;
            })
            this.client.on('join', (packet) => {
                this.connectionReady = true;
            })
        }, 5000)
        setTimeout(() => {
            // Checking for all-clear to send welcome message over the minecraft client...
            if (this.connectionReady) {
                console.log(green("Connection is ready! Sending welcome message..."))
                this.broadcast(welcomeMessage);
            } else {
                console.log(orange("Connection is not ready! Waiting 5 more seconds before trying again..."))
                setTimeout(() => {
                    if (this.connectionReady) {
                        console.log(green("Connection is ready! Sending welcome message..."))
                        this.broadcast(welcomeMessage);
                    } else {
                        console.log(red("Connection is still not ready! Aborting welcome messag!"))
                    }
                }, 5000)
            }
        }, 6000)

        // Discord Client Logic
        const discordClient = this.discordClient;
        discordClient.login(discordToken);

        discordClient.on("ready", async () => {
            const guild = await discordClient.guilds.fetch(guildId);
            console.info("RealmsCord: Phoenix - Discord client ready, setting activity...");
            discordClient.user.setActivity(`over ${realmName}`, { type: "WATCHING" });
            console.info(`RealmsCord: Phoenix - Activity set.Connected to Discord as ${discordClient.user.username}`);
            // Send an embed in the designated discord channel 
            const fancyStartMSG = fancyMSG(`**${realmName}'s chat has been bridged with Discord**`, "#139dbf", "RealmsCord: Phoenix", conceptArt)
            discordClient.channels.fetch(channelId).then(async (channel) => await channel
                .send({ embeds: [fancyStartMSG] })
                .then((msg) => {
                    setTimeout(() => msg.delete(), 300000);
                })
                .catch((error) => {
                    console.error(error);
                }));
        });

        discordClient.on("messageCreate", (message) => {
            const msgAuthor = message?.author?.username ?? "";
            try {
                // Stop early if the message isn't in our bot channel
                if (message.channel.id !== channelId) { return }
                // Make sure it's not a message we just sent, an empty string, undefined, or authorless
                if (!(message.author.id === clientId || message.content.length === 0 || [null, undefined, ""].includes(msgAuthor))) {
                    this.handleDiscordMessage(message);
                }
            } catch (e) { console.log(e) }
        });
    }

    // Parse messages coming from the game chat and relay to discord
    async handleMCMessage(packet) {
        try {
            let playerMessage = "";
            let sender = packet?.sender ?? ""
            // Handles messages where the player used /me
            if (!(sender)) { playerMessage += `<**${packet.message.substr(2)}**>`; }
            else {
                playerMessage += `<**${sender}**> ${packet.message}`
            };
            let embedMsg = fancyMSG(playerMessage, sender)
            await this.discordClient.channels
                .fetch(channelId)
                .then(async (channel) => await channel.send({ embeds: [embedMsg] }))
                .catch((error) => {
                    console.error(error);
                });
        } catch (er) { console.error(er.message) }
    }

    // Send a discord message when players join or leave
    async handleJoinLeave(pName, wasJoin=true) {
        try {
            let msgColor = (!!wasJoin) ? "#10EE20":"#DD1010"
            let action = (!!wasJoin) ? "connected to":"disconnected from"
            let joinMessage = `${pName} has ${action} ${realmName}`
            let embedMsg = fancyMSG(joinMessage, msgColor)
            await this.discordClient.channels
                    .fetch(channelId)
                    .then(async (channel) => await channel.send({ embeds: [embedMsg] }))
                    .catch((error) => {
                        console.error(error);
                    });
        } catch (er) { console.error(er.message) }
    }

    // Parse messages coming from discord
    async handleDiscordMessage(message) {
        const msgAuthor = message?.author?.username ?? "";
        let msg = message.content;
        const mentions = hasMentions(msg);
        const hasInvalid = !/^[\u0000-\u007f]*$/.test(msg);
        if (hasInvalid) {
            console.info(`Discarding message from [${msgAuthor}] with invalid characters`);
            return;
        }
        if (mentions) { // TODO: parse out multiple mentions
            try {
                const usrid = sanitizeString(mentions)
                const user = await this.discordClient.users.fetch(usrid);
                msg = message.content.replace(mentions, user.username);
            } catch (e) { console.log(e) }
        }
        await this.broadcast(`${msg}`, msgAuthor);
    }

    // Dispatch messages to the game chat
    async broadcast(messageEvent, msgAuthor) {
        if (!(this.connectionReady)) {
            console.log(`Tried to broadcast to the realm/server before it was ready. \nCanceling message: ${messageEvent}`)
            return
        }
        let client = this.client
        let msg = `${chkMsg(messageEvent)}`;
        let nameColor = "§f"
        let maybeAuthor = ""
        let bot_name = botName
        if (msgAuthor) {
            nameColor = `§${mcColor(msgAuthor)}`;
            msg = `§8[§9Discord§8]§f ${nameColor}${msgAuthor}§f§r: ${msg}`;
            maybeAuthor = " from ${msgAuthor}"
        }
        if (!([null, undefined, ""].includes(client?.username))) { bot_name = client.username }
        POP(`Got Discord message${maybeAuthor}:`, msg, "Relaying to the minecraft client...")
        client.queue('text', {
            type: 'chat',
            needs_translation: false,
            source_name: bot_name,
            xuid: '',
            platform_chat_id: '',
            message: msg
        })
    }
}


const bot = new DiscBot()
bot.onStartup()
