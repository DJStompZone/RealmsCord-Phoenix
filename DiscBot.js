const bedrock = require("bedrock-protocol");
const { readFileSync, existsSync, writeFileSync } = require("fs");
const { join } = require("path");
const { Authflow } = require("prismarine-auth");
const { RealmAPI } = require("prismarine-realms");
const { generateKeyPairSync } = require("crypto");
const { Client, GatewayIntentBits, TextChannel, ChannelType, DMChannel, NewsChannel } = require("discord.js");
const { restart } = require("pm2");
const { logpaknames, welcomeMessage, conceptArt, textPacketTypes, commandPrefix, commandRegistry, hasMentions, purple, orange, red, green, OPO, POP, allTrue, panTest, handleCSZE, findFirstMatch, removeEntryByParam, logOrIgnore, sanitizeString, getDevice, filterDevice } = require("./utils");
const { playerDied } = require("./translate");
const { default: axios } = require("axios");
const { curve, config, isRealm, realmid, fancyMSG, commandNames, openai, discordToken, chatOffset, dontDoAutomod } = require("./phoenix");


class DiscBot {
  constructor() {
    this.reset();
    this.isRealm = null;
    this.connectionReady = false;
  }
  reset() {
    /**
     * @type {{ name: any; lastfm: any; }[]}
     */
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
    if (!!config?.realmId || !!config?.serverIp) {
      throw new Error(
        "Required configuration value missing: either realmId or serverIp must be set in config.json"
      );
    }
    if (!!config?.realmId && !!config?.serverIp) {
      throw new Error(
        "Required configuration: realmId or serverIp should be set in config, not both."
      );
    }
    this.prealmapi = RealmAPI.from(this.flow, "bedrock");
    this.getGameClient = function () {
      return new Promise((resolve, reject) => {
        let c;
        setTimeout(() => {
          try {
            //const c = bedrock.createClient({version: '1.21.40'});
            console.log("Creating game client...");
            c = bedrock.createClient({
              connectTimeout: 15000,
              realms: !isRealm
                ? null
                : {
                  realmId: realmid ?? config?.realmId,
                },
              username: isRealm ? null : config?.botName ?? null,
              host: isRealm ? null : config?.serverIp ?? "127.0.0.1",
              port: isRealm ? null : config?.serverPort ?? 0,
            });
            console.log('Game client: resolving...');
            resolve(c);
          } catch (e) {
            console.log(e);
            reject(e.message);
          }
        }, 600000);
      });
    };
    this.getGameClient().then(
      (c) => {
        this.client = c;
      },
      (e) => {
        console.error(e);
      }
    );
    this.authorizedAdmins = config?.authorizedAdmins ?? [];
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
  async restrealm() {
    const rr = config?.realmId
      ? await this.prealmapi.getRealm(config.realmId)
      : null;
    this.isRealm = !!(rr || isRealm === true);
    return rr;
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
      this.fmplayers.push({ name: playerName, lastfm: lastFM });
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

  get whitelist() {
    this._whitelist = JSON.parse(readFileSync("./whitelist.json").toString());
    return this._whitelist;
  }
  set whitelist(value) {
    this._whitelist = value;
    writeFileSync("./whitelist.json", JSON.stringify(value, null, 4));
  }
  xbotAuth() {
    return new Promise((resolve, reject) => {
      if (!config.xbotToken) {
        let nokey_error = 'Error: no xbot api key, get one at https://x-bot.live and add to config.json under "xbotToken"';
        console.error(nokey_error);
        reject(nokey_error);
      }

      var xbotconfig = {
        method: "get",
        maxBodyLength: Infinity,
        url: "https://x-bot.live/api/postman/auth?relyingParty=https%3A%2F%2Fpocket.realms.minecraft.net%2F",
        headers: {
          Authorization: config.xbotToken,
        },
      };
      axios(xbotconfig)
        .then(function (response) {
          let jsonData = response.data;
          resolve(`XBL3.0 x=${jsonData.userHash};${jsonData.XSTSToken}`);
        })
        .catch(function (error) {
          console.error(error);
          reject(error);
        });
    });
  }
  async numActivePlayers() {
    const rest_realm = this?.restrealm ? await this?.restrealm() : null;
    if (rest_realm) {
      const np = rest_realm.players?.filter((e) => e.online).length;
      return np;
    }
  }
  async sendOnlineEmbed() {
    const fancyStartMSG = fancyMSG(
      `**${config.worldName}'s chat has been bridged with Discord**`,
      "#139dbf",
      "RealmsCord: Phoenix",
      conceptArt
    );
    this.discordClient.channels
      .fetch(config.channelId)
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
  /**
   * @param {string} useLanguage
   * @param {string} useVersion
   * @param {string} content
   */
  async runCode(useLanguage, useVersion, content) {
    let data = JSON.stringify({
      language: useLanguage,
      version: useVersion,
      files: [
        {
          content: content,
        },
      ],
      compile_timeout: 10000,
      run_timeout: 10000,
      compile_memory_limit: -1,
      run_memory_limit: -1,
    });

    let requestData = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://emkc.org/api/v2/piston/execute",
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };

    try {
      const response = await axios(requestData);
      const output = response?.data?.run?.output || "No output.";
      return `\`\`\`\n${output}\n\`\`\``;
    } catch (error) {
      console.log(error);
      return "An error occurred while executing the code.";
    }
  }
  onStartup() {
    // Minecraft client logic (Packet listeners)
    try {
      setTimeout(() => {
        this.client.on(
          "text",
          (
                    /** @type {{ source_name: any; type: any; message: string | any[]; parameters: any[]; parameters_length: number; }} */ packet
          ) => {
            if (packet?.source_name === this.client.username) {
              return;
            }
            try {
              switch (packet.type) {
                case textPacketTypes[1]: // "translation" text packet
                  try {
                    console.log(
                      "Translation packet message: " + packet.message
                    );
                    if (packet.parameters) {
                      console.log(
                        "Translation packet params: " +
                        JSON.stringify(packet.parameters)
                      );
                    }
                    this.handleTranslation(
                      packet.message.toString(),
                      packet?.parameters_length,
                      packet?.parameters,
                      packet
                    );
                  } catch (e) {
                    console.log(e);
                  }
                  break;
                case textPacketTypes[0]: // "chat" text packet {
                  try {
                    let prefixes = [this.prefix, "."];
                    let parsed = handleCSZE(packet?.message);
                    if (packet?.message?.length > 0 &&
                      prefixes?.includes(parsed.message[0]) &&
                      commandNames.includes(
                        parsed.message.split(" ")[0].slice(1)
                      )) {
                      this.handleCommand(
                        packet?.source_name,
                        parsed.message.slice(1)
                      );
                    } else {
                      this.handleMCMessage({
                        sender: packet?.source_name,
                        message: packet?.message,
                      });
                      if (typeof openai !== "undefined" &&
                        panTest(parsed.message)) {
                        this.panHandle(packet.source_name, parsed.message);
                      }
                    }
                  } catch (e) {
                    console.log(e);
                  }
                  break;
                case textPacketTypes[6]: // "whisper" text packet
                case textPacketTypes[7]: // "announcement" text packet
                  try {
                    this.handleMCMessage({
                      sender: packet?.source_name,
                      message: packet?.message,
                    });
                  } catch (e) {
                    console.log(e);
                  }
                  break;
                case textPacketTypes[8]: // "JSON Whisper" text packet
                case textPacketTypes[9]: // "JSON" text packet
                case textPacketTypes[10]: // "JSON Announcement" text packet
                  OPO("Got a", `${packet.type} text packet:`, packet.message);
                  break;
                default: // Popup, Jukebox Popup, Tip, System, Raw
                  if (logpaknames === 1) {
                    OPO("Text packet was", packet.type, "type");
                  }
              }
            } catch (e) {
              console.log(e);
            }
          }
        );
        this.client.on(
          "player_list",
          async (
                    /** @type {{ records: { type: string; records_count: any; records: any[]; }; }} */ packet
          ) => {
            try {
              let wasJoin = packet.records.type === "add";
              let plrs = packet.records.records_count;
              for (const i of Array(plrs).keys()) {
                try {
                  let thisPlayer = packet.records.records[i];
                  let pData = !!wasJoin
                    ? await this.addPlayer(thisPlayer)
                    : this.players[thisPlayer.uuid];
                  // console.log(`Player connecting, data:${packet.records.records[ i ]}}`);
                  let pName = (await pData?.username) ??
                    `Unknown Player: ${thisPlayer.uuid}`;
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
        );
        this.client.on("disconnect", async () => {
          console.log("Got disconnect packet");
          try {
            setTimeout(async () => {
              const processNameOrId = "phoenix";
              restart(processNameOrId, (err, proc) => {
                if (err) {
                  console.error(`Failed to restart process: ${err}`);
                } else {
                  console.log(`Process restarted: ${JSON.stringify(proc)}`);
                }
              });
              this.reset();
            }, 10000);
          } catch (e) {
            console.log(
              `Unexpected error in DiscBot disconnect packet event handler: ${e}`
            );
          }
        });
        this.client.on(
          "packet",
          (/** @type {{ data: { name: any; }; }} */ packet) => {
            logOrIgnore(packet.data.name);
          }
        );
        this.client.on("spawn", () => {
          this.connectionReady = true;
          this.sendStartupMessage()
            .then(() => this.sendOnlineEmbed().then(() => {
              console.log("Startup messages deployed to discord/mc");
            })
            )
            .catch((e) => console.log(e));
        });
      }, 5000);
    } catch (e) {
      console.log(`Unexpected error in DiscBot startup event: ${e}`);
    }
    // Discord Client Logic
    const discordClient = this.discordClient;
    discordClient.login(discordToken);
    this.discordClient.on("ready", async () => {
      console.info(
        "RealmsCord: Phoenix - Discord client ready, setting activity..."
      );
      this.discordClient.user.setActivity(`over ${config.worldName}`, {
        type: 3,
      });
      console.info(
        `RealmsCord: Phoenix - Activity set.Connected to Discord as ${this.discordClient.user.username}`
      );
      this.sendOnlineEmbed();
    });
    this.discordClient.on("messageCreate", async (message) => {
      try {
        if (message?.author?.bot) {
          return;
        }
      } catch (e) {
        console.error(e);
      }
      const msgAuthor = message?.author?.username ?? "";
      try {
        // Stop early if the message isn't in our bot channel
        if (message.channel.id !== config.channelId) {
          return;
        }
        // Make sure it's not a message we just sent, an empty string, undefined, or authorless
        if (!(
          message.author.id === config.clientId ||
          message.content.length === 0 ||
          [null, undefined, ""].includes(msgAuthor)
        )) {
          console.log(
            `Debug: Discord message from ${message.author.id}: ${message.content}`
          );
          this.handleDiscordMessage(message);
        }
      } catch (e) {
        console.log(e);
      }
    });
    this.discordClient.on("interactionCreate", async (interaction) => {
      //console.log(orange("Received discord interaction"))
      if (!interaction.isCommand()) return;
      //console.log(orange(`Interaction was command. Command name: ${interaction.commandName}`))
      await interaction.deferReply({
        ephemeral: false,
      });
      const { commandName } = interaction;
      if (commandName === "sendcmd") {
        try {
          let cmdResponse = "";
          if (!this.authorizedAdmins.includes(interaction.user.id)) {
            const fancyResponse = fancyMSG(
              `Sorry ${interaction.user.username}, you aren't authorized to use this command.`,
              interaction.user.username,
              null,
              null,
              "#dd0000"
            );
            return await interaction
              .reply({
                embeds: [fancyResponse],
                ephemeral: true,
              })
              .catch((error) => {
                console.error(error);
              });
          }
          try {
            this.dispatchCommand(interaction.options.get("input"));
            cmdResponse = "Command execution successful.";
          } catch (error) {
            console.error("Error executing command: ", error);
            cmdResponse = `Command execution failed.\nDetails: ${error.message}`;
          }
          const fancyResponse = fancyMSG(
            `${cmdResponse}`,
            interaction.user.username,
            `${config.worldName}`
          );
          await interaction
            .editReply({
              embeds: [fancyResponse],
            })
            .catch((error) => {
              console.error(error);
            });
        } catch (e) {
          console.log(
            `Unexpected error in DiscBot sendcmd interaction handler: ${e}`
          );
          await interaction.editReply({
            content: `An unexpected error occurred. Check the log for details.`,
          });
        }
      } else if (commandName === "whitelist") {
        try {
          if (!this.authorizedAdmins.includes(interaction.user.id)) {
            await interaction.editReply(
              "You are not authorized to use this command."
            );
            return;
          } else {
            const operationResult = await this.addToWhitelist(
              interaction.options.get("player")
            );
            let outcomeString = operationResult;
            await interaction.editReply({
              content: outcomeString,
            });
            return true;
          }
        } catch (e) {
          console.log(
            `Unexpected error in DiscBot whitelist interaction handler: ${e}`
          );
          await interaction.editReply({
            content: `An unexpected error occurred. Check the log for details.`,
          });
        }
      } else if (commandName === "unwhitelist") {
        try {
          if (!this.authorizedAdmins.includes(interaction.user.id)) {
            await interaction.editReply(
              "You are not authorized to use this command."
            );
          } else {
            const operationResult = await this.removeFromWhitelist(
              interaction.options.get("player")
            );
            await interaction.editReply({
              content: operationResult,
            });
          }
        } catch (e) {
          console.log(
            `Unexpected error in DiscBot unwhitelist interaction handler: ${e}`
          );
          await interaction.editReply({
            content: `An unexpected error occurred. Check the log for details.`,
          });
        }
      } else if (commandName === "list") {
        const API = RealmAPI.from(this.flow, "bedrock");
        const rr = await API.getRealm(config?.realmId);
        const usr = interaction.user.username;
        const plrs = rr.players;
        let OP = plrs.filter((e) => {
          return e.online;
        });
        const nplrs = OP.length;
        let pNames = [];
        OP.forEach((e) => {
          let tmmp = Object.values(this.players).filter(
            (p) => p.xbox_user_id == e.uuid
          );
          pNames.push(
            `${tmmp[0].username}\n(${getDevice(tmmp[0].build_platform)})\n`
          );
        });
        let sendMsg = `__${nplrs} Players Online:__\n\n` + pNames.join("\n");
        let sendTitle = `${usr} used /list`;
        const fancyResponse = fancyMSG(sendMsg, usr, sendTitle);
        await interaction
          .editReply({
            embeds: [fancyResponse],
          })
          .catch((error) => {
            console.error(error);
          });
      } else if (commandName === "getxuid") {
        let pname = `${interaction.options.get("name")}`;
        let targetPlayer = await this.getPlayerByUsername(pname);
        let cmdResponse = targetPlayer == null
          ? `Sorry, I can't find this player: ${pname}`
          : `Name: ${pname}\nXUID: ${targetPlayer.xbox_user_id}`;
        const usr = interaction.user.username ?? "";
        const fancyResponse = fancyMSG(
          cmdResponse,
          usr,
          usr ? "/getxuid" : `${usr} used /getxuid`
        );
        await interaction
          .editReply({
            embeds: [fancyResponse],
          })
          .catch((error) => {
            console.error(error);
          });
      } else if (commandName === "byefelecia") {
        try {
          if (!this.authorizedAdmins.includes(interaction.user.id)) {
            const fancyResponse = fancyMSG(
              `Sorry ${interaction.user.username}, you aren't authorized to use this command.`,
              interaction.user.username,
              null,
              null,
              "#dd0000"
            );
            return await interaction
              .editReply({
                embeds: [fancyResponse],
              })
              .catch((error) => {
                console.error(error);
              });
          }
        } catch (e) {
          console.error(e);
        }
        try {
          let felecia = interaction.options.get("felecia");
          let pxuid = parseInt(felecia.user?.id ?? null);
          if (isNaN(pxuid)) {
            let _p = await this.getPlayerByUsername(felecia);
            pxuid = _p.xbox_user_id;
          } else {
            let _p = await this.getPlayerByXuid(pxuid);
            if (!_p) {
              console.error(
                "Warning: felecia not found for input: " + `${felecia}`
              );
              pxuid = 0;
            }
          }
          let pName = "them";
          if (typeof pxuid === "string" ? parseInt(pxuid) : pxuid > 1) {
            let _plr = await this.getPlayerByXuid(pxuid);
            pName = _plr.username ?? "them";
          }
          this.xbotAuth().then(
            (xbotauth) => {
              var byeconfig = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://pocket.realms.minecraft.net/worlds/13036820/blocklist/${pxuid}`,
                headers: {
                  "Cache-Control": "no-cache",
                  Charset: "utf-8",
                  "Client-Version": "1.19.60",
                  "User-Agent": "MCPE/UWP",
                  "Accept-Language": "en-US",
                  "Accept-Encoding": "gzip, deflate, br",
                  Host: "pocket.realms.minecraft.net",
                  Authorization: xbotauth,
                },
              };
              axios(byeconfig)
                .then(async function () {
                  const fancyResponse = fancyMSG(
                    `__Result__: **Yote Felecia into the void**\n\nI don't think we'll be seeing ${pName} again any time soon...`,
                    interaction.user.username,
                    "Fare Thee Well, Felecia!",
                    null,
                    "#00FF00"
                  );
                  return await interaction
                    .editReply({
                      embeds: [fancyResponse],
                    })
                    .catch((error) => {
                      console.error(error);
                    });
                })
                .catch(async function () {
                  const fancyResponse = fancyMSG(
                    `__Result__: **Utter failure**\n\nFailed to yeet ${felecia} into the void, check the log for details.`,
                    interaction.user.username,
                    "Hmm. Well shit.",
                    null,
                    "#00FF00"
                  );
                  return await interaction
                    .editReply({
                      embeds: [fancyResponse],
                    })
                    .catch((error) => {
                      console.error(error);
                    });
                });
            },
            (error) => {
              console.error(error);
            }
          );
        } catch (error) {
          console.error(error);
        }
      }
    });
  }
  async getOnlinePlayerList() {
    const API = RealmAPI.from(this.flow, "bedrock");
    const rr = await API.getRealm(config?.realmId);
    const plrs = rr.players;
    let OP = plrs.filter((e) => {
      return e.online;
    });
    let pNames = [];
    OP.forEach((e) => {
      let tmmp = Object.values(this.players).filter(
        (p) => p.xbox_user_id == e.uuid
      );
      pNames.push(`${tmmp[0].username}`);
    });
    return pNames;
  }
  /**
   * @param {any} sender
   * @param {string | Iterable<any> | ArrayLike<any>} rawCmdMessage
   */
  async handleCommand(sender, rawCmdMessage) {
    let chrs = Array.from(rawCmdMessage);
    for (const i of Array(chrs.length).keys()) {
      if (chrs[i].charCodeAt() - chatOffset < 256 &&
        chrs[i].charCodeAt() - chatOffset > 2) {
        let cc = chrs[i].charCodeAt(0);
        chrs[i] = String.fromCharCode(cc - chatOffset);
      }
    }
    let cmdMessage = chrs.join("");
    try {
      let cmd = cmdMessage.split(" ")[0];
      let cmdArgs = cmdMessage.split(" ").slice(1);
      let commandIndex = commandRegistry[cmd];
      console.log(
        `DEBUG: cmd = ${cmd}, cmdArgs = <${typeof cmdArgs}> ${cmdArgs}, commandIndex = ${commandIndex}`
      );
      switch (commandIndex) {
        case 0:
          if (cmdArgs.length === 0) {
            this.broadcast(
              `tonether: ${sender}, there are no coords to convert!`
            );
          } else {
            const coords = [];
            let coord = "";
            for (coord of cmdArgs) {
              if (!parseInt(coord)) {
                continue;
              }
              const ncoord = parseInt(coord) / 8;
              const resultcoords = ncoord.toString();
              coords.push(resultcoords);
            }
            this.broadcast(
              `${sender}, here are the converted nether coordinates: ${coords.join(
                " "
              )}`,
              this.client.username
            );
          }
          break;
        case 1:
          if (cmdArgs.length === 0) {
            this.broadcast(
              `fromnether: ${sender}, there are no coords to convert!`
            );
          } else {
            const coords = [];
            let coord = "";
            for (coord of cmdArgs) {
              if (!parseInt(coord)) {
                continue;
              }
              const ncoord = parseInt(coord) * 8;
              coords.push(ncoord.toString());
            }
            this.broadcast(
              `${sender}, Here are the converted overworld coordinates: ${coords.join(
                " "
              )}`,
              this.client.username
            );
          }
          break;
        case 2:
          console.log("Detected fm command");
          if (cmdArgs.length == 0) {
            const playerFM = this.getLastFM(sender);
            if (!playerFM) {
              this.broadcast(
                `${sender}, to use this feature, set your LastFM username with "${this.prefix}fm set <username>"`,
                this.client.username
              );
              return;
            }

            // Make the axios request
            axios
              .get(`https://fm.djstomp.win/${playerFM}`)
              .then(async (response) => {
                const responseText = response.data;
                if (responseText.startsWith("Error")) {
                  if (responseText.includes("404")) {
                    this.broadcast(
                      `${sender}, no such LastFM username was found. Please double-check your username.`,
                      this.client.username
                    );
                  } else {
                    this.broadcast(
                      `${sender}, an unknown error occurred. Please try again later.`,
                      this.client.username
                    );
                  }
                } else {
                  const nowPlaying = `${sender}: ${responseText}`;
                  this.broadcast(
                    "[TectonixFM] " + nowPlaying,
                    this.client.username
                  );
                  try {
                    let embedMsg = fancyMSG(nowPlaying, sender, "[TectonixFM]");
                    this.discordClient.channels
                      .fetch(config.channelId)
                      .then(async (channel) => {
                        if (channel instanceof TextChannel) {
                          await channel.send({
                            embeds: [embedMsg],
                          });
                        } else {
                          console.error(
                            "Fetched channel is not a text channel."
                          );
                        }
                      })
                      .catch((error) => {
                        console.error(error);
                      });
                  } catch (errorMsg) {
                    console.error(errorMsg);
                  }
                }
              })
              .catch(async (error) => {
                console.error("Error while making the request:", error);
                this.broadcast(
                  `${sender}, an error occurred while processing your request. Please try again later.`,
                  this.client.username
                );
              });
          } else {
            if (cmdArgs.length !== 2 ||
              (cmdArgs[0].toLowerCase() !== "set" &&
                cmdArgs[0].toLowerCase() !== "add")) {
              this.broadcast(
                `Usage: "${this.prefix}fm" or "${this.prefix}fm set <username>"`,
                this.client.username
              );
            } else {
              this.updatePlayerFM(sender, cmdArgs[1]);
              this.broadcast(
                `${sender}, your LastFM username has been updated successfully.`,
                this.client.username
              );
            }
          }
          break;
        case 3:
          if (cmdArgs.length === 0) {
            await this.sendCodeResult(
              `py: ${sender}, there is no code to run!`,
              sender
            );
          } else {
            try {
              let srcCode = cmdArgs.join(" ");
              const codeResponse = await this.runCode(
                "python",
                "3.10.0",
                srcCode
              );
              await this.sendCodeResult(
                `[python > ${sender}] ${codeResponse}`,
                sender
              );
            } catch (codeError) {
              await this.sendCodeResult(
                `[python > ${sender}] An error occurred while executing the code: ${codeError.message}`,
                sender
              );
            }
          }
          break;
        case 4:
          if (cmdArgs.length === 0) {
            await this.sendCodeResult(
              `js: ${sender}, there is no code to run!`,
              sender
            );
          } else {
            try {
              let srcCode = cmdArgs.join(" ");
              const codeResponse = await this.runCode(
                "javascript",
                "18.15.0",
                srcCode
              );
              await this.sendCodeResult(
                `[python > ${sender}] ${codeResponse}`,
                sender
              );
            } catch (codeError) {
              await this.sendCodeResult(
                `[python > ${sender}] An error occurred while executing the code: ${codeError.message}`,
                sender
              );
            }
          }
          break;
      }
    } catch (e) {
      console.log(e);
    }
  }
  async sendStartupMessage() {
    console.log(
      green(
        "Connection is (hopefully) ready! Attempting to send welcome message..."
      )
    );
    try {
      this.broadcast(welcomeMessage, this.client.username);
    } catch (e) {
      console.log(red(`Caught an error: ${e}`));
      console.log(
        orange("Handling error: Waiting 10 seconds and trying again...")
      );
      setTimeout(() => {
        this.sendStartupMessage();
      }, 10000);
    }
  }
  // Move along, nothing to see here
  /**
   * @param {any} pName
   */
  async greetPlayer(pName) {
    setTimeout(() => {
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: config?.botName ?? "Tectonix",
        xuid: "",
        platform_chat_id: "",
        message: `###signal###(1) ${pName}`,
      });
    }, 10000);
    setTimeout(async () => {
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: config?.botName ?? "Tectonix",
        xuid: "",
        platform_chat_id: "",
        message: `###signal###(2) ${pName}`,
      });
    }, 17000);
  }
  async tryStartupMessage() {
    try {
      setTimeout(() => {
        if (this.connectionReady) {
          console.log(green("Connection is ready! Sending welcome message..."));
          this.sendStartupMessage();
        } else {
          console.log(
            orange(
              "Connection is not ready! Waiting 10 more seconds before trying again..."
            )
          );
          this.tryStartupMessage();
        }
      }, 10000);
    } catch (e) {
      console.log(red(`Unexpected error in DiscBot.tryStartupMessage: ${e}`));
    }
  }

  /**
   * @param {any} sender
   * @param {any} txt
   */
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
          let embedMsg = fancyMSG(rr, sender, "Tectonix [Pan]");
          this.discordClient.channels
            .fetch(config.channelId)
            .then((channel) => {
              // Check if the channel is a TextChannel, DMChannel, or NewsChannel
              if (channel instanceof TextChannel ||
                channel instanceof DMChannel ||
                channel instanceof NewsChannel) {
                channel
                  .send({
                    embeds: [embedMsg],
                  })
                  .catch((error) => console.error("Error sending message:", error)
                  );
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
          let embedMsg = fancyMSG(
            `${sender}: Sorry, Pan is currently unavailable`,
            sender,
            "Tectonix [Pan]"
          );
          this.discordClient.channels
            .fetch(config.channelId)
            .then((channel) => {
              if (channel instanceof TextChannel ||
                channel instanceof DMChannel ||
                channel instanceof NewsChannel) {
                channel
                  .send("Your message here")
                  .then((/** @type {{ content: any; }} */ message) => console.log(`Sent message: ${message.content}`)
                  )
                  .catch((error) => console.error("Error sending message:", error)
                  );
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
  // Parse messages coming from the game chat and relay to discord
  /**
   * @param {{ sender: any; message: any; }} packet
   */
  async handleMCMessage(packet) {
    let msg = await packet.message;
    let parsed = handleCSZE(msg);
    let plrmsg = parsed.message;
    let em_img = parsed.img;

    POP("Game chat: message from", `${packet?.sender}:`, plrmsg);
    try {
      let playerMessage = "";
      let sender = packet?.sender ?? "";
      // Handles messages where the player used /me
      if (!sender) {
        playerMessage += "<**$" + plrmsg.slice(2) + "**>";
      } else {
        playerMessage += "<**" + sender + "**> " + plrmsg;
      }
      let embedMsg = fancyMSG(
        playerMessage.replace(/[\n]+/gim, "\n"),
        sender,
        null,
        em_img
      );
      await this.discordClient.channels
        .fetch(config.channelId)
        .then((channel) => {
          if (channel instanceof TextChannel ||
            channel instanceof DMChannel ||
            channel instanceof NewsChannel) {
            channel
              .send({ embeds: [embedMsg] })
              .catch((error) => console.error("Error sending message:", error));
          } else {
            console.error("Fetched channel is not a text-based channel.");
          }
        })
        .catch((error) => {
          console.error(error);
        });
    } catch (er) {
      console.error(er.message);
    }
  }
  /**
   * @param {string} rawMessage
   * @param {any} packet
   */
  async handleTranslation(rawMessage, paramLength = 0, params = [], packet) {
    // TODO: Implementation
    try {
      let action;
      switch (findFirstMatch(rawMessage)) {
        case 0: // Sleeping
        case 1: // Changing skins
          action = "Ignored";
          break;
        case 2: // Leave event
          console.log(
            "leave event " + rawMessage + (paramLength > 0 ? params : "")
          );
          action = "Leave";
          break;
        case 3: // Join event
          action = "Join";
          console.log(
            purple("join event " + rawMessage + (paramLength > 0 ? params : ""))
          );
          break;
        case 4: // Death event
          console.log(
            "death event " + rawMessage + (paramLength > 0 ? params : "")
          );
          await this.onPlayerDeath(packet);
          break;
        default: // No match
          action = "Unhandled";
      }
      console.log(`handleTranslation event: on${action}`);
    } catch (e) {
      console.log(red(`Unexpected error in DiscBot.handleTranslation: ${e}`));
    }
  }
  /**
   * @param {{ message: any; parameters: string | any[]; xuid: any; }} packet
   */
  async onPlayerDeath(packet) {
    try {
      const rawEvent = packet.message;
      let deadPlayer = "unknown player";
      if (packet.parameters) {
        deadPlayer = packet.parameters[0];
      }
      let killer = "";
      if (packet.parameters.length > 1) {
        killer = packet.parameters[packet.parameters.length - 1];
      }
      console.log(
        `Death message: ${packet.message}  deadPlayer: <${deadPlayer}> xuid (${packet.xuid})`
      );
      console.log(
        `Parameters: ${Object.keys(packet?.parameters ?? []).join(
          " "
        )}, ${JSON.stringify(packet?.parameters ?? {})}`
      );
      let deathArgs = {
        player: deadPlayer,
        cause: rawEvent,
        killer: killer,
      };
      let formattedString = playerDied(deathArgs);
      console.log(formattedString);
      let embedMsg = fancyMSG(formattedString, deadPlayer);
      await this.discordClient.channels
        .fetch(config.channelId)
        .then((channel) => {
          if (channel instanceof TextChannel ||
            channel instanceof DMChannel ||
            channel instanceof NewsChannel) {
            channel
              .send({ embeds: [embedMsg] })
              .catch((error) => console.error("Error sending message:", error));
          } else {
            console.error("Fetched channel is not a text-based channel.");
          }
        })
        .catch((error) => {
          console.error(error);
        });
    } catch (e) {
      console.log(`Error handling player death: ${e.message}`);
    }
  }
  /**
   * @param {{ entity_unique_id: { toString: () => any; }; platform_chat_id: any; is_teacher: any; is_host: any; skin_data: any; build_platform: { toString: () => any; }; uuid: string | number; }} record
   */
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
  /**
   * @param {import("discord.js").CommandInteractionOption<import("discord.js").CacheType>} playerName
   */
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
  /**
   * @param {any} playerName
   */
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
  /**
   * @param {any} playerName
   */
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
  /**
   * @param {import("discord.js").CommandInteractionOption<import("discord.js").CacheType>} playerName
   */
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
  /**
   * @param {string | import("discord.js").CommandInteractionOption<import("discord.js").CacheType>} pName
   */
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
  /**
   * @param {number} PXUID
   */
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
  // Send a discord message when players join or leave
  /**
   * @param {any} pName
   */
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
      let joinMessage = `${pName} has ${action} ${config.worldName}`;
      let embedMsg = fancyMSG(joinMessage, msgColor);
      console.log(green(joinMessage));
      await this.discordClient.channels
        .fetch(config.channelId)
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
  // Parse messages coming from discord
  /**
   * @param {import("discord.js").Message<boolean>} message
   */
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

  fmHandler() { }

  /**
   * @param {string} codeOutput
   */
  async sendCodeResult(codeOutput, sender = null) {
    console.log("SendCodeResult: ", codeOutput, sender);
    try {
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: this.client.username,
        xuid: "",
        platform_chat_id: "",
        message: codeOutput,
      });
    } catch (error) {
      console.log(error);
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
      let embedMsg = fancyMSG(
        codeOutput.replace(/[\n]+/gim, "\n"),
        sender,
        "Code Output",
        messageColor
      );
      await this.discordClient.channels
        .fetch(config.channelId)
        .then(async (channel) => {
          if (channel instanceof TextChannel) {
            await channel.send({
              embeds: [embedMsg],
            });
          } else {
            console.error(
              "Fetched channel is not a text channel."
            );
          }
        })
        .catch((error) => {
          console.error(error);
        });
    } catch (error) {
      console.log(error);
    }
  }

  // Dispatch messages to the game chat
  /**
   * @param {string | Iterable<any> | ArrayLike<any>} messageEvent
   * @param {string} [msgAuthor]
   */
  async broadcast(messageEvent, msgAuthor) {
    let outputMessage = "";
    try {
      if (!(this.connectionReady)) {
        console.log(
          red(
            `Tried to broadcast to the realm/server before it was ready. \nCanceling message: ${messageEvent}`
          )
        );
        return;
      }
      let bot_name = config?.botName ?? this.client.username;
      if (![null, undefined, ""].includes(this.client?.username)) {
        bot_name = this.client.username;
      }
      let dt = new Date();
      let author = `\[Discord\]\ ${dt.toLocaleDateString().slice(0, 5)}${dt
        .toLocaleDateString()
        .slice(7, 9)} ${dt
          .toTimeString()
          .split(" ")[0]
          .split(":")
          .join(".")
          .replace(".", ":")}`;
      if (msgAuthor != "" && msgAuthor != this.client.username) {
        author += `\ <${msgAuthor}>`;
      } else {
        author = " ";
      }
      let msgOutput = "";
      for (let ea of Array.from(messageEvent)) {
        if (ea.match(/[a-z]/i)) {
          msgOutput += String.fromCharCode(ea.charCodeAt(0) + chatOffset);
        } else {
          msgOutput += ea;
        }
      }
      outputMessage = [author, msgOutput].join(" ");
      this.client.queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: bot_name,
        xuid: "",
        platform_chat_id: "",
        message: outputMessage,
      });
    } catch (e) {
      console.log(
        red(`Unexpected error in DiscBot.broadcast: ${e} ` + outputMessage)
      );
    }
  }
  /**
   * @param {string | import("discord.js").CommandInteractionOption<import("discord.js").CacheType>} command
   */
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
      let bot_name = config?.botName ?? this.client.username;
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
}
exports.DiscBot = DiscBot;
