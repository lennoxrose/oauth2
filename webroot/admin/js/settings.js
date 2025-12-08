// API_BASE and API_SECRET are already defined in config.js
console.log('[DEBUG] settings.js loaded!');
let originalSettings = {}; // Store original values
let hasUnsavedChanges = false;

// Hide loading overlay
function hideLoadingOverlay() {
    console.log('[DEBUG] Hiding loading overlay');
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Initialize function
async function initSettings() {
    console.log('[DEBUG] initSettings() called');
    // Wait for config.js to finish loading API_SECRET
    let attempts = 0;
    while (!window.API_SECRET && attempts < 50) {
        attempts++;
        console.log(`[DEBUG] Waiting for API_SECRET... attempt ${attempts}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!window.API_SECRET) {
        console.error('[DEBUG] Failed to load API configuration');
        hideLoadingOverlay();
        showModal('❌', 'Error', 'Failed to load API configuration. Please refresh the page.');
        return;
    }
    
    console.log('[DEBUG] API_SECRET loaded! Loading settings...');
    await loadSettings();
    setupChangeDetection();
    hideLoadingOverlay();
}

// Load settings on page load - handle both cases
if (document.readyState === 'loading') {
    console.log('[DEBUG] DOM still loading, adding event listener');
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    console.log('[DEBUG] DOM already loaded, running immediately');
    initSettings();
}

// Load all settings from API
async function loadSettings() {
    try {
        console.log('Fetching settings from:', `${API_BASE}/settings`);
        
        // Add timeout to prevent infinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE}/settings`, {
            headers: {
                'Authorization': `Bearer ${API_SECRET}`
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Settings response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
        }

        const settings = await response.json();
        console.log('Settings loaded:', Object.keys(settings).length, 'settings');
        
        // Populate ALL form fields including sensitive data
        for (const [key, data] of Object.entries(settings)) {
            const input = document.getElementById(key);
            if (input) {
                input.value = data.value || '';
                originalSettings[key] = data.value || ''; // Store original value
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        if (error.name === 'AbortError') {
            showModal('❌', 'Error', 'Request timed out. Please check your API server and refresh the page.');
        } else {
            showModal('❌', 'Error', 'Failed to load settings: ' + error.message);
        }
    }
}

// Setup change detection on all inputs
function setupChangeDetection() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            checkForChanges();
        });
    });
}

// Check if any field has changed
function checkForChanges() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
    let changed = false;
    
    inputs.forEach(input => {
        const originalValue = originalSettings[input.id] || '';
        if (input.value !== originalValue) {
            changed = true;
        }
    });
    
    if (changed && !hasUnsavedChanges) {
        hasUnsavedChanges = true;
        showToast();
    } else if (!changed && hasUnsavedChanges) {
        hasUnsavedChanges = false;
        hideToast();
    }
}

// Show unsaved changes toast
function showToast() {
    const toast = document.getElementById('unsaved-toast');
    toast.classList.remove('hidden');
}

// Hide unsaved changes toast
function hideToast() {
    const toast = document.getElementById('unsaved-toast');
    toast.classList.add('hidden');
    hasUnsavedChanges = false;
}

// Undo all changes
function undoChanges() {
    for (const [key, value] of Object.entries(originalSettings)) {
        const input = document.getElementById(key);
        if (input) {
            input.value = value;
        }
    }
    hideToast();
}

