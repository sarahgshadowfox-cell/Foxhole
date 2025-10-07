const sessionId = localStorage.getItem('sessionId');
const username = localStorage.getItem('username');

document.addEventListener('DOMContentLoaded', () => {
    if (!sessionId || !username) {
        window.location.href = '/';
        return;
    }
    
    loadAdminInfo();
    loadAdminStats();
    loadSettlements();
    loadPlayers();
    loadServerLogs();
});

async function loadAdminInfo() {
    try {
        const response = await fetch(`/api/player/${username}`);
        const player = await response.json();
        
        const adminInfo = document.getElementById('adminInfo');
        if (player.isAdmin) {
            adminInfo.innerHTML = `<p style="color: #ffd700;">Logged in as: ${player.username} (Admin)</p>`;
        } else {
            adminInfo.innerHTML = `<p style="color: #f0e68c;">Logged in as: ${player.username}</p>`;
        }
    } catch (error) {
        console.error('Failed to load admin info:', error);
    }
}

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        
        document.getElementById('onlinePlayers').textContent = stats.onlinePlayers;
        document.getElementById('totalPlayers').textContent = stats.totalPlayers;
        document.getElementById('maxPlayers').textContent = stats.maxPlayers;
        document.getElementById('settlementCount').textContent = stats.settlements.length;
    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}

async function loadSettlements() {
    try {
        const response = await fetch('/api/settlements');
        const settlements = await response.json();
        
        const table = document.createElement('table');
        table.className = 'data-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Coordinates</th>
                    <th>Island ID</th>
                </tr>
            </thead>
            <tbody>
                ${settlements.map(s => `
                    <tr>
                        <td>${s.id}</td>
                        <td>${s.name}</td>
                        <td>(${s.x}, ${s.y})</td>
                        <td>${s.islandId}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        document.getElementById('settlementsTable').innerHTML = '';
        document.getElementById('settlementsTable').appendChild(table);
    } catch (error) {
        console.error('Failed to load settlements:', error);
    }
}

async function loadPlayers() {
    try {
        const response = await fetch('/api/admin/players');
        const players = await response.json();
        
        const table = document.createElement('table');
        table.className = 'data-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Race</th>
                    <th>Level</th>
                    <th>XP</th>
                    <th>Location</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                ${players.map(p => `
                    <tr>
                        <td>${p.username}</td>
                        <td>${p.race}</td>
                        <td>${p.level}</td>
                        <td>${p.xp}</td>
                        <td>(${p.x}, ${p.y})</td>
                        <td>${new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        document.getElementById('playersTable').innerHTML = '';
        document.getElementById('playersTable').appendChild(table);
    } catch (error) {
        console.error('Failed to load players:', error);
    }
}

function refreshPlayers() {
    loadPlayers();
}

async function loadServerLogs() {
    try {
        const response = await fetch(`/api/admin/logs?sessionId=${sessionId}`);
        
        if (!response.ok) {
            document.getElementById('serverLogsTable').innerHTML = '<p style="color: #dc143c;">Admin access required to view logs</p>';
            return;
        }
        
        const logs = await response.json();
        
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Show last 50 logs
        const recentLogs = logs.slice(-50).reverse();
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Message</th>
                </tr>
            </thead>
            <tbody>
                ${recentLogs.map(log => `
                    <tr class="log-${log.type}">
                        <td>${new Date(log.timestamp).toLocaleString()}</td>
                        <td>${log.type.toUpperCase()}</td>
                        <td>${log.message}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        document.getElementById('serverLogsTable').innerHTML = '';
        document.getElementById('serverLogsTable').appendChild(table);
    } catch (error) {
        console.error('Failed to load server logs:', error);
    }
}

function viewAdminProfile() {
    window.location.href = `/profile/${username}`;
}
