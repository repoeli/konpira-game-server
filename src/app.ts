import express from 'express';
import http from 'http';
import { setupWebSocketServer } from './network/websocketHandler';

const app = express();
const server = http.createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public')); // Serve static files for client

app.get('/', (req, res) => {
    res.send('Welcome to the Konpira Game Server!');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
    console.log(`Konpira Game Server is running on port ${PORT}`);
    console.log(`WebSocket server is ready for connections`);
});