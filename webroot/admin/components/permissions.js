// Centralized Permissions Management System
const PERMISSIONS_CONFIG = {
    dashboard: {
        label: 'Dashboard',
        description: 'View dashboard statistics and overview',
        category: 'viewing',
        subPermissions: {}
    },
    users_view: {
        label: 'View Users',
        description: 'View list of verified users',
        category: 'viewing',
        subPermissions: {}
    },
    users_delete: {
        label: 'Delete Users',
        description: 'Remove users from the system',
        category: 'management',
        requiresParent: 'users_view',
        subPermissions: {}
    },
    pullback: {
        label: 'Pullback',
        description: 'Access pullback features',
        category: 'management',
        subPermissions: {}
    },
    sync: {
        label: 'Server Sync',
        description: 'Manage server synchronization',
        category: 'management',
        subPermissions: {
            sync_pullback_all: {
                label: 'Pullback All Users',
                description: 'Re-add all users who left the server'
            },
            sync_cleanup_deauth: {
                label: 'Remove Deauthorized',
                description: 'Remove users who revoked OAuth access'
            },
            sync_cleanup_all: {
                label: 'Remove All Verified',
                description: 'Remove all verified users from database'
            },
            sync_delete_all: {
                label: 'Nuclear Delete',
                description: 'Delete all data from all tables (dangerous!)'
            }
        }
    },
    settings_view: {
        label: 'View Settings',
        description: 'View bot configuration settings',
        category: 'settings',
        subPermissions: {
            settings_view_token: {
                label: 'View Bot Token',
                description: 'Can reveal and view the bot token'
            },
            settings_view_secret: {
                label: 'View Client Secret',
                description: 'Can reveal and view the OAuth client secret'
            }
        }
    },
    settings_edit: {
        label: 'Edit Settings',
        description: 'Modify bot configuration',
        category: 'settings',
        requiresParent: 'settings_view',
        subPermissions: {}
    },
    permissions: {
        label: 'Manage Permissions',
        description: 'Full admin - manage user permissions',
        category: 'admin',
        subPermissions: {}
    }
};

// Permission categories for UI grouping
const PERMISSION_CATEGORIES = {
    viewing: {
        label: 'Viewing',
        icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
        color: 'blue'
    },
    management: {
        label: 'Management',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        color: 'yellow'
    },
    settings: {
        label: 'Settings',
        icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
        color: 'purple'
    },
    admin: {
        label: 'Administration',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        color: 'red'
    }
};

// Check if user has a specific permission
function hasPermission(userPermissions, permissionKey) {
    if (!userPermissions) return false;
    
    // Check if it's a sub-permission (contains underscore after main permission)
    if (permissionKey.includes('_')) {
        const parts = permissionKey.split('_');
        // For sub-permissions like settings_view_token
        if (parts.length > 2) {
            const mainPerm = parts.slice(0, 2).join('_'); // settings_view
            const subPerm = permissionKey; // settings_view_token
            return userPermissions[mainPerm]?.subPermissions?.[subPerm] === true;
        }
    }
    
    return userPermissions[permissionKey]?.enabled === true;
}

// Check if user can access a specific page/feature
function canAccessPage(userPermissions, pageName) {
    const pagePermissionMap = {
        'dashboard': 'dashboard',
        'users': 'users_view',
        'pullback': 'pullback',
        'sync': 'sync',
        'settings': 'settings_view',
        'permissions': 'permissions'
    };
    
    const requiredPermission = pagePermissionMap[pageName];
    if (!requiredPermission) return false;
    
    return hasPermission(userPermissions, requiredPermission);
}

// Build permission object from form data
function buildPermissionObject(formData) {
    const permissions = {};
    
    Object.keys(PERMISSIONS_CONFIG).forEach(permKey => {
        const config = PERMISSIONS_CONFIG[permKey];
        const isEnabled = formData[permKey] === true;
        
        permissions[permKey] = {
            enabled: isEnabled,
            subPermissions: {}
        };
        
        // Handle sub-permissions
        if (isEnabled && Object.keys(config.subPermissions).length > 0) {
            Object.keys(config.subPermissions).forEach(subKey => {
                permissions[permKey].subPermissions[subKey] = formData[subKey] === true;
            });
        }
    });
    
    return permissions;
}

