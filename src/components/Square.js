import React from 'react';
import './Square.css';

const Square = ({ row, col, piece, isLight, highlight, onClick, game }) => {
  const handleClick = () => {
    console.log(`🎯 Square (${row},${col}) clicked!`);
    if (onClick) {
      onClick();
    } else {
      console.log('❌ Square: No onClick function provided');
    }
  };

  const getSquareClasses = () => {
    let classes = 'square ';
    classes += isLight ? 'light ' : 'dark ';
    if (highlight) classes += `${highlight} `;
    return classes.trim();
  };

  const renderPiece = () => {
    if (!piece) return null;

    // Используем методы из game-logic
    if (piece.fusedTypes && game && game.getFusedPieceSymbol) {
      return (
        <div className={`piece ${piece.color} fused-piece`}>
          {game.getFusedPieceSymbol(piece.fusedTypes)}
        </div>
      );
    } else if (game && game.getPieceSymbol) {
      return (
        <div className={`piece ${piece.color}`}>
          {game.getPieceSymbol(piece.type)}
        </div>
      );
    } else {
      // Fallback если game методы недоступны
      const symbols = {
        king: { white: '♔', black: '♚' },
        queen: { white: '♕', black: '♛' },
        rook: { white: '♖', black: '♜' },
        bishop: { white: '♗', black: '♝' },
        knight: { white: '♘', black: '♞' },
        pawn: { white: '♙', black: '♟' }
      };
      
      const symbol = symbols[piece.type]?.[piece.color] || '?';
      return (
        <div className={`piece ${piece.color}`}>
          {symbol}
        </div>
      );
    }
  };

  return (
    <div 
      className={getSquareClasses()} 
      onClick={handleClick}
    >
      {renderPiece()}
    </div>
  );
};

export default Square;