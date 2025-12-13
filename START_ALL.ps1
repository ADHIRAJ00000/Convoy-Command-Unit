# Hawkroute - Complete Startup Script
# Starts Frontend, Backend, and OR-Tools Optimizer

Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "🚀 HAWKROUTE - Real-Time AI Mobility Intelligence Platform" -ForegroundColor Green
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan

# Function to start service in new terminal
function Start-Service {
    param($Name, $Path, $Command, $Color)
    Write-Host "`n[$Name]" -ForegroundColor $Color -NoNewline
    Write-Host " Starting..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command"
    Start-Sleep -Seconds 2
}

# Check if MongoDB is configured
$envFile = "c:\Users\yashj\Downloads\Hawkroute_2.1\Backend\.env"
if (Test-Path $envFile) {
    $mongoUri = (Get-Content $envFile | Select-String "MONGODB_URI").ToString()
    if ($mongoUri -match "mongodb") {
        Write-Host "✅ MongoDB configuration found" -ForegroundColor Green
    }
}
else {
    Write-Host "⚠️  Warning: .env file not found" -ForegroundColor Yellow
}

# Start services in separate terminals
Write-Host "`n📦 Starting Services..." -ForegroundColor Cyan

Start-Service -Name "OR-Tools Optimizer" `
    -Path "c:\Users\yashj\Downloads\Hawkroute_2.1\Backend\optimizer-service" `
    -Command "python optimizer.py" `
    -Color "Magenta"

Start-Service -Name "Backend Server" `
    -Path "c:\Users\yashj\Downloads\Hawkroute_2.1\Backend" `
    -Command "npm run dev" `
    -Color "Blue"

Start-Service -Name "Frontend (Next.js)" `
    -Path "c:\Users\yashj\Downloads\Hawkroute_2.1\Frontend" `
    -Command "npm run dev" `
    -Color "Green"

# Display URLs
Write-Host "`n" -NoNewline
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan

Write-Host "`n📍 Service URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:          " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API:       " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5000" -ForegroundColor White
Write-Host "   OR-Tools Service:  " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:5001" -ForegroundColor White

Write-Host "`n🧪 Quick Tests:" -ForegroundColor Cyan
Write-Host "   Backend Health:    " -NoNewline -ForegroundColor Gray
Write-Host "curl http://localhost:5000/health" -ForegroundColor Yellow
Write-Host "   Optimizer Health:  " -NoNewline -ForegroundColor Gray
Write-Host "curl http://localhost:5001/health" -ForegroundColor Yellow
Write-Host "   Get Convoys:       " -NoNewline -ForegroundColor Gray
Write-Host "curl http://localhost:5000/api/convoys" -ForegroundColor Yellow

Write-Host "`n👤 Default Users (after seeding):" -ForegroundColor Cyan
Write-Host "   Admin:      " -NoNewline -ForegroundColor Gray
Write-Host "admin / admin123" -ForegroundColor White
Write-Host "   Commander:  " -NoNewline -ForegroundColor Gray
Write-Host "commander / commander123" -ForegroundColor White
Write-Host "   Operator:   " -NoNewline -ForegroundColor Gray
Write-Host "operator / operator123" -ForegroundColor White

Write-Host "`n🎯 For Hackathon Demo:" -ForegroundColor Cyan
Write-Host "   1. Open " -NoNewline -ForegroundColor Gray
Write-Host "http://localhost:3000" -ForegroundColor White
Write-Host "   2. Navigate to Dashboard to see real-time convoy tracking" -ForegroundColor Gray
Write-Host "   3. Create new convoy route - will use OR-Tools optimization!" -ForegroundColor Gray
Write-Host "   4. Show judges the 3 terminal windows running microservices" -ForegroundColor Gray

Write-Host "`n" -NoNewline
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "Press Ctrl+C in each terminal to stop services" -ForegroundColor Yellow
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan

Write-Host "`nGood luck with your hackathon! 🏆" -ForegroundColor Green
