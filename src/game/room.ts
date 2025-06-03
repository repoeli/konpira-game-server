import WebSocket from 'ws';
import { Player, GameState, PlayerAction, GameResult } from '../types/gameTypes';
import { ServerMessage } from '../types/messageTypes';

export class GameRoom {
    public roomId: string;
    public players: Player[] = [];
    private gameState: GameState;
    private guessTimer: NodeJS.Timeout | null = null;
    private phaseUpdateInterval: NodeJS.Timeout | null = null; // Added for periodic timer updates
    private readonly GUESS_TIME_LIMIT = 3000; // 3 seconds to make a guess
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
            roundNumber: 1,
            currentRound: 1
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
        // Validate game state first
        if (this.gameState.gamePhase !== 'action') {
            return { success: false, message: 'Not in action phase' };
        }

        if (this.gameState.isGameOver) {
            return { success: false, message: 'Game is over' };
        }

        // Find current player data more safely
        const currentPlayerData = this.gameState.players[this.gameState.currentPlayer];
        if (!currentPlayerData || currentPlayerData.id !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        // Prevent duplicate actions
        if (currentPlayerData.lastAction !== undefined) {
            return { success: false, message: 'Action already taken this round' };
        }

        // Clear any existing phase update interval
        if (this.phaseUpdateInterval) {
            clearInterval(this.phaseUpdateInterval);
            this.phaseUpdateInterval = null;
        }

        // Validate action based on game rules - be more lenient
        const isValidAction = this.validateAction(action);
        if (!isValidAction) {
            // Instead of immediately ending the game, give player a drink penalty
            currentPlayerData.drinkLevel++;
            
            // Store the action anyway to continue the game
            currentPlayerData.lastAction = action;
            
            // Check if this penalty causes game over
            if (currentPlayerData.drinkLevel >= this.MAX_DRINK_LEVEL) {
                this.playerLoses(playerId, 'Too many invalid actions - bottle is full!');
                return { success: true, message: 'Invalid action penalty - you lose!', gameState: this.gameState };
            }
            
            // Continue the game with penalty applied
            this.broadcastGameState();
            this.startGuessingPhase();
            return { success: true, message: 'Invalid action - drink penalty applied', gameState: this.gameState };
        }

        // Store the valid action
        currentPlayerData.lastAction = action;
        
        // Update box position based on action
        if (action === 'touchBox') {
            this.gameState.boxOnTable = !this.gameState.boxOnTable;
        }

        // Start guessing phase
        this.startGuessingPhase();

        return { success: true, message: 'Action processed', gameState: this.gameState };
    }

    public processGuess(playerId: string, guess: PlayerAction): GameResult {
        // Validate game state first
        if (this.gameState.gamePhase !== 'guessing') {
            return { success: false, message: 'Not in guessing phase' };
        }

        if (this.gameState.isGameOver) {
            return { success: false, message: 'Game is over' };
        }

        // Find the player making the guess
        const guessingPlayer = this.gameState.players.find(p => p.id === playerId);
        if (!guessingPlayer) {
            return { success: false, message: 'Player not found' };
        }

        // Prevent duplicate guesses
        if (guessingPlayer.guess !== undefined) {
            return { success: false, message: 'Guess already made this round' };
        }

        // Only the opponent of the current player should be guessing
        const currentPlayerIndex = this.gameState.currentPlayer;
        const guessingPlayerIndex = this.gameState.players.findIndex(p => p.id === playerId);
        
        if (guessingPlayerIndex === currentPlayerIndex) {
            return { success: false, message: 'You cannot guess your own action' };
        }

        // Store the guess
        guessingPlayer.guess = guess;

        // Clear the guess timer since a guess was made
        if (this.guessTimer) {
            clearTimeout(this.guessTimer);
            this.guessTimer = null;
        }
        if (this.phaseUpdateInterval) {
            clearInterval(this.phaseUpdateInterval);
            this.phaseUpdateInterval = null;
        }

        // Immediately validate the round since the guess was made
        this.validateRound();

        return { success: true, message: 'Guess processed', gameState: this.gameState };
    }

