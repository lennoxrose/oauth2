'use strict';

const embeds = require('../embeds');

module.exports = {
  name: 'auth',
  aliases: ['verify', 'link'],
  description: 'Get the verification link to authenticate with Discord OAuth2',
  
  async execute(message, args, { config, embedLoader }) {
    const webUrl = config.web_url;
    
    const embed = await embedLoader.loadEmbed('auth_link');
    if (!embed) {
      return message.reply({ embeds: [embeds.error('Embed Not Found', 'The auth link embed has not been created in the panel.')] });
    }

    try {
      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error sending auth link:', err);
      await message.reply(`Verify here: ${webUrl}`);
    }
  }
};
