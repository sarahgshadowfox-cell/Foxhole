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
        <div class="stat-line">🏃 Agility: ${player.stats.agility}</div>
        <div class="stat-line">🧠 Intelligence: ${player.stats.intelligence}</div>
        <div class="stat-line">💬 Charisma: ${player.stats.charisma}</div>
        <div class="stat-line">❤️ Vitality: ${player.stats.vitality}</div>
    `;
    
    const locationDisplay = document.getElementById('locationDisplay');
    locationDisplay.innerHTML = `
        <div class="stat-line">X: ${player.x}</div>
        <div class="stat-line">Y: ${player.y}</div>
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
        water: '#0066CC',
        grass: '#228B22',
        forest: '#006400',
        mountain: '#8B4513',
        beach: '#F4A460'
    };
    return colors[type] || '#000000';
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
            
            if (data.player.level > oldLevel) {
                alert(`Congratulations! You reached level ${data.player.level}!`);
            }
        }
    } catch (error) {
        console.error('Failed to gain XP:', error);
    }
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
