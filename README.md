# konpira-game-server

Welcome to the Konpira Game Server! This project implements the online version of the traditional Japanese game Konpira, allowing two players to compete in real-time over the internet.

## Project Structure

- **src/app.ts**: Main application setup, including the HTTP and WebSocket server for real-time communication.
- **src/game/konpiraLogic.ts**: Contains the core logic of the Konpira game, including rules, game state management, and validation of player actions.
- **src/game/room.ts**: Manages game rooms, player interactions, and determines the winner based on the game rules.
- **src/network/websocketHandler.ts**: Handles WebSocket connections, processes incoming game messages, and sends real-time updates to players.
- **src/types/gameTypes.ts**: Defines game-specific types, such as player actions and overall game state.
- **src/types/messageTypes.ts**: Defines the structure of messages exchanged between the client and server.

## Game Rules

1. Players take turns touching either the box or the table.
2. If the box is on the table during a player's turn, they must touch the box with a flat hand.
3. If the box is not on the table, they must touch the table with a fist.
4. Players have a limited time to guess the action of their opponent.
5. If a player fails to guess correctly within the time limit, they lose the game.
6. If both players guess correctly, their actions are validated, and points are awarded.
7. The game continues until one player fills their drink bottle, resulting in their loss.

## Getting Started

### Running the Server

1. Install dependencies:
   ```
   npm install
   ```

2. Build the TypeScript code:
   ```
   npm run build
   ```

3. Start the server:
   ```
   npm start
   ```
   
   For development with auto-reload:
   ```
   npm run dev
   ```

4. The server will be running at `http://localhost:3000`

### Playing the Game

1. Open a browser and go to `http://localhost:3000`
2. Enter a room ID (or leave blank to generate one) and your player name
3. Share the room ID with another player to join the same game
4. Wait for both players to connect
5. Follow the on-screen instructions to play

## Client-Server Communication

The game uses WebSocket for real-time communication between clients and the server. Messages are exchanged in JSON format as defined in the message types.

### Key Message Types

- **joinRoom**: Sent by clients to join a game room
- **playerAction**: Sent by clients when they make an action (touch box or table)
- **playerGuess**: Sent by clients when they guess their opponent's action
- **gameState**: Sent by server to update clients about the current game state
- **timerUpdate**: Sent by server to update clients about remaining time in a round

## Development

### Scripts

- `npm run build`: Compile TypeScript code
- `npm run start`: Start the production server
- `npm run dev`: Start the development server with auto-reload
- `npm run watch`: Watch TypeScript files for changes