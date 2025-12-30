'use strict';

const mysql = require('mysql2/promise');
const { EmbedBuilder } = require('discord.js');

// Database connection pool
let pool = null;

/**
 * Initialize database connection
 * @param {Object} config - Database configuration from config.xml
 */
function initDatabase(config) {
  pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

/**
 * Load all emojis from database
 * @returns {Promise<Object>} - Emoji map { name: '<:name:id>' }
 */
async function loadEmojis() {
  if (!pool) throw new Error('Database not initialized');
  
  const [rows] = await pool.query('SELECT name, hash, animated FROM nitro_emojis');
  
  const emojis = {};
  for (const row of rows) {
    emojis[row.name] = `<${row.animated ? 'a' : ''}:${row.name}:${row.hash}>`;
  }
  
  return emojis;
}

/**
 * Load embed from database by name
 * @param {string} embedName - The name of the embed to load
 * @returns {Promise<EmbedBuilder|null>} - Discord.js EmbedBuilder or null if not found
 */
async function loadEmbed(embedName) {
  if (!pool) throw new Error('Database not initialized');
  
  const [rows] = await pool.query('SELECT * FROM embeds WHERE name = ? LIMIT 1', [embedName]);
  
  if (rows.length === 0) {
    return null;
  }
  
  const embed = rows[0];
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
 * Load all embeds from database
 * @returns {Promise<Array>} - Array of embed objects
 */
async function loadAllEmbeds() {
  if (!pool) throw new Error('Database not initialized');
  
  const [rows] = await pool.query('SELECT * FROM embeds ORDER BY name ASC');
  return rows;
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
