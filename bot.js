const Discord = require("discord.js");
const client = new Discord.Client({
    intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS"],
    partials: ["GUILD_MEMBER", "MESSAGE", "REACTION"],
});

const config = require("./config.json");

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}.`);

    client.user.setActivity("with fire.", {type: "PLAYING"});
});

let just_joined = {};

function sendSystemMessage(template, member) {
    const channel = member.guild.channels.resolve(config.system_channel);
    if (channel && channel.type == "text") {
        channel.send(template
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

    // Hard coding all of this because I am lazy.
    just_joined[member.id] = true;
    setTimeout(() => {delete just_joined[member.id]}, 60 * 1000);
});

const gifs = [
    "https://tenor.com/view/the-simpsons-bart-simpson-whoops-go-in-and-out-gif-15009786",
    "https://tenor.com/view/the-simpsons-homer-simpson-bush-hide-im-out-gif-17449504",
    "https://tenor.com/view/oh-no-top-gear-jeremy-clarkson-no-one-cares-gif-18925814",
    "https://tenor.com/view/mouse-walkout-hi-there-bye-gif-14078209",
];

client.on("guildMemberRemove", member => {
    if (config.leave_message) sendSystemMessage(config.leave_message, member);
    if (just_joined[member.id]) sendSystemMessage(gifs[~~(Math.random() * gifs.length)], member);
});

client.login(config.token);
