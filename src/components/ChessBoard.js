import React from 'react';
import Square from './Square';
import './ChessBoard.css';

const ChessBoard = ({ gameState, onSquareClick, game, playerColor }) => {
  console.log('🎲 ChessBoard rendered:', {
    hasGameState: !!gameState,
    hasOnSquareClick: !!onSquareClick,
    hasGame: !!game,
    playerColor,
    currentPlayer: gameState?.currentPlayer
  });

  if (!gameState || !gameState.board) {
    console.log('❌ ChessBoard: Missing gameState or board');
    return <div>Loading board...</div>;
  }

  const { board, selectedSquare, possibleMoves } = gameState;

  const handleSquareClick = (row, col) => {
    console.log(`🎯 ChessBoard handleSquareClick: ${row}, ${col}`);
    if (onSquareClick) {
      onSquareClick(row, col);
    } else {
      console.log('❌ ChessBoard: No onSquareClick function');
    }
  };

  const isSquareSelected = (row, col) => {
    return selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
  };

  const getSquareHighlight = (row, col) => {
    if (isSquareSelected(row, col)) {
      return 'selected';
    }
    
    if (possibleMoves) {
      const move = possibleMoves.find(move => move.row === row && move.col === col);
      if (move) {
        return move.isFusion ? 'fusion-target' : 'possible-move';
      }
    }
    
    return null;
  };

  return (
    <div className="chess-board-container">
      <div className="chess-board">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => (
            <Square
              key={`${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              piece={piece}
              isLight={(rowIndex + colIndex) % 2 === 0}
              highlight={getSquareHighlight(rowIndex, colIndex)}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
              game={game}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ChessBoard;