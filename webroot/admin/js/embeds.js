// Embed Editor Page JavaScript

let embeds = [];
let emojis = [];
let currentEmbed = null;

// Load all embeds
async function loadEmbeds() {
    try {
        const response = await fetch(`${window.API_BASE}/embeds`, {
            headers: {
                'Authorization': `Bearer ${window.API_SECRET}`
            }
        });
        
        const data = await response.json();
        embeds = data.embeds || [];
        renderEmbedsList();
    } catch (error) {
        console.error('Error loading embeds:', error);
        showAlert('Error', 'Failed to load embeds', 'error');
    }
}

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
    } catch (error) {
        console.error('Error loading emojis:', error);
    }
}

// Render embeds list
function renderEmbedsList() {
    const container = document.getElementById('embeds-list');
    
    if (embeds.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <p>No embeds found. Create your first embed!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = embeds.map(embed => `
        <div class="border border-white/10 bg-black/40 p-4 hover:border-accent/30 transition-colors cursor-pointer" onclick="selectEmbed(${embed.id})">
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                    <h3 class="font-semibold text-white mb-1">${escapeHtml(embed.name)}</h3>
                    <p class="text-xs text-gray-400">Created ${new Date(embed.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            ${embed.description ? `<p class="text-sm text-gray-300 line-clamp-2">${escapeHtml(embed.description.substring(0, 100))}</p>` : ''}
        </div>
    `).join('');
}

// Select embed for editing
function selectEmbed(id) {
    const embed = embeds.find(e => e.id === id);
    if (!embed) return;
    
    currentEmbed = embed;
    populateEditor(embed);
    updatePreview();
}

// Create new embed
function newEmbed() {
    currentEmbed = {
        id: null,
        name: 'New Embed',
        description: '',
        color: '#000000',
        title: '',
        title_url: '',
        footer_text: '',
        footer_icon_url: '',
        timestamp: false,
        author_name: '',
        author_icon_url: '',
        author_url: '',
        image_url: '',
        thumbnail_url: '',
        fields: []
    };
    
    populateEditor(currentEmbed);
    updatePreview();
}

// Populate editor with embed data
function populateEditor(embed) {
    document.getElementById('embed-name').value = embed.name || '';
    document.getElementById('embed-title').value = embed.title || '';
    document.getElementById('embed-title-url').value = embed.title_url || '';
    document.getElementById('embed-description').value = embed.description || '';
    document.getElementById('embed-color').value = embed.color || '#000000';
    document.getElementById('embed-author-name').value = embed.author_name || '';
    document.getElementById('embed-author-icon').value = embed.author_icon_url || '';
    document.getElementById('embed-author-url').value = embed.author_url || '';
    document.getElementById('embed-footer').value = embed.footer_text || '';
    document.getElementById('embed-footer-icon').value = embed.footer_icon_url || '';
    document.getElementById('embed-timestamp').checked = embed.timestamp || false;
    document.getElementById('embed-thumbnail').value = embed.thumbnail_url || '';
    document.getElementById('embed-image').value = embed.image_url || '';
    
    renderFields(embed.fields || []);
}

// Render fields editor
function renderFields(fields) {
    const container = document.getElementById('fields-container');
    
    if (fields.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-400 text-sm">
                No fields. Click "Add Field" to create one.
            </div>
        `;
        return;
    }
    
    container.innerHTML = fields.map((field, index) => `
        <div class="border border-white/10 bg-black/20 p-3 space-y-2">
            <div class="flex items-center gap-2 mb-2">
                <span class="text-xs text-gray-400">Field ${index + 1}</span>
                <div class="flex-1"></div>
                <label class="flex items-center gap-2 text-xs text-gray-300">
                    <input type="checkbox" ${field.inline ? 'checked' : ''} onchange="updateFieldInline(${index}, this.checked)" class="w-3 h-3" />
                    Inline
                </label>
                <button onclick="removeField(${index})" class="text-red-400 hover:text-red-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <input 
                type="text" 
                value="${escapeHtml(field.name)}" 
                onchange="updateFieldName(${index}, this.value)"
                placeholder="Field Name"
                class="w-full px-3 py-1.5 bg-black border border-white/10 text-white text-sm focus:border-accent focus:outline-none"
            />
            <textarea 
                onchange="updateFieldValue(${index}, this.value)"
                placeholder="Field Value"
                rows="2"
                class="w-full px-3 py-1.5 bg-black border border-white/10 text-white text-sm focus:border-accent focus:outline-none resize-none"
            >${escapeHtml(field.value)}</textarea>
        </div>
    `).join('');
}

// Field management functions
function addField() {
    if (!currentEmbed) return;
    
    if (!currentEmbed.fields) currentEmbed.fields = [];
    currentEmbed.fields.push({
        name: 'New Field',
        value: 'Field value',
        inline: false
    });
    
    renderFields(currentEmbed.fields);
    updatePreview();
}

function removeField(index) {
    if (!currentEmbed || !currentEmbed.fields) return;
    
    currentEmbed.fields.splice(index, 1);
    renderFields(currentEmbed.fields);
    updatePreview();
}

function updateFieldName(index, value) {
    if (!currentEmbed || !currentEmbed.fields) return;
    currentEmbed.fields[index].name = value;
    updatePreview();
}

function updateFieldValue(index, value) {
    if (!currentEmbed || !currentEmbed.fields) return;
    currentEmbed.fields[index].value = value;
    updatePreview();
}

function updateFieldInline(index, inline) {
    if (!currentEmbed || !currentEmbed.fields) return;
    currentEmbed.fields[index].inline = inline;
    updatePreview();
}

// Update preview
function updatePreview() {
    if (!currentEmbed) return;
    
    // Update current embed with form values
    currentEmbed.name = document.getElementById('embed-name').value;
    currentEmbed.title = document.getElementById('embed-title').value;
    currentEmbed.title_url = document.getElementById('embed-title-url').value;
    currentEmbed.description = document.getElementById('embed-description').value;
    currentEmbed.color = document.getElementById('embed-color').value;
    currentEmbed.author_name = document.getElementById('embed-author-name').value;
    currentEmbed.author_icon_url = document.getElementById('embed-author-icon').value;
    currentEmbed.author_url = document.getElementById('embed-author-url').value;
    currentEmbed.footer_text = document.getElementById('embed-footer').value;
    currentEmbed.footer_icon_url = document.getElementById('embed-footer-icon').value;
    currentEmbed.timestamp = document.getElementById('embed-timestamp').checked;
    currentEmbed.thumbnail_url = document.getElementById('embed-thumbnail').value;
    currentEmbed.image_url = document.getElementById('embed-image').value;
    
    renderPreview(currentEmbed);
}

// Render Discord-style preview
function renderPreview(embed) {
    const preview = document.getElementById('preview-embed');
    
    const color = embed.color || '#000000';
    
    let html = `<div class="flex gap-3">`;
    
    // Color bar
    html += `<div class="w-1 flex-shrink-0" style="background-color: ${color};"></div>`;
    
    html += `<div class="flex-1 min-w-0">`;
    
    // Author
    if (embed.author_name) {
        html += `<div class="flex items-center gap-2 mb-2">`;
        if (embed.author_icon_url) {
            html += `<img src="${embed.author_icon_url}" class="w-6 h-6 rounded-full" onerror="this.style.display='none'" />`;
        }
        if (embed.author_url) {
            html += `<a href="${embed.author_url}" class="text-white hover:underline text-sm font-medium">${parseEmojis(embed.author_name)}</a>`;
        } else {
            html += `<span class="text-white text-sm font-medium">${parseEmojis(embed.author_name)}</span>`;
        }
        html += `</div>`;
    }
    
    // Title
    if (embed.title) {
        if (embed.title_url) {
            html += `<a href="${embed.title_url}" class="text-[#00b0f4] hover:underline font-semibold text-base mb-2 block">${parseEmojis(embed.title)}</a>`;
        } else {
            html += `<div class="text-white font-semibold text-base mb-2">${parseEmojis(embed.title)}</div>`;
        }
    }
    
    // Description
    if (embed.description) {
        html += `<div class="text-gray-300 text-sm mb-2 whitespace-pre-wrap">${parseEmojis(embed.description)}</div>`;
    }
    
    // Fields
    if (embed.fields && embed.fields.length > 0) {
        html += `<div class="grid gap-2 mt-2">`;
        
        let inlineGroup = [];
        embed.fields.forEach((field, index) => {
            if (field.inline) {
                inlineGroup.push(field);
                if (inlineGroup.length === 3 || index === embed.fields.length - 1) {
                    html += `<div class="grid grid-cols-${inlineGroup.length} gap-2">`;
                    inlineGroup.forEach(f => {
                        html += `
                            <div class="min-w-0">
                                <div class="text-white font-semibold text-sm mb-1">${parseEmojis(f.name)}</div>
                                <div class="text-gray-300 text-sm whitespace-pre-wrap">${parseEmojis(f.value)}</div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                    inlineGroup = [];
                }
            } else {
                if (inlineGroup.length > 0) {
                    html += `<div class="grid grid-cols-${inlineGroup.length} gap-2">`;
                    inlineGroup.forEach(f => {
                        html += `
                            <div class="min-w-0">
                                <div class="text-white font-semibold text-sm mb-1">${parseEmojis(f.name)}</div>
                                <div class="text-gray-300 text-sm whitespace-pre-wrap">${parseEmojis(f.value)}</div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                    inlineGroup = [];
                }
                
                html += `
                    <div>
                        <div class="text-white font-semibold text-sm mb-1">${parseEmojis(field.name)}</div>
                        <div class="text-gray-300 text-sm whitespace-pre-wrap">${parseEmojis(field.value)}</div>
                    </div>
                `;
            }
        });
        
        html += `</div>`;
    }
    
    // Image
    if (embed.image_url) {
        html += `<img src="${embed.image_url}" class="mt-4 max-w-full rounded" onerror="this.style.display='none'" />`;
    }
    
    // Thumbnail (absolute positioned)
    if (embed.thumbnail_url) {
        html += `<img src="${embed.thumbnail_url}" class="absolute top-2 right-2 w-20 h-20 rounded object-cover" onerror="this.style.display='none'" />`;
    }
    
    // Footer
    if (embed.footer_text || embed.timestamp) {
        html += `<div class="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">`;
        if (embed.footer_icon_url) {
            html += `<img src="${embed.footer_icon_url}" class="w-5 h-5 rounded-full" onerror="this.style.display='none'" />`;
        }
        html += `<span class="text-gray-400 text-xs">`;
        if (embed.footer_text) {
            html += parseEmojis(embed.footer_text);
        }
        if (embed.timestamp) {
            if (embed.footer_text) html += ' • ';
            html += new Date().toLocaleString();
        }
        html += `</span></div>`;
    }
    
    html += `</div></div>`;
    
    preview.innerHTML = html;
}

// Parse emoji tags in text
function parseEmojis(text) {
    if (!text) return '';
    
    // Replace <:name:id> and <a:name:id> with actual emoji images
    return text.replace(/<(a?):([^:]+):(\d+)>/g, (match, animated, name, id) => {
        const ext = animated ? 'gif' : 'png';
        return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=24&quality=lossless" alt=":${name}:" class="inline-block w-5 h-5 align-text-bottom" />`;
    });
}

// Show emoji picker
function showEmojiPicker(inputId) {
    const modal = document.getElementById('emoji-picker-modal');
    const grid = document.getElementById('emoji-picker-grid');
    
    if (emojis.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8">No emojis available. Add emojis first.</div>`;
    } else {
        grid.innerHTML = emojis.map(emoji => {
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emoji.hash}.${emoji.animated ? 'gif' : 'png'}?size=48&quality=lossless`;
            const emojiTag = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.hash}>`;
            
            return `
                <button 
                    type="button"
                    onclick="insertEmoji('${inputId}', '${emojiTag}')" 
                    class="p-3 border border-white/10 hover:border-accent/30 bg-black/40 hover:bg-black/60 transition-colors flex flex-col items-center gap-2 group"
                    title=":${emoji.name}:"
                >
                    <img src="${emojiUrl}" alt=":${emoji.name}:" class="w-8 h-8" />
                    <span class="text-xs text-gray-400 group-hover:text-accent">:${emoji.name}:</span>
                </button>
            `;
        }).join('');
    }
    
    modal.dataset.targetInput = inputId;
    modal.classList.remove('hidden');
}

// Insert emoji into input
function insertEmoji(inputId, emojiTag) {
    const input = document.getElementById(inputId);
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    
    input.value = text.substring(0, start) + emojiTag + text.substring(end);
    input.selectionStart = input.selectionEnd = start + emojiTag.length;
    input.focus();
    
    closeEmojiPicker();
    updatePreview();
}

// Close emoji picker
function closeEmojiPicker() {
    document.getElementById('emoji-picker-modal').classList.add('hidden');
}

// Save embed
async function saveEmbed() {
    if (!currentEmbed) return;
    
    const id = currentEmbed.id;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${window.API_BASE}/embeds/${id}` : `${window.API_BASE}/embeds`;
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${window.API_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentEmbed)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Success', result.message, 'success');
            loadEmbeds();
        } else {
            showAlert('Error', result.error || 'Failed to save embed', 'error');
        }
    } catch (error) {
        console.error('Error saving embed:', error);
        showAlert('Error', 'Failed to save embed', 'error');
    }
}

// Delete embed
async function deleteEmbed(id, name) {
    if (!confirm(`Are you sure you want to delete embed "${name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_BASE}/embeds/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.API_SECRET}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Success', result.message, 'success');
            if (currentEmbed && currentEmbed.id === id) {
                currentEmbed = null;
                document.getElementById('preview-embed').innerHTML = `
                    <div class="text-center py-12 text-gray-400">
                        <p>Select or create an embed to preview</p>
                    </div>
                `;
            }
            loadEmbeds();
        } else {
            showAlert('Error', result.error || 'Failed to delete embed', 'error');
        }
    } catch (error) {
        console.error('Error deleting embed:', error);
        showAlert('Error', 'Failed to delete embed', 'error');
    }
}

