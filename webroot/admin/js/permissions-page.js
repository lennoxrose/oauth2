// Permissions Page Management
console.log('[DEBUG] permissions-page.js loaded!');
let currentEditingUserId = null;
let allVerifiedUsers = [];
let currentUserPermissions = null;

// Load all permissions on page load
async function loadPermissions() {
    console.log('[DEBUG] loadPermissions() called');
    console.log('[DEBUG] API_BASE:', window.API_BASE);
    console.log('[DEBUG] API_SECRET exists:', !!window.API_SECRET);
    try {
        const response = await fetch(`${API_BASE}/permissions`, {
            headers: {
                'Authorization': `Bearer ${API_SECRET}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch permissions');

        const data = await response.json();
        console.log('Permissions API response:', data);
        
        // API returns { success: true, users: [...] }
        const permissions = data.users || [];
        renderPermissionsTable(permissions);
    } catch (error) {
        console.error('Error loading permissions:', error);
        showAlert('Error', 'Failed to load permissions', 'error');
    }
}

// Load all verified users for search
async function loadVerifiedUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${API_SECRET}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch users');

        const data = await response.json();
        console.log('Verified users API response:', data);
        
        // API returns { success: true, users: [...] }
        // Map user_id to discord_id for consistency
        allVerifiedUsers = (data.users || []).map(user => ({
            ...user,
            discord_id: user.user_id || user.discord_id,
            avatar: user.avatar || null
        }));
        
        console.log('Loaded verified users:', allVerifiedUsers.length);
    } catch (error) {
        console.error('Error loading verified users:', error);
        allVerifiedUsers = []; // Ensure it's always an array
    }
}

// Render permissions table
function renderPermissionsTable(permissions) {
    const tbody = document.getElementById('permissions-body');
    
    if (!permissions || permissions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="px-6 py-12 text-center text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <p>No admin users found</p>
                    <p class="text-sm mt-1">Add verified users to grant them admin access</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = permissions.map(user => {
        const perms = user.permissions || {};
        const avatar = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` 
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discord_id) % 5}.png`;
        
        const checkIcon = '<svg class="w-6 h-6 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        const xIcon = '<svg class="w-6 h-6 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';

        return `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <img src="${avatar}" alt="${user.username}" class="w-10 h-10 border border-white/20">
                        <div>
                            <div class="font-medium text-white">${user.username}</div>
                            <div class="text-sm text-gray-400">${user.discord_id}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4 text-center">${perms.dashboard?.enabled ? checkIcon : xIcon}</td>
                <td class="px-4 py-4 text-center">${perms.users_view?.enabled ? checkIcon : xIcon}</td>
                <td class="px-4 py-4 text-center">${perms.users_delete?.enabled ? checkIcon : xIcon}</td>
                <td class="px-4 py-4 text-center">${perms.pullback?.enabled ? checkIcon : xIcon}</td>
                <td class="px-4 py-4 text-center">${perms.sync?.enabled ? checkIcon : xIcon}</td>
                <td class="px-4 py-4 text-center">${perms.settings_view?.enabled ? checkIcon : xIcon}</td>
                <td class="px-4 py-4 text-center">${perms.settings_edit?.enabled ? checkIcon : xIcon}</td>
                <td class="px-4 py-4 text-center">${perms.permissions?.enabled ? checkIcon : xIcon}</td>
                <td class="px-6 py-4">
                    <div class="flex gap-2 justify-end">
                        <button onclick="editPermissions('${user.discord_id}')" class="px-3 py-1 border border-accent/40 text-accent hover:bg-accent/10 transition-colors text-sm">
                            Edit
                        </button>
                        <button onclick="removePermissions('${user.discord_id}', '${user.username}')" class="px-3 py-1 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors text-sm">
                            Remove
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render permission badge
// Edit permissions
async function editPermissions(discordId) {
    try {
        const response = await fetch(`${API_BASE}/permissions/${discordId}`, {
            headers: {
                'Authorization': `Bearer ${API_SECRET}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user permissions');

        const data = await response.json();
        console.log('Edit permissions API response:', data);
        
        // API returns { success: true, user: {...} }
        const userData = data.user || {};
        currentEditingUserId = discordId;
        currentUserPermissions = userData.permissions || {};

        // Show modal with user info
        const avatar = userData.avatar 
            ? `https://cdn.discordapp.com/avatars/${userData.discord_id}/${userData.avatar}.png` 
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.discord_id) % 5}.png`;

        document.getElementById('edit-user-info').innerHTML = `
            <div class="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded">
                <img src="${avatar}" alt="${userData.username}" class="w-12 h-12 border border-white/20">
                <div>
                    <div class="font-medium text-white">${userData.username}</div>
                    <div class="text-sm text-gray-400">${userData.discord_id}</div>
                </div>
            </div>
        `;

        // Generate permissions checkboxes
        const permissionsHTML = window.PermissionsManager.generatePermissionCheckboxes(currentUserPermissions);
        document.getElementById('permissions-container').innerHTML = permissionsHTML;
        
        // Initialize custom checkboxes
        window.PermissionsManager.initCustomCheckboxes();

        // Show modal
        document.getElementById('edit-modal').classList.remove('hidden');
        document.getElementById('edit-modal').classList.add('flex');
    } catch (error) {
        console.error('Error editing permissions:', error);
        showAlert('Error', 'Failed to load user permissions', 'error');
    }
}

// Save permissions
async function savePermissions() {
    if (!currentEditingUserId) return;

    try {
        const permissions = window.PermissionsManager.getSelectedPermissions();

        console.log('Saving permissions for user:', currentEditingUserId);
        console.log('Permissions object:', JSON.stringify(permissions, null, 2));

        const response = await fetch(`${API_BASE}/permissions/${currentEditingUserId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${API_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permissions })
        });

        if (!response.ok) throw new Error('Failed to save permissions');

        showAlert('Success', 'Permissions updated successfully', 'success');
        closeEditModal();
        loadPermissions(); // Reload table
    } catch (error) {
        console.error('Error saving permissions:', error);
        showAlert('Error', 'Failed to save permissions', 'error');
    }
}

// Remove permissions (revoke admin access)
async function removePermissions(discordId, username) {
    showConfirm(
        'Remove Admin Access',
        `Are you sure you want to remove admin access for ${username}?\n\nThey will no longer be able to access the admin panel.`,
        async () => {
            try {
                const response = await fetch(`${API_BASE}/permissions/${discordId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${API_SECRET}`
                    }
                });

                if (!response.ok) throw new Error('Failed to remove permissions');

                showAlert('Success', `Admin access removed for ${username}`, 'success');
                loadPermissions(); // Reload table
            } catch (error) {
                console.error('Error removing permissions:', error);
                showAlert('Error', 'Failed to remove admin access', 'error');
            }
        }
    );
}

