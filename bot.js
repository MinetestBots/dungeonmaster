const Discord = require("discord.js");
const client = new Discord.Client();

const {ban_patterns, token} = require("./config.json");

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}.`);

    client.user.setActivity("with fire.", {type: "PLAYING"});
});

client.on("guildMemberAdd", member => {
    for (pattern of ban_patterns) {
        if (member.user.username.toLowerCase().match(new RegExp(pattern, "i"))) {
            member.ban({reason: "Pattern ban."});
        }
    }
});

client.login(token);
