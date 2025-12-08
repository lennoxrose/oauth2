// Users page functionality
let allUsers = [];

async function loadUsers() {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            displayUsers(allUsers);
        } else {
            showError('Failed to load users');
        }
    } catch (err) {
        console.error('Failed to load users:', err);
        showError('Failed to load users: ' + err.message);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('users-table');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-gray-400">No verified users found</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const date = new Date(parseInt(user.verified_at));
        const dateStr = date.toLocaleString();
        
        // Handle avatar URL - Discord CDN format
        let avatar;
        if (user.avatar && user.user_id) {
            // Use avatar hash directly
            avatar = `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.png`;
        } else {
            const defaultNum = user.user_id ? (parseInt(user.user_id) >> 22) % 6 : 0;
            avatar = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
        }
        
        return `
            <tr class="border-b border-white/10 hover:bg-white/5">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <img src="${avatar}" onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png';" class="w-10 h-10 border border-white/10 object-cover" alt="${user.username}">
                        <div>
                            <p class="text-white font-semibold">${user.username}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <code class="text-accent text-sm">${user.user_id}</code>
                </td>
                <td class="p-4">
                    <span class="text-gray-300">${user.email || 'N/A'}</span>
                </td>
                <td class="p-4">
                    <span class="text-gray-400 text-sm">${dateStr}</span>
                </td>
                <td class="p-4">
                    <button onclick="deleteUser('${user.user_id}', '${user.username}')" class="px-3 py-1 text-sm border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-colors">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete ${username}?`)) {
        return;
    }
    
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Successfully deleted ${username}`);
            loadUsers(); // Reload users
        } else {
            alert('Failed to delete user');
        }
    } catch (err) {
        console.error('Failed to delete user:', err);
        alert('Failed to delete user: ' + err.message);
    }
}

function showError(message) {
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="p-8 text-center text-red-400">${message}</td>
        </tr>
    `;
}

// Search functionality
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    
    if (!query) {
        displayUsers(allUsers);
        return;
    }
    
    const filtered = allUsers.filter(user => 
        user.username.toLowerCase().includes(query) ||
        user.user_id.includes(query) ||
        (user.email && user.email.toLowerCase().includes(query))
    );
    
    displayUsers(filtered);
});

// Load users on page load - wait for config first
(async () => {
    await window.getConfig();
    loadUsers();
})();
