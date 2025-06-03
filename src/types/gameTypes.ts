export type PlayerAction = 'touchBox' | 'touchTable' | 'guess';

export interface GameState {
    currentPlayer: number;
    boxOnTable: boolean;
    players: {
        id: string;
        drinkLevel: number;
        lastAction?: PlayerAction;
        guess?: PlayerAction;
    }[];
    roundTimer: number;
    gamePhase: 'waiting' | 'action' | 'guessing' | 'validation' | 'gameOver';
    isGameOver: boolean;
    winner: string | null;
    roundNumber: number;
    currentRound: number;
}

export interface Player {
    id: string;
    ws: any; // WebSocket connection
    drinkLevel: number;
    lastAction?: PlayerAction;
    guess?: PlayerAction;
}

export interface GameResult {
    success: boolean;
    message: string;
    gameState?: GameState;
}
