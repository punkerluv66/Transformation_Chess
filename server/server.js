// :\TransformationChess\server\server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const isDevelopment = process.env.NODE_ENV !== 'production';

// В продакшене обслуживаем React приложение
if (!isDevelopment) {
  console.log('📁 Setting up static files from:', path.join(__dirname, '../build'));
  app.use(express.static(path.join(__dirname, '../build')));
} else {
  console.log('🔧 Development mode - static files not served');
}

const io = socketIo(server, {
  cors: isDevelopment ? {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  } : {}
});

const gameRooms = new Map();

class GameRoom {
  constructor(id, hostName, hostSocketId) {
    this.id = id;
    this.players = [
      { id: hostSocketId, name: hostName, color: 'white' }
    ];
    this.isGameStarted = false;
    this.gameState = this.createInitialGameState();
  }

  createInitialGameState() {
    return {
      board: this.initializeBoard(),
      currentPlayer: 'white',
      selectedSquare: null,
      possibleMoves: [],
      gameStatus: 'playing',
      isGameOver: false,
      winner: null
    };
  }

  initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Place pawns
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: 'pawn', color: 'black' };
      board[6][i] = { type: 'pawn', color: 'white' };
    }

    // Place other pieces
    const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let i = 0; i < 8; i++) {
      board[0][i] = { type: pieceOrder[i], color: 'black' };
      board[7][i] = { type: pieceOrder[i], color: 'white' };
    }

    return board;
  }

  addPlayer(socketId, playerName) {
    if (this.players.length < 2) {
      this.players.push({
        id: socketId,
        name: playerName,
        color: this.players.length === 1 ? 'black' : 'white'
      });
      return true;
    }
    return false;
  }

  getPlayerBySocketId(socketId) {
    return this.players.find(player => player.id === socketId);
  }

  startGame() {
    if (this.players.length === 2) {
      this.isGameStarted = true;
      return true;
    }
    return false;
  }

  makeMove(from, to, newGameState) {
    console.log(`🎯 Applying move in room ${this.id}:`, {
      from: `${from.row},${from.col}`,
      to: `${to.row},${to.col}`,
      oldCurrentPlayer: this.gameState.currentPlayer,
      newCurrentPlayer: newGameState.currentPlayer
    });

    // Обновляем состояние игры ПОЛНОСТЬЮ
    this.gameState = {
      ...newGameState,
      selectedSquare: null,
      possibleMoves: []
    };
    
    console.log(`✅ Move applied successfully:`, {
      currentPlayer: this.gameState.currentPlayer,
      gameStatus: this.gameState.gameStatus,
      isGameOver: this.gameState.isGameOver
    });

    return this.gameState;
  }

  resetGame() {
    this.gameState = this.createInitialGameState();
    return this.gameState;
  }

  removePlayer(socketId) {
    this.players = this.players.filter(player => player.id !== socketId);
    if (this.players.length === 0) {
      return true; // Room should be deleted
    }
    return false;
  }

  toJSON() {
    return {
      roomId: this.id,
      players: this.players,
      isGameStarted: this.isGameStarted,
      gameState: this.gameState,
      waitingForOpponent: this.players.length === 1
    };
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// API маршруты с префиксом
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeRooms: gameRooms.size,
    mode: isDevelopment ? 'development' : 'production'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    message: 'Chess server is running!',
    port: process.env.PORT || 5000,
    timestamp: new Date().toISOString(),
    activeRooms: gameRooms.size,
    mode: isDevelopment ? 'development' : 'production',
    rooms: Array.from(gameRooms.values()).map(room => ({
      id: room.id,
      players: room.players.length,
      isStarted: room.isGameStarted
    }))
  });
});