// Add new admin user
async function addAdmin(discordId) {
    try {
        // Default permissions: can view dashboard only
        const defaultPermissions = {
            dashboard: { enabled: true, subPermissions: {} },
            users_view: { enabled: false, subPermissions: {} },
            users_delete: { enabled: false, subPermissions: {} },
            pullback: { enabled: false, subPermissions: {} },
            sync: { enabled: false, subPermissions: {} },
            settings_view: { enabled: false, subPermissions: {} },
            settings_edit: { enabled: false, subPermissions: {} },
            permissions: { enabled: false, subPermissions: {} }
        };

        const response = await fetch(`${API_BASE}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                discord_id: discordId,
                permissions: defaultPermissions
            })
        });

        if (!response.ok) throw new Error('Failed to add admin');

        const user = allVerifiedUsers.find(u => u.discord_id === discordId);
        showAlert('Success', `${user?.username || 'User'} has been added as admin with default permissions (dashboard only)`, 'success');
        
        // Clear search
        document.getElementById('user-search').value = '';
        document.getElementById('search-results').classList.add('hidden');
        
        loadPermissions(); // Reload table
    } catch (error) {
        console.error('Error adding admin:', error);
        showAlert('Error', 'Failed to add admin user', 'error');
    }
}

// User search functionality
function handleUserSearch() {
    const searchInput = document.getElementById('user-search');
    const resultsContainer = document.getElementById('search-results');

    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        
        if (query.length < 2) {
            resultsContainer.classList.add('hidden');
            return;
        }

        // Ensure allVerifiedUsers is an array
        if (!Array.isArray(allVerifiedUsers) || allVerifiedUsers.length === 0) {
            console.warn('allVerifiedUsers is not ready:', allVerifiedUsers);
            resultsContainer.innerHTML = `
                <div class="p-4 text-center text-gray-400">
                    ${!Array.isArray(allVerifiedUsers) ? 'Loading users...' : 'No verified users available'}
                </div>
            `;
            resultsContainer.classList.remove('hidden');
            return;
        }

        try {
            const matches = allVerifiedUsers.filter(user => 
                user.username.toLowerCase().includes(query) || 
                user.discord_id.includes(query)
            ).slice(0, 10); // Limit to 10 results

            if (matches.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="p-4 text-center text-gray-400">
                        No users found matching "${query}"
                    </div>
                `;
                resultsContainer.classList.remove('hidden');
                return;
            }

            resultsContainer.innerHTML = matches.map(user => {
                const avatar = user.avatar 
                    ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png` 
                    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discord_id) % 5}.png`;

                return `
                    <div class="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/10 last:border-b-0" onclick="addAdmin('${user.discord_id}')">
                        <img src="${avatar}" alt="${user.username}" class="w-10 h-10 rounded-full">
                        <div class="flex-1">
                            <div class="font-medium text-white">${user.username}</div>
                            <div class="text-sm text-gray-400">${user.discord_id}</div>
                        </div>
                        <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </div>
                `;
            }).join('');

            resultsContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Error in search:', error);
            resultsContainer.innerHTML = `
                <div class="p-4 text-center text-gray-400">
                    Error searching users
                </div>
            `;
            resultsContainer.classList.remove('hidden');
        }
    });

    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
}

