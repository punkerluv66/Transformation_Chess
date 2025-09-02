class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameHistory = [];
        this.gameStatus = 'playing';
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

    getPieceSymbol(type) {
        const symbols = {
            'pawn': '♟',
            'rook': '♜',
            'knight': '♞',
            'bishop': '♝',
            'queen': '♛',
            'king': '♚'
        };
        return symbols[type] || '?';
    }

    getFusedPieceSymbol(fusedTypes) {
        const shortNames = {
            'pawn': 'P',
            'rook': 'R',
            'knight': 'N',
            'bishop': 'B',
            'queen': 'Q',
            'king': 'K'
        };
        return fusedTypes.map(type => shortNames[type] || '?').join('+');
    }

    selectSquare(row, col) {
        const piece = this.board[row][col];
        
        if (this.selectedSquare) {
            // Check if clicked square is a possible move
            const moveIndex = this.possibleMoves.findIndex(move => move.row === row && move.col === col);
            if (moveIndex !== -1) {
                const move = this.possibleMoves[moveIndex];
                this.makeMove(this.selectedSquare, { row, col }, move.isFusion);
                this.selectedSquare = null;
                this.possibleMoves = [];
                this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
                
                // Проверяем игровую ситуацию после хода
                this.updateGameStatus();
                
                return { moved: true, gameState: this.getGameState() };
            } else {
                this.selectedSquare = null;
                this.possibleMoves = [];
            }
        } else if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = { row, col };
            this.possibleMoves = this.getPossibleMoves(row, col);
        }
        
        return { moved: false, gameState: this.getGameState() };
    }

    makeMove(from, to, isFusion) {
        const piece = this.board[from.row][from.col];
        const targetPiece = this.board[to.row][to.col];

        // Record move in history
        this.gameHistory.push({
            from,
            to,
            piece: JSON.parse(JSON.stringify(piece)),
            capturedPiece: targetPiece ? JSON.parse(JSON.stringify(targetPiece)) : null,
            isFusion
        });

        if (isFusion && targetPiece) {
            // Fuse pieces
            const fusedPiece = this.fusePieces(piece, targetPiece);
            this.board[to.row][to.col] = fusedPiece;
        } else {
            // Normal move
            this.board[to.row][to.col] = piece;
        }
        
        this.board[from.row][from.col] = null;
    }

    fusePieces(piece1, piece2) {
        const types1 = piece1.fusedTypes || [piece1.type];
        const types2 = piece2.fusedTypes || [piece2.type];
        const allTypes = [...new Set([...types1, ...types2])]; // Remove duplicates
        
        return {
            color: piece1.color,
            fusedTypes: allTypes
        };
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const types = piece.fusedTypes || [piece.type];

        // Get moves for each piece type in the fused piece
        types.forEach(type => {
            moves.push(...this.getMovesForPieceType(type, row, col, piece.color));
        });

        // Remove duplicate moves
        const uniqueMoves = [];
        const moveStrings = new Set();
        
        moves.forEach(move => {
            const moveString = `${move.row},${move.col}`;
            if (!moveStrings.has(moveString)) {
                moveStrings.add(moveString);
                uniqueMoves.push(move);
            }
        });

        // Фильтруем ходы, которые оставляют короля под шахом
        return uniqueMoves.filter(move => this.isLegalMove(row, col, move));
    }

    getMovesForPieceType(type, row, col, color) {
        const moves = [];
        
        switch (type) {
            case 'pawn':
                moves.push(...this.getPawnMoves(row, col, color));
                break;
            case 'rook':
                moves.push(...this.getRookMoves(row, col, color));
                break;
            case 'knight':
                moves.push(...this.getKnightMoves(row, col, color));
                break;
            case 'bishop':
                moves.push(...this.getBishopMoves(row, col, color));
                break;
            case 'queen':
                moves.push(...this.getQueenMoves(row, col, color));
                break;
            case 'king':
                moves.push(...this.getKingMoves(row, col, color));
                break;
        }
        
        return moves;
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Move forward one square
        if (this.isValidSquare(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({ row: row + direction, col, isFusion: false });
            
            // Move forward two squares from starting position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col, isFusion: false });
            }
        }

        // Capture diagonally
        [col - 1, col + 1].forEach(newCol => {
            if (this.isValidSquare(row + direction, newCol)) {
                const targetPiece = this.board[row + direction][newCol];
                if (targetPiece) {
                    if (targetPiece.color !== color) {
                        moves.push({ row: row + direction, col: newCol, isFusion: false });
                    } else if (targetPiece.type !== 'king' && !targetPiece.fusedTypes?.includes('king')) {
                        moves.push({ row: row + direction, col: newCol, isFusion: true });
                    }
                }
            }
        });

        return moves;
    }

    getRookMoves(row, col, color) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;

                if (!this.isValidSquare(newRow, newCol)) break;

                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol, isFusion: false });
                } else {
                    if (targetPiece.color !== color) {
                        moves.push({ row: newRow, col: newCol, isFusion: false });
                    } else if (targetPiece.type !== 'king' && !targetPiece.fusedTypes?.includes('king')) {
                        moves.push({ row: newRow, col: newCol, isFusion: true });
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isValidSquare(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol, isFusion: false });
                } else if (targetPiece.color !== color) {
                    moves.push({ row: newRow, col: newCol, isFusion: false });
                } else if (targetPiece.type !== 'king' && !targetPiece.fusedTypes?.includes('king')) {
                    moves.push({ row: newRow, col: newCol, isFusion: true });
                }
            }
        });

        return moves;
    }

    getBishopMoves(row, col, color) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dRow;
                const newCol = col + i * dCol;

                if (!this.isValidSquare(newRow, newCol)) break;

                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol, isFusion: false });
                } else {
                    if (targetPiece.color !== color) {
                        moves.push({ row: newRow, col: newCol, isFusion: false });
                    } else if (targetPiece.type !== 'king' && !targetPiece.fusedTypes?.includes('king')) {
                        moves.push({ row: newRow, col: newCol, isFusion: true });
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getQueenMoves(row, col, color) {
        return [...this.getRookMoves(row, col, color), ...this.getBishopMoves(row, col, color)];
    }

    getKingMoves(row, col, color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        directions.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isValidSquare(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol, isFusion: false });
                } else if (targetPiece.color !== color) {
                    moves.push({ row: newRow, col: newCol, isFusion: false });
                }
                // Kings cannot fuse with anything
            }
        });

        return moves;
    }

    isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Проверяем, является ли ход легальным (не оставляет короля под шахом)
    isLegalMove(fromRow, fromCol, move) {
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[move.row][move.col];
        
        // Временно делаем ход
        if (move.isFusion && targetPiece) {
            const fusedPiece = this.fusePieces(piece, targetPiece);
            this.board[move.row][move.col] = fusedPiece;
        } else {
            this.board[move.row][move.col] = piece;
        }
        this.board[fromRow][fromCol] = null;
        
        // Проверяем, под шахом ли король после этого хода
        const isUnderCheck = this.isKingInCheck(piece.color);
        
        // Отменяем временный ход
        this.board[fromRow][fromCol] = piece;
        this.board[move.row][move.col] = targetPiece;
        
        return !isUnderCheck;
    }

    // Находим короля на доске
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    // Проверяем обычного короля или объединенную фигуру с королем
                    if (piece.type === 'king' || (piece.fusedTypes && piece.fusedTypes.includes('king'))) {
                        return { row, col };
                    }
                }
            }
        }
        return null;
    }

    // Проверяем, находится ли король под шахом
    isKingInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;

        const opponentColor = color === 'white' ? 'black' : 'white';

        // Проверяем, может ли любая фигура противника атаковать короля
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === opponentColor) {
                    const attackMoves = this.getRawMoves(row, col);
                    if (attackMoves.some(move => move.row === kingPosition.row && move.col === kingPosition.col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Получаем "сырые" ходы без проверки на шах (для проверки атак)
    getRawMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const types = piece.fusedTypes || [piece.type];

        types.forEach(type => {
            moves.push(...this.getMovesForPieceType(type, row, col, piece.color));
        });

        // Убираем дубликаты
        const uniqueMoves = [];
        const moveStrings = new Set();
        
        moves.forEach(move => {
            const moveString = `${move.row},${move.col}`;
            if (!moveStrings.has(moveString)) {
                moveStrings.add(moveString);
                uniqueMoves.push(move);
            }
        });

        return uniqueMoves;
    }

    // Проверяем все возможные ходы игрока
    getAllPossibleMoves(color) {
        const allMoves = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.getPossibleMoves(row, col);
                    pieceMoves.forEach(move => {
                        allMoves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col },
                            isFusion: move.isFusion
                        });
                    });
                }
            }
        }
        
        return allMoves;
    }

    // Обновляем статус игры после хода
    updateGameStatus() {
        const currentPlayerInCheck = this.isKingInCheck(this.currentPlayer);
        const possibleMoves = this.getAllPossibleMoves(this.currentPlayer);

        if (possibleMoves.length === 0) {
            if (currentPlayerInCheck) {
                this.gameStatus = 'checkmate';
            } else {
                this.gameStatus = 'stalemate';
            }
        } else if (currentPlayerInCheck) {
            this.gameStatus = 'check';
        } else {
            this.gameStatus = 'playing';
        }
    }

    // Проверяем, закончена ли игра
    isGameOver() {
        return this.gameStatus === 'checkmate' || this.gameStatus === 'stalemate';
    }

    // Получаем победителя
    getWinner() {
        if (this.gameStatus === 'checkmate') {
            return this.currentPlayer === 'white' ? 'black' : 'white';
        }
        return null; // Ничья или игра продолжается
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            selectedSquare: this.selectedSquare,
            possibleMoves: this.possibleMoves,
            gameStatus: this.gameStatus,
            isGameOver: typeof this.isGameOver === 'function' ? this.isGameOver() : this.isGameOver,
            winner: this.getWinner()
        };
    }

    resetGame() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameHistory = [];
        this.gameStatus = 'playing';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessGame;
}
// For browser usage
if (typeof window !== 'undefined') {
    window.ChessGame = ChessGame;
}