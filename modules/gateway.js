const config = require("../config.json").module_gateway;

let recent_joins = {};

function sendGatewayMessage(template, member) {
    const channel = member.guild.channels.resolve(config.channel);
    if (channel && channel.isTextBased()) {
        channel.send(template
                        .replace("$ID", member.id)
                        .replace("$NICKNAME", member.nickname)
                        .replace("$USERNAME", member.user.username)
                        .replace("$TAG", member.user.tag)
        );
    }
}

let join_pipeline = [];

// Pattern ban
join_pipeline.push((member) => {
    if (config.ban_patterns) {
        for (pattern of config.ban_patterns) {
            if (member.user.username.toLowerCase().match(new RegExp(pattern, "i"))) {
                member.ban({reason: "Pattern ban."});
                return true;
            }
        }
    }
})

// Join message
join_pipeline.push((member) => {
    if (config.join_message) {
        sendGatewayMessage(config.join_message, member);
    }
});

// Nevermind (how long do they stay)
join_pipeline.push((member) => {
    if (config.nevermind_timeout && config.nevermind_timeout > 0) {
        recent_joins[member.id] = true;
        setTimeout(() => {delete recent_joins[member.id]}, config.nevermind_timeout * 1000);
    }
});

let leave_pipeline = [];

// Leave message
leave_pipeline.push((member) => {
    if (config.leave_message) {
        sendGatewayMessage(config.leave_message, member);
    }
});

// Leave gif (if left quickly)
leave_pipeline.push((member) => {
    if (recent_joins[member.id]) {
        const msgs = config.nevermind_messages;
        if (msgs.length > 0) sendGatewayMessage(msgs[~~(Math.random() * msgs.length)], member);
    }
})

module.exports = client => {
    client.on("guildMemberAdd", member => {
        for (const stage of join_pipeline) {
            if (stage(member)) return;
        }
    });

    client.on("guildMemberRemove", member => {
        for (const stage of leave_pipeline) {
            if (stage(member)) return;
        }
    });
}
