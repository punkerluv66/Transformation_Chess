import React from 'react';
import './GameInfo.css';

const GameInfo = ({ gameState, onResetGame }) => {
  // Добавим отладку
  console.log('GameInfo received gameState:', gameState);
  
  const { currentPlayer, gameStatus, isGameOver, winner } = gameState;

  const getStatusMessage = () => {
    switch (gameStatus) {
      case 'check':
        return `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} is in CHECK!`;
      case 'checkmate':
        return `CHECKMATE! ${winner.charAt(0).toUpperCase() + winner.slice(1)} WINS!`;
      case 'stalemate':
        return 'STALEMATE! It\'s a draw!';
      default:
        return `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
    }
  };

  const getStatusClass = () => {
    switch (gameStatus) {
      case 'check':
        return 'check-status';
      case 'checkmate':
        return 'checkmate-status';
      case 'stalemate':
        return 'stalemate-status';
      default:
        return `${currentPlayer}-turn`;
    }
  };

  return (
    <div className="game-info">
      <div className={`current-player ${getStatusClass()}`}>
        {getStatusMessage()}
      </div>
      
      {isGameOver && (
        <div className="game-over-message">
          <h2>🎉 GAME OVER! 🎉</h2>
          
          {gameState.message ? (
            <p><strong>{gameState.message}</strong></p>
          ) : (
            <>
              {gameStatus === 'checkmate' && (
                <p><strong>{winner.charAt(0).toUpperCase() + winner.slice(1)} player wins!</strong></p>
              )}
              {gameStatus === 'stalemate' && (
                <p><strong>It's a draw!</strong></p>
              )}
            </>
          )}
        </div>
      )}
      
      <button 
        className={`reset-button ${isGameOver ? 'game-over-button' : ''}`} 
        onClick={onResetGame}
      >
        {isGameOver ? '🔄 START NEW GAME' : 'New Game'}
      </button>
      
      <div className="instructions">
        <h3>Rules:</h3>
        <ul>
          <li>Standard chess moves</li>
          <li>Click a piece, then click destination</li>
          <li>Yellow squares = normal moves</li>
          <li>Pink squares = fusion moves</li>
          <li>Can fuse pieces by moving onto ally (except King)</li>
          <li>Fused pieces have combined moves</li>
          <li><strong>Kings cannot be left in check!</strong></li>
        </ul>
        
        {/* Дополнительная отладочная информация */}
        <div className="debug-info" style={{fontSize: '10px', color: '#666', marginTop: '10px'}}>
          Status: {gameStatus} | Game Over: {isGameOver ? 'Yes' : 'No'} | Winner: {winner || 'None'}
        </div>
      </div>
    </div>
  );
};

export default GameInfo;