// Save all sections at once (from toast)
async function saveAllSections() {
    const settingsData = {};
    
    const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
    inputs.forEach(input => {
        if (input.value && input.value !== originalSettings[input.id]) {
            settingsData[input.id] = input.value;
        }
    });
    
    if (Object.keys(settingsData).length === 0) {
        hideToast();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_SECRET}`
            },
            body: JSON.stringify(settingsData)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        // Update original settings
        for (const key in settingsData) {
            originalSettings[key] = settingsData[key];
        }

        hideToast();
        showModal('✅', 'Success', 'All settings saved successfully! Restart your bot for changes to take effect.');
    } catch (error) {
        console.error('Error saving settings:', error);
        showModal('❌', 'Error', 'Failed to save settings. Please try again.');
    }
}

// Save bot configuration
async function saveBotConfig() {
    const settingsData = {};
    
    // Only include fields that have changed
    const token = document.getElementById('token').value;
    const client_id = document.getElementById('client_id').value;
    const client_secret = document.getElementById('client_secret').value;
    const prefix = document.getElementById('prefix').value;
    const owner_id = document.getElementById('owner_id').value;
    const guild_id = document.getElementById('guild_id').value;
    
    if (token && token !== originalSettings.token) settingsData.token = token;
    if (client_id && client_id !== originalSettings.client_id) settingsData.client_id = client_id;
    if (client_secret && client_secret !== originalSettings.client_secret) settingsData.client_secret = client_secret;
    if (prefix && prefix !== originalSettings.prefix) settingsData.prefix = prefix;
    if (owner_id && owner_id !== originalSettings.owner_id) settingsData.owner_id = owner_id;
    if (guild_id && guild_id !== originalSettings.guild_id) settingsData.guild_id = guild_id;

    await saveSettingsData(settingsData, 'Bot configuration', ['token', 'client_id', 'client_secret', 'prefix', 'owner_id', 'guild_id']);
}

// Save OAuth2 configuration
async function saveOAuthConfig() {
    const settingsData = {};
    
    const redirect_uri = document.getElementById('redirect_uri').value;
    const web_url = document.getElementById('web_url').value;
    
    if (redirect_uri && redirect_uri !== originalSettings.redirect_uri) settingsData.redirect_uri = redirect_uri;
    if (web_url && web_url !== originalSettings.web_url) settingsData.web_url = web_url;

    await saveSettingsData(settingsData, 'OAuth2 configuration', ['redirect_uri', 'web_url']);
}

// Save role configuration
async function saveRoleConfig() {
    const settingsData = {};
    
    const verified_role_id = document.getElementById('verified_role_id').value;
    const unverified_role_id = document.getElementById('unverified_role_id').value;
    
    if (verified_role_id && verified_role_id !== originalSettings.verified_role_id) settingsData.verified_role_id = verified_role_id;
    if (unverified_role_id && unverified_role_id !== originalSettings.unverified_role_id) settingsData.unverified_role_id = unverified_role_id;

    await saveSettingsData(settingsData, 'Role configuration', ['verified_role_id', 'unverified_role_id']);
}

// Save settings data helper
async function saveSettingsData(settingsData, sectionName, fieldKeys) {
    if (Object.keys(settingsData).length === 0) {
        showModal('⚠️', 'Warning', 'No changes to save.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_SECRET}`
            },
            body: JSON.stringify(settingsData)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        // Update original settings with saved values
        for (const key in settingsData) {
            originalSettings[key] = settingsData[key];
        }

        showModal('✅', 'Success', `${sectionName} saved successfully! Restart your bot for changes to take effect.`);
        
        // Re-check for changes after save
        checkForChanges();
    } catch (error) {
        console.error('Error saving settings:', error);
        showModal('❌', 'Error', `Failed to save ${sectionName}. Please try again.`);
    }
}

// Save all settings (legacy function - kept for compatibility)
async function saveSettings() {
    const settingsData = {
        token: document.getElementById('token').value,
        client_id: document.getElementById('client_id').value,
        client_secret: document.getElementById('client_secret').value,
        prefix: document.getElementById('prefix').value,
        owner_id: document.getElementById('owner_id').value,
        redirect_uri: document.getElementById('redirect_uri').value,
        web_url: document.getElementById('web_url').value,
        verified_role_id: document.getElementById('verified_role_id').value,
        unverified_role_id: document.getElementById('unverified_role_id').value,
        guild_id: document.getElementById('guild_id').value
    };

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_SECRET}`
            },
            body: JSON.stringify(settingsData)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        const result = await response.json();
        showModal('✅', 'Success', 'Settings saved successfully! Restart your bot for changes to take effect.');
    } catch (error) {
        console.error('Error saving settings:', error);
        showModal('❌', 'Error', 'Failed to save settings. Please try again.');
    }
}

// Show modal
function showModal(icon, title, message) {
    document.getElementById('modalIcon').textContent = icon;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('messageModal').classList.remove('hidden');
    document.getElementById('messageModal').classList.add('flex');
}

// Close modal
function closeModal() {
    document.getElementById('messageModal').classList.add('hidden');
    document.getElementById('messageModal').classList.remove('flex');
}

// Toggle password visibility
function togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// Logout function
function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '../login.html';
}
