# 🌐 Konpira Game - Network Access Guide

## ✅ What I've Configured

Your Konpira Game Server is now configured to be accessible over the network! Here are the changes made:

### 1. Server Configuration
- ✅ Server now listens on `0.0.0.0:3001` (all network interfaces)
- ✅ Client automatically detects the correct server address
- ✅ Added network information endpoint

### 2. Updated Files
- ✅ `src/app.ts` - Server listens on all interfaces
- ✅ `public/client.js` - Dynamic WebSocket connection
- ✅ Added network detection and logging

## 🚀 How to Access from Other Devices

### Step 1: Start the Server
```bash
npm start
```

When the server starts, it will display all available network URLs like:
```
🌐 Network Access URLs:
   Local: http://localhost:3001
   Network (Wi-Fi): http://192.168.1.100:3001
   Network (Ethernet): http://192.168.0.150:3001
```

### Step 2: Get Your Network IP
If you need to find your IP manually:

**Windows (Command Prompt):**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**Windows (PowerShell):**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*"}
```

### Step 3: Share the URL
Share the network URL with other devices on the same WiFi network:
- Example: `http://192.168.1.100:3001`
- Other devices can open this URL in their browser to play

## 🔥 Windows Firewall Setup

**Important:** You may need to allow the app through Windows Firewall.

### Option 1: Automatic (when prompted)
1. Start the server (`npm start`)
2. Windows may show a firewall popup
3. Click "Allow access" for both Private and Public networks

### Option 2: Manual Firewall Rule
1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → **Next**
4. Select **TCP** and enter port **3001** → **Next**
5. Select **Allow the connection** → **Next**
6. Check all profiles (Domain, Private, Public) → **Next**
7. Name it "Konpira Game Server" → **Finish**

### Option 3: Quick PowerShell Command (Run as Administrator)
```powershell
New-NetFirewallRule -DisplayName "Konpira Game Server" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

## 📱 Testing Network Access

### From Another Device:
1. Connect to the same WiFi network
2. Open a web browser
3. Navigate to: `http://[YOUR_IP]:3001`
4. You should see the Konpira Game interface

### Troubleshooting:
1. **Can't connect from other devices?**
   - Check if both devices are on the same network
   - Verify Windows Firewall settings
   - Try temporarily disabling Windows Firewall to test

2. **Server not starting?**
   - Make sure port 3001 is not in use by another application
   - Check if you have permission to bind to the port

3. **WebSocket connection failed?**
   - The client now automatically uses the correct server address
   - Check browser console for error messages

## 🌍 For Internet Access (Advanced)

To make your game accessible over the internet (not just local network):

### Option 1: Port Forwarding
1. Access your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Find "Port Forwarding" or "Virtual Servers"
3. Add rule: External Port `3001` → Internal IP `[YOUR_PC_IP]` → Internal Port `3001`
4. Share your public IP: `http://[YOUR_PUBLIC_IP]:3001`

### Option 2: Tunneling Services
Use services like:
- **ngrok**: `npx ngrok http 3001`
- **localtunnel**: `npx localtunnel --port 3001`
- **serveo**: `ssh -R 80:localhost:3001 serveo.net`

## 🎮 Ready to Play!

Your Konpira Game Server is now network-ready! Players on the same WiFi network can:
1. Open the network URL in their browser
2. Enter a room ID and player name
3. Start playing together instantly

**Pro Tip:** The server will automatically display all available network URLs when you start it with `npm start`!
