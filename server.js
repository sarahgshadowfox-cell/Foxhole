const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 100;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Data storage (in-memory, would use a proper database in production)
const gameData = {
  players: new Map(),
  sessions: new Map(),
  map: null,
  settlements: [],
  chatHistory: [],
  serverLogs: []
};

// Server logging function
function logServer(message, type = 'info') {
  const logEntry = {
    timestamp: Date.now(),
    type: type,
    message: message
  };
  gameData.serverLogs.push(logEntry);
  if (gameData.serverLogs.length > 1000) {
    gameData.serverLogs.shift();
  }
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Load or initialize game data
const DATA_FILE = './data/game_data.json';
async function loadGameData() {
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    gameData.map = data.map;
    gameData.settlements = data.settlements;
    if (data.players) {
      gameData.players = new Map(Object.entries(data.players));
    }
  } else {
    initializeMap();
    await initializeAdmin();
    saveGameData();
  }
}

// Initialize admin account
async function initializeAdmin() {
  const adminPassword = await bcrypt.hash('123456789', 10);
  const adminPlayer = {
    username: 'Shadowfox',
    password: adminPassword,
    email: 'admin@foxhole.game',
    race: 'human',
    level: 100,
    xp: 0,
    isAdmin: true,
    stats: {
      strength: 50,
      intelligence: 50,
      speed: 50,
      luck: 50
    },
    statPoints: 0,
    x: gameData.settlements[0]?.x || 75,
    y: gameData.settlements[0]?.y || 75,
    avatar: '/images/default-avatar.png',
    createdAt: Date.now()
  };
  gameData.players.set('Shadowfox', adminPlayer);
  logServer('Admin account "Shadowfox" initialized', 'system');
}

function saveGameData() {
  const data = {
    map: gameData.map,
    settlements: gameData.settlements,
    players: Object.fromEntries(gameData.players)
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Map generation
function initializeMap() {
  const MAP_SIZE = 150;
  const map = Array(MAP_SIZE).fill(null).map(() => Array(MAP_SIZE).fill({ type: 'water' }));
  
  // Generate islands (generous amount - 25 islands)
  const islands = [];
  for (let i = 0; i < 25; i++) {
    const centerX = Math.floor(Math.random() * (MAP_SIZE - 20)) + 10;
    const centerY = Math.floor(Math.random() * (MAP_SIZE - 20)) + 10;
    const islandSize = Math.floor(Math.random() * 15) + 10;
    
    islands.push({ centerX, centerY, size: islandSize });
    
    // Create organic island shape
    for (let x = centerX - islandSize; x <= centerX + islandSize; x++) {
      for (let y = centerY - islandSize; y <= centerY + islandSize; y++) {
        if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          if (distance < islandSize * (0.7 + Math.random() * 0.3)) {
            const terrainTypes = ['grass', 'forest', 'mountain', 'beach'];
            const weights = distance < islandSize * 0.3 ? [0.4, 0.3, 0.2, 0.1] :
                           distance < islandSize * 0.6 ? [0.3, 0.3, 0.2, 0.2] : [0.1, 0.2, 0.1, 0.6];
            const rand = Math.random();
            let sum = 0;
            let terrain = 'grass';
            for (let i = 0; i < weights.length; i++) {
              sum += weights[i];
              if (rand < sum) {
                terrain = terrainTypes[i];
                break;
              }
            }
            map[x][y] = { type: terrain, islandId: i };
          }
        }
      }
    }
  }
  
  // Place 12 settlements on islands
  const settlements = [];
  const settlementNames = [
    'Port Royal', 'Tortuga', 'Nassau', 'Shipwreck Bay',
    'Skull Island', 'Treasure Cove', 'Blackbeard\'s Harbor', 'Rum Bay',
    'Cannonball Reef', 'Cutlass Point', 'Parrot\'s Perch', 'Jolly Roger Port'
  ];
  
  for (let i = 0; i < 12; i++) {
    const island = islands[i % islands.length];
    const offsetX = Math.floor((Math.random() - 0.5) * island.size * 0.5);
    const offsetY = Math.floor((Math.random() - 0.5) * island.size * 0.5);
    const x = Math.max(0, Math.min(MAP_SIZE - 1, island.centerX + offsetX));
    const y = Math.max(0, Math.min(MAP_SIZE - 1, island.centerY + offsetY));
    
    if (map[x][y].type !== 'water') {
      settlements.push({
        id: i,
        name: settlementNames[i],
        x: x,
        y: y,
        islandId: map[x][y].islandId
      });
      map[x][y] = { ...map[x][y], settlement: settlementNames[i] };
    }
  }
  
  gameData.map = map;
  gameData.settlements = settlements;
}

// Race definitions with bonuses
const RACES = {
  human: {
    name: 'Human',
    description: 'Versatile and adaptable sailors',
    bonuses: { strength: 0, agility: 0, intelligence: 5, charisma: 5, vitality: 0 }
  },
  catpeople: {
    name: 'Cat People',
    description: 'Agile and quick-witted felines',
    bonuses: { strength: 0, agility: 10, intelligence: 0, charisma: 0, vitality: 0 }
  },
  orc: {
    name: 'Orc',
    description: 'Strong and fearsome warriors',
    bonuses: { strength: 10, agility: 0, intelligence: 0, charisma: -5, vitality: 5 }
  },
  dwarf: {
    name: 'Dwarf',
    description: 'Hardy and resilient craftsmen',
    bonuses: { strength: 5, agility: -5, intelligence: 0, charisma: 0, vitality: 10 }
  },
  elf: {
    name: 'Elf',
    description: 'Wise and graceful navigators',
    bonuses: { strength: 0, agility: 5, intelligence: 5, charisma: 5, vitality: -5 }
  },
  goblin: {
    name: 'Goblin',
    description: 'Cunning and sneaky scavengers',
    bonuses: { strength: -5, agility: 5, intelligence: 5, charisma: -5, vitality: 0 }
  }
};

// WebSocket connections
const clients = new Map();

wss.on('connection', (ws) => {
  ws.id = uuidv4();
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    const player = clients.get(ws.id);
    if (player) {
      broadcast({
        type: 'chat',
        sender: 'System',
        message: `${player.username} has left the game.`,
        timestamp: Date.now()
      });
      clients.delete(ws.id);
    }
  });
});

