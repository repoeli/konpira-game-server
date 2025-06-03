@echo off
echo.
echo ========================================
echo   Your Network Information
echo ========================================
echo.

echo Getting your IP addresses...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo Network IP: %%a
    echo Game URL: http:%%a:3001
    echo.
)

echo.
echo Instructions:
echo 1. Start the server: npm start (or run start-network-server.bat)
echo 2. Share the Game URL with other devices on the same WiFi
echo 3. Make sure Windows Firewall allows the connection
echo.
echo Note: Look for IP addresses starting with 192.168 or 10.0
echo.
pause
