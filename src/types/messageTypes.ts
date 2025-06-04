export interface JoinRoomMessage {
    type: 'joinRoom';
    roomId: string;
    playerId: string;
}

export interface PlayerActionMessage {
    type: 'playerAction';
    roomId: string;
    playerId: string;
    action: 'touchBox' | 'touchTable';
    timestamp: number;
}

export interface PlayerGuessMessage {
    type: 'playerGuess';
    roomId: string;
    playerId: string;
    guess: 'touchBox' | 'touchTable';
}

export interface GiveUpMessage {
    type: 'giveUp';
    roomId: string;
    playerId: string;
}

export interface RestartGameMessage {
    type: 'restartGame';
    roomId: string;
    playerId: string;
}

export interface GameStateMessage {
    type: 'gameState';
    state: any; // Will be GameState from gameTypes
}

export interface ErrorMessage {
    type: 'error';
    message: string;
}

export interface RoomJoinedMessage {
    type: 'roomJoined';
    roomId: string;
    playerId: string;
    playerCount: number;
}

export interface GameStartMessage {
    type: 'gameStart';
    roomId: string;
}

export interface TimerUpdateMessage {
    type: 'timerUpdate';
    timeLeft: number;
    phase: string;
}

export interface PostGameDecisionMessage {
    type: 'postGameDecision';
    roomId: string;
    playerId: string;
    decision: 'continue' | 'end';
}

export interface KickPlayerMessage {
    type: 'kickPlayer';
    roomId: string;
    winnerId: string;
    targetPlayerId: string;
}

export interface PostGameStateMessage {
    type: 'postGameState';
    state: {
        winnerId: string | null;
        loserId: string | null;
        reason: string;
        canKick: boolean;
        waitingForDecisions: boolean;
        playerDecisions: { [playerId: string]: 'continue' | 'end' | 'pending' };
    };
}

export type ClientMessage = JoinRoomMessage | PlayerActionMessage | PlayerGuessMessage | GiveUpMessage | RestartGameMessage | PostGameDecisionMessage | KickPlayerMessage;
export type ServerMessage = GameStateMessage | ErrorMessage | RoomJoinedMessage | GameStartMessage | TimerUpdateMessage | PostGameStateMessage;