// Generate permission checkboxes HTML
function generatePermissionCheckboxes(userPermissions = null, readOnly = false) {
    const categories = {};
    
    // Group permissions by category
    Object.keys(PERMISSIONS_CONFIG).forEach(permKey => {
        const perm = PERMISSIONS_CONFIG[permKey];
        if (!categories[perm.category]) {
            categories[perm.category] = [];
        }
        categories[perm.category].push({ key: permKey, ...perm });
    });
    
    let html = '';
    
    Object.keys(PERMISSION_CATEGORIES).forEach(catKey => {
        const category = PERMISSION_CATEGORIES[catKey];
        const perms = categories[catKey] || [];
        
        if (perms.length === 0) return;
        
        html += `
            <div class="permission-category mb-6">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-${category.color}-500/20">
                    <svg class="w-5 h-5 text-${category.color}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${category.icon}"></path>
                    </svg>
                    <span class="font-semibold text-${category.color}-400">${category.label}</span>
                </div>
                <div class="space-y-3 pl-7">
        `;
        
        perms.forEach(perm => {
            const isChecked = userPermissions ? hasPermission(userPermissions, perm.key) : false;
            const hasSubPerms = Object.keys(perm.subPermissions).length > 0;
            
            html += `
                <div class="permission-item">
                    <label class="flex items-start gap-3 cursor-pointer group">
                        <div class="custom-checkbox ${readOnly ? 'pointer-events-none opacity-50' : ''}" data-permission="${perm.key}">
                            <input type="checkbox" 
                                   id="perm-${perm.key}" 
                                   name="${perm.key}" 
                                   ${isChecked ? 'checked' : ''} 
                                   ${readOnly ? 'disabled' : ''}
                                   class="hidden permission-checkbox">
                            <div class="checkbox-box">
                                <svg class="checkbox-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="font-medium text-white group-hover:text-accent transition-colors">${perm.label}</div>
                            <div class="text-sm text-gray-400">${perm.description}</div>
                        </div>
                    </label>
            `;
            
            // Add sub-permissions if they exist
            if (hasSubPerms && isChecked) {
                html += `<div class="sub-permissions ml-11 mt-2 pl-4 border-l-2 border-white/10 space-y-2" id="sub-${perm.key}">`;
                
                Object.keys(perm.subPermissions).forEach(subKey => {
                    const subPerm = perm.subPermissions[subKey];
                    const isSubChecked = userPermissions?.[perm.key]?.subPermissions?.[subKey] === true;
                    
                    html += `
                        <label class="flex items-start gap-3 cursor-pointer group">
                            <div class="custom-checkbox ${readOnly ? 'pointer-events-none opacity-50' : ''}" data-permission="${subKey}">
                                <input type="checkbox" 
                                       id="perm-${subKey}" 
                                       name="${subKey}" 
                                       ${isSubChecked ? 'checked' : ''} 
                                       ${readOnly ? 'disabled' : ''}
                                       class="hidden permission-checkbox sub-permission">
                                <div class="checkbox-box">
                                    <svg class="checkbox-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            </div>
                            <div class="flex-1">
                                <div class="text-sm font-medium text-gray-300 group-hover:text-accent transition-colors">${subPerm.label}</div>
                                <div class="text-xs text-gray-500">${subPerm.description}</div>
                            </div>
                        </label>
                    `;
                });
                
                html += `</div>`;
            }
            
            html += `</div>`;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    return html;
}

// Initialize custom checkboxes with event handlers
function initCustomCheckboxes() {
    document.querySelectorAll('.custom-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', function(e) {
            if (this.classList.contains('pointer-events-none')) return;
            
            const input = this.querySelector('input[type="checkbox"]');
            input.checked = !input.checked;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
            
            e.preventDefault();
        });
    });
    
    // Handle parent-child permission relationships
    document.querySelectorAll('.permission-checkbox:not(.sub-permission)').forEach(checkbox => {
        const permKey = checkbox.name;
        const subContainer = document.getElementById(`sub-${permKey}`);
        
        // Initialize visibility based on current state
        if (subContainer) {
            subContainer.style.display = checkbox.checked ? 'block' : 'none';
        }
        
        checkbox.addEventListener('change', function() {
            if (subContainer) {
                if (this.checked) {
                    subContainer.style.display = 'block';
                } else {
                    subContainer.style.display = 'none';
                    // Uncheck all sub-permissions
                    subContainer.querySelectorAll('input[type="checkbox"]').forEach(sub => {
                        sub.checked = false;
                    });
                }
            }
        });
    });
}

// Get all selected permissions from form
function getSelectedPermissions() {
    const formData = {};
    
    document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
        formData[checkbox.name] = checkbox.checked;
    });
    
    return buildPermissionObject(formData);
}

// Export functions
window.PermissionsManager = {
    config: PERMISSIONS_CONFIG,
    categories: PERMISSION_CATEGORIES,
    hasPermission,
    canAccessPage,
    buildPermissionObject,
    generatePermissionCheckboxes,
    initCustomCheckboxes,
    getSelectedPermissions
};
