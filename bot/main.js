'use strict';

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const ConfigLoader = require('./config-loader');
const embeds = require('./embeds');
const axios = require('axios');

let config;

// Check for pending role assignments and assign verified roles
async function checkPendingRoleAssignments(client, config) {
    try {
        // Get pending role assignments from API
        const response = await axios.get('https://api.lennox-rose.com/v2/oauth2/discord/pending-roles', {
            headers: {
                'Authorization': `Bearer ${config.token}`
            }
        });

        const { pending } = response.data;
        
        if (!pending || pending.length === 0) {
            return;
        }

        console.log(`[INFO    ] Found ${pending.length} pending role assignment(s)`);

        const guild = client.guilds.cache.get(config.guild_id);
        if (!guild) {
            console.error('[ERROR   ] Guild not found:', config.guild_id);
            return;
        }

        for (const userId of pending) {
            try {
                console.log(`[INFO    ] Processing role assignment for user ID: ${userId}`);
                const member = await guild.members.fetch(userId);
                
                if (member) {
                    // Remove unverified role if set
                    if (config.unverified_role_id && member.roles.cache.has(config.unverified_role_id)) {
                        await member.roles.remove(config.unverified_role_id);
                        console.log(`[INFO    ] Removed unverified role from ${member.user.tag}`);
                    }
                    
                    // Add verified role
                    if (config.verified_role_id && !member.roles.cache.has(config.verified_role_id)) {
                        await member.roles.add(config.verified_role_id);
                        console.log(`[INFO    ] Gave verified role to ${member.user.tag}`);
                    }
                    
                    // Remove from pending list
                    await axios.delete('https://api.lennox-rose.com/v2/oauth2/discord/pending-roles', {
                        headers: {
                            'Authorization': `Bearer ${config.token}`,
                            'Content-Type': 'application/json'
                        },
                        data: { user_id: userId }
                    });
                    
                    console.log(`[INFO    ] Successfully processed role assignment for ${member.user.tag}`);
                } else {
                    console.log(`[WARN    ] Member not found in guild for user ID: ${userId}`);
                }
            } catch (err) {
                console.error(`[ERROR   ] Failed to assign role to ${userId}:`, err.message);
            }
        }
    } catch (error) {
        console.error('[ERROR   ] Error checking pending role assignments:', error.message);
        if (error.response) {
            console.error('[ERROR   ] API Response:', error.response.status, error.response.data);
        }
    }
}

