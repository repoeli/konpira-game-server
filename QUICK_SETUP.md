# 🎮 Konpira Game - Quick Network Setup

## ✅ Your Game is NOW Network-Ready!

I've successfully configured your Konpira Game Server for network access. Here's everything you need to know:

## 🚀 Quick Start

### Method 1: Use the Helper Scripts
**Windows Command Prompt:**
```cmd
get-my-ip.bat
start-network-server.bat
```

**PowerShell:**
```powershell
.\get-network-info.ps1
npm start
```

### Method 2: Manual Start
```cmd
npm run build
npm start
```

## 🌐 What to Expect

When you run `npm start`, you'll see output like this:
```
🌐 Network Access URLs:
   Local: http://localhost:3001
   Network (Wi-Fi): http://192.168.1.100:3001
   Network (Ethernet): http://192.168.0.150:3001

📱 Share the Network URL with other devices on the same network!
```

## 📱 How Others Can Join

1. **Same WiFi Network**: Share the Network URL (e.g., `http://192.168.1.100:3001`)
2. **Other devices** open that URL in their browser
3. **Both players** can create/join rooms and play together!

## 🔥 Windows Firewall (Important!)

The first time you start the server, Windows may ask about firewall access:
- ✅ **Click "Allow Access"** for both Private and Public networks
- This lets other devices connect to your game

If you missed the prompt, manually allow it:
1. Search "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Find "Node.js" or add the rule manually for port 3001

## 🌍 Internet Access (Optional)

### For Friends NOT on Your WiFi:

**Option 1: Port Forwarding (Router Setup)**
1. Access router admin (usually `192.168.1.1`)
2. Add port forwarding: External `3001` → Your PC IP → Internal `3001`
3. Share your public IP: `http://[YOUR_PUBLIC_IP]:3001`

**Option 2: Tunneling (Easiest)**
```cmd
# Install ngrok globally
npm install -g ngrok

# In another terminal, after starting your server:
ngrok http 3001
```
This gives you a public URL like `https://abc123.ngrok.io`

## 🛠️ Troubleshooting

**❌ "Can't connect from other device"**
- Both devices on same WiFi? ✅
- Windows Firewall allowed? ✅
- Try the IP from `ipconfig` manually

**❌ "Port already in use"**
- Another server running? Close it first
- Check with: `netstat -an | findstr 3001`

**❌ "WebSocket connection failed"**
- Client auto-detects server IP now ✅
- Check browser console for errors

## 🎯 Test Setup

1. **Start server**: `npm start`
2. **Open locally**: `http://localhost:3001` ✅
3. **From phone**: Use the Network URL shown in terminal ✅
4. **Create room** on one device, **join with same Room ID** on other ✅

## 📁 New Files Created

- `start-network-server.bat` - Easy server startup
- `get-my-ip.bat` - Get your network IP
- `get-network-info.ps1` - PowerShell network info
- `NETWORK_ACCESS_GUIDE.md` - Detailed guide

Your Konpira Game is ready for multiplayer fun! 🎉
