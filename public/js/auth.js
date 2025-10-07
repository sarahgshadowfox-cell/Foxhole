let selectedRace = null;

// Load races on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadRaces();
});

async function loadRaces() {
    try {
        const response = await fetch('/api/races');
        const races = await response.json();
        
        const racesList = document.getElementById('racesList');
        racesList.innerHTML = '';
        
        for (const [key, race] of Object.entries(races)) {
            const card = document.createElement('div');
            card.className = 'race-card';
            card.onclick = () => selectRace(key, card);
            
            let bonusText = '';
            for (const [stat, value] of Object.entries(race.bonuses)) {
                if (value !== 0) {
                    bonusText += `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${value > 0 ? '+' : ''}${value} `;
                }
            }
            
            card.innerHTML = `
                <h4>${race.name}</h4>
                <p>${race.description}</p>
                <div class="race-bonuses">Bonuses: ${bonusText}</div>
            `;
            
            racesList.appendChild(card);
        }
    } catch (error) {
        console.error('Failed to load races:', error);
    }
}

function selectRace(raceKey, cardElement) {
    // Remove selected class from all cards
    document.querySelectorAll('.race-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    cardElement.classList.add('selected');
    selectedRace = raceKey;
}

function showSection(section) {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('registerSection').classList.add('hidden');
    
    if (section === 'login') {
        document.getElementById('loginSection').classList.remove('hidden');
    } else if (section === 'register') {
        document.getElementById('registerSection').classList.remove('hidden');
    }
}

function showMessage(message, isError = false) {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = isError ? 'message error' : 'message success';
    messageBox.classList.remove('hidden');
    
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000);
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('sessionId', data.sessionId);
            localStorage.setItem('username', username);
            window.location.href = '/game';
        } else {
            showMessage(data.error, true);
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', true);
    }
});

// Register form
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedRace) {
        showMessage('Please select a race!', true);
        return;
    }
    
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, race: selectedRace })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Character created successfully! Please login.');
            setTimeout(() => showSection('login'), 2000);
        } else {
            showMessage(data.error, true);
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', true);
    }
});
