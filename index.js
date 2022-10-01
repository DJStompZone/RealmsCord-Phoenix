const axios = require("axios");
const bedrock = require('bedrock-protocol')
const chalk = require('chalk');
const { Client, Intents, MessageEmbed, MessageAttachment, } = require("discord.js");
const { realmName, realmId, verboseMessageEvents, attemptAutoConnect, token, channelId, clientId, guildId, botName} = require("./config.json");
const discordToken = token

let realmid = realmId
const realmargs = process.argv[2]?.toString() ?? "";
if ((typeof parseInt(realmargs) === 'number') && (realmargs.length > 6)) { realmid = realmargs }


const pktrgx = new RegExp(/(entity|map|block|tick|level_chunk|update|inventory|sound|update_attributes)/)
const emojex =  new RegExp(/<a?:[a-zA-Z0-9_]+:[0-9]+>/g)
const ignorepackets = ["event", "set_time", "level_event", "mob_effect"]
const logpaknames = pk = 1
function rtest(t) { return !!pktrgx.exec(t) }
const welcomeMessage = '§a§l§oRealmscord: Phoenix has been connected.§r'

function hasMentions(st) {
    const m = /<@[0-9]+>/.exec(st);
    if (m?.length) {
        return m[0];
    }
    return null;
}

function chkMsg(msg) {
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


function logOrIgnore(packetname) {
    try {
        if (logpaknames !== 1) { return }
        if (rtest(packetname) === true) { return }
        if (ignorepackets.includes(packetname)) { return }
        OPO("Recieved a", packetname, "packet.")
    } catch { }
}

function purple(txt) { return chalk.rgb(130, 20, 200).bold(txt) }
function orange(txt) { return chalk.rgb(255, 130, 0).bold(txt) }
function OPO(f, m, l) { console.log(orange(f) + " " + purple(m) + " " + orange(l)) }
function POP(f, m, l) { console.log(purple(f) + " " + orange(m) + " " + purple(l)) }


class DiscBot {
    constructor() {
        this.stringToColor = function (str) {
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
        this.fancyHash = function (str) {
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
        this.mcColor = function (str) {
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
            const pick = this.fancyHash(str)[0].toString()[5];
            if (parseInt(pick) === 8) {
                return colormap["0"];
            }
            else if (parseInt(pick) === 9) {
                return colormap["7"];
            }
            else
                return colormap[pick];
        };
        this.discordClient = new Client({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.GUILD_MEMBERS,
            ],
        });
		this.getRealmClient = function () {
		   return new Promise((resolve, reject) => {
				setTimeout(()=>{
					const c = bedrock.createClient({ realms: { realmId: realmid } })
					resolve(c)
				}, 1500)
			})
		}
		this.handle_realm_message = function (source, message) {
            try {
                this.onRealmMessage({ sender: source, message: message })
            } catch { }
        }
        this.client = null
		this.getRealmClient().then((c)=>{
			this.client = c
			this.client.on('text', (packet) => {
				try {
					if ((packet.source_name != this.client.username) && (packet.type === "chat")) {
						POP( "Got a realm message from", `${packet.source_name}:`, packet.message)
						this.handle_realm_message(packet.source_name, packet.message)
					}
				} catch { }
			})
			this.client.on('packet', (packet) => { logOrIgnore(packet.data.name) })
		})
        
    }
    onStartup() {		
		let client = this.client

		setTimeout(()=>{
			const discordClient = this.discordClient;
			discordClient.login(discordToken);

			discordClient.on("ready", async () => {
				const guild = await discordClient.guilds.fetch(guildId);
				console.info("RealmsCord: Phoenix - Discord discordClient Ready, setting activity...");
				discordClient.user.setActivity(`over ${realmName}`, { type: "WATCHING" });
				console.info("RealmsCord: Phoenix - Activity set.");
				console.info(`Now bridged with Discord as ${discordClient.user.username}`);
				const fancyStartMSG = new MessageEmbed()
					.setColor("#139dbf")
					.setTitle("Realmscord: Phoenix")
					.setDescription(`**${realmName}'s chat has been bridged with Discord**`)
					.setImage('https://i.imgur.com/FJ4yR0P.png');
				discordClient.channels.fetch(channelId).then(async (channel) => await channel
					.send({ embeds: [fancyStartMSG] })
					.then((msg) => {
						setTimeout(() => msg.delete(), 300000);
					})
					.catch((error) => {
						console.error(error);
					}));
				this.onBroadcast(welcomeMessage);
			});

			discordClient.on("messageCreate", (message) => {
				const msgAuthor = message?.author?.username ?? null;
				if (!(message.author.id === clientId || message.content.length === 0 || [null, undefined, ""].includes(msgAuthor) || message.channel.id !== channelId)) {
					this.onDiscordMessage(message);
				}
			});
		}, 2000)
    }
	
    async onRealmMessage(packet) {
        try {
            const messageRanks = "";
            if (verboseMessageEvents && packet.sender) {
                console.info(`New realm message: [${packet.sender}]: "${packet.message}"`);
            }
            let playerMessage = "";
            if (packet.sender) {
                playerMessage += `<**${packet.sender}**> ${packet.message}`;
            }
            else {
                playerMessage += `<**${packet.message.substr(2)}**>`;
            }
            const fancyMSG = new MessageEmbed()
                .setColor(this.stringToColor(packet.sender))
                .setDescription(playerMessage);
            await this.discordClient.channels
                .fetch(channelId)
                .then(async (channel) => await channel.send({ embeds: [fancyMSG] }))
                .catch((error) => {
                    console.error(error);
                });
        } catch (er) { console.error(er.message) }
    }
	
    async onDiscordMessage(message) {
        const msgAuthor = message?.author?.username ?? null;
        let msg = message.content;
        const mentions = hasMentions(msg);
        const hasInvalid = !/^[\u0000-\u007f]*$/.test(msg);
        if (hasInvalid) {
            console.info(`Dropping message from [${msgAuthor}] with invalid characters`);
            return;
        }
        if (mentions) {
            const usrid = mentions.replace("<@", "").replace(">", "");
            const user = await this.discordClient.users.fetch(usrid);
            msg = message.content.replace(mentions, user.username);
        }
        if (verboseMessageEvents) {
            console.info(`New Discord message - [${msgAuthor}]: "${message.content}"`);
        }
        await this.onBroadcast(`${msg}`, msgAuthor);
        
    }
    async onBroadcast(messageEvent, msgAuthor) {
		let client = this.client
        let msg = `${chkMsg(messageEvent)}`;
        let nameColor;
        if (msgAuthor) {
            nameColor = `§${this.mcColor(msgAuthor)}` ?? "";
            msg = `§8[§9Discord§8]§f ${nameColor}${msgAuthor}§f§r: ${msg}`;
        }
		let pause = messageEvent===welcomeMessage?5000:50
		let bot_name = ""
		if ([null, undefined, ""].includes(client.username)){
			bot_name = botName
		} else { bot_name = client.username }
		setTimeout(()=>{
			POP("Attempting to send discord message:", msg, "to the realm client...")
			client.queue('text', {
				type: 'chat',
				needs_translation: false,
				source_name: bot_name,
				xuid: '',
				platform_chat_id: '',
				message: msg
			})
		}, pause)
    }
}


const bot = new DiscBot()
bot.onStartup()
