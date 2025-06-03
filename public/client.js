// WebSocket connection
let socket = null;
let playerId = '';
let roomId = '';
let playerCount = 0;
let isMyTurn = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

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
const giveUpBtn = document.getElementById('giveUpBtn');
const yourNameSpan = document.getElementById('yourName');
const opponentNameSpan = document.getElementById('opponentName');
const yourDrinkLevel = document.getElementById('yourDrinkLevel');
const opponentDrinkLevel = document.getElementById('opponentDrinkLevel');
const yourActionSpan = document.getElementById('yourAction');
const opponentActionSpan = document.getElementById('opponentAction');
const winnerSpan = document.getElementById('winner');
const newGameBtn = document.getElementById('newGameBtn');
const restartGameBtn = document.getElementById('restartGameBtn');
const currentRoundSpan = document.getElementById('currentRound');
const progressFill = document.getElementById('progressFill');
const notificationDiv = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');
const closeNotificationBtn = document.getElementById('closeNotification');

// Event Listeners
joinBtn.addEventListener('click', joinGame);
touchBoxBtn.addEventListener('click', () => sendPlayerAction('touchBox'));
touchTableBtn.addEventListener('click', () => sendPlayerAction('touchTable'));
guessBoxBtn.addEventListener('click', () => sendPlayerGuess('touchBox'));
guessTableBtn.addEventListener('click', () => sendPlayerGuess('touchTable'));
giveUpBtn.addEventListener('click', giveUpGame);
newGameBtn.addEventListener('click', resetGame);
restartGameBtn.addEventListener('click', restartGame);
closeNotificationBtn.addEventListener('click', hideNotification);

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
    const wsUrl = `${protocol}${window.location.hostname}:3001`;
    
    connectionStatus.textContent = 'Connecting...';
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        connectionStatus.textContent = 'Connected!';
        reconnectAttempts = 0; // Reset reconnection attempts on successful connection
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
        
        // Attempt to reconnect if we were in a game
        if (gameAreaDiv && !gameAreaDiv.classList.contains('hidden') && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            connectionStatus.textContent = `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
            
            setTimeout(() => {
                if (roomId && playerId) {
                    joinGame();
                }
            }, 2000 * reconnectAttempts); // Exponential backoff
        } else {
            hideGameArea();
            reconnectAttempts = 0;
        }
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
        showNotification('Waiting for another player to join...', 'info');
    } else if (playerCount === 2) {
        gameStatusSpan.textContent = 'Game starting soon';
        showNotification('Opponent joined! Game starting soon...', 'success');
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
    gameStatusSpan.textContent = translateGamePhase(state.gamePhase, state.currentRound);
    
    // Update round progress
    if (state.currentRound !== undefined) {
        updateRoundProgress(state.currentRound);
    }
    
    // Update timer display based on phase
    if (state.gamePhase === 'action') {
        timeLeftSpan.textContent = 'No timer';
        timeLeftSpan.style.color = '#2ecc71';
    }
    
    // Enable/disable buttons based on game phase
    updateButtonState(state.gamePhase);
    
    // Check if game is over
    if (state.isGameOver) {
        endGame(state.winner);
    } else {
        // Show round completion notification
        if (state.gamePhase === 'action' && state.currentRound > 1) {
            const roundsLeft = 11 - state.currentRound;
            if (roundsLeft <= 3) {
                showNotification(`Round ${state.currentRound}/10 - Only ${roundsLeft} rounds left!`, 'warning');
            }
        }
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

function translateGamePhase(phase, currentRound) {
    const roundInfo = currentRound ? ` (Round ${currentRound}/10)` : '';
    switch(phase) {
        case 'waiting':
            return 'Waiting for players';
        case 'action':
            return `Action Phase${roundInfo}`;
        case 'guessing':
            return `Guessing Phase${roundInfo}`;
        case 'validation':
            return `Validating Actions${roundInfo}`;
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
        // It's my turn to act
        touchBoxBtn.disabled = false;
        touchTableBtn.disabled = false;
    } else if (phase === 'guessing' && !isMyTurn) {
        // It's my turn to guess the opponent's action
        guessBoxBtn.disabled = false;
        guessTableBtn.disabled = false;
    }
}

function updateTimer(timeLeft, phase) {
    if (phase === 'action') {
        timeLeftSpan.textContent = 'No timer';
        timeLeftSpan.style.color = '#2ecc71'; // Green
    } else {
        timeLeftSpan.textContent = timeLeft + 's';
        
        // Update timer color based on time left
        if (timeLeft <= 1) {
            timeLeftSpan.style.color = '#e74c3c'; // Red
        } else {
            timeLeftSpan.style.color = '#f39c12'; // Orange
        }
    }
}

function sendPlayerAction(action) {
    // Prevent sending if not in correct state
    if (!isMyTurn || gameStatusSpan.textContent.includes('Guessing') || gameStatusSpan.textContent.includes('Game Over')) {
        showNotification('Cannot perform action right now', 'warning');
        return;
    }

    try {
        sendMessage({
            type: 'playerAction',
            roomId: roomId,
            playerId: playerId,
            action: action,
            timestamp: Date.now()
        });
        
        // Visual feedback for action
        const actionText = action === 'touchBox' ? 'Touched Box' : 'Touched Table';
        showNotification(`You ${actionText.toLowerCase()}!`, 'info');
        
        // Disable action buttons after selection
        touchBoxBtn.disabled = true;
        touchTableBtn.disabled = true;
    } catch (error) {
        console.error('Error sending action:', error);
        showNotification('Failed to send action - please try again', 'error');
        
        // Re-enable buttons on error
        if (isMyTurn) {
            touchBoxBtn.disabled = false;
            touchTableBtn.disabled = false;
        }
    }
}

function sendPlayerGuess(guess) {
    // Prevent sending if not in correct state
    if (isMyTurn || !gameStatusSpan.textContent.includes('Guessing') || gameStatusSpan.textContent.includes('Game Over')) {
        showNotification('Cannot guess right now', 'warning');
        return;
    }

    try {
        sendMessage({
            type: 'playerGuess',
            roomId: roomId,
            playerId: playerId,
            guess: guess
        });
        
        // Visual feedback for guess
        const guessText = guess === 'touchBox' ? 'Box' : 'Table';
        showNotification(`You guessed: Opponent touched ${guessText}`, 'info');
        
        // Disable guess buttons after selection
        guessBoxBtn.disabled = true;
        guessTableBtn.disabled = true;
    } catch (error) {
        console.error('Error sending guess:', error);
        showNotification('Failed to send guess - please try again', 'error');
        
        // Re-enable buttons on error
        if (!isMyTurn && gameStatusSpan.textContent.includes('Guessing')) {
            guessBoxBtn.disabled = false;
            guessTableBtn.disabled = false;
        }
    }
}

function giveUpGame() {
    if (confirm('Are you sure you want to give up? You will lose the game.')) {
        sendMessage({
            type: 'giveUp',
            roomId: roomId,
            playerId: playerId
        });
    }
}

function startGame() {
    gameStatusSpan.textContent = 'Game Started';
    showNotification('Game has started! Good luck!', 'success');
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
    currentRoundSpan.textContent = '1';
    progressFill.style.width = '10%';
    
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

function restartGame() {
    try {
        sendMessage({
            type: 'restartGame',
            roomId: roomId,
            playerId: playerId
        });
        
        // Reset local UI immediately for responsive feedback
        yourDrinkLevel.style.width = '0%';
        opponentDrinkLevel.style.width = '0%';
        yourActionSpan.textContent = '-';
        opponentActionSpan.textContent = '-';
        boxElement.classList.remove('off-table');
        currentRoundSpan.textContent = '1';
        progressFill.style.width = '10%';
        timeLeftSpan.textContent = 'No timer';
        timeLeftSpan.style.color = '#2ecc71';
        
        // Hide game over screen and show game area
        gameOverDiv.classList.add('hidden');
        gameAreaDiv.classList.remove('hidden');
        
        showNotification('Game restarted! New round beginning...', 'success');
    } catch (error) {
        console.error('Error restarting game:', error);
        showNotification('Failed to restart game - please try again', 'error');
    }
}

function updateRoundProgress(round) {
    currentRoundSpan.textContent = round;
    const progressPercentage = (round / 10) * 100;
    progressFill.style.width = `${progressPercentage}%`;
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
    console.error('Game error:', message);
    
    // Handle specific error types
    if (message.includes('Invalid action') || message.includes('drink penalty')) {
        showNotification(message, 'warning');
    } else if (message.includes('Not your turn') || message.includes('already')) {
        showNotification(message, 'info');
    } else if (message.includes('Room not found') || message.includes('Connection')) {
        showNotification(message, 'error');
        
        // Try to reconnect if room issues
        if (message.includes('Room not found') && reconnectAttempts < maxReconnectAttempts) {
            setTimeout(() => {
                if (roomId && playerId) {
                    joinGame();
                }
            }, 3000);
        }
    } else {
        showNotification(message, 'error');
    }
}

function showNotification(message, type = 'info') {
    notificationText.textContent = message;
    notificationDiv.className = `notification ${type}`;
    notificationDiv.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    notificationDiv.classList.add('hidden');
}

function generateRoomId() {
    return 'room-' + Math.random().toString(36).substring(2, 8);
}