// Initialize bot
(async () => {
    try {
        // Load config from API
        const configLoader = new ConfigLoader();
        config = await configLoader.load();
        
        console.log('[INFO    ] Config loaded from API');
        
        // Validate required config
        if (!config.token || config.token === 'YOUR_BOT_TOKEN_HERE') {
            console.error('[ERROR   ] Invalid bot token in settings');
            process.exit(1);
        }

        // Create Discord client
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
            ],
            partials: [Partials.Channel],
        });

        const commands = new Collection();

        // Load commands from ./commands/*.js
        const commandsDir = path.join(__dirname, 'commands');
        if (fs.existsSync(commandsDir)) {
            for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
                try {
                    const cmd = require(path.join(commandsDir, file));
                    const name = cmd && cmd.name;
                    if (!name || typeof cmd.execute !== 'function') {
                        console.warn(`[WARN    ] Skipping ${file}: missing name or execute()`);
                        continue;
                    }
                    commands.set(name.toLowerCase(), cmd);
                    if (Array.isArray(cmd.aliases)) {
                        for (const a of cmd.aliases) commands.set(String(a).toLowerCase(), cmd);
                    }
                    console.log(`[INFO    ] Loaded command: ${name}`);
                } catch (err) {
                    console.error(`[ERROR   ] Failed to load ${file}:`, err.message);
                }
            }
        }

        // Bot ready event
        client.once('clientReady', () => {
            console.log(`[INFO    ] Logged in as ${client.user.tag}`);
            console.log(`[INFO    ] Bot is in ${client.guilds.cache.size} servers`);
            console.log(`[INFO    ] Prefix: ${config.prefix}`);
            console.log(`[INFO    ] Main Server ID: ${config.guild_id || 'Not set'}`);
            console.log(`[INFO    ] Verified Role ID: ${config.verified_role_id || 'Not set'}`);
            console.log(`[INFO    ] Unverified Role ID: ${config.unverified_role_id || 'Not set'}`);
            
            // Start role assignment checker (every 10 seconds for faster response)
            if (config.guild_id && config.verified_role_id) {
                // Check immediately on startup
                checkPendingRoleAssignments(client, config);
                
                // Then check every 10 seconds
                setInterval(() => checkPendingRoleAssignments(client, config), 10000);
                console.log('[INFO    ] Role assignment checker started (checking every 10 seconds)');
            } else {
                console.log('[WARN    ] Role assignment checker NOT started - missing guild_id or verified_role_id');
            }
        });

        // Handle new members (give unverified role)
        client.on('guildMemberAdd', async (member) => {
            if (!config.guild_id || !config.unverified_role_id) return;
            if (member.guild.id !== config.guild_id) return;

            try {
                await member.roles.add(config.unverified_role_id);
                console.log(`[INFO    ] Gave unverified role to ${member.user.tag}`);
            } catch (error) {
                console.error(`[ERROR   ] Failed to give unverified role to ${member.user.tag}:`, error.message);
            }
        });

        // Handle prefix commands
        client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            const content = message.content || '';
            if (!content.startsWith(config.prefix)) return;

            const args = content.slice(config.prefix.length).trim().split(/\s+/);
            const cmdName = (args.shift() || '').toLowerCase();
            if (!cmdName) return;

            const command = commands.get(cmdName);
            if (!command) return;

            console.log(`[INFO    ] Executing command: ${command.name} by ${message.author.tag}`);

            try {
                await command.execute(message, args, { client, prefix: config.prefix, config, commands });
            } catch (err) {
                console.error(`[ERROR   ] Error in command ${command.name}:`, err);
                try {
                    await message.reply({ embeds: [embeds.error('Command Error', 'There was an error executing that command.')] });
                } catch (_) {}
            }
        });

        // Handle slash commands and interactions
        client.on('interactionCreate', async (interaction) => {
            const ctx = { client, prefix: config.prefix, config, commands };

            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const commandName = interaction.commandName;

                // /verify-embed command
                if (commandName === 'verify-embed') {
                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    
                    // Construct OAuth URL - use web_url and append /oauth2/ if needed
                    let webUrl = config.web_url || 'https://lennox-rose.com';
                    
                    // Ensure the URL ends with /oauth2/
                    if (!webUrl.includes('/oauth2')) {
                        webUrl = webUrl.replace(/\/$/, '') + '/oauth2/';
                    }

                    const embed = embeds.verification(webUrl);

                    const button = new ButtonBuilder()
                        .setLabel('Verify Account')
                        .setStyle(ButtonStyle.Link)
                        .setURL(webUrl)
                        .setEmoji('✅');

                    const row = new ActionRowBuilder()
                        .addComponents(button);

                    try {
                        await interaction.reply({
                            embeds: [embed],
                            components: [row]
                        });
                    } catch (err) {
                        console.error('[ERROR   ] Error sending verification embed:', err);
                        await interaction.reply({
                            embeds: [embeds.error('Failed to Send', 'Failed to send verification embed.')],
                            ephemeral: true
                        });
                    }
                }

                // /pullback command
                if (commandName === 'pullback') {
                    const apiCmd = commands.get('pullback');
                    if (apiCmd) {
                        const subcommand = interaction.options.getSubcommand();
                        const args = subcommand === 'user' ? [subcommand, interaction.options.getString('userid')] : [subcommand];

                        // Create a fake message object for compatibility
                        const fakeMessage = {
                            guild: interaction.guild,
                            channel: interaction.channel,
                            member: interaction.member,
                            author: interaction.user,
                            reply: async (content) => {
                                if (typeof content === 'string') {
                                    return interaction.reply({ content, ephemeral: false });
                                }
                                return interaction.reply({ ...content, ephemeral: false });
                            }
                        };

                        await interaction.deferReply();

                        try {
                            await apiCmd.execute(fakeMessage, args, ctx);
                        } catch (err) {
                            console.error('❌ Error in pullback command:', err);
                            await interaction.editReply({ embeds: [embeds.error('Command Error', 'An error occurred while executing the command.')] });
                        }
                    }
                }
            }
        });

        // Login to Discord
        await client.login(config.token);
        
    } catch (error) {
        console.error('[ERROR   ] Failed to start bot:', error.message);
        process.exit(1);
    }
})();
