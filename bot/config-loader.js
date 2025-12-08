const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

class ConfigLoader {
    constructor() {
        this.config = {};
        this.apiSecret = null;
    }

    // Load API secret from config.xml (only thing in XML now)
    loadApiSecret() {
        const configPath = path.join(__dirname, 'config.xml');
        if (!fs.existsSync(configPath)) {
            throw new Error('Missing config.xml. Create one with <api_secret>');
        }

        const xml = fs.readFileSync(configPath, 'utf8');
        const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
        
        try {
            const parsed = parser.parse(xml).config || {};
            this.apiSecret = parsed.api_secret;
            
            if (!this.apiSecret) {
                throw new Error('Missing <api_secret> in config.xml');
            }
        } catch (e) {
            throw new Error('Failed to parse config.xml: ' + e.message);
        }
    }

    // Fetch all config from API
    async fetchFromAPI() {
        try {
            const response = await axios.get('https://api.lennox-rose.com/v2/oauth2/discord/settings', {
                headers: {
                    'Authorization': `Bearer ${this.apiSecret}`
                }
            });

            const settings = response.data;
            
            // Convert settings object to config format
            this.config = {
                token: settings.token?.value || '',
                client_id: settings.client_id?.value || '',
                client_secret: settings.client_secret?.value || '',
                prefix: settings.prefix?.value || ';',
                ownerId: settings.owner_id?.value || '',
                redirect_uri: settings.redirect_uri?.value || '',
                web_url: settings.web_url?.value || '',
                verified_role_id: settings.verified_role_id?.value || '',
                unverified_role_id: settings.unverified_role_id?.value || '',
                guild_id: settings.guild_id?.value || '',
                api_secret: this.apiSecret
            };

            return this.config;
        } catch (error) {
            throw new Error('Failed to fetch config from API: ' + error.message);
        }
    }

    // Main load function
    async load() {
        this.loadApiSecret();
        await this.fetchFromAPI();
        return this.config;
    }
}

module.exports = ConfigLoader;
