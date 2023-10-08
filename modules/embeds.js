const {
    ActionRowBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder,
    TextInputStyle, ChannelType, ContextMenuCommandBuilder, ApplicationCommandType,
} = require("discord.js");

// Builds a form for embed content
function build_embed_modal(raw, embed) {
    const modal = new ModalBuilder()
        .setCustomId("embed_data");

    // Basic title, description, and color
    if (!raw) {
        const title = new TextInputBuilder()
            .setCustomId("embed_title")
            .setLabel("Title")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const content = new TextInputBuilder()
            .setCustomId("embed_content")
            .setLabel("Content")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const color = new TextInputBuilder()
            .setCustomId("embed_color")
            .setLabel("Color")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(7)
            .setMinLength(7)
            .setPlaceholder("#000000")
            .setRequired(false);

        // Fill in values for editing
        if (embed) {
            title.setValue(embed.title);
            content.setValue(embed.description);
            color.setValue("#" + embed.color.toString(16).padStart(6, "0"));
        }

        modal.addComponents(
            new ActionRowBuilder().addComponents(title),
            new ActionRowBuilder().addComponents(content),
            new ActionRowBuilder().addComponents(color),
        );
    } else {
        // Raw JSON string
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("embed_content_raw")
                .setLabel("Embed JSON (external editor recommended)")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setValue(embed ? JSON.stringify(embed) : "")
        ));
    }

    return modal;
}

// Convert modal result into embed
function parse_embed_modal(interaction) {
    return new Promise((resolve, reject) => {
        let embed;

        try {
            if (interaction.fields.fields.hasAny("embed_content_raw")) {
                embed = JSON.parse(interaction.fields.getTextInputValue("embed_content_raw"));
            } else {
                embed = {
                    color: parseInt(interaction.fields.getTextInputValue("embed_color").slice(1), 16),
                    title: interaction.fields.getTextInputValue("embed_title"),
                    description: interaction.fields.getTextInputValue("embed_content"),
                };
            }
        } catch (err) {
            return reject(err);
        }

        resolve(embed);
    });
}

function show_embed_modal(interaction, title, raw, embed) {
    return new Promise((resolve, reject) => {
        const modal = build_embed_modal(raw, embed);
        modal.setTitle(title);

        interaction.awaitModalSubmit({
            filter: modal_interaction => modal_interaction.customId === "embed_data",
            time: 15_000_000,
        }).then(resolve).catch(reject);

        interaction.showModal(modal);
    });
}

// Chatcommand to create embed in a channel
const command_create = (interaction) => {
    const target_channel = interaction.options.getChannel("channel");
    const raw = interaction.options.getBoolean("raw");

    show_embed_modal(interaction, `Create an embed for #${target_channel.name}`, raw).then(modal_interaction => {
        parse_embed_modal(modal_interaction).then(parsed => {
            target_channel.send({
                embeds: [parsed],
            }).then(message => {
                modal_interaction.reply({
                    content: `:white_check_mark: Embed created at ${message.url}`,
                    ephemeral: true,
                });
            }).catch((err) => {
                modal_interaction.reply({
                    content: `:warning: Error creating embed: \`${err}\``,
                    ephemeral: true,
                });
            });
        }).catch(err => modal_interaction.reply({
            content: `:warning: Error parsing embed content: \`${err}\``,
            ephemeral: true,
        }));
    });
}

// Context menu for editing embeds
const menu_edit = (interaction, raw) => {
    const message = interaction.targetMessage;

    // Only allow editing bot messages with embeds
    if (message.author.id !== interaction.client.user.id || message.embeds.length == 0) {
        return interaction.reply({content: ":no_entry: Cannot edit this message.", ephemeral: true});
    }

    show_embed_modal(interaction, `Edit embed in #${interaction.channel.name}`, raw, message.embeds[0]).then(modal_interaction => {
        parse_embed_modal(modal_interaction).then(parsed => {
            message.edit({
                content: message.content,
                embeds: [parsed],
            }).then(message => {
                modal_interaction.reply({
                    content: `:white_check_mark: Embed at ${message.url} updated.`,
                    ephemeral: true,
                });
            }).catch((err) => {
                modal_interaction.reply({
                    content: `:warning: Error updating embed: \`${err}\``,
                    ephemeral: true,
                });
            });
        }).catch(err => modal_interaction.reply({
            content: `:warning: Error parsing embed content: \`${err}\``,
            ephemeral: true,
        }));
    });
};

module.exports = () => {return {
    commands: [
        [
            new SlashCommandBuilder()
                .setName("embed")
                .setDescription("Create a new embed in a channel")
                .setDMPermission(false)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .addChannelOption(option => option.setName("channel").setDescription("Target channel").setRequired(true)
                    .addChannelTypes(
                        ChannelType.AnnouncementThread,
                        ChannelType.GuildAnnouncement,
                        ChannelType.GuildText,
                        ChannelType.PrivateThread,
                        ChannelType.PublicThread
                    ))
                .addBooleanOption(option => option.setName("raw").setDescription("Use raw JSON")),
            command_create,
        ],
        [
            new ContextMenuCommandBuilder()
                .setName("Edit Embed")
                .setType(ApplicationCommandType.Message)
                .setDMPermission(false)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            (interaction) => menu_edit(interaction, false),
        ],
        [
            new ContextMenuCommandBuilder()
                .setName("Edit JSON")
                .setType(ApplicationCommandType.Message)
                .setDMPermission(false)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
            (interaction) => menu_edit(interaction, true),
        ],
    ],
}};
