// Emoji Management Page JavaScript

let emojis = [];

// Load all emojis
async function loadEmojis() {
    try {
        const response = await fetch(`${window.API_BASE}/emojis`, {
            headers: {
                'Authorization': `Bearer ${window.API_SECRET}`
            }
        });
        
        const data = await response.json();
        emojis = data.emojis || [];
        renderEmojis();
    } catch (error) {
        console.error('Error loading emojis:', error);
        showAlert('Error', 'Failed to load emojis', 'error');
    }
}

// Render emoji grid
function renderEmojis() {
    const container = document.getElementById('emoji-grid');
    
    if (emojis.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No emojis found. Click "Add Emoji" to create one.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = emojis.map(emoji => {
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emoji.hash}.${emoji.animated ? 'gif' : 'png'}?size=96&quality=lossless`;
        const emojiTag = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.hash}>`;
        
        return `
            <div class="border border-white/10 bg-black/40 p-4 hover:border-accent/30 transition-colors group">
                <div class="aspect-square mb-3 flex items-center justify-center bg-black/60 border border-white/5">
                    <img src="${emojiUrl}" alt="${emoji.name}" class="max-w-full max-h-full" loading="lazy" />
                </div>
                <div class="space-y-2">
                    <div>
                        <div class="text-xs text-gray-400">Name</div>
                        <div class="text-sm font-medium text-white">:${emoji.name}:</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">ID</div>
                        <div class="text-xs font-mono text-gray-300">${emoji.hash}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">Tag</div>
                        <div class="text-xs font-mono text-gray-300 break-all">${emojiTag}</div>
                    </div>
                    ${emoji.animated ? '<div class="text-xs text-accent">Animated</div>' : ''}
                    <div class="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editEmoji(${emoji.id})" class="flex-1 px-2 py-1 text-xs border border-accent/20 text-accent hover:bg-accent/10 transition-colors">
                            Edit
                        </button>
                        <button onclick="deleteEmoji(${emoji.id}, '${emoji.name}')" class="flex-1 px-2 py-1 text-xs border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Show add emoji modal
function showAddEmojiModal() {
    const modal = document.getElementById('emoji-modal');
    const form = document.getElementById('emoji-form');
    
    document.getElementById('modal-title').textContent = 'Add Emoji';
    document.getElementById('emoji-id').value = '';
    form.reset();
    
    modal.classList.remove('hidden');
}

// Edit emoji
async function editEmoji(id) {
    const emoji = emojis.find(e => e.id === id);
    if (!emoji) return;
    
    // Show confirmation
    showConfirmModal(
        'Edit Emoji',
        `Are you sure you want to edit ":${emoji.name}:"?`,
        'Edit',
        () => {
            document.getElementById('modal-title').textContent = 'Edit Emoji';
            document.getElementById('emoji-id').value = emoji.id;
            document.getElementById('emoji-name').value = emoji.name;
            document.getElementById('emoji-hash').value = emoji.hash;
            document.getElementById('emoji-animated').checked = emoji.animated;
            
            document.getElementById('emoji-modal').classList.remove('hidden');
        }
    );
}

// Save emoji (create or update)
async function saveEmoji(event) {
    event.preventDefault();
    
    const id = document.getElementById('emoji-id').value;
    const name = document.getElementById('emoji-name').value.trim();
    const hash = document.getElementById('emoji-hash').value.trim();
    const animated = document.getElementById('emoji-animated').checked;
    
    const data = { name, hash, animated };
    
    try {
        const url = id ? `${window.API_BASE}/emojis/${id}` : `${window.API_BASE}/emojis`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${window.API_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Success', result.message, 'success');
            closeEmojiModal();
            loadEmojis();
        } else {
            showAlert('Error', result.error || 'Failed to save emoji', 'error');
        }
    } catch (error) {
        console.error('Error saving emoji:', error);
        showAlert('Error', 'Failed to save emoji', 'error');
    }
}

// Delete emoji
async function deleteEmoji(id, name) {
    showConfirmModal(
        'Delete Emoji',
        `Are you sure you want to permanently delete ":${name}:"? This action cannot be undone.`,
        'Delete',
        async () => {
            try {
                const response = await fetch(`${window.API_BASE}/emojis/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${window.API_SECRET}`
                    }
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showAlert('Success', result.message, 'success');
                    loadEmojis();
                } else {
                    showAlert('Error', result.error || 'Failed to delete emoji', 'error');
                }
            } catch (error) {
                console.error('Error deleting emoji:', error);
                showAlert('Error', 'Failed to delete emoji', 'error');
            }
        },
        true // isDanger flag
    );
}

// Show confirmation modal
function showConfirmModal(title, message, confirmText, onConfirm, isDanger = false) {
    const modalId = 'confirm-modal-' + Date.now();
    const buttonClass = isDanger 
        ? 'bg-red-500 hover:bg-red-600 text-white' 
        : 'bg-accent hover:bg-accent/80 text-black';
    
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4';
    modal.innerHTML = `
        <div class="bg-black border-2 ${isDanger ? 'border-red-500' : 'border-accent'} max-w-md w-full p-6 shadow-2xl">
            <h2 class="text-xl font-bold text-white mb-4">${title}</h2>
            <p class="text-gray-300 mb-6">${message}</p>
            <div class="flex gap-3">
                <button 
                    onclick="document.getElementById('${modalId}').remove()" 
                    class="flex-1 px-4 py-2 border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    id="${modalId}-confirm"
                    class="flex-1 px-4 py-2 ${buttonClass} font-semibold transition-colors"
                >
                    ${confirmText}
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add confirm button handler
    document.getElementById(`${modalId}-confirm`).addEventListener('click', () => {
        modal.remove();
        onConfirm();
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Close modal
function closeEmojiModal() {
    document.getElementById('emoji-modal').classList.add('hidden');
}

// Alert system
function showAlert(title, message, type = 'info') {
    const alertDiv = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500/20 border-green-500/50' : 
                   type === 'error' ? 'bg-red-500/20 border-red-500/50' : 
                   'bg-blue-500/20 border-blue-500/50';
    
    alertDiv.className = `fixed top-4 right-4 ${bgColor} border px-6 py-4 max-w-md z-50 animate-fade-in`;
    alertDiv.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-1">
                <div class="font-semibold text-white mb-1">${title}</div>
                <div class="text-sm text-gray-300">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Initialize
function initEmojisPage() {
    // Wait for config to be loaded
    if (!window.API_BASE || !window.API_SECRET) {
        console.log('Waiting for config to load...');
        setTimeout(initEmojisPage, 50);
        return;
    }
    
    loadEmojis();
    
    // Setup form submit
    document.getElementById('emoji-form').addEventListener('submit', saveEmoji);
    
    // Close modal on outside click
    document.getElementById('emoji-modal').addEventListener('click', (e) => {
        if (e.target.id === 'emoji-modal') {
            closeEmojiModal();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmojisPage);
} else {
    // DOM already loaded, run immediately
    initEmojisPage();
}
