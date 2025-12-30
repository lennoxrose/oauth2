'use strict';

const embeds = require('../embeds');

module.exports = {
  name: 'auth',
  aliases: ['verify', 'link'],
  description: 'Get the verification link to authenticate with Discord OAuth2',
  
  async execute(message, args, { config }) {
    const webUrl = config.web_url || 'https://lennox-rose.com/oauth2/';
    
    const embed = embeds.authLink(webUrl);

    try {
      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error sending auth link:', err);
      await message.reply(`Verify here: ${webUrl}`);
    }
  }
};
