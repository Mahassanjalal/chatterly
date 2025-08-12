# Chatterly - Modern Random Video Chat Platform

Chatterly is a secure and user-friendly random video chat platform that connects people worldwide for spontaneous conversations. Built with modern technologies and a focus on privacy, security, and seamless user experience.

## Features

- 🎥 Instant random video chat matching
- 🔒 End-to-end encrypted communications
- 📱 Responsive design for all devices
- 🌍 Global scalability with low latency
- 🛡️ Advanced privacy controls and moderation
- 💬 Optional text chat alongside video
- 🎨 Clean, intuitive user interface

## Tech Stack

### Frontend
- Next.js 13+ with App Router
- WebRTC for peer-to-peer video
- TailwindCSS for styling
- Socket.io-client for real-time communication
- Simple-peer for WebRTC management

### Backend
- Node.js with Express
- Socket.io for signaling server
- MongoDB for user/session data
- Redis for pub/sub and matching
- JWT for authentication

### Infrastructure
- Docker containerization
- Microservices architecture
- Cloud-native deployment ready

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/chatterly.git
cd chatterly
\`\`\`

2. Start the development environment:
\`\`\`bash
docker-compose up
\`\`\`

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Environment Variables

#### Frontend (.env.local)
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:4000
\`\`\`

#### Backend (.env)
\`\`\`
NODE_ENV=development
MONGODB_URI=mongodb://mongodb:27017/chatterly
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:3000
\`\`\`

## Architecture

### High-Level Components

1. **Client Application (Next.js)**
   - Video/Audio streaming
   - User interface
   - WebRTC peer connections
   - Real-time signaling

2. **API Server (Express)**
   - User management
   - Session handling
   - Authentication
   - Rate limiting

3. **Signaling Server (Socket.io)**
   - WebRTC signaling
   - User matching
   - Presence management

4. **Databases**
   - MongoDB: User profiles, settings
   - Redis: Real-time matching, caching

## Security Features

- WebRTC encryption for video/audio
- JWT-based authentication
- Rate limiting
- Input validation
- XSS protection
- CORS policies
- Data encryption at rest

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

For support, please open an issue in the GitHub repository or contact support@chatterly.com.