// Socket.IO обработчики
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  console.log('Connection origin:', socket.request.headers.origin);

  socket.emit('connected', { 
    socketId: socket.id,
    serverTime: new Date().toISOString()
  });

  socket.on('createRoom', (playerName) => {
    const roomId = generateRoomId();
    const room = new GameRoom(roomId, playerName, socket.id);
    
    gameRooms.set(roomId, room);
    socket.join(roomId);
    
    console.log(`Room ${roomId} created by ${playerName}`);
    socket.emit('roomCreated', room.toJSON());
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    console.log(`${playerName} trying to join room ${roomId}`);
    
    const room = gameRooms.get(roomId);
    if (!room) {
      socket.emit('joinError', 'Room not found');
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('joinError', 'Room is full');
      return;
    }

    if (room.addPlayer(socket.id, playerName)) {
      socket.join(roomId);
      console.log(`${playerName} joined room ${roomId}`);
      
      if (room.startGame()) {
        console.log(`Game started in room ${roomId}`);
        io.to(roomId).emit('gameStarted', room.toJSON());
      } else {
        socket.emit('joinedRoom', room.toJSON());
      }
    }
  });

  socket.on('makeMove', ({ roomId, from, to, gameState }) => {
    console.log(`🎯 Move received for room ${roomId}:`, { 
      from: `${from.row},${from.col}`, 
      to: `${to.row},${to.col}`,
      player: socket.id
    });
    
    const room = gameRooms.get(roomId);
    if (!room || !room.isGameStarted) {
      console.log('❌ Room not found or game not started');
      socket.emit('moveError', 'Room not found or game not started');
      return;
    }

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) {
      console.log('❌ Player not found in room');
      socket.emit('moveError', 'Player not found in room');
      return;
    }

    if (player.color !== room.gameState.currentPlayer) {
      socket.emit('moveError', `Not your turn! Current turn: ${room.gameState.currentPlayer}, you are: ${player.color}`);
      console.log(`❌ Wrong turn: ${player.name}(${player.color}) tried to move on ${room.gameState.currentPlayer}'s turn`);
      return;
    }

    const updatedGameState = room.makeMove(from, to, gameState);
    
    console.log(`✅ Move applied successfully in room ${roomId}`);
    console.log(`📡 Broadcasting game state update to all players in room ${roomId}`);
    
    io.to(roomId).emit('gameStateUpdate', {
      gameState: updatedGameState,
      lastMove: { 
        from, 
        to, 
        player: player.name,
        playerColor: player.color
      }
    });
    
    console.log(`📤 Game state update broadcasted successfully`);
  });

  socket.on('resetGame', (roomId) => {
    const room = gameRooms.get(roomId);
    if (room && room.isGameStarted) {
      const newGameState = room.resetGame();
      io.to(roomId).emit('gameReset', newGameState);
      console.log(`Game reset in room ${roomId}`);
    }
  });

  socket.on('getRooms', () => {
    const availableRooms = Array.from(gameRooms.values())
      .filter(room => !room.isGameStarted && room.players.length === 1)
      .map(room => ({
        id: room.id,
        hostName: room.players[0].name,
        playerCount: room.players.length
      }));
    
    socket.emit('roomsList', availableRooms);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    for (const [roomId, room] of gameRooms.entries()) {
      if (room.removePlayer(socket.id)) {
        gameRooms.delete(roomId);
        console.log(`Room ${roomId} deleted`);
      } else if (room.players.length > 0) {
        socket.to(roomId).emit('playerDisconnected');
      }
    }
  });
});

// В продакшене обслуживаем React для всех остальных путей
if (!isDevelopment) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// Обработка ошибок
io.on('error', (error) => {
  console.error('❌ Socket.IO error:', error);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Chess server running on port ${PORT}`);
  console.log(`🌐 Mode: ${isDevelopment ? 'Development' : 'Production'}`);
  if (!isDevelopment) {
    console.log(`🎮 Game available at: http://localhost:${PORT}`);
  } else {
    console.log(`🎮 Frontend: http://localhost:3000`);
    console.log(`🔧 Backend: http://localhost:${PORT}`);
  }
});