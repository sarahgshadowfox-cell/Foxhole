let ws;
let player = null;
let sessionId = localStorage.getItem('sessionId');
let username = localStorage.getItem('username');

// Check authentication
if (!sessionId || !username) {
    window.location.href = '/';
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    loadSettlements();
});

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
        console.log('Connected to game server');
        ws.send(JSON.stringify({
            type: 'auth',
            sessionId: sessionId
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        setTimeout(connectWebSocket, 3000);
    };
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'auth_success':
            player = data.player;
            updatePlayerUI();
            loadMapView();
            break;
            
        case 'chat':
            addChatMessage(data);
            break;
            
        case 'move_success':
            player.x = data.x;
            player.y = data.y;
            updatePlayerUI();
            loadMapView();
            break;
            
        case 'move_failed':
            alert(data.message);
            break;
            
        case 'map_data':
            renderMap(data.data);
            break;
    }
}

function updatePlayerUI() {
    document.getElementById('playerName').textContent = player.username;
    document.getElementById('playerLevel').textContent = player.level;
    document.getElementById('playerXP').textContent = player.xp;
    document.getElementById('playerMaxXP').textContent = player.level * 100;
    
    const statsDisplay = document.getElementById('statsDisplay');
    statsDisplay.innerHTML = `
        <div class="stat-line">💪 Strength: ${player.stats.strength}</div>
        <div class="stat-line">🧠 Intelligence: ${player.stats.intelligence}</div>
        <div class="stat-line">⚡ Speed: ${player.stats.speed}</div>
        <div class="stat-line">🍀 Luck: ${player.stats.luck}</div>
        ${player.statPoints > 0 ? `<div class="stat-line" style="color: #ffd700;">✨ Available Points: ${player.statPoints}</div>` : ''}
    `;
    
    const locationDisplay = document.getElementById('locationDisplay');
    locationDisplay.innerHTML = `
        <div class="stat-line">X: ${player.x}</div>
        <div class="stat-line">Y: ${player.y}</div>
        ${player.email ? `<div class="stat-line">📧 ${player.email}</div>` : ''}
    `;
}

async function loadSettlements() {
    try {
        const response = await fetch('/api/settlements');
        const settlements = await response.json();
        
        const list = document.getElementById('settlementsList');
        list.innerHTML = '';
        
        settlements.forEach(settlement => {
            const item = document.createElement('div');
            item.className = 'settlement-item';
            item.innerHTML = `
                <strong>${settlement.name}</strong><br>
                Coords: (${settlement.x}, ${settlement.y})
            `;
            list.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load settlements:', error);
    }
}

function loadMapView() {
    if (!player) return;
    
    ws.send(JSON.stringify({
        type: 'get_map',
        x: player.x,
        y: player.y,
        radius: 10
    }));
}

function renderMap(mapData) {
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const tileSize = 30;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a grid centered on player
    const viewSize = 20; // 20x20 tiles
    const centerX = Math.floor(viewSize / 2);
    const centerY = Math.floor(viewSize / 2);
    
    // Draw tiles
    for (let i = 0; i < viewSize; i++) {
        for (let j = 0; j < viewSize; j++) {
            const worldX = player.x + (i - centerX);
            const worldY = player.y + (j - centerY);
            
            const tile = mapData.find(t => t.x === worldX && t.y === worldY);
            
            if (tile) {
                const color = getTileColor(tile.tile.type);
                ctx.fillStyle = color;
                ctx.fillRect(i * tileSize, j * tileSize, tileSize, tileSize);
                
                // Draw settlement marker
                if (tile.tile.settlement) {
                    ctx.fillStyle = '#FF0000';
                    ctx.fillRect(i * tileSize + 10, j * tileSize + 10, 10, 10);
                }
            } else {
                ctx.fillStyle = '#000033';
                ctx.fillRect(i * tileSize, j * tileSize, tileSize, tileSize);
            }
            
            // Draw grid
            ctx.strokeStyle = '#333';
            ctx.strokeRect(i * tileSize, j * tileSize, tileSize, tileSize);
        }
    }
    
    // Draw player
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(centerX * tileSize + 15, centerY * tileSize + 15, 8, 0, Math.PI * 2);
    ctx.fill();
}

function getTileColor(type) {
    const colors = {
        water: '#0055AA',  // Blue ocean
        grass: '#22AA22',   // Green islands
        forest: '#22AA22',  // Green islands
        mountain: '#22AA22', // Green islands
        beach: '#22AA22'    // Green islands
    };
    return colors[type] || '#0055AA';
}

function movePlayer(dx, dy) {
    if (!player) return;
    
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    ws.send(JSON.stringify({
        type: 'move',
        x: newX,
        y: newY
    }));
}

function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        ws.send(JSON.stringify({
            type: 'chat',
            message: message
        }));
        input.value = '';
    }
}

