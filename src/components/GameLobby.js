import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './GameLobby.css';

const GameLobby = ({ onGameStart, savedRoomData }) => {
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  const getServerUrl = () => {
    if (process.env.NODE_ENV === 'production') {
      return window.location.origin;
    }
    return window.location.origin;
  };

  const serverUrl = getServerUrl();

  useEffect(() => {
    console.log('🔌 Creating socket connection to:', serverUrl);
    console.log('🌐 Environment:', process.env.NODE_ENV);
    console.log('🌐 Current location:', window.location.href);

    const newSocket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      forceNew: true,
      reconnection: true,
      timeout: 20000,
      autoConnect: true
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to server! Socket ID:', newSocket.id);
      console.log('🔗 Transport:', newSocket.io.engine.transport.name);
      setConnectionStatus('connected');
      setError('');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setConnectionStatus('error');
      setError(`Cannot connect to server: ${error.message || 'Unknown error'}`);
    });

    newSocket.on('connected', (data) => {
      console.log('Server confirmation:', data);
    });

    newSocket.on('roomCreated', (data) => {
      console.log('Room created:', data);
      setCurrentRoom(data);
      setWaitingForOpponent(data.waitingForOpponent);
      setError('');
    });

    newSocket.on('joinedRoom', (data) => {
      console.log('Joined room:', data);
      setCurrentRoom(data);
      setWaitingForOpponent(data.waitingForOpponent);
      setError('');
    });

    newSocket.on('gameStarted', (data) => {
      console.log('🎮 Game started, passing socket to App:', data);
      setWaitingForOpponent(false);
      onGameStart(newSocket, data);
    });

    newSocket.on('roomsList', (rooms) => {
      console.log('Rooms list:', rooms);
      setAvailableRooms(rooms);
    });

    newSocket.on('joinError', (message) => {
      console.error('Join error:', message);
      setError(message);
    });

    newSocket.on('playerDisconnected', () => {
      setError('Opponent disconnected');
      setWaitingForOpponent(false);
      setCurrentRoom(null);
    });

    return () => {
      console.log('🧹 GameLobby cleanup (socket will be reused)');
    };
  }, [onGameStart]);

  useEffect(() => {
    if (!savedRoomData || !savedRoomData.roomId) return;
    
    console.log('🔄 Setting up rejoin attempt for room:', savedRoomData.roomId);
    
    let rejoinAttempts = 0;
    const maxRejoinAttempts = 5;
    
    const attemptRejoin = () => {
      if (!socket || !socket.connected) {
        console.log('⏳ Socket not ready yet, delaying rejoin attempt');
        return;
      }
      
      if (currentRoom) {
        console.log('✅ Already in a room, skipping rejoin attempt');
        return;
      }
      
      console.log(`🔄 Rejoin attempt ${rejoinAttempts + 1}/${maxRejoinAttempts} for room ${savedRoomData.roomId}`);
      
      if (savedRoomData.playerName) {
        setPlayerName(savedRoomData.playerName);
      }
      
      socket.emit('rejoinRoom', {
        roomId: savedRoomData.roomId,
        playerName: savedRoomData.playerName
      });
      
      rejoinAttempts++;
    };
    
    // Попытка переподключения каждую секунду
    const rejoinInterval = setInterval(() => {
      if (rejoinAttempts >= maxRejoinAttempts || currentRoom) {
        console.log('🛑 Stopping rejoin attempts:', 
                    currentRoom ? 'Already in room' : 'Max attempts reached');
        clearInterval(rejoinInterval);
        return;
      }
      
      attemptRejoin();
    }, 1000); // Пробовать каждую секунду
    
    // Попробовать сразу
    attemptRejoin();
    
    return () => {
      clearInterval(rejoinInterval);
    };
  }, [savedRoomData, socket, currentRoom]);
  
  const createRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (connectionStatus !== 'connected') {
      setError('Not connected to server');
      return;
    }
    
    console.log('Creating room for:', playerName);
    socket.emit('createRoom', playerName);
  };

  const joinRoom = (roomIdToJoin) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (connectionStatus !== 'connected') {
      setError('Not connected to server');
      return;
    }
    
    console.log('Joining room:', roomIdToJoin);
    socket.emit('joinRoom', { roomId: roomIdToJoin, playerName });
  };

  const joinRoomById = () => {
    if (!roomId.trim()) {
      setError('Please enter room ID');
      return;
    }
    joinRoom(roomId);
  };

  const refreshRooms = () => {
    if (connectionStatus !== 'connected') {
      setError('Not connected to server');
      return;
    }
    socket.emit('getRooms');
  };

  const getConnectionStatusMessage = () => {
    const displayUrl = serverUrl === window.location.origin ? 'same domain' : serverUrl;
    switch (connectionStatus) {
      case 'connecting':
        return `🔄 Connecting to server (${displayUrl})...`;
      case 'connected':
        return `✅ Connected to server (${displayUrl})`;
      case 'disconnected':
        return '❌ Disconnected from server';
      case 'error':
        return `⚠️ Cannot connect to server`;
      default:
        return '';
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      console.log('Link copied to clipboard!');
    });
  };

  if (waitingForOpponent) {
    return (
      <div className="lobby-container">
        <div className="waiting-room">
          <h2>Waiting for Opponent...</h2>
          <p>Room ID: <strong>{currentRoom?.roomId}</strong></p>
          <p>Share this page URL with your friend!</p>
          <div className="share-info">
            <p><strong>Share this link:</strong></p>
            <input 
              type="text" 
              readOnly 
              value={window.location.href}
              onClick={(e) => e.target.select()}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: '#f9f9f9'
              }}
            />
            <button onClick={copyToClipboard} style={{marginTop: '10px'}}>
              📋 Copy Link
            </button>
          </div>
          <div className="loading-spinner"></div>
          <button onClick={() => {
            setCurrentRoom(null);
            setWaitingForOpponent(false);
          }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <h1>🏆 Transformation Chess Online</h1>
      
      <div className={`connection-status ${connectionStatus}`}>
        {getConnectionStatusMessage()}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="player-setup">
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
        />
      </div>

      <div className="lobby-sections">
        <div className="create-section">
          <h3>Create New Game</h3>
          <button 
            onClick={createRoom} 
            disabled={!playerName.trim() || connectionStatus !== 'connected'}
          >
            🎮 Create Room
          </button>
        </div>

        <div className="join-section">
          <h3>Join by Room ID</h3>
          <div className="join-controls">
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button 
              onClick={joinRoomById} 
              disabled={!playerName.trim() || !roomId.trim() || connectionStatus !== 'connected'}
            >
              Join
            </button>
          </div>
        </div>

        <div className="rooms-section">
          <h3>Available Rooms</h3>
          <button 
            onClick={refreshRooms} 
            className="refresh-btn"
            disabled={connectionStatus !== 'connected'}
          >
            🔄 Refresh
          </button>
          <div className="rooms-list">
            {availableRooms.length === 0 ? (
              <p className="no-rooms">No available rooms</p>
            ) : (
              availableRooms.map(room => (
                <div key={room.id} className="room-item">
                  <span className="room-info">
                    <strong>{room.id}</strong> - Host: {room.hostName}
                  </span>
                  <button 
                    onClick={() => joinRoom(room.id)}
                    disabled={!playerName.trim() || connectionStatus !== 'connected'}
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;