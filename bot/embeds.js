'use strict';

const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * Centralized embed templates for the bot
 * All embeds should be created through this file for consistency
 */

// Load emojis from XML file
const emojisXml = fs.readFileSync(path.join(__dirname, 'src', 'emojis.xml'), 'utf8');
const emojis = {};
const emojiMatches = emojisXml.matchAll(/<emoji name="([^"]+)" id="([^"]+)" \/>/g);
for (const match of emojiMatches) {
  emojis[match[1]] = `<:${match[1]}:${match[2]}>`;
}

module.exports = {
  // Colors
  colors: {
    primary: 0x1e1e1e,
    success: 0x1e1e1e,
    error: 0x1e1e1e,
    warning: 0x1e1e1e,
    info: 0x1e1e1e
  },

  /**
   * Verification embed with OAuth2 link
   * @param {string} webUrl - The verification URL
   * @returns {EmbedBuilder}
   */
  verification(webUrl) {
    return new EmbedBuilder()
      .setColor(this.colors.primary)
      .setTitle(`${emojis.secure} Account Verification`)
      .setDescription('Click the button below to verify your Discord account and get access!')
      .addFields(
        {
          name: `${emojis.sparkle} Why Verify?`,
          value: '• Gain access to exclusive channels\n• Stay connected with the community\n• Easy re-invite if you leave',
          inline: false
        },
        {
          name: `${emojis.secure} What We Store`,
          value: '• Your Discord username and ID\n• Email address\n• Server memberships',
          inline: false
        },
        {
          name: `${emojis.info} How It Works`,
          value: '1. Click the button below\n2. Login with Discord OAuth2\n3. Authorize the application\n4. You\'re verified!',
          inline: false
        }
      )
      .setFooter({ text: 'Your data is stored securely and only used for verification purposes' })
      .setTimestamp();
  },

  /**
   * Error embed
   * @param {string} title - Error title
   * @param {string} description - Error description
   * @returns {EmbedBuilder}
   */
  error(title, description) {
    return new EmbedBuilder()
      .setColor(this.colors.error)
      .setTitle(`${emojis.cancel} ${title}`)
      .setDescription(description)
      .setTimestamp();
  },

  /**
   * Success embed
   * @param {string} title - Success title
   * @param {string} description - Success description
   * @returns {EmbedBuilder}
   */
  success(title, description) {
    return new EmbedBuilder()
      .setColor(this.colors.success)
      .setTitle(`${emojis.confirm} ${title}`)
      .setDescription(description)
      .setTimestamp();
  },

  /**
   * Info embed
   * @param {string} title - Info title
   * @param {string} description - Info description
   * @returns {EmbedBuilder}
   */
  info(title, description) {
    return new EmbedBuilder()
      .setColor(this.colors.info)
      .setTitle(`${emojis.info} ${title}`)
      .setDescription(description)
      .setTimestamp();
  }
};
