'use strict';

const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

// API configuration
let apiConfig = null;
let embedsCache = null;
let emojisCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 10000; // 10 seconds

/**
 * Initialize API connection
 * @param {Object} config - API configuration { api_base, api_secret }
 */
function initDatabase(config) {
  apiConfig = {
    api_base: config.api_base,
    api_secret: config.api_secret
  };
}

/**
 * Refresh embeds cache from API
 */
async function refreshEmbedsCache() {
  if (!apiConfig) throw new Error('API not initialized');
  
  const now = Date.now();
  if (embedsCache && (now - lastCacheUpdate) < CACHE_TTL) {
    return; // Cache still valid
  }
  
  try {
    const response = await axios.get(`${apiConfig.api_base}/embeds`, {
      headers: {
        'Authorization': `Bearer ${apiConfig.api_secret}`
      }
    });
    
    embedsCache = response.data.embeds || [];
    lastCacheUpdate = now;
  } catch (error) {
    console.error('Failed to refresh embeds cache:', error.message);
    throw error;
  }
}

/**
 * Load all emojis from API
 * @returns {Promise<Object>} - Emoji map { name: '<:name:id>' }
 */
async function loadEmojis() {
  if (!apiConfig) throw new Error('API not initialized');
  
  // Use cache if available
  if (emojisCache) return emojisCache;
  
  try {
    const response = await axios.get(`${apiConfig.api_base}/emojis`, {
      headers: {
        'Authorization': `Bearer ${apiConfig.api_secret}`
      }
    });
    
    const emojis = {};
    for (const emoji of response.data.emojis || []) {
      emojis[emoji.name] = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.hash}>`;
    }
    
    emojisCache = emojis;
    return emojis;
  } catch (error) {
    console.error('Failed to load emojis from API:', error.message);
    return {};
  }
}

/**
 * Load embed from API by name
 * @param {string} embedName - The name of the embed to load
 * @returns {Promise<EmbedBuilder|null>} - Discord.js EmbedBuilder or null if not found
 */
async function loadEmbed(embedName) {
  if (!apiConfig) throw new Error('API not initialized');
  
  // Refresh cache if needed
  await refreshEmbedsCache();
  
  // Find embed by name
  const embed = embedsCache.find(e => e.name === embedName);
  
  if (!embed) {
    return null;
  }
  
  const builder = new EmbedBuilder();
  
  // Set color (convert hex to integer)
  if (embed.color) {
    const colorInt = parseInt(embed.color.replace('#', ''), 16);
    builder.setColor(colorInt);
  }
  
  // Set author
  if (embed.author_name) {
    const authorData = { name: embed.author_name };
    if (embed.author_icon_url) authorData.iconURL = embed.author_icon_url;
    if (embed.author_url) authorData.url = embed.author_url;
    builder.setAuthor(authorData);
  }
  
  // Set title
  if (embed.title) {
    builder.setTitle(embed.title);
  }
  
  // Set title URL
  if (embed.title_url) {
    builder.setURL(embed.title_url);
  }
  
  // Set description
  if (embed.description) {
    builder.setDescription(embed.description);
  }
  
  // Set thumbnail
  if (embed.thumbnail_url) {
    builder.setThumbnail(embed.thumbnail_url);
  }
  
  // Set image
  if (embed.image_url) {
    builder.setImage(embed.image_url);
  }
  
  // Add fields
  if (embed.fields) {
    try {
      const fields = typeof embed.fields === 'string' ? JSON.parse(embed.fields) : embed.fields;
      if (Array.isArray(fields) && fields.length > 0) {
        for (const field of fields) {
          builder.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline || false
          });
        }
      }
    } catch (e) {
      console.error('Error parsing embed fields:', e);
    }
  }
  
  // Set footer
  if (embed.footer_text) {
    const footerData = { text: embed.footer_text };
    if (embed.footer_icon_url) footerData.iconURL = embed.footer_icon_url;
    builder.setFooter(footerData);
  }
  
  // Set timestamp
  if (embed.timestamp) {
    builder.setTimestamp();
  }
  
  return builder;
}

/**
 * Load all embeds from API
 * @returns {Promise<Array>} - Array of embed objects
 */
async function loadAllEmbeds() {
  if (!apiConfig) throw new Error('API not initialized');
  
  await refreshEmbedsCache();
  return embedsCache || [];
}

/**
 * Get embed as object (for sending with components)
 * @param {string} embedName - The name of the embed to load
 * @returns {Promise<Object|null>} - Embed object or null if not found
 */
async function getEmbedObject(embedName) {
  const builder = await loadEmbed(embedName);
  if (!builder) return null;
  
  return builder.toJSON();
}

module.exports = {
  initDatabase,
  loadEmojis,
  loadEmbed,
  loadAllEmbeds,
  getEmbedObject
};
