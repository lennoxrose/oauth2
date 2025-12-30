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
   * Simple auth link embed
   * @param {string} webUrl - The verification URL
   * @returns {Object} - Embed object
   */
  authLink(webUrl) {
    return {
      color: this.colors.primary,
      title: `${emojis.secure} Discord Verification`,
      description: 'Click the link below to verify your Discord account:',
      fields: [
        {
          name: `${emojis.network} Verification Link`,
          value: `[Click here to verify](${webUrl})`,
          inline: false
        },
        {
          name: `${emojis.info} What happens?`,
          value: '• You\'ll login with Discord\n• We\'ll save your user info\n• You can be pulled back to servers',
          inline: false
        }
      ],
      footer: {
        text: 'Your data is stored securely'
      },
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Verified users list embed
   * @param {Array} users - Array of user objects
   * @returns {Object} - Embed object
   */
  verifiedUsersList(users) {
    return {
      color: this.colors.primary,
      title: `${emojis.folder} Verified Users`,
      description: `Total: ${users.length} users`,
      fields: users.slice(0, 25).map(u => ({
        name: `${emojis.member} ${u.username}${u.discriminator !== '0' ? '#' + u.discriminator : ''}`,
        value: `ID: ${u.user_id}\nVerified: <t:${Math.floor(u.verified_at / 1000)}:R>`,
        inline: true
      })),
      footer: {
        text: users.length > 25 ? 'Showing first 25 users' : ''
      }
    };
  },

  /**
   * Pullback results embed
   * @param {number} success - Number of successful pulls
   * @param {number} failed - Number of failed pulls
   * @param {number} alreadyIn - Number of users already in server
   * @returns {Object} - Embed object
   */
  pullbackResults(success, failed, alreadyIn) {
    return {
      color: success > 0 ? this.colors.success : this.colors.error,
      title: `${emojis.folder} Pullback Results`,
      fields: [
        { name: `${emojis.confirm} Successfully Added`, value: success.toString(), inline: true },
        { name: `${emojis.cancel} Failed`, value: failed.toString(), inline: true },
        { name: `${emojis.member} Already in Server`, value: alreadyIn.toString(), inline: true }
      ],
      footer: {
        text: 'Note: Failed users may have expired tokens or left Discord'
      }
    };
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
  },

  /**
   * Warning embed
   * @param {string} title - Warning title
   * @param {string} description - Warning description
   * @returns {EmbedBuilder}
   */
  warning(title, description) {
    return new EmbedBuilder()
      .setColor(this.colors.warning)
      .setTitle(`${emojis.warn} ${title}`)
      .setDescription(description)
      .setTimestamp();
  }
};
