const { readFileSync, createWriteStream, existsSync } = require("fs");
const { format } = require("util");
const { EmbedBuilder, version } = require("discord.js");
console.log(`Using discord.js version ${version}`);
const { commandRegistry, stringToColor } = require("./utils");
const { DiscBot } = require("./DiscBot");
const { Configuration, OpenAIApi } = require("openai");
const curve = 'secp384r1';
const config = JSON.parse(readFileSync("./config.json").toString());
const MessageEmbed = EmbedBuilder;
const chatOffset = 10240;
const bootTimeDay = Math.floor(new Date().getTime() / 60 / 60000 / 24);
const todaysLog = `./logs/phoenix_${bootTimeDay.toString()}.log`;
const todaysErrorLog = `./logs/phoenix_err_${bootTimeDay.toString()}.log`;
const logAccess = createWriteStream(todaysLog, { flags: "a" });
const logErrorAccess = createWriteStream(todaysErrorLog, { flags: "a" });
const discordToken = config.token;
const realmid = config?.realmId ?? null;
const serverIp = config?.serverIp ?? null;
const isRealm = !!realmid && !serverIp;
const worldName = config?.worldName ?? null;
let lastLogMessage = "";


console.log = function (d) {
  let now = new Date();
  let log_format = `[${now.toTimeString().split(" ")[0]}] ` + format(d) + "\n";
  lastLogMessage = log_format;
  logAccess.write(log_format);
  process.stdout.write(log_format);
};

process.stderr.write = logErrorAccess.write.bind(logErrorAccess);

process.on("uncaughtException", function (err) {
  let now = new Date();
  console.log(err && err.stack ? err.stack : err);
  let log_format = `[${now.toTimeString().split(" ")[0]}] ` + format(err && err.stack ? err.stack : err) + "\n";
  logErrorAccess.write(log_format);
  lastLogMessage = log_format;
});

/**
 * @param {string} message
 * @param {string} sender
 * @param {string|null} [title]
 * @param {string|null} [image]
 * @param {import("discord.js").ColorResolvable|null} [embedColor]
*/
const fancyMSG = function (
  message,
  sender,
  title = null,
  image = null,
  embedColor = null
) {
  let _color = embedColor ?? "#000000";
  let color = stringToColor(_color.toString());
  if (!!sender) {
    color = stringToColor(sender);
  }
  const newEmbed = new MessageEmbed().setColor(color).setDescription(message);
  if (title) {
    newEmbed.setTitle(title);
  }
  if (image) {
    newEmbed.setImage(image);
  }
  return newEmbed;
}

exports.dontDoAutomod = true; // Don't use no double negatives
exports.fancyMSG = fancyMSG;
const commandNames = Object.keys(commandRegistry);
exports.initialize = () => {
  const bot = new DiscBot();
  bot.onStartup();
  return bot;
};


exports.loadOpenAI = function () {
  let apiKey;
  try {
    if (existsSync("./openaikey")) {
      apiKey = readFileSync("./openaikey", "utf8");
      const configuration = new Configuration({ apiKey });
      const openai = new OpenAIApi(configuration);
      exports.openai = openai;
      return apiKey;
    } else {
      console.warn("OpenAI API key not found, skipping...");
      return null;
    }
  } catch (err) {
    console.error("An error occurred while attempting to load OpenAI");
  }
}

exports.chatOffset = chatOffset;
exports.config = config;
exports.curve = curve;
exports.worldName = worldName;
exports.isRealm = isRealm;
exports.commandNames = commandNames;
exports.discordToken = discordToken;
exports.realmid = realmid;
exports.Configuration = Configuration;
exports.OpenAIApi = OpenAIApi;
exports.DiscBot = DiscBot;
