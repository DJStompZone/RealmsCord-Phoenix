const {
    EmbedBuilder
} = require("discord.js");
const {
    stringToColor
} = require('./utils');
const MessageEmbed = EmbedBuilder;


function fancyMSG(message, sender, title = null, image = null, embedColor = null) {
    let color = embedColor ?? "#000000";
    if (!!(sender)) {
        color = hexColor.test(sender) ? sender : stringToColor(sender);
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


module.exports = [fancyMSG]