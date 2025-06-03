# Konpira Game Development Documentation

This document provides technical details about the implementation of the Konpira Game Server.

## Architecture Overview

The Konpira Game Server is built using a modular architecture with the following components:

1. **HTTP Server**: Express.js is used to serve static files and handle basic HTTP requests.
2. **WebSocket Server**: The ws library provides real-time communication between clients.
3. **Game Logic**: The core game rules and state management.
4. **Room Management**: Handles multiple game rooms and player connections.

## WebSocket Communication

The game uses a custom WebSocket protocol for real-time communication. All messages are JSON-formatted with a `type` field that identifies the message purpose.

### Server to Client Messages

- **gameState**: Updates the client with the current game state
  ```typescript
  {
    type: 'gameState',
    state: GameState // The current game state
  }
  ```

- **roomJoined**: Confirms a player has joined a room
  ```typescript
  {
    type: 'roomJoined',
    roomId: string,
    playerId: string,
    playerCount: number
  }
  ```

- **gameStart**: Notifies players that the game is starting
  ```typescript
  {
    type: 'gameStart',
    roomId: string
  }
  ```

- **timerUpdate**: Updates clients about remaining time
  ```typescript
  {
    type: 'timerUpdate',
    timeLeft: number,
    phase: string
  }
  ```

- **error**: Sends error messages to clients
  ```typescript
  {
    type: 'error',
    message: string
  }
  ```

### Client to Server Messages

- **joinRoom**: Request to join a game room
  ```typescript
  {
    type: 'joinRoom',
    roomId: string,
    playerId: string
  }
  ```

- **playerAction**: Player performs an action (touch box/table)
  ```typescript
  {
    type: 'playerAction',
    roomId: string,
    playerId: string,
    action: 'touchBox' | 'touchTable',
    timestamp: number
  }
  ```

- **playerGuess**: Player guesses opponent's action
  ```typescript
  {
    type: 'playerGuess',
    roomId: string,
    playerId: string,
    guess: 'touchBox' | 'touchTable'
  }
  ```

## Game State Management

The game state is managed by the `KonpiraGame` class and includes:

- Current player's turn
- Box position (on table or off table)
- Player information (actions, guesses, drink levels)
- Game phase (waiting, action, guessing, validation, gameOver)
- Round information

## Game Flow

1. Players join a room
2. When two players are present, the game starts
3. Game cycles through these phases:
   - **Action Phase**: Current player must touch box or table based on box position
   - **Guessing Phase**: Opponent must guess the action
   - **Validation Phase**: Actions and guesses are validated, drink levels updated
4. If a player's drink level reaches maximum, they lose
5. Game can be restarted

## Future Enhancements

Potential improvements for the Konpira Game Server:

1. **Authentication**: Add user accounts and authentication
2. **Leaderboards**: Track player statistics and rankings
3. **Game Variations**: Implement different rule sets or game modes
4. **Spectator Mode**: Allow users to watch ongoing games
5. **Mobile App**: Create native mobile applications
6. **Voice Chat**: Add real-time audio communication between players
