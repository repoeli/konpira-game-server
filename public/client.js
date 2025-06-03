// WebSocket connection
let socket = null;
let playerId = '';
let roomId = '';
let playerCount = 0;
let isMyTurn = false;

// DOM Elements
const joinGameDiv = document.getElementById('join-game');
const gameAreaDiv = document.getElementById('game-area');
const gameOverDiv = document.getElementById('game-over');
const roomIdInput = document.getElementById('roomId');
const playerIdInput = document.getElementById('playerId');
const joinBtn = document.getElementById('joinBtn');
const connectionStatus = document.getElementById('connectionStatus');
const currentRoomSpan = document.getElementById('currentRoom');
const playerCountSpan = document.getElementById('playerCount');
const gameStatusSpan = document.getElementById('gameStatus');
const timeLeftSpan = document.getElementById('timeLeft');
const boxStatusSpan = document.getElementById('boxStatus');
const currentTurnSpan = document.getElementById('currentTurn');
const boxElement = document.getElementById('box');
const touchBoxBtn = document.getElementById('touchBoxBtn');
const touchTableBtn = document.getElementById('touchTableBtn');
const guessBoxBtn = document.getElementById('guessBoxBtn');
const guessTableBtn = document.getElementById('guessTableBtn');
const yourNameSpan = document.getElementById('yourName');
const opponentNameSpan = document.getElementById('opponentName');
const yourDrinkLevel = document.getElementById('yourDrinkLevel');
const opponentDrinkLevel = document.getElementById('opponentDrinkLevel');
const yourActionSpan = document.getElementById('yourAction');
const opponentActionSpan = document.getElementById('opponentAction');
const winnerSpan = document.getElementById('winner');
const newGameBtn = document.getElementById('newGameBtn');

// Event Listeners
joinBtn.addEventListener('click', joinGame);
touchBoxBtn.addEventListener('click', () => sendPlayerAction('touchBox'));
touchTableBtn.addEventListener('click', () => sendPlayerAction('touchTable'));
guessBoxBtn.addEventListener('click', () => sendPlayerGuess('touchBox'));
guessTableBtn.addEventListener('click', () => sendPlayerGuess('touchTable'));
newGameBtn.addEventListener('click', resetGame);

// Functions
function joinGame() {
    roomId = roomIdInput.value.trim() || generateRoomId();
    playerId = playerIdInput.value.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
    
    if (!playerId) {
        alert('Please enter a player name.');
        return;
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsUrl = `${protocol}${window.location.host}`;
    
    connectionStatus.textContent = 'Connecting...';
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        connectionStatus.textContent = 'Connected!';
        // Send join room message
        sendMessage({
            type: 'joinRoom',
            roomId: roomId,
            playerId: playerId
        });
    };
    
    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
    
    socket.onclose = () => {
        connectionStatus.textContent = 'Disconnected';
        hideGameArea();
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatus.textContent = 'Connection error';
    };
}

function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}

function handleMessage(message) {
    console.log('Received message:', message);
    
    switch(message.type) {
        case 'roomJoined':
            handleRoomJoined(message);
            break;
        case 'gameState':
            updateGameState(message.state);
            break;
        case 'gameStart':
            startGame();
            break;
        case 'timerUpdate':
            updateTimer(message.timeLeft, message.phase);
            break;
        case 'error':
            showError(message.message);
            break;
        default:
            console.warn('Unknown message type:', message.type);
    }
}

function handleRoomJoined(message) {
    roomId = message.roomId;
    playerCount = message.playerCount;
    
    currentRoomSpan.textContent = roomId;
    playerCountSpan.textContent = `${playerCount}/2`;
    yourNameSpan.textContent = playerId;
    
    if (playerCount === 1) {
        gameStatusSpan.textContent = 'Waiting for opponent';
    } else if (playerCount === 2) {
        gameStatusSpan.textContent = 'Game starting soon';
    }
    
    // Switch to game area
    showGameArea();
}

