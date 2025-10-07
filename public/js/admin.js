document.addEventListener('DOMContentLoaded', () => {
    loadAdminStats();
    loadSettlements();
    loadPlayers();
});

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
