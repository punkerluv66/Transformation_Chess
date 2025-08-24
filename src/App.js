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
    
    // Инициализируем локальную копию игры
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
        
        // Подписываемся на события игры
        setupGameEvents(gameSocket, newGame);
      } else {
        setTimeout(initGame, 100);
      }
    };
    
    initGame();
  };

  const setupGameEvents = (gameSocket, gameInstance) => {
    // Удаляем старые обработчики перед добавлением новых
    gameSocket.off('gameStateUpdate');
    gameSocket.off('gameReset');
    gameSocket.off('moveError');

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
    if (socket) {
      socket.close();
    }
    setGameMode('menu');
    setGame(null);
    setGameState(null);
    setSocket(null);
    setOnlineGameData(null);
  };

  // Определяем цвет текущего игрока для онлайн игры
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
    return <GameLobby onGameStart={handleOnlineGameStart} />;
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