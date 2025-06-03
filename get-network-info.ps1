# Konpira Game Network Setup Script
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Konpira Game Server - Network Info" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Getting your network information..." -ForegroundColor Yellow
Write-Host ""

# Get network adapters with IPv4 addresses
$networkInfo = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -like "192.168.*" -or 
    $_.IPAddress -like "10.*" -or 
    $_.IPAddress -like "172.*"
} | Select-Object IPAddress, InterfaceAlias

if ($networkInfo) {
    Write-Host "🌐 Available Network URLs:" -ForegroundColor Green
    Write-Host "   Local: http://localhost:3001" -ForegroundColor White
    
    foreach ($info in $networkInfo) {
        $url = "http://$($info.IPAddress):3001"
        Write-Host "   Network ($($info.InterfaceAlias)): $url" -ForegroundColor White
    }
} else {
    Write-Host "❌ No network interfaces found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm start" -ForegroundColor White
Write-Host "2. Share the Network URL with other devices" -ForegroundColor White
Write-Host "3. Ensure Windows Firewall allows port 3001" -ForegroundColor White
Write-Host ""

# Check if port 3001 is already in use
try {
    $portCheck = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "⚠️  Port 3001 is currently in use" -ForegroundColor Yellow
        Write-Host "   The server might already be running" -ForegroundColor White
    } else {
        Write-Host "✅ Port 3001 is available" -ForegroundColor Green
    }
} catch {
    Write-Host "✅ Port 3001 appears to be available" -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to continue"
