const Discord = require("discord.js");
const client = new Discord.Client();

const config = require("./config.json");

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}.`);

    client.user.setActivity("with fire.", {type: "PLAYING"});
});

function sendSystemMessage(template, member) {
    const channel = member.guild.channels.resolve(config.system_channel);
    if (channel && channel.type == "text") {
        channel.send(template
                        .replace("$ID", member.id)
                        .replace("$NICKNAME", member.nickname)
                        .replace("$USERNAME", member.user.username)
                        .replace("$TAG", member.user.tag)
        );
    }
}

client.on("guildMemberAdd", member => {
    for (pattern of config.ban_patterns) {
        if (member.user.username.toLowerCase().match(new RegExp(pattern, "i"))) {
            member.ban({reason: "Pattern ban."});
            return;
        }
    }

    if (config.join_message) sendSystemMessage(config.join_message, member);
});

client.on("guildMemberRemove", member => {
    if (config.leave_message) sendSystemMessage(config.leave_message, member);
});

client.login(config.token);
