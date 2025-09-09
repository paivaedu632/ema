# VS Code Memory Cleanup Script
# This script kills orphaned MCP server processes that consume excessive memory

Write-Host "🧹 VS Code Memory Cleanup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Function to get memory usage in MB
function Get-MemoryUsageMB($process) {
    return [math]::Round($process.WorkingSet / 1MB, 2)
}

# Check current memory usage
Write-Host "`n📊 Current VS Code Memory Usage:" -ForegroundColor Yellow
$codeProcesses = Get-Process Code -ErrorAction SilentlyContinue
if ($codeProcesses) {
    $totalMemory = ($codeProcesses | Measure-Object WorkingSet -Sum).Sum / 1MB
    Write-Host "Total VS Code Memory: $([math]::Round($totalMemory, 2)) MB" -ForegroundColor White
    
    $codeProcesses | Select-Object Id, @{Name="MemoryMB";Expression={Get-MemoryUsageMB($_)}} | 
        Sort-Object MemoryMB -Descending | 
        Format-Table -AutoSize
} else {
    Write-Host "No VS Code processes found." -ForegroundColor Green
}

# Check for Node.js processes (MCP servers)
Write-Host "`n🔍 Checking for MCP Server Processes:" -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js processes" -ForegroundColor Red
    
    # Show details of Node processes
    $nodeProcesses | ForEach-Object {
        $memoryMB = Get-MemoryUsageMB($_)
        Write-Host "  PID: $($_.Id) | Memory: $memoryMB MB" -ForegroundColor White
    }
    
    # Ask user if they want to kill the processes
    $response = Read-Host "`n❓ Kill all Node.js processes? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "`n🔥 Terminating Node.js processes..." -ForegroundColor Red
        $nodeProcesses | Stop-Process -Force
        Write-Host "✅ All Node.js processes terminated!" -ForegroundColor Green
    } else {
        Write-Host "❌ Skipped terminating Node.js processes." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ No Node.js processes found." -ForegroundColor Green
}

# Clean npm cache to prevent future issues
Write-Host "`n🧽 Cleaning npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force 2>$null
    Write-Host "✅ npm cache cleaned!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not clean npm cache (npm not found or error occurred)" -ForegroundColor Yellow
}

# Final memory check
Write-Host "`n📊 Final Memory Usage:" -ForegroundColor Yellow
$finalCodeProcesses = Get-Process Code -ErrorAction SilentlyContinue
if ($finalCodeProcesses) {
    $finalTotalMemory = ($finalCodeProcesses | Measure-Object WorkingSet -Sum).Sum / 1MB
    Write-Host "Total VS Code Memory: $([math]::Round($finalTotalMemory, 2)) MB" -ForegroundColor White
    
    if ($codeProcesses) {
        $memorySaved = $totalMemory - $finalTotalMemory
        if ($memorySaved -gt 0) {
            Write-Host "💾 Memory saved: $([math]::Round($memorySaved, 2)) MB" -ForegroundColor Green
        }
    }
}

Write-Host "`n🎉 Cleanup completed!" -ForegroundColor Green
Write-Host "`n💡 Tips to prevent future memory issues:" -ForegroundColor Cyan
Write-Host "  1. Restart VS Code regularly" -ForegroundColor White
Write-Host "  2. Close unused tabs and extensions" -ForegroundColor White
Write-Host "  3. Run this script when memory usage is high" -ForegroundColor White
Write-Host "  4. Keep Claude Desktop MCP servers minimal" -ForegroundColor White

# Pause to show results
Read-Host "`nPress Enter to exit..."
