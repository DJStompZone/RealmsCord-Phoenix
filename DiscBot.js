process.env.DEBUG = 'minecraft-protocol'
const bedrock = require("bedrock-protocol");
const {
  readFileSync,
  existsSync,
  writeFileSync
} = require("fs");
const {
  join
} = require("path");
const {
  Authflow
} = require("prismarine-auth");
const {
  RealmAPI
} = require("prismarine-realms");
const {
  generateKeyPairSync
} = require("crypto");
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  TextChannel,
  DMChannel,
  NewsChannel
} = require("discord.js");
const {
  logpaknames,
  textPacketTypes,
  commandPrefix,
  handleCSZE,
  panTest,
  hasMentions,
  sanitizeString,
  red,
  orange,
  allTrue,
  getDevice,
  POP,
  filterDevice,
  green,
  conceptArt,
  removeEntryByParam,
} = require("./utils");
const _config = JSON.parse(readFileSync("./config.json").toString());
const discordToken = _config.token;
const worldName = _config.worldName;
const PHX = require("./phoenix")
const ClientSingleton = require('./ClientSingleton');
const { dontDoAutomod, openai } = require("./phoenix");

class DiscBot {
  constructor() {
    this.reset();
    this.isRealm = null;
    this.messageQueue = [];
    this.fmplayers = [];
    this.setupListeners();
  }

