// Permissions Management
let currentEditUserId = null;

// Custom modal functions
function showAlert(title, message, type = 'success') {
    return new Promise((resolve) => {
        const modal = document.getElementById('alert-modal');
        const modalTitle = document.getElementById('alert-title');
        const modalMessage = document.getElementById('alert-message');
        const modalIcon = document.getElementById('alert-icon');
        const okBtn = document.getElementById('alert-ok-btn');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Set icon based on type
        if (type === 'success') {
            modalIcon.innerHTML = `
                <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `;
        } else if (type === 'error') {
            modalIcon.innerHTML = `
                <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `;
        } else {
            modalIcon.innerHTML = `
                <svg class="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `;
        }
        
        modal.classList.remove('hidden');
        
        const handleOk = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            resolve();
        };
        
        okBtn.addEventListener('click', handleOk);
    });
}

function showConfirm(title, message, confirmText = 'Yes, Remove', cancelText = 'Cancel', confirmStyle = 'danger') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const modalTitle = document.getElementById('confirm-title');
        const modalMessage = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-no-btn');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        yesBtn.textContent = confirmText;
        noBtn.textContent = cancelText;
        
        // Apply button styling based on type
        if (confirmStyle === 'success') {
            yesBtn.className = 'flex-1 px-4 py-2 bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-colors font-semibold';
        } else if (confirmStyle === 'primary') {
            yesBtn.className = 'flex-1 px-4 py-2 bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 transition-colors font-semibold';
        } else {
            yesBtn.className = 'flex-1 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors font-semibold';
        }
        
        modal.classList.remove('hidden');
        
        const handleYes = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            resolve(true);
        };
        
        const handleNo = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            resolve(false);
        };
        
        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    });
}

// Load verified users for search
let allVerifiedUsers = [];
let availableUsers = [];

async function loadVerifiedUsers() {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch users');

        const data = await response.json();
        allVerifiedUsers = data.users;
        
        // Get existing admins to filter them out
        const permsResponse = await fetch(`${config.API_BASE}/permissions`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        const permsData = await permsResponse.json();
        const existingAdminIds = permsData.users.map(u => u.user_id);
        
        // Filter out users who already have permissions
        availableUsers = allVerifiedUsers.filter(u => !existingAdminIds.includes(u.user_id));
        
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error', 'Failed to load verified users', 'error');
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('user-search');
    const searchResults = document.getElementById('search-results');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            searchResults.classList.add('hidden');
            return;
        }
        
        // Filter users by username or user ID
        const filtered = availableUsers.filter(user => {
            const username = (user.username || '').toLowerCase();
            const discriminator = user.discriminator || '0';
            const fullUsername = discriminator !== '0' ? `${username}#${discriminator}` : username;
            const userId = user.user_id.toString();
            
            return fullUsername.includes(query) || userId.includes(query);
        });
        
        if (filtered.length === 0) {
            searchResults.innerHTML = `
                <div class="p-4 text-center text-gray-400">
                    No users found
                </div>
            `;
            searchResults.classList.remove('hidden');
            return;
        }
        
        searchResults.innerHTML = filtered.map(user => {
            const avatar = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.user_id) >> 22n) % 6n}.png`;
            
            return `
                <div class="search-result-item flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/10 last:border-b-0" data-user-id="${user.user_id}">
                    <img src="${avatar}" class="w-10 h-10 border border-white/20" alt="${user.username}">
                    <div class="flex-1">
                        <div class="text-white font-medium">${user.username}${user.discriminator !== '0' ? '#' + user.discriminator : ''}</div>
                        <div class="text-xs text-gray-400">${user.user_id}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        searchResults.classList.remove('hidden');
        
        // Add click handlers to results
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                const user = availableUsers.find(u => u.user_id === userId);
                if (user) {
                    addAdminFromSearch(user);
                }
            });
        });
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

