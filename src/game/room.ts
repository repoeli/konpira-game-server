import WebSocket from 'ws';
import { Player, GameState, PlayerAction, GameResult } from '../types/gameTypes';
import { ServerMessage } from '../types/messageTypes';

export class GameRoom {
    public roomId: string;
    public players: Player[] = [];
    private gameState: GameState;
    private actionTimer: NodeJS.Timeout | null = null;
    private guessTimer: NodeJS.Timeout | null = null;
    private readonly ACTION_TIME_LIMIT = 3000; // 3 seconds to make an action
    private readonly GUESS_TIME_LIMIT = 2000; // 2 seconds to make a guess
    private readonly MAX_DRINK_LEVEL = 10; // Game ends when bottle is full

    constructor(roomId: string) {
        this.roomId = roomId;
        this.gameState = {
            currentPlayer: 0,
            boxOnTable: Math.random() > 0.5, // Random initial state
            players: [],
            roundTimer: 0,
            gamePhase: 'waiting',
            isGameOver: false,
            winner: null,
            roundNumber: 1
        };
    }

    public addPlayer(ws: WebSocket, playerId: string): boolean {
        if (this.players.length >= 2) {
            this.sendMessage(ws, { type: 'error', message: 'Room is full' });
            return false;
        }

        const player: Player = {
            id: playerId,
            ws: ws,
            drinkLevel: 0
        };

        this.players.push(player);
        this.gameState.players.push({
            id: playerId,
            drinkLevel: 0
        });

        this.sendMessage(ws, {
            type: 'roomJoined',
            roomId: this.roomId,
            playerId: playerId,
            playerCount: this.players.length
        });

        if (this.players.length === 2) {
            this.startGame();
        }

        return true;
    }

    public removePlayer(ws: WebSocket): void {
        const playerIndex = this.players.findIndex(p => p.ws === ws);
        if (playerIndex !== -1) {
            this.players.splice(playerIndex, 1);
            this.gameState.players.splice(playerIndex, 1);
            
            if (this.gameState.gamePhase !== 'waiting' && this.players.length < 2) {
                this.endGame('Game ended - player disconnected');
            }
        }
    }