  reset() {
    this.fmplayers = [];
    this.connectionReady = false;
    this.client = null;
    this.discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });
    this.keypair = generateKeyPairSync("ec", {
      namedCurve: 'secp384r1',
    }).toString();
    this.flow = new Authflow();
    this.flow.getMsaToken();
    if (!(!!_config?.realmId || !!_config?.serverIp)) {
      throw new Error(
        "Required configuration value missing: either realmId or serverIp must be set in config.json"
      );
    }
    if (!!_config?.realmId && !!_config?.serverIp) {
      throw new Error(
        "Required configuration: realmId or serverIp should be set in config, not both."
      );
    }

    this.prealmapi = this.isRealm ? RealmAPI.from(this.flow, "bedrock") : { getRealm: () => { } };
    ClientSingleton.getGameClient({
      isRealm: this.isRealm,
      realmId: _config.realmId,
      botName: _config.botName,
      serverIp: _config.serverIp,
      serverPort: _config.serverPort,
    }).then(
      (c) => {
        this.client = c;
      },
      (e) => {
        console.error(e);
      }
    );
    this.authorizedAdmins = _config?.authorizedAdmins ?? [];
    this.players = JSON.parse(readFileSync("./players.json").toString());
    this._whitelist = JSON.parse(readFileSync("./whitelist.json").toString());
    this.prefix = commandPrefix;
    this.fmPath = join(__dirname, "fm.json");
    if (!existsSync(this.fmPath)) {
      const defaultContent = {
        players: [],
      };

      writeFileSync(this.fmPath, JSON.stringify(defaultContent, null, 2));
    }
    this.loadPlayersFM();
  }

  loadPlayersFM() {
    const fileContent = readFileSync(this.fmPath, "utf-8");
    const jsonContent = JSON.parse(fileContent);

    if (jsonContent.players) {
      this.fmplayers = jsonContent.players;
    }
  }
  /**
   * @param {any} playerName
   * @param {string} lastFM
   */
  updatePlayerFM(playerName, lastFM) {
    const existingPlayerIndex = this.fmplayers.findIndex(
      (player) => player.name === playerName
    );

    if (existingPlayerIndex === -1) {
      this.fmplayers.push({
        name: playerName,
        lastfm: lastFM
      });
    } else {
      this.fmplayers[existingPlayerIndex].lastfm = lastFM;
    }
    this.savePlayersFM();
  }

  savePlayersFM() {
    const updatedContent = {
      players: this.fmplayers,
    };

    writeFileSync(this.fmPath, JSON.stringify(updatedContent, null, 2));
  }

  /**
   * @param {any} playerName
   */
  getLastFM(playerName) {
    const player = this.fmplayers.find((player) => player.name === playerName);
    return player ? player.lastfm : null;
  }



  setupListeners() {
    ClientSingleton.on('connectionReady', () => {
      this.onConnectionReady();
    });

    ClientSingleton.on('connectionLost', () => {
      this.onConnectionLost();
    });

    ClientSingleton.on('textPacket', (packet) => {
      this.handleTextPacket(packet);
    });

    ClientSingleton.on('playerListPacket', (packet) => {
      this.handlePlayerListPacket(packet);
    });

    ClientSingleton.on('sessionStarted', () => {
      this.onSessionStarted();
    });

    ClientSingleton.on('spawn', () => {
      this.onSpawn();
    });
  }
  onConnectionLost() {
    console.log("Connection is lost in DiscBot.");
    // Additional logic for when the connection is lost
  }

  handleTextPacket(packet) {
    if (packet?.source_name === this.client.username) {
      return;
    }
    try {
      switch (packet.type) {
        case textPacketTypes[1]: // "translation" text packet
          console.log("Translation packet message: " + packet.message);
          if (packet.parameters) {
            console.log("Translation packet params: " + JSON.stringify(packet.parameters));
          }
          this.handleTranslation(packet.message.toString(), packet?.parameters_length, packet?.parameters, packet);
          break;
        case textPacketTypes[0]: // "chat" text packet
          let prefixes = [this.prefix, "."];
          let parsed = handleCSZE(packet?.message);
          if (packet?.message?.length > 0 && prefixes?.includes(parsed.message[0]) && PHX.commandNames.includes(parsed.message.split(" ")[0].slice(1))) {
            this.handleCommand(packet?.source_name, parsed.message.slice(1));
          } else {
            this.handleMCMessage({ sender: packet?.source_name, message: packet?.message });
            if (typeof openai !== "undefined" && panTest(parsed.message)) {
              this.panHandle(packet.source_name, parsed.message);
            }
          }
          break;
        case textPacketTypes[6]: // "whisper" text packet
        case textPacketTypes[7]: // "announcement" text packet
          this.handleMCMessage({ sender: packet?.source_name, message: packet?.message });
          break;
        default:
          break;
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * @param {any} sender
   * @param {string} panMessage
   */
  panHandle(sender, panMessage) {
    let r = null;
    this.getPan(sender, panMessage).then(async (rr) => {
      r = rr;
      if (rr) {
        this.broadcast(rr, this.client.username);
        try {
          let embedMsg = PHX.fancyMSG(rr, sender, "Tectonix [Pan]");
          this.discordClient.channels
            .fetch(_config.channelId)
            .then((channel) => {
              // Check if the channel is a TextChannel, DMChannel, or NewsChannel
              if (channel instanceof TextChannel ||
                channel instanceof DMChannel ||
                channel instanceof NewsChannel) {
                channel
                  .send({
                    embeds: [embedMsg],
                  })
                  .catch((error) => console.error("Error sending message:", error));
              } else {
                console.error("Fetched channel is not a text-based channel.");
              }
            })
            .catch((error) => {
              console.error(error);
            });
        } catch (errorMsg) {
          console.error(errorMsg);
        }
      } else {
        this.broadcast(
          `${sender}: Sorry, Pan is currently unavailable`,
          this.client.username
        );
        try {
          let embedMsg = PHX.fancyMSG(
            `${sender}: Sorry, Pan is currently unavailable`,
            sender,
            "Tectonix [Pan]"
          );
          this.discordClient.channels
            .fetch(_config.channelId)
            .then((channel) => {
              if (channel instanceof TextChannel ||
                channel instanceof DMChannel ||
                channel instanceof NewsChannel) {
                channel
                  .send("Your message here")
                  .then(( /** @type {{ content: any; }} */ message) => console.log(`Sent message: ${message.content}`))
                  .catch((error) => console.error("Error sending message:", error));
              } else {
                console.error("Fetched channel is not a text-based channel.");
              }
            })
            .catch((error) => {
              console.error(error);
            });
        } catch (errorMsg) {
          console.error(errorMsg);
        }
      }
    });
  }

  async getPan(sender, txt) {
    if (openai == null) {
      console.log("Pan is unavailable");
      return null;
    }
    const completionData = {
      model: "text-davinci-003",
      prompt: `You are Pan, a character within Minecraft Bedrock that can answer players' questions helpfully and above all, accurately. Your knowledge is restricted to actions performed within the game, but you are kind and curteous in your responses.\n\ncreeperslayer69: Hey Pan, how do j make an enchant tbale?\n\nPan: @creeperslayer69 You can craft an enchantment table with 4 obsidian, 2 diamonds, and a book. Obsidian is found when flowing water meets standing lava, diamonds can be found underground and are most common at the deepest depths. A book can be made from leather and paper.\n\n${sender}: ${txt}`,
      temperature: 0.28,
      max_tokens: 1108,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["\\n\\n"],
    };
    let response = null;
    try {
      response = await openai.createCompletion(completionData);
    } catch (e) {
      console.log("Pan is unavailable");
    }
    if (response?.data?.choices?.length) {
      return response.data.choices[0].text;
    }
    return null;
  }


  async handlePlayerListPacket(packet) {
    try {
      let wasJoin = packet.records.type === "add";
      let plrs = packet.records.records_count;
      for (const i of Array(plrs).keys()) {
        try {
          let thisPlayer = packet.records.records[i];
          let pData = !!wasJoin ? await this.addPlayer(thisPlayer) : this.players[thisPlayer.uuid];
          let pName = (await pData?.username) ?? `Unknown Player: ${thisPlayer.uuid}`;
          if (pName !== this.client.username) {
            this.handleJoinLeave(pName, wasJoin);
          }
        } catch (e) {
          console.log(e);
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  onSessionStarted() {
    console.log("Session started in DiscBot.");
    // Additional logic for when the session starts
  }

  async sendOnlineEmbed() {
    const fancyStartMSG = PHX.fancyMSG(
      `**${worldName}'s chat has been bridged with Discord**`,
      "#139dbf",
      "RealmsCord: Phoenix",
      conceptArt
    );
    this.discordClient.channels
      .fetch(_config.channelId)
      .then(async (channel) => {
        if (channel?.type === ChannelType.GuildText) {
          await channel
            .send({
              embeds: [fancyStartMSG],
            })
            .then((msg) => {
              setTimeout(async () => {
                try {
                  msg.fetch().then((mssg) => {
                    mssg.delete();
                  });
                } catch (error) {
                  console.error("Failed to delete message:", error);
                }
              }, 5000);
            });
        }
      });
  }


  onSpawn() {
    console.log("Spawn event in DiscBot.");
    this.connectionReady = true;
    this.sendStartupMessage()
      .then(() => this.sendOnlineEmbed().then(() => {
        console.log("Startup messages deployed to discord/mc");
      })).catch((e) => console.log(e));
  }

  async sendStartupMessage() {
    // Implementation for sending a startup message
  }

  handleTranslation(message, paramsLength, params, packet) {
    // Implementation for handling translation packets
  }

  handleCommand(sourceName, message) {
    // Implementation for handling commands
  }

  handleMCMessage({ sender, message }) {
    // Implementation for handling Minecraft messages
  }

  async handleDiscordMessage(message) {
    console.log("Debug: handleDiscordMessage", message.content);
    try {
      const msgAuthor = message?.author?.username ?? "";
      if (msgAuthor === this.discordClient.user.username) {
        return;
      }
      let msg = message.content;

      // Handle multiple mentions
      let mention = hasMentions(msg);
      while (mention) {
        try {
          const usrid = sanitizeString(mention);
          const user = await this.discordClient.users.fetch(usrid);
          msg = msg.replace(mention, user.username);
        } catch (e) {
          console.log(red(e));
        }
        mention = hasMentions(msg); // Check for more mentions
      }

      this.broadcast(msg, msgAuthor);
    } catch (e) {
      console.log(
        red(`Unexpected error in DiscBot.handleDiscordMessage: ${e}`)
      );
    }
  }

  dispatchCommand(command) {
    try {
      if (!(this.connectionReady)) {
        console.log(
          red(
            `Tried to send command to the realm/server before it was ready. \nCanceling message: ${command}`
          )
        );
        return;
      }
      POP(`Attempting to send command: `, command, `to the MC connection...`);
      let bot_name = _config?.botName ?? this?.client?.username;
      if (!bot_name) {
        console.error("Bot name not found. Using default name: RealmsCord Phoenix");
        bot_name = "RealmsCord Phoenix"
      }
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: bot_name,
        xuid: "",
        platform_chat_id: "",
        message: `!run ${command}`,
      });
    } catch (e) {
      console.log(red(`Unexpected error in DiscBot.dispatchCommand: ${e}`));
    }
  }

  async addToWhitelist(playerName) {
    let outcomeString;
    let operationResult = await this._addWL(playerName);
    switch (operationResult) {
      case 0:
        outcomeString = `Success, whitelisted ${playerName}.`;
        break;
      case 1:
        outcomeString = `Error: Invalid player name: ${playerName}`;
        break;
      case 2:
        outcomeString = `Error: ${playerName} is already whitelisted.`;
        break;
      default:
        outcomeString = `An unexpected error occurred. Check the log for details.`;
    }
    return outcomeString;
  }

  async removeFromWhitelist(playerName) {
    let operationResult = await this._removeWL(playerName);
    let outcomeString;
    switch (operationResult) {
      case 0:
        outcomeString = `Success, un-whitelisted ${playerName}.`;
        break;
      case 1:
        outcomeString = `Error: Invalid player name: ${playerName}`;
        break;
      case 2:
        outcomeString = `Error: ${playerName} not in whitelist.`;
        break;
      default:
        outcomeString = `An unexpected error occurred. Check the log for details.`;
    }
    return outcomeString;
  }

  async addPlayer(record) {
    try {
      record.entity_unique_id = record.entity_unique_id.toString();
      delete record.platform_chat_id;
      delete record.is_teacher;
      delete record.is_host;
      delete record.skin_data;
      record.build_platform = record.build_platform.toString();
      this.players[record.uuid] = record;
      writeFileSync("./players.json", JSON.stringify(this.players, null, 4));
      // console.log(`Added player: ${record?.username}`);
      return record;
    } catch (e) {
      console.log(`Unexpected error in DiscBot.addPlayer: ${e}`);
    }
  }

  async getPlayerByUsername(pName) {
    let correlation = {};
    console.log(`getPlayerByUsername: Searched for "${pName}"`);
    Object.values(Object.values(this.players)).forEach((e) => {
      correlation[e.username] = e.uuid;
    });
    try {
      return (
        this.players[correlation[pName]] ??
        (() => {
          console.log(`getPlayerByUsername: Not found: "${pName}".`);
          return null;
        })()
      );
    } catch (e) {
      console.log(red(e.message));
      return null;
    }
  }

  getPlayerByXuid(PXUID) {
    const pXUID = `${PXUID}`;
    let correlation = {};
    Object.values(Object.values(this.players)).forEach((e) => {
      correlation[e.uuid] = e.username;
    });
    try {
      return this.players[correlation[pXUID]];
    } catch (e) {
      console.log(red(e.message));
      return null;
    }
  }

  async handleJoinLeave(pName, wasJoin = true) {
    try {
      let plr = await this.getPlayerByUsername(pName);
      let platform = plr?.build_platform ?? -1;
      let bannedDevice = filterDevice(platform);
      let notWhitelisted = true;
      for (let e of this.whitelist) {
        if (e.username === pName) {
          notWhitelisted = false;
          console.log(`Found ${pName} on whitelist`);
        }
      }
      if (this.authorizedAdmins.includes(plr.xbox_user_id)) {
        notWhitelisted = false;
      }
      if (allTrue(plr, platform, bannedDevice, notWhitelisted, wasJoin) &&
        dontDoAutomod != true) {
        console.log(
          orange(
            `Kicking player ${pName}, reason - banned device: ${getDevice(
              plr.build_platform
            )}`
          )
        );
        setTimeout(() => {
          this.dispatchCommand(
            `/kick "${pName}" Banned device - ${getDevice(plr.build_platform)}`
          );
        }, 3000);
      }
    } catch (e) {
      POP("Tried and failed to kick player:", pName + e);
    }
    try {
      let msgColor = !!wasJoin ? "#10EE20" : "#DD1010";
      let action = !!wasJoin ? "connected to" : "disconnected from";
      let joinMessage = `${pName} has ${action} ${worldName}`;
      let embedMsg = PHX.fancyMSG(joinMessage, msgColor);
      console.log(green(joinMessage));
      await this.discordClient.channels
        .fetch(_config.channelId)
        .then(async (channel) => {
          if (channel instanceof TextChannel) {
            await channel.send({
              embeds: [embedMsg],
            });
          } else {
            console.error("Fetched channel is not a text channel.");
          }
        })
        .catch((error) => {
          console.error(red(error.message));
        });
    } catch (er) {
      console.error(red(er.message));
    }
  }

  fmHandler() { }

  async sendCodeResult(codeOutput, sender = null) {
    console.log("SendCodeResult: ", codeOutput, sender);
    try {
      console.log("Queueing message to Minecraft client...");
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: this.client.username,
        xuid: "",
        platform_chat_id: "",
        message: codeOutput,
      });
      console.log("Message queued to Minecraft client.");
    } catch (error) {
      console.log("Error queueing message to Minecraft client:", error);
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: this.client.username,
        xuid: "",
        platform_chat_id: "",
        message: `An error occurred: ${error}`,
      });
    }

    try {
      let messageColor = codeOutput.includes("error") ? "#dd0000" : "#00dd00";
      let embedMsg = PHX.fancyMSG(
        codeOutput.replace(/[\n]+/gim, "\n"),
        sender,
        "Code Output",
        messageColor
      );
      console.log("Fetching Discord channel...");
      await this.discordClient.channels
        .fetch(_config.channelId)
        .then(async (channel) => {
          if (channel instanceof TextChannel) {
            console.log("Sending message to Discord channel...");
            await channel.send({
              embeds: [embedMsg],
            });
            console.log("Message sent to Discord channel.");
          } else {
            console.error("Fetched channel is not a text channel.");
          }
        })
        .catch((error) => {
          console.error("Error fetching Discord channel:", error);
        });
    } catch (error) {
      console.log("Error sending message to Discord:", error);
    }
  }

  async broadcast(messageEvent, msgAuthor) {
    if (!this.connectionReady) {
      console.log(
        `Tried to broadcast to the realm/server before it was ready. \nCanceling message: ${messageEvent}`
      );
      this.messageQueue.push({ messageEvent, msgAuthor });
      return;
    }

    let dt = new Date();
    let author = `[Discord] ${dt.toLocaleDateString().slice(0, 5)}${dt
      .toLocaleDateString()
      .slice(7, 9)} ${dt
        .toTimeString()
        .split(" ")[0]
        .split(":")
        .join(".")
        .replace(".", ":")}`;

    if (msgAuthor && msgAuthor !== this.client.username) {
      author += ` <${msgAuthor}>`;
    } else {
      author = " ";
    }

    let msgOutput = "";
    for (let ea of Array.from(messageEvent)) {
      if (ea.match(/[a-z]/i)) {
        msgOutput += String.fromCharCode(ea.charCodeAt(0) + PHX.chatOffset);
      } else {
        msgOutput += ea;
      }
    }

    let outputMessage = [author, msgOutput].join(" ");
    console.log("Broadcasting message:", outputMessage);
    let bot_name = _config?.botName ?? this?.client?.username;
    if (!bot_name) {
      console.error("Bot name not found. Using default name: RealmsCord Phoenix");
      bot_name = "RealmsCord Phoenix"
    }
    try {
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: bot_name,
        xuid: "",
        platform_chat_id: "",
        message: outputMessage,
      });

      console.log("Message queued to Minecraft client.");
    } catch (error) {
      console.error("Error broadcasting message:", error);
    }
  }

  onConnectionReady() {
    console.log("Connection is now ready. Broadcasting queued messages...");

    const broadcastNextMessage = () => {
      if (this.messageQueue.length > 0) {
        const { messageEvent, msgAuthor } = this.messageQueue.shift();
        this.broadcast(messageEvent, msgAuthor);

        setTimeout(broadcastNextMessage, 750);
      }
    };

    broadcastNextMessage();
  }

  async _removeWL(playerName) {
    let player = await this.getPlayerByUsername(playerName);
    let wlist = this.whitelist;
    if (!player) {
      return 1;
    }
    let whitelisted = [];
    for (let p of wlist) {
      if (!whitelisted.includes(p.username)) {
        whitelisted.push(p.username);
      }
    }
    let exists = whitelisted.includes(playerName);
    if (!exists) {
      return 2;
    }
    try {
      let newWhitelist = removeEntryByParam("username", playerName, wlist);
      this.whitelist = newWhitelist;
      return 0;
    } catch (e) {
      console.log(e.message);
      return 3;
    }
  }

  async _addWL(playerName) {
    let player = await this.getPlayerByUsername(playerName);
    let wlist = this.whitelist;
    if (!player) {
      return 1;
    }
    let whitelisted = [];
    for (let p of wlist) {
      if (!whitelisted.includes(p.username)) {
        whitelisted.push(p.username);
      }
    }
    let exists = whitelisted.includes(playerName);
    if (exists) {
      return 2;
    }
    try {
      wlist.push(player);
      this.whitelist = wlist;
      return 0;
    } catch (e) {
      console.log(e.message);
      return 3;
    }
  }
}

module.exports = DiscBot;

exports.DiscBot = DiscBot;