function handleWebSocketMessage(ws, data) {
  switch (data.type) {
    case 'auth':
      const session = gameData.sessions.get(data.sessionId);
      if (session) {
        const player = gameData.players.get(session.username);
        if (player) {
          clients.set(ws.id, { ws, username: player.username, sessionId: data.sessionId });
          ws.send(JSON.stringify({
            type: 'auth_success',
            player: sanitizePlayer(player)
          }));
          broadcast({
            type: 'chat',
            sender: 'System',
            message: `${player.username} has joined the game!`,
            timestamp: Date.now()
          });
        }
      }
      break;
      
    case 'chat':
      const client = clients.get(ws.id);
      if (client) {
        const chatMessage = {
          type: 'chat',
          sender: client.username,
          message: data.message,
          timestamp: Date.now()
        };
        gameData.chatHistory.push(chatMessage);
        if (gameData.chatHistory.length > 100) {
          gameData.chatHistory.shift();
        }
        broadcast(chatMessage);
      }
      break;
      
    case 'move':
      handlePlayerMove(ws, data);
      break;
      
    case 'get_map':
      const mapData = getMapRegion(data.x, data.y, data.radius || 10);
      ws.send(JSON.stringify({ type: 'map_data', data: mapData }));
      break;
  }
}

function handlePlayerMove(ws, data) {
  const client = clients.get(ws.id);
  if (!client) return;
  
  const player = gameData.players.get(client.username);
  if (!player) return;
  
  const { x, y } = data;
  if (x >= 0 && x < 150 && y >= 0 && y < 150) {
    const tile = gameData.map[x][y];
    if (tile.type !== 'water') {
      player.x = x;
      player.y = y;
      saveGameData();
      
      ws.send(JSON.stringify({
        type: 'move_success',
        x: x,
        y: y,
        tile: tile
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'move_failed',
        message: 'Cannot move to water!'
      }));
    }
  }
}

function getMapRegion(centerX, centerY, radius) {
  const region = [];
  for (let x = Math.max(0, centerX - radius); x <= Math.min(149, centerX + radius); x++) {
    for (let y = Math.max(0, centerY - radius); y <= Math.min(149, centerY + radius); y++) {
      region.push({
        x: x,
        y: y,
        tile: gameData.map[x][y]
      });
    }
  }
  return region;
}

function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

function sanitizePlayer(player) {
  const { password, ...safe } = player;
  return safe;
}

