// Auth check and session management
// API_BASE, API_SECRET, and ADMIN_USER_ID are defined in config.js

// DEBUG MODE - Set to true to test permissions even as owner
const DEBUG_PERMISSIONS = true; // Change to true to test permission restrictions

// Store user permissions globally
let userPermissions = null;

async function fetchUserPermissions(userId) {
    try {
        const config = await window.getConfig();
        const response = await fetch(`${config.API_BASE}/permissions/${userId}`, {
            headers: {
                'Authorization': `Bearer ${config.API_SECRET}`
            }
        });
        
        if (!response.ok) {
            console.warn('No admin permissions found for user:', userId);
            // User has no admin permissions
            return null;
        }
        
        const data = await response.json();
        // API returns { success: true, user: { discord_id, username, permissions: {...} } }
        return data.user?.permissions || null;
    } catch (error) {
        console.error('Error fetching permissions:', error);
        // Don't fail completely, just return null
        return null;
    }
}

function checkAuth() {
    const session = localStorage.getItem('admin_session');
    
    if (!session) {
        window.location.href = '/admin/';
        return null;
    }
    
    const data = JSON.parse(session);
    
    // Get ADMIN_USER_ID from window (loaded by config.js)
    const isOwner = window.ADMIN_USER_ID && data.user_id === window.ADMIN_USER_ID;
    
    if (data.expires < Date.now()) {
        localStorage.removeItem('admin_session');
        window.location.href = '/admin/';
        return null;
    }
    
    return data;
}

// Helper function to check if user has a specific permission
function hasPermission(permissions, permissionKey) {
    if (!permissions) return false;
    return permissions[permissionKey]?.enabled === true;
}

