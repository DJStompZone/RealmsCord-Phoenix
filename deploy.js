const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, guildId, token } = require('./config.json');

const commands = [
    new SlashCommandBuilder()
        .setName("sendcmd")
        .setDescription("Send a command to be executed on the realm")
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The command to send to the realm')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("whitelist")
        .setDescription("Add a player to the whitelist")
        .addStringOption(option =>
            option.setName('player')
                .setDescription('The player to whitelist')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("unwhitelist")
        .setDescription("Remove a player from the whitelist")
        .addStringOption(option =>
            option.setName('player')
                .setDescription('The player to remove from the whitelist')
                .setRequired(true)),
	new SlashCommandBuilder()
        .setName("getxuid")
        .setDescription("Lookup the XUID for a given player's gamertag")
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The gamertag of the player to lookup')
                .setRequired(true)),
	new SlashCommandBuilder()
        .setName("byefelecia")
        .setDescription("Yeet felecia into the void")
        .addStringOption(option =>
            option.setName('felecia')
                .setDescription('Name of the player to yeet')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("list")
        .setDescription("Lists the players currently online")
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
})();