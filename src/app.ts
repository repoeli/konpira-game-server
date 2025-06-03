import express from 'express';
import http from 'http';
import os from 'os';
import { setupWebSocketServer } from './network/websocketHandler';

const app = express();
const server = http.createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

app.use(express.static('public')); // Serve static files for client

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/network-info', (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const [name, nets] of Object.entries(networkInterfaces)) {
        if (nets) {
            for (const net of nets) {
                // Skip internal and non-IPv4 addresses
                if (!net.internal && net.family === 'IPv4') {
                    addresses.push({
                        interface: name,
                        address: net.address,
                        url: `http://${net.address}:${PORT}`
                    });
                }
            }
        }
    }
    
    res.json({
        port: PORT,
        host: HOST,
        localAccess: `http://localhost:${PORT}`,
        networkAddresses: addresses
    });
});

app.get('/status', (req, res) => {
    // This will show server status in a nice HTML page
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const [name, nets] of Object.entries(networkInterfaces)) {
        if (nets) {
            for (const net of nets) {
                if (!net.internal && net.family === 'IPv4') {
                    addresses.push({ interface: name, address: net.address });
                }
            }
        }
    }
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Konpira Game Server Status</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .status-card { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 10px 0; }
            .url { font-family: monospace; background: #e0e0e0; padding: 5px; border-radius: 3px; }
            .success { color: green; } .info { color: blue; }
        </style>
    </head>
    <body>
        <h1>🎮 Konpira Game Server</h1>
        <div class="status-card">
            <h2 class="success">✅ Server Running</h2>
            <p><strong>Port:</strong> ${PORT}</p>
            <p><strong>Started:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="status-card">
            <h2 class="info">🌐 Access URLs</h2>
            <p><strong>Local:</strong> <span class="url">http://localhost:${PORT}</span></p>
            ${addresses.map(addr => 
                `<p><strong>${addr.interface}:</strong> <span class="url">http://${addr.address}:${PORT}</span></p>`
            ).join('')}
        </div>
        
        <div class="status-card">
            <h2>📱 How to Connect</h2>
            <ol>
                <li>Share the network URL with other devices on the same WiFi</li>
                <li>Open the URL in a web browser</li>
                <li>Create or join a game room</li>
                <li>Start playing!</li>
            </ol>
        </div>
        
        <div class="status-card">
            <h2>🔧 Quick Links</h2>
            <p><a href="/">🎮 Play Game</a></p>
            <p><a href="/network-info">📊 Network Info (JSON)</a></p>
            <p><a href="/health">❤️ Health Check</a></p>
        </div>
    </body>
    </html>`;
    
    res.send(html);
});

server.listen(PORT, HOST, () => {
    console.log(`Konpira Game Server is running on http://${HOST}:${PORT}`);
    console.log(`WebSocket server is ready for connections`);
    
    // Get and display network addresses
    const networkInterfaces = os.networkInterfaces();
    console.log('\n🌐 Network Access URLs:');
    console.log(`   Local: http://localhost:${PORT}`);
    
    for (const [name, nets] of Object.entries(networkInterfaces)) {
        if (nets) {
            for (const net of nets) {
                if (!net.internal && net.family === 'IPv4') {
                    console.log(`   Network (${name}): http://${net.address}:${PORT}`);
                }
            }
        }
    }
    console.log('\n📱 Share the Network URL with other devices on the same network!');
    console.log(`🔍 Visit http://localhost:${PORT}/network-info for all network details\n`);
});