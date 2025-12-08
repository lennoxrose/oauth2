// Configuration for Pterodactyl container environment
// Fetches configuration securely from server-side endpoint

const CONFIG = {
    ADMIN_USER_ID: null,
    API_BASE: null,
    API_SECRET: null,
    APP_DOMAIN: null
};

async function loadConfig() {
    try {
        const response = await fetch('/admin/config.php');
        if (!response.ok) {
            throw new Error('Failed to load configuration');
        }
        const data = await response.json();
        
        // Update CONFIG object
        CONFIG.API_SECRET = data.api_secret;
        CONFIG.API_BASE = data.api_base;
        CONFIG.ADMIN_USER_ID = data.admin_user_id;
        CONFIG.APP_DOMAIN = data.app_domain;
        
        // Set GLOBAL variables for other scripts
        window.API_SECRET = data.api_secret;
        window.API_BASE = data.api_base;
        window.ADMIN_USER_ID = data.admin_user_id;
        window.APP_DOMAIN = data.app_domain;
        
        console.log('config.js loaded - API_SECRET starts with:', window.API_SECRET?.substring(0, 20));
        console.log('CONFIG loaded:', {
            API_BASE: CONFIG.API_BASE,
            API_SECRET_LENGTH: CONFIG.API_SECRET?.length,
            API_SECRET_PREFIX: CONFIG.API_SECRET?.substring(0, 20) + '...',
            ADMIN_USER_ID: CONFIG.ADMIN_USER_ID,
            APP_DOMAIN: CONFIG.APP_DOMAIN
        });
        return CONFIG;
    } catch (error) {
        console.error('Failed to load config:', error);
        throw error;
    }
}

// Auto-load config on page load
loadConfig().catch(err => console.error('Failed to auto-load config:', err));

window.getConfig = loadConfig;
window.CONFIG = CONFIG;
