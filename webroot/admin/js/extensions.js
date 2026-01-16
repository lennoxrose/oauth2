// Extensions page functionality
console.log('[DEBUG] extensions.js loaded!');

const extensionsGrid = document.getElementById('extensions-grid');
const loadingDiv = document.getElementById('loading');
const noExtensionsDiv = document.getElementById('no-extensions');

async function loadExtensions() {
    console.log('[DEBUG] Loading extensions...');
    
    try {
        // Scan for extensions by checking known directories
        const extensions = await scanExtensionDirectories();
        
        loadingDiv.classList.add('hidden');
        
        if (extensions.length === 0) {
            noExtensionsDiv.classList.remove('hidden');
            return;
        }
        
        renderExtensions(extensions);
        
    } catch (error) {
        console.error('[ERROR] Failed to load extensions:', error);
        loadingDiv.classList.add('hidden');
        noExtensionsDiv.classList.remove('hidden');
    }
}

async function scanExtensionDirectories() {
    const extensions = [];
    const baseUrl = '/admin/dashboard/extensions';
    
    // List of potential extension folders to check
    // Add more folder names here as you create new extensions
    const potentialExtensions = [
        'pterodactyl',
        // Add more extension folder names here
    ];
    
    for (const folder of potentialExtensions) {
        try {
            const response = await fetch(`${baseUrl}/${folder}/display.json`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.title && data.description) {
                    data.folder = folder;
                    extensions.push(data);
                    console.log(`[DEBUG] Found extension: ${folder}`);
                }
            }
        } catch (error) {
            // Extension doesn't exist or display.json is invalid, skip it
            console.log(`[DEBUG] Extension not found or invalid: ${folder}`);
        }
    }
    
    return extensions;
}

function renderExtensions(extensions) {
    extensionsGrid.innerHTML = '';
    
    extensions.forEach(ext => {
        const card = createExtensionCard(ext);
        extensionsGrid.appendChild(card);
    });
    
    extensionsGrid.classList.remove('hidden');
}

function createExtensionCard(extension) {
    const card = document.createElement('div');
    card.className = 'border border-white/10 bg-black/40 p-6 hover:border-accent/50 transition-all duration-200';
    
    // Icon mapping - default to puzzle piece
    const iconSVG = getIconSVG(extension.icon || 'puzzle');
    const version = extension.version ? `<span class="text-xs text-gray-500 ml-2">v${extension.version}</span>` : '';
    const author = extension.author ? `<p class="text-xs text-gray-500 mt-1">by ${extension.author}</p>` : '';
    
    card.innerHTML = `
        <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10">
                ${iconSVG}
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="text-xl font-bold text-white mb-1">
                    ${extension.title}${version}
                </h3>
                ${author}
                <p class="text-gray-400 mt-3 mb-4">${extension.description}</p>
                <button 
                    onclick="window.location.href='/admin/dashboard/extensions/${extension.folder}/'"
                    class="px-4 py-2 border border-accent text-accent hover:bg-accent hover:text-black transition-colors text-sm font-semibold"
                >
                    Open Extension →
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function getIconSVG(iconName) {
    const icons = {
        'puzzle': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path></svg>',
        'server': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>',
        'terminal': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
        'code': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
        'chart': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
        'cog': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
        'database': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>',
        'cube': '<svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>'
    };
    
    return icons[iconName] || icons['puzzle'];
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadExtensions);
} else {
    loadExtensions();
}