    private startGame(): void {
        this.gameState.gamePhase = 'action';
        this.broadcastMessage({ type: 'gameStart', roomId: this.roomId });
        this.startActionPhase();
    }

    private startActionPhase(): void {
        // Ensure we're not in a game over state
        if (this.gameState.isGameOver) {
            return;
        }

        this.gameState.gamePhase = 'action';
        this.gameState.roundTimer = 0; // No timer for actions
        
        // Clear previous guesses and actions for new round
        this.gameState.players.forEach(p => {
            p.guess = undefined;
            p.lastAction = undefined;
        });

        this.broadcastGameState();

        // Clear any existing phase update interval
        if (this.phaseUpdateInterval) {
            clearInterval(this.phaseUpdateInterval);
            this.phaseUpdateInterval = null;
        }

        // Send action phase update to clients
        this.broadcastMessage({
            type: 'timerUpdate',
            timeLeft: 0,
            phase: 'action'
        });

        // No action timer - players can take their time to act
    }

    private startGuessingPhase(): void {
        this.gameState.gamePhase = 'guessing';
        this.gameState.roundTimer = this.GUESS_TIME_LIMIT;
        
        this.broadcastGameState();

        // Clear any existing phase update interval
        if (this.phaseUpdateInterval) {
            clearInterval(this.phaseUpdateInterval);
            this.phaseUpdateInterval = null;
        }

        // Set timer for guessing timeout - only the opponent who needs to guess has 3 seconds
        this.guessTimer = setTimeout(() => {
            if (this.phaseUpdateInterval) {
                clearInterval(this.phaseUpdateInterval);
                this.phaseUpdateInterval = null;
            }
            
            // Find the player who should be guessing (the one who didn't act)
            const otherPlayerIndex = 1 - this.gameState.currentPlayer;
            const guessingPlayer = this.gameState.players[otherPlayerIndex];
            
            // If they haven't guessed, they lose a point
            if (guessingPlayer.guess === undefined) {
                guessingPlayer.drinkLevel++;
                this.broadcastMessage({
                    type: 'gameState',
                    state: this.gameState
                });
                
                // Check if game should end
                if (guessingPlayer.drinkLevel >= this.MAX_DRINK_LEVEL) {
                    this.endGame(`${guessingPlayer.id} has filled their bottle and loses!`);
                    return;
                }
            }
            
            // Continue to validation if both players have acted/guessed
            this.validateRound();
        }, this.GUESS_TIME_LIMIT);

        // Start sending periodic timer updates for guessing
        let timeLeft = this.GUESS_TIME_LIMIT;
        this.phaseUpdateInterval = setInterval(() => {
            timeLeft -= 1000;
            if (timeLeft >= 0) {
                this.broadcastMessage({
                    type: 'timerUpdate',
                    timeLeft: timeLeft / 1000,
                    phase: 'guessing'
                });
            } else {
                if (this.phaseUpdateInterval) {
                    clearInterval(this.phaseUpdateInterval);
                    this.phaseUpdateInterval = null;
                }
            }
        }, 1000);
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
        // Clear timers
        if (this.guessTimer) {
            clearTimeout(this.guessTimer);
            this.guessTimer = null;
        }
        if (this.phaseUpdateInterval) {
            clearInterval(this.phaseUpdateInterval);
            this.phaseUpdateInterval = null;
        }

        // Ensure we're not in game over state
        if (this.gameState.isGameOver) {
            return;
        }

        this.gameState.gamePhase = 'validation';
        
        const currentPlayerData = this.gameState.players[this.gameState.currentPlayer];
        const otherPlayerData = this.gameState.players[1 - this.gameState.currentPlayer];
        
        // Only apply guess penalty if a guess was actually made and it was wrong
        if (otherPlayerData.guess !== undefined) {
            const guessedCorrectly = otherPlayerData.guess === currentPlayerData.lastAction;
            
            if (!guessedCorrectly) {
                // Wrong guess - guesser gets a drink
                otherPlayerData.drinkLevel++;
            }
        }
        // If no guess was made, the timeout already handled the penalty

        // Check for game end condition
        const loser = this.gameState.players.find(p => p.drinkLevel >= this.MAX_DRINK_LEVEL);
        if (loser) {
            const winner = this.gameState.players.find(p => p.id !== loser.id);
            this.endGame(`${loser.id} has filled their bottle and loses!`, winner?.id || null);
            return;
        }

        // Check if we've completed 10 rounds
        if (this.gameState.currentRound >= 10) {
            // Determine winner by lowest drink level
            const player1 = this.gameState.players[0];
            const player2 = this.gameState.players[1];
            
            if (player1.drinkLevel < player2.drinkLevel) {
                this.endGame(`10 rounds completed! ${player1.id} wins with ${player1.drinkLevel} drinks vs ${player2.drinkLevel}!`, player1.id);
            } else if (player2.drinkLevel < player1.drinkLevel) {
                this.endGame(`10 rounds completed! ${player2.id} wins with ${player2.drinkLevel} drinks vs ${player1.drinkLevel}!`, player2.id);
            } else {
                this.endGame(`10 rounds completed! It's a tie with both players at ${player1.drinkLevel} drinks!`);
            }
            return;
        }

        // Continue to next round - switch to the other player
        this.gameState.currentPlayer = 1 - this.gameState.currentPlayer;
        this.gameState.roundNumber++;
        this.gameState.currentRound = this.gameState.roundNumber;
        
        // Broadcast the validation result
        this.broadcastGameState();
        
        // Start next round after a brief pause
        setTimeout(() => {
            if (!this.gameState.isGameOver) {
                this.startActionPhase();
            }
        }, 2000);
    }