// Utility functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showAlert(title, message, type = 'info') {
    const alertDiv = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500/20 border-green-500/50' : 
                   type === 'error' ? 'bg-red-500/20 border-red-500/50' : 
                   'bg-blue-500/20 border-blue-500/50';
    
    alertDiv.className = `fixed top-4 right-4 ${bgColor} border px-6 py-4 max-w-md z-50`;
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
    setTimeout(() => alertDiv.remove(), 5000);
}

// Initialize
function initEmbedsPage() {
    // Wait for config to be loaded
    if (!window.API_BASE || !window.API_SECRET) {
        console.log('Waiting for config to load...');
        setTimeout(initEmbedsPage, 50);
        return;
    }
    
    loadEmbeds();
    loadEmojis();
    
    // Setup auto-update preview on input changes
    const inputs = [
        'embed-name', 'embed-title', 'embed-title-url', 'embed-description',
        'embed-color', 'embed-author-name', 'embed-author-icon', 'embed-author-url',
        'embed-footer', 'embed-footer-icon', 'embed-timestamp',
        'embed-thumbnail', 'embed-image'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updatePreview);
            element.addEventListener('change', updatePreview);
        }
    });
    
    // Close modal on outside click
    document.getElementById('emoji-picker-modal').addEventListener('click', (e) => {
        if (e.target.id === 'emoji-picker-modal') {
            closeEmojiPicker();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbedsPage);
} else {
    // DOM already loaded, run immediately
    initEmbedsPage();
}
