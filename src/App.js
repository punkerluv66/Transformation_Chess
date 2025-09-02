import React, { useState, useEffect } from 'react';
import ChessBoard from './components/ChessBoard';
import GameInfo from './components/GameInfo';
import GameLobby from './components/GameLobby';
import './App.css';

function App() {
  const [gameMode, setGameMode] = useState('menu');
  const [game, setGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [gameKey, setGameKey] = useState(0);
  const [socket, setSocket] = useState(null);
  const [onlineGameData, setOnlineGameData] = useState(null);
  
  const saveRoomData = (roomData, socketId) => {
    if (!roomData || !socketId) {
      console.error('❌ Cannot save room data: invalid data or socketId');
      return;
    }
    
    localStorage.setItem('chess_room', JSON.stringify({
      roomId: roomData.roomId,
      playerName: roomData.players.find(p => p.id === socketId)?.name,
      playerColor: roomData.players.find(p => p.id === socketId)?.color,
      timestamp: new Date().getTime()
    }));
    console.log('🔄 Room data saved to localStorage');
  };

  

  const loadRoomData = () => {
    const savedData = localStorage.getItem('chess_room');
    console.log('🔎 Checking for saved room data...', savedData ? 'Found' : 'Not found');
    
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        console.log('📊 Parsed room data:', parsedData);
        
        if (new Date().getTime() - parsedData.timestamp < 24 * 60 * 60 * 1000) {
          console.log('🔄 Found valid saved room:', parsedData);
          return parsedData;
        } else {
          console.log('⏰ Room data expired, clearing');
          localStorage.removeItem('chess_room');
        }
      } catch (e) {
        console.error('❌ Error parsing saved room data:', e);
        localStorage.removeItem('chess_room');
      }
    }
    return null;
  };

  const clearRoomData = () => {
    localStorage.removeItem('chess_room');
    console.log('🧹 Room data cleared from localStorage');
  };
  useEffect(() => {
  const savedRoom = loadRoomData();
  if (savedRoom && savedRoom.roomId) {
    console.log('🔄 Found saved room, redirecting to lobby');
    setGameMode('lobby');
  }
}, []);
  useEffect(() => {
    if (gameMode === 'local') {
      initLocalGame();
    }
  }, [gameMode]);

  const initLocalGame = () => {
    const initGame = () => {
      if (window.ChessGame) {
        const newGame = new window.ChessGame();
        setGame(newGame);
        setGameState(newGame.getGameState());
      } else {
        setTimeout(initGame, 100);
      }
    };
    initGame();
  };

  const handleOnlineGameStart = (gameSocket, gameData) => {
    console.log('🎮 Online game starting with existing socket:', {
      socketId: gameSocket.id,
      players: gameData.players,
      myPlayer: gameData.players?.find(p => p.id === gameSocket.id)
    });

    setSocket(gameSocket);
    setOnlineGameData(gameData);
    setGameMode('online');
    saveRoomData(gameData, gameSocket.id);
    
    const initGame = () => {
      if (window.ChessGame) {
        const newGame = new window.ChessGame();
        
        if (gameData.gameState) {
          newGame.board = gameData.gameState.board;
          newGame.currentPlayer = gameData.gameState.currentPlayer;
          newGame.gameStatus = gameData.gameState.gameStatus;
        }
        
        setGame(newGame);
        setGameState(newGame.getGameState());
        
        setupGameEvents(gameSocket, newGame);
      } else {
        setTimeout(initGame, 100);
      }
    };
    
    initGame();
  };

  const setupGameEvents = (gameSocket, gameInstance) => {
    gameSocket.off('gameStateUpdate');
    gameSocket.off('gameReset');
    gameSocket.off('moveError');
    gameSocket.off('playerReconnected');

    gameSocket.on('gameStateUpdate', (data) => {
      console.log('📡 Game state update received:', data);
      
      gameInstance.board = data.gameState.board;
      gameInstance.currentPlayer = data.gameState.currentPlayer;
      gameInstance.gameStatus = data.gameState.gameStatus;
      gameInstance.selectedSquare = null;
      gameInstance.possibleMoves = [];
      
      setGameState({...data.gameState});
      setGameKey(prev => prev + 1);
    });

    gameSocket.on('gameReset', (newGameState) => {
      console.log('🔄 Game reset received');
      gameInstance.resetGame();
      setGameState(gameInstance.getGameState());
      setGameKey(prev => prev + 1);
    });
    
    gameSocket.on('moveError', (error) => {
      console.error('❌ Move error:', error);
      alert(`Move error: ${error}`);
    });
    gameSocket.on('playerReconnected', (data) => {
    console.log(`👋 Player ${data.name} reconnected as ${data.color}`);
    // Обновляем список игроков с правильными цветами
    if (onlineGameData) {
      const updatedPlayers = [...onlineGameData.players];
      const playerIndex = updatedPlayers.findIndex(p => p.name === data.name);
      if (playerIndex !== -1) {
        updatedPlayers[playerIndex].id = gameSocket.id; // используйте gameSocket, а не socket
        setOnlineGameData({
          ...onlineGameData,
          players: updatedPlayers
        });
      }
    }
  });
  gameSocket.on('opponentLeft', (data) => {
    console.log('👋 Opponent left the game:', data);
    
    // Обновляем состояние игры - победа!
    gameInstance.gameStatus = 'checkmate';
    gameInstance.isGameOver = true;
    gameInstance.winner = data.winnerColor;
    
    // Обновляем UI
    setGameState({
      ...gameInstance.getGameState(),
      gameStatus: 'checkmate',
      isGameOver: true,
      winner: data.winnerColor,
      message: `${data.opponentName} left the game. You win!`
    });
    
    // Показываем сообщение
    alert(`${data.opponentName} left the game. You win!`);
    
    // Переключаем на режим ожидания нового оппонента
    setTimeout(() => {
      setGameMode('lobby');
    }, 3000);
  });
};


  const handleSquareClick = (row, col) => {
    console.log(`🎯 App handleSquareClick called: ${row}, ${col}`, { 
      gameMode, 
      hasGame: !!game, 
      hasSocket: !!socket,
      socketId: socket?.id,
      socketConnected: socket?.connected,
      hasOnlineGameData: !!onlineGameData
    });
    
    if (gameMode === 'local') {
      // Локальная игра
      if (!game || gameState?.isGameOver) {
        console.log('❌ Local game blocked:', { hasGame: !!game, isGameOver: gameState?.isGameOver });
        return;
      }
      
      console.log('✅ Making local move');
      const result = game.selectSquare(row, col);
      setGameState(result.gameState);
      if (result.moved) {
        setGameKey(prev => prev + 1);
      }
      
    } else if (gameMode === 'online') {
      // Онлайн игра
      if (!socket || !socket.id || !socket.connected) {
        console.log('❌ Socket not connected:', {
          hasSocket: !!socket,
          socketId: socket?.id,
          connected: socket?.connected
        });
        alert('Connection lost! Please refresh and try again.');
        return;
      }
      
      if (!game || !onlineGameData || gameState?.isGameOver) {
        console.log('❌ Cannot make move - missing dependencies');
        return;
      }
      
      console.log('🔍 Online game debugging:', {
        socketId: socket.id,
        players: onlineGameData.players,
        playersDetails: onlineGameData.players?.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          isCurrentSocket: p.id === socket.id
        }))
      });
      
      // Проверяем, что это ход текущего игрока
      const currentPlayerData = onlineGameData.players.find(p => p.id === socket.id);
      if (!currentPlayerData) {
        console.log('❌ Player not found in game data:', {
          socketId: socket.id,
          availablePlayers: onlineGameData.players?.map(p => p.id)
        });
        return;
      }
      
      console.log(`🎮 Current turn check:`, {
        playerColor: currentPlayerData.color,
        currentTurn: gameState.currentPlayer,
        match: currentPlayerData.color === gameState.currentPlayer
      });
      
      if (currentPlayerData.color !== gameState.currentPlayer) {
        console.log(`❌ Not your turn! You are ${currentPlayerData.color}, current turn: ${gameState.currentPlayer}`);
        return;
      }
      
      // Получаем текущее выделение перед ходом
      const selectedSquare = game.selectedSquare;
      
      console.log(`🎯 Making online move:`, {
        selectedSquare,
        target: { row, col },
        boardPiece: gameState.board[row][col]
      });
      
      // Применяем логику хода локально для валидации
      const result = game.selectSquare(row, col);
      
      console.log(`🎲 Move result:`, {
        moved: result.moved,
        newCurrentPlayer: result.gameState.currentPlayer,
        selectedSquare: result.gameState.selectedSquare,
        possibleMoves: result.gameState.possibleMoves?.length || 0
      });
      
      // Если ход был выполнен (фигура переместилась)
      if (result.moved) {
        console.log('✅ Move made locally, sending to server');
        
        // Отправляем ход на сервер
        socket.emit('makeMove', {
          roomId: onlineGameData.roomId,
          from: selectedSquare,
          to: { row, col },
          gameState: result.gameState
        });
        
        // НЕ обновляем локальное состояние - дождемся ответа сервера
      } else {
        // Просто обновляем локальное состояние (выделение фигуры)
        console.log('🎯 Piece selected or deselected, updating local state');
        setGameState(result.gameState);
      }
    }
  };

  const handleResetGame = () => {
    if (gameMode === 'local') {
      if (!game) return;
      game.resetGame();
      setGameState(game.getGameState());
      setGameKey(prev => prev + 1);
    } else if (gameMode === 'online' && socket && onlineGameData) {
      socket.emit('resetGame', onlineGameData.roomId);
    }
  };

  const backToMenu = () => {
  if (socket && socket.connected && onlineGameData) {
    socket.emit('leaveGame', {
      roomId: onlineGameData.roomId,
      playerColor: onlineGameData.players.find(p => p.id === socket.id)?.color
    });
    
    clearRoomData();
  }
  
  setGameMode('menu');
  setGame(null);
  setGameState(null);
  setSocket(null);
  setOnlineGameData(null);
};

  const getPlayerColor = () => {
    if (gameMode === 'online' && onlineGameData && socket) {
      const playerData = onlineGameData.players.find(p => p.id === socket.id);
      return playerData ? playerData.color : null;
    }
    return null;
  };

  const getOpponentName = () => {
    if (gameMode === 'online' && onlineGameData && socket) {
      const opponent = onlineGameData.players.find(p => p.id !== socket.id);
      return opponent ? opponent.name : 'Unknown';
    }
    return null;
  };

  if (gameMode === 'menu') {
    return (
      <div className="app">
        <h1>🏰 Transformation Chess</h1>
        <div className="menu-container">
          <div className="menu-options">
            <button 
              className="menu-button local-game"
              onClick={() => setGameMode('local')}
            >
              🎮 Play Local Game
            </button>
            <button 
              className="menu-button online-game"
              onClick={() => setGameMode('lobby')}
            >
              🌐 Play Online
            </button>
          </div>
          <div className="game-description">
            <h3>How to Play:</h3>
            <ul>
              <li>Standard chess rules apply</li>
              <li>Pieces can fuse with ally pieces (except King)</li>
              <li>Fused pieces combine movement abilities</li>
              <li>Win by checkmate or capturing the enemy King</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (gameMode === 'lobby') {
    const savedRoomData = loadRoomData();
  return <GameLobby onGameStart={handleOnlineGameStart} savedRoomData={savedRoomData} />;
  }

  if (!game || !gameState) {
    return (
      <div className="app">
        <h1>Transformation Chess</h1>
        <div>Loading game...</div>
        <div>Game: {game ? '✅' : '❌'}</div>
        <div>State: {gameState ? '✅' : '❌'}</div>
        <div>Mode: {gameMode}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-header">
        <h1>
          Transformation Chess {gameMode === 'online' ? '🌐' : '🏠'}
          {gameMode === 'online' && getPlayerColor() && (
            <span className={`player-color ${getPlayerColor()}`}>
              {` - You are ${getPlayerColor().toUpperCase()}`}
            </span>
          )}
        </h1>
        <button className="back-button" onClick={backToMenu}>
          ← Back to Menu
        </button>
      </div>
      
      {gameMode === 'online' && (
        <div className="online-game-info">
          {getOpponentName() && (
            <div className="opponent-info">
              <p>Playing against: <strong>{getOpponentName()}</strong></p>
            </div>
          )}
          <div className="turn-info">
            <p>Current turn: <strong>{gameState.currentPlayer?.toUpperCase()}</strong></p>
            {gameState.currentPlayer === getPlayerColor() ? (
              <p className="your-turn">🟢 Your turn!</p>
            ) : (
              <p className="their-turn">🔴 Opponent's turn</p>
            )}
          </div>
        </div>
      )}
      
      {gameState.isGameOver && (
        <div className="victory-banner">
          🎉 GAME OVER! 🎉
        </div>
      )}
      
      <div className="game-container">
        <ChessBoard
          key={gameKey}
          gameState={gameState}
          onSquareClick={handleSquareClick}
          game={game}
          playerColor={getPlayerColor()}
        />
        <GameInfo
          gameState={gameState}
          onResetGame={handleResetGame}
          gameMode={gameMode}
          onlineGameData={onlineGameData}
          playerColor={getPlayerColor()}
          opponentName={getOpponentName()}
        />
      </div>
    </div>
  );
}

export default App;