    private playerLoses(playerId: string, reason: string): void {
        const winner = this.gameState.players.find(p => p.id !== playerId);
        this.endGame(`${playerId} loses: ${reason}`, winner?.id || null);
    }

    public endGame(reason: string, winnerId: string | null = null): void {
        this.gameState.gamePhase = 'gameOver';
        this.gameState.isGameOver = true;
        this.gameState.winner = winnerId;
        
        if (this.guessTimer) {
            clearTimeout(this.guessTimer);
            this.guessTimer = null;
        }
        if (this.phaseUpdateInterval) {
            clearInterval(this.phaseUpdateInterval);
            this.phaseUpdateInterval = null;
        }

        this.broadcastGameState();
        console.log(`Game ${this.roomId} ended: ${reason}`);
    }

    public getGameState(): GameState {
        return { ...this.gameState };
    }

    public resetGame(): void {
        // Clear any existing timers first
        if (this.guessTimer) {
            clearTimeout(this.guessTimer);
            this.guessTimer = null;
        }
        if (this.phaseUpdateInterval) {
            clearInterval(this.phaseUpdateInterval);
            this.phaseUpdateInterval = null;
        }

        // Reset game state but keep players connected
        this.gameState = {
            currentPlayer: 0,
            boxOnTable: Math.random() > 0.5, // Random initial state
            players: this.gameState.players.map(p => ({
                id: p.id,
                drinkLevel: 0,
                lastAction: undefined,
                guess: undefined
            })),
            roundTimer: 0,
            gamePhase: 'action', // Start directly in action phase instead of waiting
            isGameOver: false,
            winner: null,
            roundNumber: 1,
            currentRound: 1
        };

        // Broadcast the reset state immediately
        this.broadcastGameState();
        
        // Start the action phase after a short delay to ensure clients are ready
        setTimeout(() => {
            if (this.players.length === 2 && !this.gameState.isGameOver) {
                this.startActionPhase();
            }
        }, 500);
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
