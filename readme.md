# 🏆 Transformation Chess Online

Online chess game with piece transformation for two players. Full-featured web game with real-time multiplayer support and automatic reconnection.

## ✨ Features

- 🎮 **Classic Chess** with complete rules implementation
- 🔄 **Room System** - create game or join by ID
- 🌐 **Real-time** gameplay via WebSocket connection
- 🎯 **Move highlighting** for possible moves
- 👥 **Multiplayer mode** for online gaming
- 🔧 **Ready to deploy** (development + production modes)


## 🎮 How to Play
1. Enter your name
2. Create room or join by ID
3. Share link with opponent
4. Play! - click piece then click destination square

## Game Features:
✅ Standard chess rules
✅ Pawn promotion to any piece
✅ Move highlighting
✅ Check and checkmate detection
✅ Reconnection on connection loss


## 🚀 Quick Start

### Requirements
- Node.js 14+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/punkerluv/transformation-chess.git
cd transformation-chess

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Build and run (everything on port 5000)
npm run start:full

# Or step by step:
npm run build
cd server  
NODE_ENV=production npm start

Application available at: http://localhost:5000

### 📁 Project Structure


transformation-chess/
├── public/                 # React static files
├── src/                   # Frontend source code
│   ├── components/        # React components
│   │   ├── GameLobby.js  # Lobby and room creation
│   │   ├── GameBoard.js  # Game board
│   │   └── ...
│   ├── models/           # Game logic
│   │   └── ChessGame.js  # Chess rules
│   └── App.js            # Main component
├── server/               # Backend server
│   ├── server.js         # Express + Socket.IO server
│   └── package.json      # Server dependencies
├── build/                # Built React app (auto-generated)
└── package.json          # Main package.json

