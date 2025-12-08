'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../embeds');

module.exports = {
  name: 'verify-embed',
  aliases: ['verifyembed', 've'],
  description: 'Send a verification embed with a button for users to verify',
  
  async execute(message, args, { config }) {
    // Check if user has permission
    if (!message.member.permissions.has('Administrator') && message.author.id !== config.owner_id) {
      return message.reply({ embeds: [embeds.error('Permission Denied', 'You need Administrator permission to use this command.')] });
    }

    // Construct OAuth URL - use web_url and append /oauth2/ if needed
    let webUrl = config.web_url || 'https://lennox-rose.com';
    
    // Ensure the URL ends with /oauth2/
    if (!webUrl.includes('/oauth2')) {
      webUrl = webUrl.replace(/\/$/, '') + '/oauth2/';
    }

    // Create the embed using centralized template
    const embed = embeds.verification(webUrl);

    // Create the button
    const button = new ButtonBuilder()
      .setLabel('Verify Account')
      .setStyle(ButtonStyle.Link)
      .setURL(webUrl)
      .setEmoji('✅');

    const row = new ActionRowBuilder()
      .addComponents(button);

    // Send the embed with button
    try {
      await message.channel.send({
        embeds: [embed],
        components: [row]
      });

      // Delete the command message if possible
      if (message.guild && message.channel.permissionsFor(message.guild.members.me).has('ManageMessages')) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error('Error sending verification embed:', err);
      await message.reply({ embeds: [embeds.error('Failed to Send', 'Failed to send verification embed. Make sure I have permission to send embeds and links.')] });
    }
  }
};