function updateGameState(state) {
    // Update box position
    boxStatusSpan.textContent = state.boxOnTable ? 'on the table' : 'off the table';
    if (state.boxOnTable) {
        boxElement.classList.remove('off-table');
    } else {
        boxElement.classList.add('off-table');
    }
    
    // Update current turn
    const isPlayer1 = state.players[0]?.id === playerId;
    const currentPlayerIndex = state.currentPlayer;
    isMyTurn = (isPlayer1 && currentPlayerIndex === 0) || (!isPlayer1 && currentPlayerIndex === 1);
    
    if (isMyTurn) {
        currentTurnSpan.textContent = 'Your turn';
    } else {
        currentTurnSpan.textContent = 'Opponent\'s turn';
    }
    
    // Update player info
    state.players.forEach(player => {
        if (player.id === playerId) {
            yourDrinkLevel.style.width = `${player.drinkLevel * 10}%`;
            yourActionSpan.textContent = translateAction(player.lastAction);
        } else {
            opponentNameSpan.textContent = player.id;
            opponentDrinkLevel.style.width = `${player.drinkLevel * 10}%`;
            opponentActionSpan.textContent = translateAction(player.lastAction);
        }
    });
    
    // Update game phase
    gameStatusSpan.textContent = translateGamePhase(state.gamePhase);
    
    // Enable/disable buttons based on game phase
    updateButtonState(state.gamePhase);
    
    // Check if game is over
    if (state.isGameOver) {
        endGame(state.winner);
    }
}

function translateAction(action) {
    if (!action) return '-';
    switch(action) {
        case 'touchBox':
            return 'Touched Box';
        case 'touchTable':
            return 'Touched Table';
        default:
            return action;
    }
}

function translateGamePhase(phase) {
    switch(phase) {
        case 'waiting':
            return 'Waiting for players';
        case 'action':
            return 'Action Phase';
        case 'guessing':
            return 'Guessing Phase';
        case 'validation':
            return 'Validating Actions';
        case 'gameOver':
            return 'Game Over';
        default:
            return phase;
    }
}

function updateButtonState(phase) {
    // Disable all buttons by default
    touchBoxBtn.disabled = true;
    touchTableBtn.disabled = true;
    guessBoxBtn.disabled = true;
    guessTableBtn.disabled = true;
    
    // Enable appropriate buttons based on phase and turn
    if (phase === 'action' && isMyTurn) {
        touchBoxBtn.disabled = false;
        touchTableBtn.disabled = false;
    } else if (phase === 'guessing' && !isMyTurn) {
        guessBoxBtn.disabled = false;
        guessTableBtn.disabled = false;
    }
}

function updateTimer(timeLeft, phase) {
    timeLeftSpan.textContent = timeLeft + 's';
    
    // Update timer color based on time left
    if (timeLeft <= 3) {
        timeLeftSpan.style.color = '#e74c3c'; // Red
    } else {
        timeLeftSpan.style.color = '#2ecc71'; // Green
    }
}

function sendPlayerAction(action) {
    sendMessage({
        type: 'playerAction',
        roomId: roomId,
        playerId: playerId,
        action: action,
        timestamp: Date.now()
    });
    
    // Disable action buttons after selection
    touchBoxBtn.disabled = true;
    touchTableBtn.disabled = true;
}

function sendPlayerGuess(guess) {
    sendMessage({
        type: 'playerGuess',
        roomId: roomId,
        playerId: playerId,
        guess: guess
    });
    
    // Disable guess buttons after selection
    guessBoxBtn.disabled = true;
    guessTableBtn.disabled = true;
}

function startGame() {
    gameStatusSpan.textContent = 'Game Started';
}

function endGame(winner) {
    winnerSpan.textContent = winner === playerId ? 'You!' : 'Opponent';
    gameAreaDiv.classList.add('hidden');
    gameOverDiv.classList.remove('hidden');
}

function resetGame() {
    // Reset UI
    yourDrinkLevel.style.width = '0%';
    opponentDrinkLevel.style.width = '0%';
    yourActionSpan.textContent = '-';
    opponentActionSpan.textContent = '-';
    boxElement.classList.remove('off-table');
    
    // Hide game over screen
    gameOverDiv.classList.add('hidden');
    
    // Show join screen to create a new game
    joinGameDiv.classList.remove('hidden');
    gameAreaDiv.classList.add('hidden');
    
    // Close existing WebSocket connection
    if (socket) {
        socket.close();
        socket = null;
    }
}

function showGameArea() {
    joinGameDiv.classList.add('hidden');
    gameAreaDiv.classList.remove('hidden');
}

function hideGameArea() {
    joinGameDiv.classList.remove('hidden');
    gameAreaDiv.classList.add('hidden');
}

function showError(message) {
    alert(`Error: ${message}`);
}

function generateRoomId() {
    return 'room-' + Math.random().toString(36).substring(2, 8);
}
