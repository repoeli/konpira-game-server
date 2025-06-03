// filepath: /workspaces/konpira-game-server/src/game/konpiraLogic.ts
import { GameState, PlayerAction, GameResult, Player } from '../types/gameTypes';

export class KonpiraGame {
    private state: GameState;
    private readonly ACTION_TIME_LIMIT = 3000; // 3 seconds to make an action
    private readonly GUESS_TIME_LIMIT = 2000; // 2 seconds to make a guess
    private readonly MAX_DRINK_LEVEL = 10; // Game ends when bottle is full

    constructor(player1Id: string, player2Id: string) {
        // Initialize game state
        this.state = {
            currentPlayer: 0, // Index of current player (0 or 1)
            boxOnTable: Math.random() > 0.5, // Random initial state
            players: [
                { id: player1Id, drinkLevel: 0 },
                { id: player2Id, drinkLevel: 0 }
            ],
            roundTimer: 0,
            gamePhase: 'waiting',
            isGameOver: false,
            winner: null,
            roundNumber: 1,
            currentRound: 1
        };
    }

    /**
     * Start the game and return the initial state
     */
    public startGame(): GameState {
        this.state.gamePhase = 'action';
        this.state.roundNumber = 1;
        this.state.currentRound = 1;
        this.state.boxOnTable = Math.random() > 0.5;
        this.state.currentPlayer = 0;
        this.state.isGameOver = false;
        this.state.winner = null;
        
        // Reset player actions and guesses
        this.state.players.forEach(player => {
            player.lastAction = undefined;
            player.guess = undefined;
            player.drinkLevel = 0;
        });
        
        return this.getGameState();
    }

    /**
     * Process a player's action (touching box or table)
     */
    public processAction(playerId: string, action: PlayerAction): GameResult {
        // Find player index
        const playerIndex = this.findPlayerIndex(playerId);
        
        if (playerIndex === -1) {
            return { success: false, message: "Player not found" };
        }
        
        // Check if it's the player's turn
        if (playerIndex !== this.state.currentPlayer) {
            return { success: false, message: "Not your turn" };
        }
        
        // Check if we're in the action phase
        if (this.state.gamePhase !== 'action') {
            return { success: false, message: `Cannot perform action in ${this.state.gamePhase} phase` };
        }
        
        // Record the player's action
        this.state.players[playerIndex].lastAction = action;
        
        // Move to guessing phase
        this.state.gamePhase = 'guessing';
        
        return { 
            success: true, 
            message: "Action recorded", 
            gameState: this.getGameState() 
        };
    }

    /**
     * Process a player's guess of opponent's action
     */
    public processGuess(playerId: string, guess: PlayerAction): GameResult {
        // Find player index
        const playerIndex = this.findPlayerIndex(playerId);
        
        if (playerIndex === -1) {
            return { success: false, message: "Player not found" };
        }
        
        // Check if it's NOT the player's turn (the guesser is the opponent)
        if (playerIndex === this.state.currentPlayer) {
            return { success: false, message: "You cannot guess your own action" };
        }
        
        // Check if we're in the guessing phase
        if (this.state.gamePhase !== 'guessing') {
            return { success: false, message: `Cannot guess in ${this.state.gamePhase} phase` };
        }
        
        // Record the player's guess
        this.state.players[playerIndex].guess = guess;
        
        // Move to validation phase
        this.state.gamePhase = 'validation';
        
        // Validate the guess
        this.validateRound();
        
        return { 
            success: true, 
            message: "Guess recorded", 
            gameState: this.getGameState() 
        };
    }

    /**
     * Validate the current round based on actions and guesses
     */
    private validateRound(): void {
        const currentPlayerIndex = this.state.currentPlayer;
        const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
        
        const currentPlayer = this.state.players[currentPlayerIndex];
        const opponent = this.state.players[opponentIndex];
        
        // Get the correct action based on box position
        const correctAction = this.state.boxOnTable ? 'touchBox' : 'touchTable';
        
        // Check if current player performed the correct action
        const currentPlayerCorrect = currentPlayer.lastAction === correctAction;
        
        // Check if opponent guessed correctly
        const opponentCorrect = opponent.guess === currentPlayer.lastAction;
        
        // Determine drink penalties
        if (!currentPlayerCorrect) {
            // Current player performed wrong action
            currentPlayer.drinkLevel += 1;
        }
        
        if (!opponentCorrect) {
            // Opponent guessed wrong
            opponent.drinkLevel += 1;
        }
        
        // Check for game over condition
        if (currentPlayer.drinkLevel >= this.MAX_DRINK_LEVEL) {
            this.endGame(opponent.id);
            return;
        }
        
        if (opponent.drinkLevel >= this.MAX_DRINK_LEVEL) {
            this.endGame(currentPlayer.id);
            return;
        }
        
        // Move to next round
        this.prepareNextRound();
    }

    /**
     * Prepare for the next round
     */
    private prepareNextRound(): void {
        // Switch current player
        this.state.currentPlayer = this.state.currentPlayer === 0 ? 1 : 0;
        
        // Randomly change box position with 50% chance
        if (Math.random() > 0.5) {
            this.state.boxOnTable = !this.state.boxOnTable;
        }
        
        // Increment round number
        this.state.roundNumber++;
        this.state.currentRound = this.state.roundNumber;
        
        // Reset player actions and guesses
        this.state.players.forEach(player => {
            player.lastAction = undefined;
            player.guess = undefined;
        });
        
        // Move back to action phase
        this.state.gamePhase = 'action';
    }

    /**
     * End the game with a winner
     */
    private endGame(winnerId: string): void {
        this.state.isGameOver = true;
        this.state.winner = winnerId;
        this.state.gamePhase = 'gameOver';
    }

    /**
     * Handle timeout for player actions or guesses
     */
    public handleTimeout(playerId: string): GameResult {
        // Find player index
        const playerIndex = this.findPlayerIndex(playerId);
        
        if (playerIndex === -1) {
            return { success: false, message: "Player not found" };
        }
        
        // If in action phase and it's player's turn, they lose
        if (this.state.gamePhase === 'action' && playerIndex === this.state.currentPlayer) {
            const opponentIndex = playerIndex === 0 ? 1 : 0;
            this.endGame(this.state.players[opponentIndex].id);
            
            return { 
                success: true, 
                message: "Player timed out on action", 
                gameState: this.getGameState() 
            };
        }
        
        // If in guessing phase and it's opponent's turn to guess, they lose
        if (this.state.gamePhase === 'guessing' && playerIndex !== this.state.currentPlayer) {
            const currentPlayerIndex = this.state.currentPlayer;
            this.endGame(this.state.players[currentPlayerIndex].id);
            
            return { 
                success: true, 
                message: "Player timed out on guess", 
                gameState: this.getGameState() 
            };
        }
        
        return { 
            success: false, 
            message: "Invalid timeout call"
        };
    }

    /**
     * Find the index of a player by ID
     */
    private findPlayerIndex(playerId: string): number {
        return this.state.players.findIndex(player => player.id === playerId);
    }

    /**
     * Get a copy of the current game state
     */
    public getGameState(): GameState {
        return JSON.parse(JSON.stringify(this.state));
    }
}
