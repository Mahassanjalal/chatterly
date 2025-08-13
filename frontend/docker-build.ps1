# PowerShell script for building frontend Docker container

param(
    [string]$Mode = "production"
)

if ($Mode -eq "dev" -or $Mode -eq "development") {
    Write-Host "Building frontend Docker image for development..." -ForegroundColor Green
    docker build -f Dockerfile.dev -t chatterly-frontend-dev .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Development Docker image built successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To run development mode:" -ForegroundColor Yellow
        Write-Host "docker-compose -f docker-compose.dev.yml up" -ForegroundColor Cyan
    }
} else {
    Write-Host "Building frontend Docker image for production..." -ForegroundColor Green
    docker build -t chatterly-frontend .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Production Docker image built successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To run production mode:" -ForegroundColor Yellow
        Write-Host "docker-compose up" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To run the container directly:" -ForegroundColor Yellow
        Write-Host "docker run -p 3000:3000 chatterly-frontend" -ForegroundColor Cyan
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}
