const {Client, Collection, Events, GatewayIntentBits, Partials, REST, Routes} = require("discord.js");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.GuildMember, Partials.Message, Partials.Reaction],
});

const config = require("./config.json");

// Load modules
const fs = require("node:fs");
const path = require("node:path");

client.commands = new Collection();

const registry = [];
const do_register = process.argv.includes("--register");

const modulesPath = path.join(__dirname, "modules");

// Load all modules in path
for (const file of fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"))) {
    const exports = require(path.join(modulesPath, file))(client);

    if (exports) {
        if ("commands" in exports) {
            for (const command of exports.commands) {
                client.commands.set(command[0].name, command[1]);
                if (do_register) registry.push(command[0].toJSON());
            }
        }
    }

    console.log(`Loaded ${file}`);
}

// Listen for and respond to chat and context menu commands
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (command) {
            try {
                await command(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: ":exclamation: An error occured while executing this command.",
                        ephemeral: true,
                    });
                } else {
                    await interaction.reply({
                        content: ":exclamation: An error occured while executing this command.",
                        ephemeral: true,
                    });
                }
            }
        };
    }
});

client.login(config.token);

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}.`);
    client.user.setActivity("with fire.", {type: "PLAYING"});

    // Register bot commands
    if (do_register) {
        const rest = new REST().setToken(config.token);

        (async () => {
            try {
                process.stdout.write(`Registering ${registry.length} application (/) commands...`)
                const res = await rest.put(Routes.applicationCommands(client.application.id), {body: registry});
                process.stdout.write(` Done. ${registry.length - res.length} errors.\n`);
            } catch (error) {
                console.error(error);
            }
        })();
    }
});
