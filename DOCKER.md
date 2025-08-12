# Docker Setup for Chatterly

This document explains how to run Chatterly using Docker in both development and production environments.

## Quick Start

### Production Mode (Recommended)
```bash
# Build and run all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### Development Mode
```bash
# Build and run with hot reloading
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

## Configuration Files

### Production (`docker-compose.yml`)
- **Frontend**: Production-optimized Next.js build
- **Backend**: Production Node.js server
- **Database**: MongoDB and Redis
- **Features**: Auto-restart, optimized for deployment

### Development (`docker-compose.dev.yml`)
- **Frontend**: Development server with hot reloading
- **Backend**: Development server with file watching
- **Database**: Same as production
- **Features**: Volume mounting for live code changes

## Frontend Docker Configuration

### Production Dockerfile (`frontend/Dockerfile`)
- Multi-stage build for optimized image size
- Uses Node.js 20 Alpine for security and performance
- Standalone Next.js output for self-contained deployment
- Non-root user for security
- Security headers included

### Development Dockerfile (`frontend/Dockerfile.dev`)
- Single-stage build for faster development
- Hot reloading enabled
- File watching with polling for cross-platform compatibility
- Volume mounting for live code changes

## Environment Variables

### Frontend
- `NODE_ENV`: `production` or `development`
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_SOCKET_URL`: WebSocket server URL
- `PORT`: Server port (default: 3000)
- `HOSTNAME`: Server hostname (default: 0.0.0.0)

### Backend
- `NODE_ENV`: `production` or `development`
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CORS_ORIGIN`: Allowed CORS origin

## Build Scripts

### Windows PowerShell
```powershell
# Production build
.\frontend\docker-build.ps1

# Development build
.\frontend\docker-build.ps1 -Mode dev
```

### Unix/Linux
```bash
# Make executable
chmod +x frontend/docker-build.sh

# Production build
./frontend/docker-build.sh

# Development build
./frontend/docker-build.sh dev
```

## Common Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Stop services
```bash
# Stop all
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Rebuild specific service
```bash
# Rebuild frontend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build frontend
```

### Access container shell
```bash
# Frontend container
docker-compose exec frontend sh

# Backend container
docker-compose exec backend sh
```

## Troubleshooting

### Port conflicts
If ports 3000 or 4000 are in use:
```bash
# Check what's using the port
netstat -tulpn | grep :3000

# Kill the process or modify docker-compose.yml ports
```

### Permission issues (Linux/Mac)
```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Make scripts executable
chmod +x frontend/docker-build.sh
```

### Cache issues
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Next.js config issues
The project uses `next.config.js` (JavaScript) instead of `next.config.ts` (TypeScript) for Docker compatibility with older Next.js versions in container environments.

## Performance Tips

### Production
- Uses multi-stage builds to minimize image size
- Standalone output reduces runtime dependencies
- Alpine Linux base for security and size
- Non-root user for security

### Development
- Volume mounting for instant code changes
- Polling enabled for cross-platform file watching
- Separate development and production configurations

## Security Features

- Non-root user in production containers
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Environment variable isolation
- Network isolation between services
- Auto-restart policies for reliability

## Monitoring

### Health checks
```bash
# Check container status
docker-compose ps

# Check container health
docker inspect chatterly-frontend | grep Health -A 10
```

### Resource usage
```bash
# Monitor resource usage
docker stats

# Monitor specific containers
docker stats chatterly-frontend chatterly-backend
```
