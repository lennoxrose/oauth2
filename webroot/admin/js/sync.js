// Server Sync page functionality with permission checks
console.log('[DEBUG] sync.js loaded!');

const pullbackAllBtn = document.getElementById('pullback-all-btn');
const cleanupDeauthBtn = document.getElementById('cleanup-deauth-btn');
const cleanupAllBtn = document.getElementById('cleanup-all-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
const resultsDiv = document.getElementById('results');
const resultsContent = document.getElementById('results-content');
const loadingDiv = document.getElementById('loading');

// Initialize function with permission checks
async function initSync() {
    console.log('[DEBUG] initSync() called');
    
    // Wait for permissions to load
    let attempts = 0;
    while (!window.userPermissions && attempts < 50) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!window.userPermissions) {
        console.error('[ERROR] Failed to load user permissions');
        return;
    }
    
    console.log('[DEBUG] Permissions loaded, setting up sync page');
    setupEventListeners();
}

// Setup event listeners with permission checks
function setupEventListeners() {
    // Check and setup pullback all button
    if (hasSubPermission('sync', 'sync_pullback_all')) {
        pullbackAllBtn.addEventListener('click', handlePullbackAll);
    } else {
        pullbackAllBtn.disabled = true;
        pullbackAllBtn.classList.add('opacity-50', 'cursor-not-allowed');
        pullbackAllBtn.title = 'You do not have permission for this action';
    }
    
    // Check and setup cleanup deauth button
    if (hasSubPermission('sync', 'sync_cleanup_deauth')) {
        cleanupDeauthBtn.addEventListener('click', handleCleanupDeauth);
    } else {
        cleanupDeauthBtn.disabled = true;
        cleanupDeauthBtn.classList.add('opacity-50', 'cursor-not-allowed');
        cleanupDeauthBtn.title = 'You do not have permission for this action';
    }
    
    // Check and setup cleanup all button
    if (hasSubPermission('sync', 'sync_cleanup_all')) {
        cleanupAllBtn.addEventListener('click', handleCleanupAll);
    } else {
        cleanupAllBtn.disabled = true;
        cleanupAllBtn.classList.add('opacity-50', 'cursor-not-allowed');
        cleanupAllBtn.title = 'You do not have permission for this action';
    }
    
    // Check and setup delete all button
    if (hasSubPermission('sync', 'sync_delete_all')) {
        deleteAllBtn.addEventListener('click', handleDeleteAll);
    } else {
        deleteAllBtn.disabled = true;
        deleteAllBtn.classList.add('opacity-50', 'cursor-not-allowed');
        deleteAllBtn.title = 'You do not have permission for this action';
    }
}

// Helper to check sub-permissions
function hasSubPermission(mainPerm, subPerm) {
    if (!window.userPermissions) return false;
    const perm = window.userPermissions[mainPerm];
    if (!perm || !perm.enabled) return false;
    return perm.subPermissions?.[subPerm] === true;
}

// Custom modal functions
function showConfirmModal(title, message, icon = 'warning') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalIcon = document.getElementById('modal-icon');
        const confirmBtn = document.getElementById('modal-confirm');
        const cancelBtn = document.getElementById('modal-cancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Set icon based on type
        if (icon === 'warning') {
            modalIcon.innerHTML = `
                <svg class="w-12 h-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
            `;
        } else if (icon === 'danger') {
            modalIcon.innerHTML = `
                <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
            `;
            confirmBtn.className = 'flex-1 px-4 py-2 bg-red-500 border border-red-500 text-white hover:bg-red-600 transition-colors font-semibold';
        } else {
            modalIcon.innerHTML = `
                <svg class="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `;
            confirmBtn.className = 'flex-1 px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-black transition-colors font-semibold';
        }
        
        modal.classList.remove('hidden');
        
        const handleConfirm = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

function showInputModal(title, message, placeholder, expectedValue) {
    return new Promise((resolve) => {
        const modal = document.getElementById('input-modal');
        const modalTitle = document.getElementById('input-modal-title');
        const modalMessage = document.getElementById('input-modal-message');
        const inputField = document.getElementById('input-modal-field');
        const confirmBtn = document.getElementById('input-modal-confirm');
        const cancelBtn = document.getElementById('input-modal-cancel');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        inputField.placeholder = placeholder;
        inputField.value = '';
        
        modal.classList.remove('hidden');
        inputField.focus();
        
        const handleConfirm = () => {
            const value = inputField.value.trim();
            if (expectedValue && value !== expectedValue) {
                resolve(null);
            } else {
                resolve(value);
            }
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            inputField.removeEventListener('keypress', handleKeyPress);
        };
        
        const handleCancel = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            inputField.removeEventListener('keypress', handleKeyPress);
            resolve(null);
        };
        
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        inputField.addEventListener('keypress', handleKeyPress);
    });
}

// Action Handlers

