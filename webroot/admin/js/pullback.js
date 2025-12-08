// Pullback page functionality
let pullbackData = null;

async function loadPullbackUsers() {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/pullback`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            pullbackData = data;
            displayPullbackData(data);
            updateCounts(data.counts);
        } else {
            showError('Failed to load pullback data');
        }
    } catch (err) {
        console.error('Failed to load pullback data:', err);
        showError('Failed to load data: ' + err.message);
    }
}

function updateCounts(counts) {
    document.getElementById('total-count').textContent = counts.total;
    document.getElementById('in-server-count').textContent = counts.in_server;
    document.getElementById('left-server-count').textContent = counts.left_server;
}

function displayPullbackData(data) {
    displayUserList(data.in_server, 'in-server-list', 'in_server');
    displayUserList(data.left_server, 'left-server-list', 'left_server');
}

function displayUserList(users, containerId, listType) {
    const container = document.getElementById(containerId);
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-400">
                No users in this category
            </div>
        `;
        return;
    }
    
    container.innerHTML = users.map(user => {
        const date = new Date(parseInt(user.verified_at));
        const dateStr = date.toLocaleDateString();
        
        // Handle avatar URL
        let avatar;
        if (user.avatar && user.user_id) {
            avatar = `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.png`;
        } else {
            const defaultNum = user.user_id ? (parseInt(user.user_id) >> 22) % 6 : 0;
            avatar = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
        }
        
        // Status badge
        let statusBadge = '';
        let actionButton = '';
        
        if (listType === 'in_server') {
            if (user.has_verified_role) {
                statusBadge = '<span class="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30">✓ Has Role</span>';
                actionButton = '<button disabled class="px-4 py-2 border border-gray-500/20 text-gray-500 cursor-not-allowed">Already Verified</button>';
            } else {
                statusBadge = '<span class="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">⚠ Missing Role</span>';
                actionButton = `<button onclick="addRole('${user.user_id}', '${escapeHtml(user.username)}')" class="px-4 py-2 border border-accent/20 text-accent hover:bg-accent/5 transition-colors">Add Role</button>`;
            }
        } else {
            statusBadge = '<span class="px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30">✗ Left Server</span>';
            actionButton = `<button onclick="pullbackUser('${user.user_id}', '${escapeHtml(user.username)}')" class="px-4 py-2 bg-accent/20 border border-accent text-accent hover:bg-accent/30 transition-colors font-semibold">Pull Back</button>`;
        }
        
        return `
            <div class="p-6 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <img src="${avatar}" onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png';" class="w-12 h-12 border border-white/10 object-cover" alt="${user.username}">
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="text-white font-semibold">${escapeHtml(user.display_name || user.username)}</p>
                                ${statusBadge}
                            </div>
                            <p class="text-gray-400 text-sm blur-users">ID: ${user.user_id}</p>
                            <p class="text-gray-500 text-xs">Verified: ${dateStr}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        ${actionButton}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Custom confirm modal (matches permissions page style)
function showConfirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmStyle = 'primary') {
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
        } else if (confirmStyle === 'danger') {
            yesBtn.className = 'flex-1 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors font-semibold';
        } else {
            yesBtn.className = 'flex-1 px-4 py-2 bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 transition-colors font-semibold';
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

async function pullbackUser(userId, username) {
    const confirmed = await showConfirm(
        'Pull Back User',
        `Are you sure you want to pull back ${username} to the server?\n\nThis will re-add them using their OAuth2 token and assign the verified role.`,
        'Pull Back',
        'Cancel',
        'primary'
    );
    
    if (!confirmed) return;
    
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Processing...';
    
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/pullback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                action: 'invite'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            // Reload data to update lists
            setTimeout(() => loadPullbackUsers(), 1000);
        } else {
            showError(data.error || 'Failed to pull back user');
            button.disabled = false;
            button.textContent = 'Pull Back';
        }
    } catch (err) {
        console.error('Pullback error:', err);
        showError('Failed to pull back user: ' + err.message);
        button.disabled = false;
        button.textContent = 'Pull Back';
    }
}

async function addRole(userId, username) {
    const confirmed = await showConfirm(
        'Add Verified Role',
        `Add verified role to ${username}?\n\nThis will remove the unverified role if they have it.`,
        'Add Role',
        'Cancel',
        'success'
    );
    
    if (!confirmed) return;
    
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Adding...';
    
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/pullback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                action: 'add_role'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            // Reload data to update lists
            setTimeout(() => loadPullbackUsers(), 1000);
        } else {
            showError(data.error || 'Failed to add role');
            button.disabled = false;
            button.textContent = 'Add Role';
        }
    } catch (err) {
        console.error('Add role error:', err);
        showError('Failed to add role: ' + err.message);
        button.disabled = false;
        button.textContent = 'Add Role';
    }
}

function showSuccess(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-500/40 text-green-400 px-6 py-4 z-50 max-w-md';
    notification.innerHTML = `
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
                <p class="font-semibold">Success</p>
                <p class="text-sm">${message}</p>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500/20 border border-red-500/40 text-red-400 px-6 py-4 z-50 max-w-md';
    notification.innerHTML = `
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
                <p class="font-semibold">Error</p>
                <p class="text-sm">${message}</p>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// Load users on page load - wait for config first
(async () => {
    await window.getConfig();
    loadPullbackUsers();
})();