    public processAction(playerId: string, action: PlayerAction): GameResult {
        if (this.gameState.gamePhase !== 'action') {
            return { success: false, message: 'Not in action phase' };
        }

        const currentPlayerData = this.gameState.players[this.gameState.currentPlayer];
        if (currentPlayerData.id !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        // Validate action based on game rules
        const isValidAction = this.validateAction(action);
        if (!isValidAction) {
            this.playerLoses(playerId, 'Invalid action');
            return { success: true, message: 'Invalid action - you lose!', gameState: this.gameState };
        }

        // Store the action
        currentPlayerData.lastAction = action;
        
        // Update box position based on action
        if (action === 'touchBox') {
            this.gameState.boxOnTable = !this.gameState.boxOnTable;
        }

        // Clear action timer
        if (this.actionTimer) {
            clearTimeout(this.actionTimer);
            this.actionTimer = null;
        }

        // Start guessing phase
        this.startGuessingPhase();

        return { success: true, message: 'Action processed', gameState: this.gameState };
    }

    public processGuess(playerId: string, guess: PlayerAction): GameResult {
        if (this.gameState.gamePhase !== 'guessing') {
            return { success: false, message: 'Not in guessing phase' };
        }

        const player = this.gameState.players.find(p => p.id === playerId);
        if (!player) {
            return { success: false, message: 'Player not found' };
        }

        player.guess = guess;

        // Check if both players have made their guess
        const allGuessed = this.gameState.players.every(p => p.guess !== undefined);
        
        if (allGuessed) {
            this.validateRound();
        }

        return { success: true, message: 'Guess processed', gameState: this.gameState };
    }

    private startGame(): void {
        this.gameState.gamePhase = 'action';
        this.broadcastMessage({ type: 'gameStart', roomId: this.roomId });
        this.startActionPhase();
    }

    private startActionPhase(): void {
        this.gameState.gamePhase = 'action';
        this.gameState.roundTimer = this.ACTION_TIME_LIMIT;
        
        // Clear previous guesses
        this.gameState.players.forEach(p => {
            p.guess = undefined;
            p.lastAction = undefined;
        });

        this.broadcastGameState();

        // Set timer for action timeout
        this.actionTimer = setTimeout(() => {
            const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
            this.playerLoses(currentPlayer.id, 'Time limit exceeded');
        }, this.ACTION_TIME_LIMIT);
    }

    private startGuessingPhase(): void {
        this.gameState.gamePhase = 'guessing';
        this.gameState.roundTimer = this.GUESS_TIME_LIMIT;
        
        this.broadcastGameState();

        // Set timer for guessing timeout
        this.guessTimer = setTimeout(() => {
            // Players who haven't guessed lose
            const nonGuessingPlayers = this.gameState.players.filter(p => p.guess === undefined);
            if (nonGuessingPlayers.length > 0) {
                this.playerLoses(nonGuessingPlayers[0].id, 'Failed to guess in time');
            }
        }, this.GUESS_TIME_LIMIT);
    }

    private validateAction(action: PlayerAction): boolean {
        if (this.gameState.boxOnTable && action !== 'touchBox') {
            return false; // Must touch box with flat hand when box is on table
        }
        if (!this.gameState.boxOnTable && action !== 'touchTable') {
            return false; // Must touch table with fist when box is not on table
        }
        return true;
    }

    private validateRound(): void {
        if (this.guessTimer) {
            clearTimeout(this.guessTimer);
            this.guessTimer = null;
        }

        this.gameState.gamePhase = 'validation';
        
        const currentPlayerData = this.gameState.players[this.gameState.currentPlayer];
        const otherPlayerData = this.gameState.players[1 - this.gameState.currentPlayer];
        
        // Check if guesses are correct
        const currentPlayerGuessedCorrectly = otherPlayerData.guess === currentPlayerData.lastAction;
        const otherPlayerGuessedCorrectly = currentPlayerData.guess === otherPlayerData.lastAction;
        
        if (!currentPlayerGuessedCorrectly && !otherPlayerGuessedCorrectly) {
            // Both guessed wrong - both get a drink
            this.gameState.players.forEach(p => p.drinkLevel++);
        } else if (!currentPlayerGuessedCorrectly) {
            // Current player guessed wrong
            currentPlayerData.drinkLevel++;
        } else if (!otherPlayerGuessedCorrectly) {
            // Other player guessed wrong
            otherPlayerData.drinkLevel++;
        }
        // If both guessed correctly, no drinks awarded

        // Check for game end condition
        const loser = this.gameState.players.find(p => p.drinkLevel >= this.MAX_DRINK_LEVEL);
        if (loser) {
            this.endGame(`${loser.id} has filled their bottle and loses!`);
            return;
        }

        // Continue to next round
        this.gameState.currentPlayer = 1 - this.gameState.currentPlayer;
        this.gameState.roundNumber++;
        
        setTimeout(() => {
            this.startActionPhase();
        }, 2000); // 2 second pause between rounds
    }

    private playerLoses(playerId: string, reason: string): void {
        const winner = this.gameState.players.find(p => p.id !== playerId);
        this.endGame(`${playerId} loses: ${reason}`, winner?.id || null);
    }

    private endGame(reason: string, winnerId: string | null = null): void {
        this.gameState.gamePhase = 'gameOver';
        this.gameState.isGameOver = true;
        this.gameState.winner = winnerId;
        
        if (this.actionTimer) {
            clearTimeout(this.actionTimer);
            this.actionTimer = null;
        }
        if (this.guessTimer) {
            clearTimeout(this.guessTimer);
            this.guessTimer = null;
        }

        this.broadcastGameState();
        console.log(`Game ${this.roomId} ended: ${reason}`);
    }

    public getGameState(): GameState {
        return { ...this.gameState };
    }

    private sendMessage(ws: WebSocket, message: ServerMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private broadcastMessage(message: ServerMessage): void {
        this.players.forEach(player => {
            this.sendMessage(player.ws, message);
        });
    }

    private broadcastGameState(): void {
        this.broadcastMessage({
            type: 'gameState',
            state: this.gameState
        });
    }
}