// Pullback All Users Who Left
async function handlePullbackAll() {
    const confirmed = await showConfirmModal(
        'Pullback All Users',
        'This will re-add all verified users who have left the server. This may take some time. Continue?',
        'info'
    );
    
    if (!confirmed) return;
    
    showLoading();
    
    try {
        const config = await window.getConfig();
        
        // First, get list of users who left
        const pullbackData = await fetch(`${config.API_BASE}/pullback`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        
        if (!pullbackData.ok) throw new Error('Failed to fetch pullback data');
        
        const data = await pullbackData.json();
        const leftUsers = data.left_server || [];
        
        if (leftUsers.length === 0) {
            showResults({ pulled_back: 0 }, 'No users to pull back');
            return;
        }
        
        // Pull back each user
        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        
        for (const user of leftUsers) {
            try {
                const response = await fetch(`${config.API_BASE}/pullback`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.API_SECRET}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: user.user_id,
                        action: 'invite'
                    })
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failedCount++;
                    const errorData = await response.json();
                    errors.push(`${user.username}: ${errorData.error}`);
                }
            } catch (error) {
                failedCount++;
                errors.push(`${user.username}: ${error.message}`);
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        showResults({
            success_count: successCount,
            failed_count: failedCount,
            errors: errors.length > 0 ? errors : null
        }, 'Pullback completed');
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

// Handle Cleanup Deauthorized Users Only
async function handleCleanupDeauth() {
    const confirmed = await showConfirmModal(
        'Remove Deauthorized Users',
        'This will remove users who have deauthorized the application. Continue?',
        'warning'
    );
    
    if (!confirmed) return;
    
    showLoading();
    
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/cleanup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to cleanup users');
        }
        
        showResults(data, 'Cleanup completed');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

// Handle Cleanup All Verified Users
async function handleCleanupAll() {
    const confirmed1 = await showConfirmModal(
        'Remove ALL Verified Users',
        'This will remove ALL verified users from the database. This cannot be undone. Are you absolutely sure?',
        'danger'
    );
    
    if (!confirmed1) return;
    
    const inputValue = await showInputModal(
        'Confirm Dangerous Action',
        'Type "DELETE ALL USERS" to confirm this action:',
        'DELETE ALL USERS',
        'DELETE ALL USERS'
    );
    
    if (inputValue !== 'DELETE ALL USERS') {
        showError('Action cancelled - confirmation text did not match');
        return;
    }
    
    showLoading();
    
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/cleanup-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to cleanup all users');
        }
        
        showResults(data, 'All users removed');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

// Nuclear Delete Everything
async function handleDeleteAll() {
    const confirmed1 = await showConfirmModal(
        '⚠️ NUCLEAR OPTION ⚠️',
        'This will DELETE EVERYTHING from ALL tables. This includes verified users, pending assignments, admin permissions, and bot settings. This is IRREVERSIBLE. Are you absolutely certain?',
        'danger'
    );
    
    if (!confirmed1) return;
    
    const inputValue1 = await showInputModal(
        'First Confirmation',
        'Type "I UNDERSTAND THE RISK" to continue:',
        'I UNDERSTAND THE RISK',
        'I UNDERSTAND THE RISK'
    );
    
    if (inputValue1 !== 'I UNDERSTAND THE RISK') {
        showError('Action cancelled - confirmation text did not match');
        return;
    }
    
    const confirmed2 = await showConfirmModal(
        'Final Confirmation',
        'This is your LAST CHANCE to cancel. Deleting all data cannot be undone. Continue?',
        'danger'
    );
    
    if (!confirmed2) return;
    
    const inputValue2 = await showInputModal(
        'FINAL CONFIRMATION',
        'Type "DELETE EVERYTHING NOW" to execute:',
        'DELETE EVERYTHING NOW',
        'DELETE EVERYTHING NOW'
    );
    
    if (inputValue2 !== 'DELETE EVERYTHING NOW') {
        showError('Action cancelled - confirmation text did not match');
        return;
    }
    
    showLoading();
    
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/delete-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete all data');
        }
        
        showResults(data, 'All data deleted');
        
        // Logout after 5 seconds since permissions are deleted
        setTimeout(() => {
            alert('All data has been deleted. You will be logged out now.');
            window.location.href = '/admin/';
        }, 5000);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

// UI Helper Functions
function showLoading() {
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
}

function showResults(data, title) {
    loadingDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    
    let html = `<div class="space-y-4">`;
    
    if (data.deleted || data.removed || data.deleted_count) {
        html += `
            <div class="border border-green-500/20 bg-green-500/5 p-4">
                <p class="text-green-400 font-semibold">${title}</p>
                <p class="text-gray-300 mt-2">Removed: ${data.deleted || data.removed || data.deleted_count} users</p>
            </div>
        `;
    }
    
    if (data.pulled_back || data.success_count) {
        html += `
            <div class="border border-green-500/20 bg-green-500/5 p-4">
                <p class="text-green-400 font-semibold">${title}</p>
                <p class="text-gray-300 mt-2">Successfully pulled back: ${data.pulled_back || data.success_count} users</p>
                ${data.failed_count ? `<p class="text-yellow-400 mt-1">Failed: ${data.failed_count} users</p>` : ''}
            </div>
        `;
    }
    
    if (data.errors && data.errors.length > 0) {
        html += `
            <div class="border border-red-500/20 bg-red-500/5 p-4">
                <p class="text-red-400 font-semibold">Errors:</p>
                <ul class="list-disc list-inside text-gray-300 mt-2">
                    ${data.errors.map(err => `<li>${err}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    html += `</div>`;
    
    resultsContent.innerHTML = html;
}

function showError(message) {
    loadingDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    
    resultsContent.innerHTML = `
        <div class="border border-red-500/20 bg-red-500/5 p-4">
            <p class="text-red-400 font-semibold">Error</p>
            <p class="text-gray-300 mt-2">${message}</p>
        </div>
    `;
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSync);
} else {
    initSync();
}