// Allow Enter key to send chat
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChat();
    }
});

function addChatMessage(data) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    if (data.sender === 'System') {
        messageDiv.innerHTML = `<span class="chat-system">${data.message}</span>`;
    } else {
        messageDiv.innerHTML = `<span class="chat-sender">${data.sender}:</span> ${data.message}`;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Keep only last 100 messages
    while (chatMessages.children.length > 100) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

async function gainXP(amount) {
    try {
        const response = await fetch(`/api/player/${username}/xp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, amount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const oldLevel = player.level;
            player = data.player;
            updatePlayerUI();
            
            if (data.bonusXP > 0) {
                addChatMessage({
                    type: 'chat',
                    sender: 'System',
                    message: `Lucky! You gained ${data.bonusXP} bonus XP!`
                });
            }
            
            if (data.player.level > oldLevel) {
                alert(`Congratulations! You reached level ${data.player.level}! You gained 2 stat points.`);
            }
        }
    } catch (error) {
        console.error('Failed to gain XP:', error);
    }
}

function showStatAllocation() {
    if (!player || player.statPoints <= 0) {
        alert('You have no stat points to allocate!');
        return;
    }
    
    const panel = document.getElementById('statAllocationPanel');
    const content = document.getElementById('statAllocationContent');
    
    content.innerHTML = `
        <p>Available Points: <span id="remainingPoints">${player.statPoints}</span></p>
        <div class="stat-allocator">
            <label>💪 Strength: <input type="number" id="allocStrength" min="0" max="${player.statPoints}" value="0"></label>
        </div>
        <div class="stat-allocator">
            <label>🧠 Intelligence: <input type="number" id="allocIntelligence" min="0" max="${player.statPoints}" value="0"></label>
        </div>
        <div class="stat-allocator">
            <label>⚡ Speed: <input type="number" id="allocSpeed" min="0" max="${player.statPoints}" value="0"></label>
        </div>
        <div class="stat-allocator">
            <label>🍀 Luck: <input type="number" id="allocLuck" min="0" max="${player.statPoints}" value="0"></label>
        </div>
        <p style="font-size: 0.9em; color: #98fb98;">Luck increases chance of bonus XP (0.25% per point)</p>
        <button onclick="applyStatAllocation()">Apply</button>
        <button onclick="closeStatAllocation()">Cancel</button>
    `;
    
    panel.classList.remove('hidden');
    
    // Add input listeners to update remaining points
    ['allocStrength', 'allocIntelligence', 'allocSpeed', 'allocLuck'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateRemainingPoints);
    });
}

function updateRemainingPoints() {
    const strength = parseInt(document.getElementById('allocStrength').value) || 0;
    const intelligence = parseInt(document.getElementById('allocIntelligence').value) || 0;
    const speed = parseInt(document.getElementById('allocSpeed').value) || 0;
    const luck = parseInt(document.getElementById('allocLuck').value) || 0;
    const total = strength + intelligence + speed + luck;
    const remaining = player.statPoints - total;
    
    document.getElementById('remainingPoints').textContent = remaining;
    
    if (remaining < 0) {
        document.getElementById('remainingPoints').style.color = '#dc143c';
    } else {
        document.getElementById('remainingPoints').style.color = '#ffd700';
    }
}

async function applyStatAllocation() {
    const strength = parseInt(document.getElementById('allocStrength').value) || 0;
    const intelligence = parseInt(document.getElementById('allocIntelligence').value) || 0;
    const speed = parseInt(document.getElementById('allocSpeed').value) || 0;
    const luck = parseInt(document.getElementById('allocLuck').value) || 0;
    const total = strength + intelligence + speed + luck;
    
    if (total > player.statPoints) {
        alert('Not enough stat points!');
        return;
    }
    
    if (total === 0) {
        alert('Please allocate at least one stat point!');
        return;
    }
    
    try {
        const response = await fetch(`/api/player/${username}/allocate-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                stats: { strength, intelligence, speed, luck }
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            player = data.player;
            updatePlayerUI();
            closeStatAllocation();
            alert('Stats allocated successfully!');
        } else {
            alert(data.error || 'Failed to allocate stats');
        }
    } catch (error) {
        console.error('Failed to allocate stats:', error);
        alert('Failed to allocate stats');
    }
}

function closeStatAllocation() {
    document.getElementById('statAllocationPanel').classList.add('hidden');
}

function viewProfile() {
    window.location.href = `/profile/${username}`;
}

function logout() {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('username');
    window.location.href = '/';
}

// Update online players count periodically
setInterval(async () => {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        document.getElementById('onlineCount').textContent = `${stats.onlinePlayers} / ${stats.maxPlayers}`;
    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}, 5000);