// REST API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email, race } = req.body;
    
    if (!username || !password || !email || !race) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (gameData.players.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const emailExists = Array.from(gameData.players.values()).some(p => p.email === email);
    if (emailExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    if (!RACES[race]) {
      return res.status(400).json({ error: 'Invalid race' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Place player at first settlement
    const startSettlement = gameData.settlements[0];
    
    const player = {
      username,
      password: hashedPassword,
      email,
      race,
      level: 1,
      xp: 0,
      isAdmin: false,
      stats: {
        strength: 10 + RACES[race].bonuses.strength,
        intelligence: 10 + RACES[race].bonuses.intelligence,
        speed: 10 + RACES[race].bonuses.agility,
        luck: 10
      },
      statPoints: 5, // 5 redistributable stat points
      x: startSettlement.x,
      y: startSettlement.y,
      avatar: '/images/default-avatar.png',
      createdAt: Date.now()
    };
    
    gameData.players.set(username, player);
    saveGameData();
    
    logServer(`New player registered: ${username} (${email})`, 'info');
    
    res.json({ success: true, message: 'Character created successfully!' });
  } catch (error) {
    logServer(`Registration error: ${error.message}`, 'error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const player = gameData.players.get(username);
    if (!player) {
      logServer(`Failed login attempt for username: ${username}`, 'warning');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, player.password);
    if (!valid) {
      logServer(`Invalid password for username: ${username}`, 'warning');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check max players (admins bypass this check)
    if (!player.isAdmin && clients.size >= MAX_PLAYERS) {
      return res.status(503).json({ error: 'Server is full (max 100 players)' });
    }
    
    const sessionId = uuidv4();
    gameData.sessions.set(sessionId, { username, isAdmin: player.isAdmin, createdAt: Date.now() });
    
    logServer(`Player logged in: ${username}${player.isAdmin ? ' (Admin)' : ''}`, 'info');
    
    res.json({ 
      success: true, 
      sessionId,
      player: sanitizePlayer(player)
    });
  } catch (error) {
    logServer(`Login error: ${error.message}`, 'error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/player/:username', (req, res) => {
  const player = gameData.players.get(req.params.username);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  res.json(sanitizePlayer(player));
});

app.post('/api/player/:username/avatar', upload.single('avatar'), (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    const session = gameData.sessions.get(sessionId);
    
    if (!session || session.username !== req.params.username) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const player = gameData.players.get(req.params.username);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    player.avatar = '/avatars/' + req.file.filename;
    saveGameData();
    
    res.json({ success: true, avatar: player.avatar });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/player/:username/xp', (req, res) => {
  try {
    const { sessionId, amount } = req.body;
    const session = gameData.sessions.get(sessionId);
    
    if (!session) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const player = gameData.players.get(req.params.username);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Apply luck-based bonus (0.25% per luck point)
    const luckBonus = player.stats.luck * 0.0025;
    const bonusXP = Math.random() < luckBonus ? Math.floor(amount * 0.1) : 0;
    const totalXP = amount + bonusXP;
    
    player.xp += totalXP;
    
    // Level up logic
    const xpForNextLevel = player.level * 100;
    if (player.xp >= xpForNextLevel) {
      player.level++;
      player.xp -= xpForNextLevel;
      
      // Give 2 stat points per level up
      player.statPoints += 2;
      
      logServer(`Player ${player.username} leveled up to ${player.level}`, 'info');
    }
    
    saveGameData();
    res.json({ success: true, player: sanitizePlayer(player), bonusXP });
  } catch (error) {
    logServer(`XP update error: ${error.message}`, 'error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stat point allocation
app.post('/api/player/:username/allocate-stats', (req, res) => {
  try {
    const { sessionId, stats } = req.body;
    const session = gameData.sessions.get(sessionId);
    
    if (!session || session.username !== req.params.username) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const player = gameData.players.get(req.params.username);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Calculate total points being allocated
    const totalPoints = (stats.strength || 0) + (stats.intelligence || 0) + (stats.speed || 0) + (stats.luck || 0);
    
    if (totalPoints > player.statPoints) {
      return res.status(400).json({ error: 'Not enough stat points' });
    }
    
    // Apply stat allocations
    player.stats.strength += (stats.strength || 0);
    player.stats.intelligence += (stats.intelligence || 0);
    player.stats.speed += (stats.speed || 0);
    player.stats.luck += (stats.luck || 0);
    player.statPoints -= totalPoints;
    
    saveGameData();
    logServer(`Player ${player.username} allocated ${totalPoints} stat points`, 'info');
    
    res.json({ success: true, player: sanitizePlayer(player) });
  } catch (error) {
    logServer(`Stat allocation error: ${error.message}`, 'error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update player email
app.post('/api/player/:username/email', (req, res) => {
  try {
    const { sessionId, email } = req.body;
    const session = gameData.sessions.get(sessionId);
    
    if (!session || session.username !== req.params.username) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const player = gameData.players.get(req.params.username);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if email already exists
    const emailExists = Array.from(gameData.players.values()).some(p => p.email === email && p.username !== req.params.username);
    if (emailExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    player.email = email;
    saveGameData();
    
    res.json({ success: true, email: player.email });
  } catch (error) {
    logServer(`Email update error: ${error.message}`, 'error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin routes
app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalPlayers: gameData.players.size,
    onlinePlayers: clients.size,
    settlements: gameData.settlements,
    maxPlayers: MAX_PLAYERS
  });
});

app.get('/api/admin/players', (req, res) => {
  const players = Array.from(gameData.players.values()).map(sanitizePlayer);
  res.json(players);
});

app.get('/api/admin/logs', (req, res) => {
  const { sessionId } = req.query;
  const session = gameData.sessions.get(sessionId);
  
  if (!session) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const player = gameData.players.get(session.username);
  if (!player || !player.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.json(gameData.serverLogs);
});

app.get('/api/races', (req, res) => {
  res.json(RACES);
});

app.get('/api/settlements', (req, res) => {
  res.json(gameData.settlements);
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/profile/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Initialize and start server
(async () => {
  await loadGameData();
  
  server.listen(PORT, () => {
    logServer(`Foxhole MMORPG server running on port ${PORT}`, 'system');
    logServer(`Max players: ${MAX_PLAYERS}`, 'system');
    logServer(`Map size: 150x150 tiles`, 'system');
    logServer(`Settlements: ${gameData.settlements.length}`, 'system');
  });
})();
