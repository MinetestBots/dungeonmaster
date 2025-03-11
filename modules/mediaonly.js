const { blockQuote } = require("discord.js");

const config = require("../config.json").module_mediaonly;
const [channels, reply] = [config.channels, config.reply];

module.exports = client => {
    client.on("messageCreate", message => {
        // Delay 1 second to let embeds populate
        setTimeout(() => {
            if (!channels.includes(message.channelId)) return;
            if (message.attachments.first() || message.embeds.length > 0) return; // Attachments or embed is acceptable

            const snapshot = message.messageSnapshots.first(); // If forwarded message qualifies, also acceptable
            if (snapshot && (snapshot.attachments.first() || snapshot.embeds.length > 0)) return;

            let content = message.content; // For some reason discord.js doesn't include the snapshot URL
            if (snapshot && content == "") content = `https://discord.com/channels/${snapshot.guildId}/${snapshot.channelId}/${snapshot.id} (forwarded message)`;

            message.delete().then(() => {
                if (!reply) return;

                // Let sender know, and echo their message for convenience
                // Would rather do an in-channel ephemeral response, but cant do that without interactions
                message.author.createDM().then(dm => {
                    dm.send(reply.replace("$CHANNEL", message.channel.url).replace("$QUOTE", blockQuote(content)));
                });
            });
        }, 1000);
    });
}
