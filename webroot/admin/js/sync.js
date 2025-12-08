// Sync page functionality
const cleanupDeauthBtn = document.getElementById('cleanup-deauth-btn');
const cleanupAllBtn = document.getElementById('cleanup-all-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
const resultsDiv = document.getElementById('results');
const resultsContent = document.getElementById('results-content');
const loadingDiv = document.getElementById('loading');

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

// Handle Cleanup Deauthorized Users Only
cleanupDeauthBtn.addEventListener('click', async () => {
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
});

// Handle Cleanup All Verified Users
cleanupAllBtn.addEventListener('click', async () => {
    const confirmed1 = await showConfirmModal(
        'Remove ALL Verified Users',
        'This will remove ALL verified users from the database. This action cannot be undone. Continue?',
        'warning'
    );
    
    if (!confirmed1) return;
    
    const confirmed2 = await showConfirmModal(
        'FINAL WARNING',
        'You are about to delete ALL verified users. Are you absolutely sure?',
        'danger'
    );
    
    if (!confirmed2) return;
    
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
            throw new Error(data.error || 'Failed to remove all users');
        }
        
        showResults(data, 'All users removed');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
});

// Handle Nuclear Delete Everything
deleteAllBtn.addEventListener('click', async () => {
    const confirmText = await showInputModal(
        'NUCLEAR OPTION',
        'This will DELETE EVERYTHING from the database. Type "DELETE EVERYTHING" to confirm:',
        'Type DELETE EVERYTHING',
        'DELETE EVERYTHING'
    );
    
    if (confirmText !== 'DELETE EVERYTHING') {
        if (confirmText !== null) {
            await showConfirmModal('Cancelled', 'Deletion cancelled - confirmation text did not match', 'info');
        }
        return;
    }
    
    const finalConfirm = await showConfirmModal(
        'ABSOLUTELY FINAL WARNING',
        'You are about to PERMANENTLY DELETE ALL DATA. Continue?',
        'danger'
    );
    
    if (!finalConfirm) return;
    
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
            throw new Error(data.error || 'Failed to delete users');
        }
        
        showResults(data, 'Nuclear option executed');
    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
});

function showLoading() {
    resultsDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
}

function showResults(data, actionMessage) {
    loadingDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    
    if (data.success) {
        let html = `
            <div class="bg-green-500/10 border border-green-500/20 p-4 mb-4">
                <p class="text-green-400 font-semibold">${actionMessage || data.message}</p>
            </div>
        `;
        
        if (data.deleted_count !== undefined) {
            html += `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-white/10 p-4">
                        <div class="text-3xl font-bold text-accent mb-1">${data.deleted_count}</div>
                        <div class="text-sm text-gray-400">Users Removed</div>
                    </div>
                    <div class="border border-white/10 p-4">
                        <div class="text-3xl font-bold text-white mb-1">${data.remaining_count || 0}</div>
                        <div class="text-sm text-gray-400">Users Remaining</div>
                    </div>
                </div>
            `;
        }
        
        if (data.deleted_users && data.deleted_users.length > 0) {
            html += `
                <div class="mt-4">
                    <h4 class="text-white font-semibold mb-2">Removed Users:</h4>
                    <div class="space-y-2">
                        ${data.deleted_users.map(user => `
                            <div class="border border-white/10 p-3 flex items-center gap-3">
                                <div class="text-sm">
                                    <span class="text-white">${user.username || 'Unknown'}#${user.discriminator || '0000'}</span>
                                    <span class="text-gray-400 ml-2">(${user.user_id})</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        resultsContent.innerHTML = html;
    } else {
        showError(data.error || 'Operation failed');
    }
}

function showError(message) {
    loadingDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    
    resultsContent.innerHTML = `
        <div class="bg-red-500/10 border border-red-500/20 p-4">
            <p class="text-red-400 font-semibold">${message}</p>
        </div>
    `;
}
