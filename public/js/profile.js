const username = window.location.pathname.split('/').pop();
const sessionId = localStorage.getItem('sessionId');
const currentUser = localStorage.getItem('username');

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    
    // Only show upload section if viewing own profile
    if (username === currentUser) {
        document.getElementById('changeAvatarBtn').style.display = 'block';
    } else {
        document.getElementById('changeAvatarBtn').style.display = 'none';
    }
});

async function loadProfile() {
    try {
        const response = await fetch(`/api/player/${username}`);
        
        if (!response.ok) {
            alert('Player not found!');
            window.location.href = '/';
            return;
        }
        
        const player = await response.json();
        displayProfile(player);
    } catch (error) {
        console.error('Failed to load profile:', error);
        alert('Failed to load profile!');
    }
}

function displayProfile(player) {
    document.getElementById('profileUsername').textContent = player.username;
    document.getElementById('profileRace').textContent = player.race.toUpperCase();
    document.getElementById('profileLevel').textContent = player.level;
    document.getElementById('profileXP').textContent = player.xp + ' / ' + (player.level * 100);
    document.getElementById('profileX').textContent = player.x;
    document.getElementById('profileY').textContent = player.y;
    
    if (player.avatar) {
        document.getElementById('playerAvatar').src = player.avatar;
    }
    
    const statsDiv = document.getElementById('profileStats');
    statsDiv.innerHTML = `
        <div class="stat-line">💪 Strength: ${player.stats.strength}</div>
        <div class="stat-line">🏃 Agility: ${player.stats.agility}</div>
        <div class="stat-line">🧠 Intelligence: ${player.stats.intelligence}</div>
        <div class="stat-line">💬 Charisma: ${player.stats.charisma}</div>
        <div class="stat-line">❤️ Vitality: ${player.stats.vitality}</div>
    `;
}

function toggleAvatarUpload() {
    const uploadSection = document.getElementById('uploadSection');
    uploadSection.classList.toggle('hidden');
}

document.getElementById('avatarForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('avatarInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select an image file!');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('sessionId', sessionId);
    
    try {
        const response = await fetch(`/api/player/${username}/avatar`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Avatar updated successfully!');
            document.getElementById('playerAvatar').src = data.avatar;
            toggleAvatarUpload();
        } else {
            alert(data.error || 'Failed to upload avatar');
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        alert('Failed to upload avatar!');
    }
});