// Show custom permission denied modal with countdown
function showPermissionDenied(pageName, redirectUrl) {
    return new Promise((resolve) => {
        // Create modal HTML
        const modalHTML = `
            <div id="permission-denied-modal" class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999]">
                <div class="bg-black border-2 border-red-500/40 p-8 max-w-md w-full mx-4">
                    <div class="text-center">
                        <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <h2 class="text-2xl font-bold text-red-400 mb-3">Error 403</h2>
                        <p class="text-gray-300 mb-6">You don't have permission to view ${pageName}</p>
                        <button id="permission-denied-btn" class="w-full px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors font-semibold">
                            Redirecting in <span id="countdown">3</span>s
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        let countdown = 3;
        const countdownEl = document.getElementById('countdown');
        const btn = document.getElementById('permission-denied-btn');
        
        const timer = setInterval(() => {
            countdown--;
            countdownEl.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                window.location.href = redirectUrl;
                resolve();
            }
        }, 1000);
        
        btn.addEventListener('click', () => {
            clearInterval(timer);
            window.location.href = redirectUrl;
            resolve();
        });
    });
}

// Check if user can access current page - BLOCKING VERSION
async function checkPageAccess() {
    // Hide body content immediately until auth completes
    document.body.style.visibility = 'hidden';
    
    const session = checkAuth();
    if (!session) return;
    
    // Get ADMIN_USER_ID from window (loaded by config.js)
    const ADMIN_USER_ID = window.ADMIN_USER_ID;
    
    // Owner has access to everything (unless DEBUG mode is on)
    if (ADMIN_USER_ID && session.user_id === ADMIN_USER_ID && !DEBUG_PERMISSIONS) {
        // Set full permissions for owner
        userPermissions = {
            dashboard: { enabled: true, subPermissions: {} },
            users_view: { enabled: true, subPermissions: {} },
            users_delete: { enabled: true, subPermissions: {} },
            pullback: { enabled: true, subPermissions: {} },
            sync: { 
                enabled: true, 
                subPermissions: {
                    sync_pullback_all: true,
                    sync_cleanup_deauth: true,
                    sync_cleanup_all: true,
                    sync_delete_all: true
                }
            },
            settings_view: { 
                enabled: true, 
                subPermissions: {
                    settings_view_token: true,
                    settings_view_secret: true
                }
            },
            settings_edit: { enabled: true, subPermissions: {} },
            permissions: { enabled: true, subPermissions: {} }
        };
        document.body.style.visibility = 'visible';
        return true;
    }
    
    // Load permissions
    userPermissions = await fetchUserPermissions(session.user_id);
    
    if (!userPermissions) {
        // No permissions found
        alert('You do not have permission to access the admin panel.');
        logout();
        return false;
    }
    
    // Check page-specific access
    const currentPage = window.location.pathname;
    let requiredPermission = null;
    let pageName = '';
    
    // Dashboard check - match /admin/dashboard/ but not subdirectories
    if (currentPage.includes('/dashboard/') && !currentPage.includes('/dashboard/users') && 
        !currentPage.includes('/dashboard/permissions') && !currentPage.includes('/dashboard/settings') &&
        !currentPage.includes('/dashboard/pullback') && !currentPage.includes('/dashboard/sync')) {
        requiredPermission = 'dashboard';
        pageName = 'Dashboard';
    } else if (currentPage.includes('/permissions')) {
        requiredPermission = 'permissions';
        pageName = 'Permissions';
    } else if (currentPage.includes('/users')) {
        requiredPermission = 'users_view';
        pageName = 'Users';
    } else if (currentPage.includes('/pullback')) {
        requiredPermission = 'pullback';
        pageName = 'Pullback';
    } else if (currentPage.includes('/sync')) {
        requiredPermission = 'sync';
        pageName = 'Server Sync';
    } else if (currentPage.includes('/settings')) {
        requiredPermission = 'settings_view';
        pageName = 'Settings';
    }
    
    // Check if user has the required permission
    if (requiredPermission && !hasPermission(userPermissions, requiredPermission)) {
        // Find a page they CAN access
        const availablePages = [
            { key: 'dashboard', url: '/admin/dashboard/' },
            { key: 'users_view', url: '/admin/dashboard/users/' },
            { key: 'pullback', url: '/admin/dashboard/pullback/' },
            { key: 'sync', url: '/admin/dashboard/sync/' },
            { key: 'settings_view', url: '/admin/dashboard/settings/' },
            { key: 'permissions', url: '/admin/dashboard/permissions/' }
        ];
        
        const firstAvailable = availablePages.find(page => hasPermission(userPermissions, page.key));
        
        if (firstAvailable) {
            await showPermissionDenied(pageName, firstAvailable.url);
        } else {
            // No pages available - log out
            await showPermissionDenied('any admin pages', '/admin/');
            logout();
        }
        return false;
    }
    
    // Permission check passed - show content
    document.body.style.visibility = 'visible';
    
    // Apply UI restrictions based on permissions
    applyPermissionRestrictions();
    
    return true;
}

// Apply UI restrictions based on permissions
function applyPermissionRestrictions() {
    if (!userPermissions) return;
    
    const session = checkAuth();
    const ADMIN_USER_ID = window.ADMIN_USER_ID;
    const isOwner = session && ADMIN_USER_ID && session.user_id === ADMIN_USER_ID && !DEBUG_PERMISSIONS;
    
    // ALWAYS blur emails on users page for security (even for owner in debug mode)
    const currentPage = window.location.pathname;
    if (currentPage.includes('/users')) {
        blurEmails();
    }
    
    // Owner has no other restrictions (unless debug mode)
    if (isOwner) return;
    
    // Blur user data if no users_view permission
    if (!hasPermission(userPermissions, 'users_view')) {
        blurUserData();
    }
    
    // Make settings read-only if no edit permission
    if (!hasPermission(userPermissions, 'settings_edit')) {
        makeSettingsReadOnly();
    }
    
    // Hide token/secret show buttons if no view permission
    if (!hasPermission(userPermissions, 'settings_view')) {
        hideSecretButtons();
    } else {
        // Has view permission - check sub-permissions
        const subPerms = userPermissions.settings_view?.subPermissions || {};
        if (!subPerms.settings_view_token) {
            hideTokenButton();
        }
        if (!subPerms.settings_view_secret) {
            hideSecretButton();
        }
    }
}

// Blur user data when hovering
function blurUserData() {
    const style = document.createElement('style');
    style.id = 'blur-users-style';
    style.textContent = `
        .blur-users-no-hover { filter: blur(8px) !important; transition: none !important; cursor: not-allowed !important; }
    `;
    document.head.appendChild(style);
    
    // Apply blur to user tables, cards, and specific elements on all pages
    setTimeout(() => {
        // Dashboard recent users
        document.querySelectorAll('#recent-users').forEach(el => {
            el.classList.add('blur-users-no-hover');
        });
        
        // Permissions page users
        document.querySelectorAll('#permissions-body').forEach(el => {
            el.classList.add('blur-users-no-hover');
        });
        
        // Users page - entire table
        document.querySelectorAll('#users-table tbody, .user-card, .user-list').forEach(el => {
            el.classList.add('blur-users-no-hover');
        });
        
        // Pullback page - user selection dropdown and info
        document.querySelectorAll('#user-select, .user-info, [id*="user"]').forEach(el => {
            if (!el.id.includes('user-search') && !el.id.includes('user-info')) {
                el.classList.add('blur-users-no-hover');
            }
        });
        
        // Settings page - owner/user info if present
        document.querySelectorAll('.user-mention, .discord-user, [class*="user-"]').forEach(el => {
            el.classList.add('blur-users-no-hover');
        });
    }, 100);
}

// Always blur emails on users page (security measure)
function blurEmails() {
    const style = document.createElement('style');
    style.id = 'blur-email-style';
    style.textContent = `
        .blur-email { 
            filter: blur(5px); 
            transition: filter 0.3s; 
            cursor: pointer; 
            user-select: none; 
            position: relative;
        }
        .blur-email:hover { filter: blur(0); }
        .blur-email-icon {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            width: 16px;
            height: 16px;
        }
        .blur-email:hover .blur-email-icon { opacity: 1; }
    `;
    document.head.appendChild(style);
    
    // Wait for table to be populated, then blur emails
    const observer = new MutationObserver(() => {
        const emailCells = document.querySelectorAll('#users-table td:nth-child(3)'); // 3rd column is email
        emailCells.forEach(cell => {
            if (!cell.classList.contains('blur-email') && cell.textContent.trim() && cell.textContent !== 'Email') {
                cell.classList.add('blur-email');
                cell.style.position = 'relative';
                
                // Add eye icon
                const icon = document.createElement('svg');
                icon.className = 'blur-email-icon';
                icon.setAttribute('fill', 'none');
                icon.setAttribute('stroke', 'currentColor');
                icon.setAttribute('viewBox', '0 0 24 24');
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
                cell.appendChild(icon);
            }
        });
    });
    
    // Observe the users table for changes
    const usersTable = document.getElementById('users-table');
    if (usersTable) {
        observer.observe(usersTable, { childList: true, subtree: true });
        
        // Also apply immediately in case table is already populated
        setTimeout(() => {
            const emailCells = document.querySelectorAll('#users-table td:nth-child(3)');
            emailCells.forEach(cell => {
                if (!cell.classList.contains('blur-email') && cell.textContent.trim() && cell.textContent !== 'Email') {
                    cell.classList.add('blur-email');
                    cell.style.position = 'relative';
                    
                    // Add eye icon
                    const icon = document.createElement('svg');
                    icon.className = 'blur-email-icon';
                    icon.setAttribute('fill', 'none');
                    icon.setAttribute('stroke', 'currentColor');
                    icon.setAttribute('viewBox', '0 0 24 24');
                    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
                    cell.appendChild(icon);
                }
            });
        }, 500);
    }
}

// Make settings inputs read-only
function makeSettingsReadOnly() {
    setTimeout(() => {
        // Convert all inputs to read-only divs that LOOK like inputs but aren't editable
        document.querySelectorAll('input[id^="token"], input[id^="client_"], input[id^="prefix"], input[id^="owner_"], input[id^="guild_"], input[id^="redirect_"], input[id^="web_"], input[id^="verified_"], input[id^="unverified_"]').forEach(input => {
            // Create a read-only div styled like the input
            const readOnlyDiv = document.createElement('div');
            readOnlyDiv.className = input.className + ' cursor-not-allowed opacity-70 bg-black/80';
            readOnlyDiv.textContent = input.value || input.placeholder;
            readOnlyDiv.style.cssText = 'padding: 0.5rem 1rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.6); color: #9ca3af; pointer-events: none;';
            
            // Replace input with div
            input.parentNode.replaceChild(readOnlyDiv, input);
        });
        
        // Hide save buttons and undo buttons
        document.querySelectorAll('[onclick*="saveAllSections"], [onclick*="undoChanges"], #unsaved-toast').forEach(el => {
            el.style.display = 'none';
        });
    }, 200);
}

// Hide show/hide buttons for secrets
function hideSecretButtons() {
    setTimeout(() => {
        document.querySelectorAll('[onclick*="togglePasswordVisibility"]').forEach(btn => {
            btn.style.display = 'none';
        });
    }, 100);
}

function hideTokenButton() {
    setTimeout(() => {
        const tokenBtn = document.querySelector('[onclick*="togglePasswordVisibility(\'token\')"]');
        if (tokenBtn) tokenBtn.style.display = 'none';
    }, 100);
}

function hideSecretButton() {
    setTimeout(() => {
        const secretBtn = document.querySelector('[onclick*="togglePasswordVisibility(\'client_secret\')"]');
        if (secretBtn) secretBtn.style.display = 'none';
    }, 100);
}

function logout() {
    localStorage.removeItem('admin_session');
    window.location.href = '/admin/index.html';
}

// Hide navigation items based on permissions
function hideUnauthorizedNavItems() {
    if (!userPermissions) return;
    
    const session = checkAuth();
    const isOwner = session && window.ADMIN_USER_ID && session.user_id === window.ADMIN_USER_ID;
    
    // Owner can see everything (unless DEBUG mode)
    if (isOwner && !DEBUG_PERMISSIONS) return;
    
    // Map of nav item IDs to required permissions
    const navPermissions = {
        'dashboard': 'dashboard',
        'users': 'users_view',
        'pullback': 'pullback',
        'sync': 'sync',
        'settings': 'settings_view',
        'permissions': 'permissions'
    };
    
    // Hide nav items based on permissions
    Object.keys(navPermissions).forEach(navId => {
        const links = document.querySelectorAll(`a[href*="/${navId}"]`);
        links.forEach(link => {
            if (!hasPermission(userPermissions, navPermissions[navId])) {
                link.style.display = 'none';
            }
        });
    });
}

// Display user info
const session = checkAuth();
if (session) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        // Use avatar hash directly without modification
        const avatar = session.avatar 
            ? `https://cdn.discordapp.com/avatars/${session.user_id}/${session.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${(parseInt(session.user_id) >> 22) % 6}.png`;
        
        const isOwner = session.user_id === window.ADMIN_USER_ID;
        
        userInfo.innerHTML = `
            <img src="${avatar}" class="w-10 h-10 border border-white/10" alt="Avatar">
            <div>
                <p class="text-white font-semibold text-sm">${session.username}</p>
                <p class="text-gray-400 text-xs">${isOwner ? 'Owner' : 'Admin'}</p>
            </div>
        `;
    }
    
    // Load permissions and check page access ONLY if we have a valid session
    (async () => {
        try {
            await checkPageAccess();
            
            // Export permissions after they're loaded
            window.userPermissions = userPermissions;
            
            hideUnauthorizedNavItems();
            
            // Set up logout button after sidebar is loaded
            setTimeout(() => {
                const logoutButton = document.getElementById('logout-button');
                if (logoutButton) {
                    logoutButton.addEventListener('click', logout);
                }
            }, 500);
        } catch (error) {
            console.error('Permission check failed:', error);
            // Don't redirect on error, just show content
            document.body.style.visibility = 'visible';
        }
    })();
} else {
    // No session - checkAuth() already redirected to /admin/
    console.log('No session found, should redirect to login');
}

// Export for use in other scripts
window.checkPageAccess = checkPageAccess;
window.hasPermission = hasPermission;
