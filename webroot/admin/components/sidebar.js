// Centralized sidebar management and version control
const SCRIPT_VERSION = 36; // Update this single number to cache-bust all JS files

// Sidebar configuration
const SIDEBAR_PAGES = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/admin/dashboard/',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
        id: 'users',
        label: 'Verified Users',
        href: '/admin/dashboard/users/',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
    },
    {
        id: 'pullback',
        label: 'Pullback',
        href: '/admin/dashboard/pullback/',
        icon: 'M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z'
    },
    {
        id: 'sync',
        label: 'Server Sync',
        href: '/admin/dashboard/sync/',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
    },
    {
        id: 'settings',
        label: 'Bot Settings',
        href: '/admin/dashboard/settings/',
        icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
        id: 'permissions',
        label: 'Permissions',
        href: '/admin/dashboard/permissions/',
        icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
    }
];

// Function to generate sidebar HTML
function generateSidebar(activePage) {
    const navItems = SIDEBAR_PAGES.map(page => {
        const isActive = page.id === activePage;
        const classes = isActive 
            ? 'flex items-center gap-3 px-4 py-3 mb-2 bg-accent/10 border border-accent/20 text-accent'
            : 'flex items-center gap-3 px-4 py-3 mb-2 border border-white/10 hover:bg-white/5 transition-colors';
        
        return `
            <a href="${page.href}" class="${classes}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${page.icon}"></path>
                </svg>
                <span${isActive ? ' class="font-semibold"' : ''}>${page.label}</span>
            </a>
        `;
    }).join('');

    // All pages should have full-height sidebar
    const asideClasses = 'w-64 flex-shrink-0 border-r border-white/10 bg-black/40 flex flex-col h-screen overflow-y-auto';
    const headerClasses = 'p-6 border-b border-white/10 flex-shrink-0';
    const navClasses = 'flex-1 p-4 overflow-y-auto';
    const footerClasses = 'p-4 border-t border-white/10 flex-shrink-0';

    return `
        <aside class="${asideClasses}">
            <div class="${headerClasses}">
                <h1 class="text-2xl font-bold text-white">Admin <span class="text-accent">Panel</span></h1>
                <div id="user-info" class="mt-4 flex items-center gap-3">
                    <!-- User info will be inserted here -->
                </div>
            </div>
            
            <nav class="${navClasses}">
                ${navItems}
            </nav>
            
            <div class="${footerClasses}">
                <button id="logout-button" class="w-full px-4 py-3 border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    `;
}

// Function to load sidebar on page load
function initSidebar(activePage) {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = generateSidebar(activePage);
    } else {
        console.error('Sidebar container not found! Add <div id="sidebar-container"></div> to your HTML.');
    }
}

// Function to load versioned scripts
function loadVersionedScripts() {
    const scripts = [
        '../js/config.js',
        '../js/auth.js',
        '../js/settings.js'
    ];

    scripts.forEach(src => {
        const script = document.createElement('script');
        script.src = `${src}?v=${SCRIPT_VERSION}`;
        document.body.appendChild(script);
    });
}

// Export for use in HTML pages
window.initSidebar = initSidebar;
window.SCRIPT_VERSION = SCRIPT_VERSION;
