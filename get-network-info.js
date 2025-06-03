// Quick script to get network information
const os = require('os');

console.log('🌐 Network Configuration for Konpira Game Server\n');

const networkInterfaces = os.networkInterfaces();
const PORT = 3001;

console.log('📍 Local Access:');
console.log(`   http://localhost:${PORT}`);
console.log(`   http://127.0.0.1:${PORT}\n`);

console.log('🌍 Network Access (share these with other devices):');

for (const [name, nets] of Object.entries(networkInterfaces)) {
    if (nets) {
        for (const net of nets) {
            if (!net.internal && net.family === 'IPv4') {
                console.log(`   ${name}: http://${net.address}:${PORT}`);
            }
        }
    }
}

console.log('\n💡 Instructions:');
console.log('1. Start the server: npm start');
console.log('2. Share the Network URL with other devices on the same WiFi');
console.log('3. Make sure Windows Firewall allows the connection (see instructions below)\n');
