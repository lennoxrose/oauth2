// Dashboard functionality
async function loadStats() {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/stats`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('total-users').textContent = data.stats.total_users;
            document.getElementById('today-users').textContent = data.stats.verified_today;
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

async function loadRecentUsers() {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.users.length > 0) {
            const recentUsers = data.users.slice(0, 5);
            const container = document.getElementById('recent-users');
            
            container.innerHTML = recentUsers.map(user => {
                // Handle avatar URL - Discord CDN format
                let avatar;
                if (user.avatar && user.user_id) {
                    // Use avatar hash directly without modification
                    avatar = `https://cdn.discordapp.com/avatars/${user.user_id}/${user.avatar}.png`;
                } else {
                    // Default Discord avatar based on user ID
                    const defaultNum = user.user_id ? (parseInt(user.user_id) >> 22) % 6 : 0;
                    avatar = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
                }
                
                const date = new Date(parseInt(user.verified_at));
                const dateStr = date.toLocaleString();
                
                return `
                    <div class="flex items-center justify-between py-4 border-b border-white/10 last:border-0">
                        <div class="flex items-center gap-4">
                            <img src="${avatar}" onerror="this.onerror=null; this.src='https://cdn.discordapp.com/embed/avatars/0.png';" class="w-12 h-12 border border-white/10 object-cover" alt="${user.username}">
                            <div>
                                <p class="text-white font-semibold">${user.username}</p>
                                <p class="text-gray-400 text-sm">ID: ${user.user_id}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-gray-400 text-sm">${dateStr}</p>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            document.getElementById('recent-users').innerHTML = `
                <p class="text-gray-400 text-center py-8">No verified users yet</p>
            `;
        }
    } catch (err) {
        console.error('Failed to load recent users:', err);
        document.getElementById('recent-users').innerHTML = `
            <p class="text-red-400 text-center py-8">Failed to load users</p>
        `;
    }
}

// Load data on page load - wait for config first
if (document.getElementById('total-users')) {
    (async () => {
        await window.getConfig(); // Wait for config to load
        loadStats();
        loadRecentUsers();
    })();
}