// Add admin from search result
async function addAdminFromSearch(user) {
    try {
        const confirm = await showConfirm(
            'Add Admin User',
            `Add ${user.username}${user.discriminator !== '0' ? '#' + user.discriminator : ''} as an admin?\n\nThey will have basic dashboard access. You can configure their permissions after adding them.`,
            'Yes, Add Admin',
            'Cancel',
            'success'
        );
        
        if (!confirm) return;
        
        const config = await window.getConfig();
        
        const response = await fetch(`${config.API_BASE}/permissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.API_SECRET}`
            },
            body: JSON.stringify({
                user_id: user.user_id,
                can_view_dashboard: true,
                can_view_users: false,
                can_delete_users: false,
                can_pullback: false,
                can_sync: false,
                can_manage_permissions: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server response:', response.status, errorData);
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        await showAlert('Success', 'Admin user added successfully! Click Edit to configure their permissions.', 'success');
        
        // Clear search and reload
        document.getElementById('user-search').value = '';
        document.getElementById('search-results').classList.add('hidden');
        
        await loadPermissions();
        await loadVerifiedUsers();
        
    } catch (error) {
        console.error('Error adding admin:', error);
        await showAlert('Error', `Failed to add admin user: ${error.message}`, 'error');
    }
}

// Load permissions table
async function loadPermissions() {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/permissions`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch permissions');

        const data = await response.json();
        const tbody = document.getElementById('permissions-body');
        
        if (data.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-8 text-center text-gray-400">
                        No admin users yet. Add one above to get started.
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.users.map(user => {
            const avatar = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.png`
                : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.user_id) >> 22n) % 6n}.png`;
            
            const checkIcon = '<svg class="w-5 h-5 text-green-400 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
            const xIcon = '<svg class="w-5 h-5 text-gray-600 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';
            
            return `
                <tr class="hover:bg-white/5">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${avatar}" class="w-10 h-10 border border-white/20" alt="${user.username}">
                            <div>
                                <div class="text-white font-medium">${user.username}${user.discriminator !== '0' ? '#' + user.discriminator : ''}</div>
                                <div class="text-xs text-gray-400">${user.user_id}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">${user.can_view_dashboard ? checkIcon : xIcon}</td>
                    <td class="px-6 py-4">${user.can_view_users ? checkIcon : xIcon}</td>
                    <td class="px-6 py-4">${user.can_delete_users ? checkIcon : xIcon}</td>
                    <td class="px-6 py-4">${user.can_pullback ? checkIcon : xIcon}</td>
                    <td class="px-6 py-4">${user.can_sync ? checkIcon : xIcon}</td>
                    <td class="px-6 py-4">${user.can_manage_permissions ? checkIcon : xIcon}</td>
                    <td class="px-6 py-4">
                        <div class="flex gap-2">
                            <button onclick="editPermissions('${user.user_id}')" class="px-3 py-1 text-sm border border-accent/40 text-accent hover:bg-accent/10 transition-colors">
                                Edit
                            </button>
                            <button onclick="removePermissions('${user.user_id}', '${user.username}')" class="px-3 py-1 text-sm border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors">
                                Remove
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading permissions:', error);
        const tbody = document.getElementById('permissions-body');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-red-400">
                    Error loading permissions. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Edit permissions
async function editPermissions(userId) {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/permissions?user_id=${userId}`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch user permissions');

        const data = await response.json();
        const user = data.user;
        
        currentEditUserId = userId;
        
        const avatar = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.user_id) >> 22n) % 6n}.png`;
        
        document.getElementById('edit-user-info').innerHTML = `
            <div class="flex items-center gap-3 p-3 border border-white/10 bg-black/20">
                <img src="${avatar}" class="w-12 h-12 border border-white/20" alt="${user.username}">
                <div>
                    <div class="text-white font-medium">${user.username}${user.discriminator !== '0' ? '#' + user.discriminator : ''}</div>
                    <div class="text-xs text-gray-400">${user.user_id}</div>
                </div>
            </div>
        `;
        
        document.getElementById('edit-dashboard').checked = user.can_view_dashboard;
        document.getElementById('edit-users').checked = user.can_view_users;
        document.getElementById('edit-delete').checked = user.can_delete_users;
        document.getElementById('edit-pullback').checked = user.can_pullback;
        document.getElementById('edit-sync').checked = user.can_sync;
        document.getElementById('edit-perms').checked = user.can_manage_permissions;
        
        document.getElementById('edit-modal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading user permissions:', error);
        await showAlert('Error', 'Failed to load user permissions', 'error');
    }
}

// Save permission changes
async function savePermissions() {
    if (!currentEditUserId) return;
    
    try {
        const config = await window.getConfig();
        const btn = document.getElementById('save-perms-btn');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        const response = await fetch(`${config.API_BASE}/permissions`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.API_SECRET}`
            },
            body: JSON.stringify({
                user_id: currentEditUserId,
                can_view_dashboard: document.getElementById('edit-dashboard').checked,
                can_view_users: document.getElementById('edit-users').checked,
                can_delete_users: document.getElementById('edit-delete').checked,
                can_pullback: document.getElementById('edit-pullback').checked,
                can_sync: document.getElementById('edit-sync').checked,
                can_manage_permissions: document.getElementById('edit-perms').checked
            })
        });

        if (!response.ok) throw new Error('Failed to update permissions');

        document.getElementById('edit-modal').classList.add('hidden');
        currentEditUserId = null;
        
        await loadPermissions();
        
        btn.disabled = false;
        btn.textContent = 'Save Changes';
        
    } catch (error) {
        console.error('Error saving permissions:', error);
        await showAlert('Error', 'Failed to save permissions', 'error');
        document.getElementById('save-perms-btn').disabled = false;
        document.getElementById('save-perms-btn').textContent = 'Save Changes';
    }
}

// Remove permissions
async function removePermissions(userId, username) {
    const confirmed = await showConfirm(
        'Remove Admin Access',
        `Are you sure you want to remove admin access for ${username}?\n\nThey will no longer be able to access the admin panel.`
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/permissions`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.API_SECRET}`
            },
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to remove permissions');
        }

        await showAlert('Success', 'Admin access removed successfully', 'success');
        
        await loadPermissions();
        await loadVerifiedUsers();
        
    } catch (error) {
        console.error('Error removing permissions:', error);
        await showAlert('Error', error.message, 'error');
    }
}

// Event listeners
document.getElementById('save-perms-btn').addEventListener('click', savePermissions);
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.add('hidden');
    currentEditUserId = null;
});

// Close modal on background click
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') {
        document.getElementById('edit-modal').classList.add('hidden');
        currentEditUserId = null;
    }
});

// Initialize
loadVerifiedUsers();
loadPermissions();
setupSearch();
