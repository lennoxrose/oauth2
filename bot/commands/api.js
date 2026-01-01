'use strict';

const axios = require('axios');
const embeds = require('../embeds');

module.exports = {
  name: 'pullback',
  aliases: ['pull', 'invite'],
  description: 'Pull verified users back to this server',
  
  async execute(message, args, { client, config, embedLoader }) {
    const API_BASE = config.api_base_url;
    // Check if user has permission
    if (!message.member.permissions.has('Administrator') && message.author.id !== config.owner_id) {
      return message.reply({ embeds: [embeds.error('Permission Denied', 'You need Administrator permission to use this command.')] });
    }

    if (!message.guild) {
      return message.reply({ embeds: [embeds.error('Invalid Context', 'This command can only be used in a server.')] });
    }

    const subcommand = args[0]?.toLowerCase();

    // List all verified users
    if (subcommand === 'list' || !subcommand) {
      try {
        const response = await axios.get(`${API_BASE}/users`, {
          headers: {
            'Authorization': `Bearer ${config.api_secret}`
          }
        });
        const users = response.data.users;

        if (users.length === 0) {
          return message.reply({ embeds: [embeds.info('No Users', 'No verified users found.')] });
        }

        const embed = await embedLoader.loadEmbed('verified_users_list');
        if (!embed) {
          return message.reply({ embeds: [embeds.error('Embed Not Found', 'The verified users list embed has not been created in the panel.')] });
        }
        
        // Add user fields to embed
        users.slice(0, 25).forEach(u => {
          embed.addFields({
            name: `👤 ${u.username}${u.discriminator !== '0' ? '#' + u.discriminator : ''}`,
            value: `ID: ${u.user_id}\nVerified: <t:${Math.floor(new Date(u.verified_at).getTime() / 1000)}:R>`,
            inline: true
          });
        });

        return message.reply({ embeds: [embed] });
      } catch (err) {
        console.error('API Error:', err.message);
        console.error('Full error:', err.response?.data || err);
        return message.reply({ embeds: [embeds.error('API Error', `Failed to fetch verified users from API: ${err.message}`)] });
      }
    }

    // Pull a specific user
    if (subcommand === 'user') {
      const userId = args[1];
      if (!userId) {
        return message.reply({ embeds: [embeds.error('Missing User ID', 'Please provide a user ID: `pullback user <userId>`')] });
      }

      try {
        const response = await axios.get(`${API_BASE}/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${config.api_secret}`
          }
        });
        const userData = response.data.user;

        // Check if user is already in guild
        try {
          const member = await message.guild.members.fetch(userId);
          return message.reply({ embeds: [embeds.info('Already in Server', `${userData.username} is already in this server!`)] });
        } catch (err) {
          // User not in guild, try to add them
        }

        // Add user to guild
        try {
          const member = await message.guild.members.add(userId, {
            accessToken: userData.access_token
          });

          return message.reply({ embeds: [embeds.success('User Added', `Successfully pulled ${userData.username} back to the server!`)] });
        } catch (err) {
          console.error('Error adding member:', err);
          return message.reply({ embeds: [embeds.error('Failed to Add User', `Failed to pull ${userData.username}: ${err.message}\n\nNote: Access token might be expired.`)] });
        }
      } catch (err) {
        if (err.response?.status === 404) {
          return message.reply({ embeds: [embeds.error('User Not Found', 'User not found in verified database.')] });
        }
        console.error('API Error:', err.message);
        return message.reply({ embeds: [embeds.error('API Error', 'Failed to fetch user data from API.')] });
      }
    }

    // Pull all verified users
    if (subcommand === 'all') {
      try {
        const response = await axios.get(`${API_BASE}/users`, {
          headers: {
            'Authorization': `Bearer ${config.api_secret}`
          }
        });
        const users = response.data.users;

        if (users.length === 0) {
          return message.reply({ embeds: [embeds.info('No Users', 'No verified users to pull.')] });
        }

        await message.reply({ embeds: [embeds.info('Processing', `Attempting to pull ${users.length} verified users...`)] });

        let success = 0;
        let failed = 0;
        let alreadyIn = 0;

        // Fetch full user data for each user (to get access_token)
        for (const user of users) {
          try {
            // Check if already in guild
            const member = await message.guild.members.fetch(user.user_id).catch(() => null);
            if (member) {
              alreadyIn++;
              continue;
            }

            // Get full user data with access token
            const fullUserResponse = await axios.get(`${API_BASE}/users/${user.user_id}`, {
              headers: {
                'Authorization': `Bearer ${config.api_secret}`
              }
            });
            const fullUserData = fullUserResponse.data.user;

            // Try to add
            await message.guild.members.add(user.user_id, {
              accessToken: fullUserData.access_token
            });
            success++;
            
            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (err) {
            failed++;
            console.error(`Failed to add ${user.username}:`, err.message);
            
            // If OAuth token is invalid, remove user from database
            if (err.message.includes('Invalid OAuth2 access token')) {
              try {
                await axios.delete(`${API_BASE}/users/${user.user_id}`, {
                  headers: {
                    'Authorization': `Bearer ${config.api_secret}`
                  }
                });
                console.log(`Removed ${user.username} from database (invalid token)`);
              } catch (deleteErr) {
                console.error(`Failed to delete ${user.username}:`, deleteErr.message);
              }
            }
          }
        }

        const resultEmbed = await embedLoader.loadEmbed('pullback_results');
        if (!resultEmbed) {
          return message.reply({ embeds: [embeds.error('Embed Not Found', 'The pullback results embed has not been created in the panel.')] });
        }
        
        // Load custom emojis
        const customEmojis = await embedLoader.loadEmojis();
        
        // Replace placeholders in description and fields
        let embedData = resultEmbed.toJSON();
        
        // Replace placeholders in description
        if (embedData.description) {
          embedData.description = embedData.description
            .replace(/\{success\}/g, success.toString())
            .replace(/\{failed\}/g, failed.toString())
            .replace(/\{already_in\}/g, alreadyIn.toString());
        }
        
        // Replace placeholders in fields
        if (embedData.fields) {
          embedData.fields = embedData.fields.map(field => ({
            ...field,
            name: field.name
              .replace(/\{success\}/g, success.toString())
              .replace(/\{failed\}/g, failed.toString())
              .replace(/\{already_in\}/g, alreadyIn.toString()),
            value: field.value
              .replace(/\{success\}/g, success.toString())
              .replace(/\{failed\}/g, failed.toString())
              .replace(/\{already_in\}/g, alreadyIn.toString())
          }));
        }

        return message.reply({ embeds: [embedData] });
      } catch (err) {
        console.error('API Error:', err.message);
        return message.reply({ embeds: [embeds.error('API Error', 'Failed to fetch verified users from API.')] });
      }
    }

    // Invalid subcommand
    return message.reply({ embeds: [embeds.info('Usage', 'Available commands:\n• `pullback list` - List all verified users\n• `pullback user <userId>` - Pull a specific user\n• `pullback all` - Pull all verified users')] });
  }
};
