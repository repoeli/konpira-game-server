import WebSocket, { WebSocketServer } from 'ws';
import { GameRoom } from '../game/room';
import { PlayerAction, GameState } from '../types/gameTypes';
import { ClientMessage, ServerMessage } from '../types/messageTypes';

const clients: Map<WebSocket, string> = new Map(); // Map WebSocket to playerId
const gameRooms: Map<string, GameRoom> = new Map();

export function setupWebSocketServer(server: any) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        console.log('New WebSocket connection established');
        
        ws.on('message', (message: string) => {
            try {
                const data = JSON.parse(message) as ClientMessage;
                handleMessage(ws, data);
            } catch (error) {
                sendErrorMessage(ws, 'Invalid message format');
            }
        });

        ws.on('close', () => {
            handleDisconnection(ws);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            handleDisconnection(ws);
        });
    });

    return wss;
}

function handleMessage(ws: WebSocket, data: ClientMessage) {
    try {
        switch (data.type) {
            case 'joinRoom':
                joinRoom(ws, data.roomId, data.playerId);
                break;
            case 'playerAction':
                processPlayerAction(ws, data);
                break;
            case 'playerGuess':
                processPlayerGuess(ws, data);
                break;
            case 'giveUp':
                processGiveUp(ws, data);
                break;
            case 'restartGame':
                processRestartGame(ws, data);
                break;
            default:
                console.error('Unknown message type:', (data as any).type);
                sendErrorMessage(ws, 'Unknown message type');
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendErrorMessage(ws, 'Internal server error');
    }
}

function joinRoom(ws: WebSocket, roomId: string, playerId: string) {
    // Store player ID for this connection
    clients.set(ws, playerId);
    
    if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, new GameRoom(roomId));
    }
    
    const room = gameRooms.get(roomId)!;
    const success = room.addPlayer(ws, playerId);
    
    if (!success) {
        clients.delete(ws);
    }
}

function processPlayerAction(ws: WebSocket, data: { roomId: string; playerId: string; action: PlayerAction }) {
    try {
        const room = gameRooms.get(data.roomId);
        if (!room) {
            sendErrorMessage(ws, 'Room not found');
            return;
        }

        const playerId = clients.get(ws);
        if (playerId !== data.playerId) {
            sendErrorMessage(ws, 'Player ID mismatch');
            return;
        }

        // Validate action parameter
        if (!data.action || (data.action !== 'touchBox' && data.action !== 'touchTable')) {
            sendErrorMessage(ws, 'Invalid action type');
            return;
        }

        const result = room.processAction(data.playerId, data.action);
        if (!result.success) {
            // Send error but don't disconnect - let the game continue
            console.log(`Action error for player ${data.playerId}: ${result.message}`);
            sendErrorMessage(ws, result.message);
        }
    } catch (error) {
        console.error('Error processing player action:', error);
        sendErrorMessage(ws, 'Failed to process action - please try again');
    }
}

function processPlayerGuess(ws: WebSocket, data: { roomId: string; playerId: string; guess: PlayerAction }) {
    try {
        const room = gameRooms.get(data.roomId);
        if (!room) {
            sendErrorMessage(ws, 'Room not found');
            return;
        }

        const playerId = clients.get(ws);
        if (playerId !== data.playerId) {
            sendErrorMessage(ws, 'Player ID mismatch');
            return;
        }

        // Validate guess parameter
        if (!data.guess || (data.guess !== 'touchBox' && data.guess !== 'touchTable')) {
            sendErrorMessage(ws, 'Invalid guess type');
            return;
        }

        const result = room.processGuess(data.playerId, data.guess);
        if (!result.success) {
            // Send error but don't disconnect - let the game continue
            console.log(`Guess error for player ${data.playerId}: ${result.message}`);
            sendErrorMessage(ws, result.message);
        }
    } catch (error) {
        console.error('Error processing player guess:', error);
        sendErrorMessage(ws, 'Failed to process guess - please try again');
    }
}

function processGiveUp(ws: WebSocket, data: { roomId: string; playerId: string }) {
    const room = gameRooms.get(data.roomId);
    if (!room) {
        sendErrorMessage(ws, 'Room not found');
        return;
    }

    const playerId = clients.get(ws);
    if (playerId !== data.playerId) {
        sendErrorMessage(ws, 'Player ID mismatch');
        return;
    }

    // Player gives up - they lose
    const opponent = room.players.find(p => p.id !== data.playerId);
    room.endGame(`${data.playerId} gave up`, opponent?.id || null);
}

function processRestartGame(ws: WebSocket, data: { roomId: string; playerId: string }) {
    try {
        const room = gameRooms.get(data.roomId);
        if (!room) {
            sendErrorMessage(ws, 'Room not found');
            return;
        }

        const playerId = clients.get(ws);
        if (playerId !== data.playerId) {
            sendErrorMessage(ws, 'Player ID mismatch');
            return;
        }

        // Ensure room has the required number of players
        if (room.players.length !== 2) {
            sendErrorMessage(ws, 'Need 2 players to restart game');
            return;
        }

        console.log(`Player ${data.playerId} restarting game in room ${data.roomId}`);
        
        // Reset the game for another round
        room.resetGame();
        
        // Send success notification
        room.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                    type: 'gameState',
                    state: room.getGameState()
                }));
            }
        });
    } catch (error) {
        console.error('Error restarting game:', error);
        sendErrorMessage(ws, 'Failed to restart game - please try again');
    }
}

function handleDisconnection(ws: WebSocket) {
    const playerId = clients.get(ws);
    if (playerId) {
        // Find and notify all rooms that this player was in
        gameRooms.forEach((room, roomId) => {
            room.removePlayer(ws);
            // Clean up empty rooms
            if (room.players.length === 0) {
                gameRooms.delete(roomId);
            }
        });
        clients.delete(ws);
        console.log(`Player ${playerId} disconnected`);
    }
}

function sendErrorMessage(ws: WebSocket, message: string) {
    const errorMessage: ServerMessage = { type: 'error', message };
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(errorMessage));
    }
}

