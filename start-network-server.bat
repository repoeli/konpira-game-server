@echo off
echo.
echo ========================================
echo   Konpira Game Server - Network Setup
echo ========================================
echo.

echo Building the project...
call npm run build

echo.
echo Starting the server...
echo.
echo The server will display network URLs when it starts.
echo Look for lines starting with "Network (Wi-Fi)" or "Network (Ethernet)"
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
