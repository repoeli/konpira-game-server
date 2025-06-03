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

export type ClientMessage = JoinRoomMessage | PlayerActionMessage | PlayerGuessMessage;
export type ServerMessage = GameStateMessage | ErrorMessage | RoomJoinedMessage | GameStartMessage | TimerUpdateMessage;