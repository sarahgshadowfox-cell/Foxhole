# Foxhole ⚓

A browser-based text MMORPG with a pirate theme

## Features

### Game Mechanics
- **150x150 Tile Grid Map** - Expansive world to explore
- **25 Procedurally Generated Islands** - Unique terrain including grass, forest, mountains, and beaches
- **12 Pirate-Themed Settlements** - Port Royal, Tortuga, Nassau, Shipwreck Bay, Skull Island, Treasure Cove, Blackbeard's Harbor, Rum Bay, Cannonball Reef, Cutlass Point, Parrot's Perch, and Jolly Roger Port
- **Max 100 Players** - Server capacity management
- **Real-time Gameplay** - WebSocket-based for instant updates

### Character System
- **6 Playable Races** with unique bonuses:
  - **Human** - Versatile and adaptable sailors (+5 Intelligence, +5 Charisma)
  - **Cat People** - Agile and quick-witted felines (+10 Agility)
  - **Orc** - Strong and fearsome warriors (+10 Strength, -5 Charisma, +5 Vitality)
  - **Dwarf** - Hardy and resilient craftsmen (+5 Strength, -5 Agility, +10 Vitality)
  - **Elf** - Wise and graceful navigators (+5 Agility, +5 Intelligence, +5 Charisma, -5 Vitality)
  - **Goblin** - Cunning and sneaky scavengers (-5 Strength, +5 Agility, +5 Intelligence, -5 Charisma)

### Progression System
- **Level 1-100** - Extensive leveling system
- **XP Gain Mechanics** - Train and complete activities to gain experience
- **Stat Improvements** - Automatic stat increases on level up
- **Character Stats** - Strength, Agility, Intelligence, Charisma, Vitality

### Social Features
- **Global Chat** - Communicate with all online players in real-time
- **Player Profiles** - View detailed character information
- **Avatar Upload** - Customize your character with custom images (5MB limit, jpg/png/gif)
- **Online Player Count** - See how many players are currently online

### User Interfaces
- **Player UI** - Interactive game interface with map view, stats, location info, and chat
- **Admin UI** - Server statistics, player list, settlement management
- **Character Creation** - Race selection with bonus preview
- **Profile Pages** - Character information and avatar management

### Map & Navigation
- **Visual Map Display** - Canvas-based tile map showing terrain types
- **Player Movement** - Navigate in four directions (North, South, East, West)
- **Settlement Markers** - See all settlements on the map
- **Terrain Types** - Water, grass, forest, mountains, and beaches with distinct colors

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Setup
```bash
# Clone the repository
git clone https://github.com/sarahgshadowfox-cell/Foxhole.git
cd Foxhole

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 3000 (or the port specified in the PORT environment variable).

### First Time Setup
1. Open your browser and navigate to `http://localhost:3000`
2. Click "Create New Character"
3. Choose a username, password, and race
4. Click "Create Character"
5. Login with your credentials
6. Start your pirate adventure!

## Usage

### For Players
- **Login**: `http://localhost:3000/` - Main login page
- **Game**: `http://localhost:3000/game` - Main game interface (requires login)
- **Profile**: `http://localhost:3000/profile/:username` - View any player's profile

### For Admins
- **Admin Panel**: `http://localhost:3000/admin` - Server statistics and player management

## API Endpoints

### Authentication
- `POST /api/register` - Create a new character
- `POST /api/login` - Login and get session ID

### Player Management
- `GET /api/player/:username` - Get player information
- `POST /api/player/:username/avatar` - Upload player avatar
- `POST /api/player/:username/xp` - Add XP to player (for gaining levels)

### Game Data
- `GET /api/races` - Get all available races with bonuses
- `GET /api/settlements` - Get all settlement locations
- `GET /api/admin/stats` - Get server statistics
- `GET /api/admin/players` - Get list of all players

### WebSocket Events
- `auth` - Authenticate WebSocket connection
- `chat` - Send/receive chat messages
- `move` - Move player on the map
- `get_map` - Request map data for a region

## Technology Stack

- **Backend**: Node.js, Express
- **WebSocket**: ws library for real-time communication
- **Authentication**: bcrypt for password hashing
- **File Upload**: multer for avatar management
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Styling**: Custom CSS with pirate theme

## File Structure

```
Foxhole/
├── server.js           # Main server file
├── package.json        # Project dependencies
├── public/             # Frontend files
│   ├── index.html      # Login/registration page
│   ├── game.html       # Main game interface
│   ├── admin.html      # Admin panel
│   ├── profile.html    # Player profile page
│   ├── css/
│   │   └── style.css   # All styling
│   ├── js/
│   │   ├── auth.js     # Login/registration logic
│   │   ├── game.js     # Game interface logic
│   │   ├── admin.js    # Admin panel logic
│   │   └── profile.js  # Profile page logic
│   ├── images/         # Static images
│   └── avatars/        # User-uploaded avatars
└── data/               # Game data storage
    └── game_data.json  # Map, settlements, players
```

## Development

### Adding New Features
The codebase is modular and easy to extend:
- Add new races in `server.js` under `RACES`
- Modify map generation in `initializeMap()`
- Extend WebSocket messages in `handleWebSocketMessage()`
- Add new UI elements in respective HTML files

### Data Persistence
Game data is stored in `data/game_data.json` and loaded on server start. Player passwords are hashed using bcrypt.

## Security Notes

- Passwords are hashed with bcrypt before storage
- Session-based authentication for WebSocket connections
- File upload size limits (5MB) and type validation
- Input validation on all API endpoints

## License

ISC

## Author

Sarah G. Shadowfox

---

Set sail and begin your pirate adventure! ⚓🏴‍☠️
