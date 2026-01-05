#!/usr/bin/env node

/**
 * Discord Verified Users Recovery Script
 * 
 * This script recovers verified users from Discord by:
 * 1. Reading configuration from .env.secret and database
 * 2. Fetching all guild members from Discord
 * 3. Filtering members with the verified role
 * 4. Re-inserting them into the discord_verified_users table
 * 
 * Usage: node recovery.js
 */

const https = require('https');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Path to .env.secret file
const ENV_FILE_PATH = '/var/www/html/v2/oauth2/discord/.env.secret';

/**
 * Parse .env.secret file
 */
function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Environment file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const config = {};

    content.split('\n').forEach(line => {
        line = line.trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) return;
        
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            config[key.trim()] = valueParts.join('=').trim();
        }
    });

    return config;
}

/**
 * Make a Discord API request
 */
function discordRequest(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'discord.com',
            path: `/api/v10${path}`,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Discord API error: ${res.statusCode} - ${data}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Main recovery function
 */
async function main() {
    console.log('='.repeat(60));
    console.log('Discord Verified Users Recovery Script');
    console.log('='.repeat(60));
    console.log();

    // Parse .env.secret
    console.log('Reading configuration from .env.secret...');
    const envConfig = parseEnvFile(ENV_FILE_PATH);

    const DB_CONFIG = {
        host: envConfig.DB_HOST || 'localhost',
        user: envConfig.DB_USER,
        password: envConfig.DB_PASS,
        database: envConfig.DB_NAME
    };

    const BOT_TOKEN = envConfig.API_SECRET;

    if (!BOT_TOKEN) {
        throw new Error('API_SECRET (bot token) not found in .env.secret');
    }

    console.log(`   ✓ Database: ${DB_CONFIG.database}@${DB_CONFIG.host}`);
    console.log(`   ✓ Bot token loaded`);
    console.log();

    // Connect to database
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('   ✓ Connected');
    console.log();

    // Fetch bot settings from database
    console.log('Loading bot settings from database...');
    const [settings] = await connection.execute(
        'SELECT setting_key, setting_value FROM bot_settings WHERE setting_key IN (?, ?)',
        ['guild_id', 'verified_role_id']
    );

    const settingsMap = {};
    settings.forEach(row => {
        settingsMap[row.setting_key] = row.setting_value;
    });

    const GUILD_ID = settingsMap.guild_id;
    const VERIFIED_ROLE_ID = settingsMap.verified_role_id;

    if (!GUILD_ID || !VERIFIED_ROLE_ID) {
        throw new Error('Missing guild_id or verified_role_id in bot_settings table');
    }

    console.log(`   ✓ Guild ID: ${GUILD_ID}`);
    console.log(`   ✓ Verified Role ID: ${VERIFIED_ROLE_ID}`);
    console.log();

    // Fetch all guild members from Discord
    console.log('Fetching guild members from Discord...');
    let allMembers = [];
    let after = null;

    do {
        const url = `/guilds/${GUILD_ID}/members?limit=1000${after ? `&after=${after}` : ''}`;
        const members = await discordRequest(url, BOT_TOKEN);
        allMembers = allMembers.concat(members);

        if (members.length < 1000) break;
        after = members[members.length - 1].user.id;

        console.log(`   Fetched ${allMembers.length} members so far...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
    } while (true);

    console.log(`   ✓ Total members fetched: ${allMembers.length}`);
    console.log();

    // Filter members with verified role
    console.log('Filtering verified members...');
    const verifiedMembers = allMembers.filter(member =>
        member.roles.includes(VERIFIED_ROLE_ID)
    );

    console.log(`   ✓ Found ${verifiedMembers.length} verified members`);
    console.log();

    if (verifiedMembers.length === 0) {
        console.log('No verified members found. Nothing to recover.');
        await connection.end();
        return;
    }

    // Check current database state
    const [currentUsers] = await connection.execute(
        'SELECT COUNT(*) as count FROM discord_verified_users'
    );
    const currentCount = currentUsers[0].count;
    console.log(`Current database state: ${currentCount} users`);
    console.log();

    // Confirm before proceeding
    console.log('This will insert/update verified members in the database.');
    console.log('Access tokens will be set to "RECOVERED_NO_TOKEN"');
    console.log();

    // Insert verified members into database
    console.log('Inserting verified members into database...');
    console.log('-'.repeat(60));

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const member of verifiedMembers) {
        const user = member.user;
        
        try {
            const [result] = await connection.execute(
                `INSERT INTO discord_verified_users 
                (user_id, username, discriminator, email, avatar, access_token, refresh_token, created_at, verified_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    username = VALUES(username), 
                    avatar = VALUES(avatar),
                    updated_at = NOW()`,
                [
                    user.id,
                    user.username,
                    user.discriminator || '0',
                    user.email || null,
                    user.avatar,
                    'RECOVERED_NO_TOKEN',
                    'RECOVERED_NO_TOKEN'
                ]
            );

            if (result.affectedRows === 1) {
                console.log(`   ✓ Inserted: ${user.username} (${user.id})`);
                inserted++;
            } else if (result.affectedRows === 2) {
                console.log(`   ↻ Updated:  ${user.username} (${user.id})`);
                updated++;
            }
        } catch (err) {
            console.error(`   ✗ Failed:   ${user.username} - ${err.message}`);
            failed++;
        }
    }

    console.log('-'.repeat(60));
    console.log();

    // Final statistics
    const [finalUsers] = await connection.execute(
        'SELECT COUNT(*) as count FROM discord_verified_users'
    );
    const finalCount = finalUsers[0].count;

    console.log('Recovery Summary:');
    console.log(`   • Inserted: ${inserted} new users`);
    console.log(`   • Updated:  ${updated} existing users`);
    console.log(`   • Failed:   ${failed} users`);
    console.log(`   • Total in DB: ${finalCount} users`);
    console.log();

    await connection.end();

    console.log('Recovery complete!');
    console.log();
    console.log('Note: Access/refresh tokens are set to "RECOVERED_NO_TOKEN"');
    console.log('Users can re-authenticate to update their tokens.');
    console.log();
}

// Run the script
main().catch(error => {
    console.error();
    console.error('Error:', error.message);
    console.error();
    if (error.stack) {
        console.error(error.stack);
    }
    process.exit(1);
});