// Modal functions
function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('edit-modal').classList.remove('flex');
    currentEditingUserId = null;
    currentUserPermissions = null;
}

function showAlert(title, message, type) {
    const modal = document.getElementById('alert-modal');
    const iconContainer = document.getElementById('alert-icon');
    
    const icons = {
        success: `<svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        error: `<svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        warning: `<svg class="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
    };
    
    iconContainer.innerHTML = icons[type] || icons.success;
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAlert() {
    document.getElementById('alert-modal').classList.add('hidden');
    document.getElementById('alert-modal').classList.remove('flex');
}

function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const yesBtn = document.getElementById('confirm-yes-btn');
    const noBtn = document.getElementById('confirm-no-btn');
    
    // Remove old listeners
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);
    
    // Add new listeners
    newYesBtn.addEventListener('click', function() {
        closeConfirm();
        onConfirm();
    });
    
    newNoBtn.addEventListener('click', closeConfirm);
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeConfirm() {
    document.getElementById('confirm-modal').classList.add('hidden');
    document.getElementById('confirm-modal').classList.remove('flex');
}

// Initialize permissions page
async function initPermissions() {
    console.log('[DEBUG] initPermissions() called');
    // Wait for API_SECRET to be loaded
    let attempts = 0;
    const checkConfig = setInterval(async () => {
        attempts++;
        console.log(`[DEBUG] Waiting for window.API_SECRET... attempt ${attempts}`);
        if (window.API_SECRET) {
            console.log('[DEBUG] window.API_SECRET loaded! Initializing permissions page...');
            clearInterval(checkConfig);
            
            // Load data first, then set up search
            await loadPermissions();
            await loadVerifiedUsers();
            handleUserSearch(); // Set up search after users are loaded
        }
        if (attempts > 50) {
            console.error('[ERROR] Timeout waiting for window.API_SECRET');
            clearInterval(checkConfig);
        }
    }, 100);

    // Event listeners
    document.getElementById('save-perms-btn').addEventListener('click', savePermissions);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
    document.getElementById('alert-ok-btn').addEventListener('click', closeAlert);
}

// Initialize page - handle both cases: DOM still loading vs already loaded
if (document.readyState === 'loading') {
    console.log('[DEBUG] DOM still loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', initPermissions);
} else {
    console.log('[DEBUG] DOM already loaded, initializing immediately');
    initPermissions();
}

// Make functions globally available
window.editPermissions = editPermissions;
window.removePermissions = removePermissions;
window.addAdmin = addAdmin;
