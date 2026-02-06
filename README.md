# Chatterly - Modern Random Video Chat Platform

Chatterly is a secure and user-friendly random video chat platform that connects people worldwide for spontaneous conversations. Built with modern technologies and a focus on privacy, security, and seamless user experience.

## Features

- 🎥 **Instant random video chat matching** with WebRTC
- 🔒 **End-to-end encrypted communications**
- 📱 **Responsive design** for all devices
- 🌍 **Global scalability** with Redis pub/sub
- 🛡️ **Advanced privacy controls and moderation**
- 💬 **Real-time text chat** alongside video
- 🎨 **Clean, intuitive user interface**
- ⚡ **AI-powered content moderation**
- 📊 **Real-time analytics and monitoring**

## Tech Stack

### Frontend
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Real-time**: Socket.io-client
- **WebRTC**: Simple-peer
- **Monitoring**: Sentry

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **WebSocket**: Socket.io
- **Validation**: Zod
- **Security**: Helmet, bcrypt, JWT (httpOnly cookies)
- **Logging**: Winston

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest (47 tests passing)
- **Health Checks**: `/health` and `/health/ready` endpoints

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatterly.git
cd chatterly
```

2. Start the development environment:
```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:4000
```

#### Backend (.env)
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://mongodb:27017/chatterly
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

## Implemented Features

### Security & Authentication
- ✅ **HTTP-Only Cookies**: JWT tokens stored securely (not localStorage)
- ✅ **Helmet Security Headers**: CSP, HSTS, XSS protection
- ✅ **Password Hashing**: bcrypt with 10+ salt rounds
- ✅ **Rate Limiting**: API and socket rate limiting
- ✅ **Age Verification**: 18+ requirement on registration
- ✅ **Account Lockout**: After 5 failed login attempts
- ✅ **Refresh Token Rotation**: Secure session management

### User Management
- ✅ **Registration**: Full registration with name, email, password, gender
- ✅ **Login/Logout**: Cookie-based authentication
- ✅ **Profile Management**: View, edit profile, change password
- ✅ **Pro Upgrade**: Free to Pro account upgrades
- ✅ **Email Verification**: SendGrid integration ready
- ✅ **Password Reset**: Full forgot/reset password flow
- ✅ **GDPR Compliance**: Data export and account deletion

### Video Chat Core
- ✅ **WebRTC Integration**: SimplePeer for P2P connections
- ✅ **Socket.io Signaling**: Real-time signaling server
- ✅ **ICE Server Configuration**: STUN/TURN server support
- ✅ **Adaptive Quality**: Dynamic quality adjustment based on connection
- ✅ **Video/Audio Controls**: Toggle during calls

### Matching System
- ✅ **Gender Preferences**: Match by gender preferences
- ✅ **User Type System**: Free (80% same gender) vs Pro (80% opposite gender)
- ✅ **Queue Management**: Real-time statistics
- ✅ **Weighted Algorithm**: Smart matching based on user type
- ✅ **Interest-Based Matching**: Tag-based matching for Pro users

### Real-Time Chat
- ✅ **Text Messaging**: Socket.io messaging
- ✅ **Typing Indicators**: Real-time typing feedback
- ✅ **Emoji Picker**: Built-in emoji support
- ✅ **Message Moderation**: Profanity filter + AI moderation

### Safety & Moderation
- ✅ **Profanity Filter**: `bad-words` library
- ✅ **AI Moderation**: Multi-category toxicity scoring
- ✅ **Video Moderation**: AI-based inappropriate content detection
- ✅ **User Reporting**: Report with categories
- ✅ **Report Model**: MongoDB storage with status tracking
- ✅ **User Restrictions**: Ban/suspend support
- ✅ **Abuse Prevention**: Rate limiting, warnings, automatic suspension

### Admin Features
- ✅ **Admin Dashboard**: User management and moderation queue
- ✅ **Moderation Queue UI**: Handle reported content
- ✅ **Ban/Suspend UI**: Admin interface for user actions
- ✅ **Metrics Dashboard**: Real-time analytics

### Legal & Compliance
- ✅ **Terms of Service**: `/terms` page
- ✅ **Privacy Policy**: `/privacy` page (GDPR/CCPA compliant)
- ✅ **Safety Center**: `/safety` page with guidelines
- ✅ **Cookie Consent**: Granular cookie management
- ✅ **Community Guidelines**: Published guidelines

### UI/UX Components
- ✅ **Responsive Design**: Mobile-first for all devices
- ✅ **Connection Quality Indicator**: Network strength display
- ✅ **Loading Spinner**: Customizable loading states
- ✅ **Error Boundary**: Graceful error handling
- ✅ **Toast Notifications**: User-friendly notifications
- ✅ **Premium Upgrade Modal**: Pro subscription UI

### Infrastructure
- ✅ **MongoDB**: Mongoose ODM with indexes
- ✅ **Redis**: Pub/sub and session management
- ✅ **Docker**: Production-ready Dockerfiles
- ✅ **Health Checks**: Kubernetes-ready endpoints
- ✅ **Winston Logging**: Structured logging
- ✅ **Sentry Integration**: Error tracking configured

### Testing
- ✅ **Jest Configuration**: Full test infrastructure
- ✅ **47 Tests Passing**: Matching, moderation, abuse prevention
- ✅ **Mock Utilities**: Comprehensive test helpers

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Client App                           │
│  (Next.js + WebRTC + Socket.io-client + Simple-peer)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│              (Express + Helmet + Rate Limiting)            │
└──────┬───────────────┬────────────────┬─────────────────────┘
       │               │                │
       ▼               ▼                ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐
│   Auth   │   │   Matching   │   │  Moderation  │
│ Service  │   │   Service    │   │   Service    │
└──────────┘   └──────────────┘   └──────────────┘
       │               │                │
       └───────────────┼────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌─────────────────┐      ┌─────────────────┐
│     MongoDB     │      │     Redis       │
│  (User, Report  │      │ (Queue, Cache,  │
│   Sessions)     │      │   Pub/Sub)      │
└─────────────────┘      └─────────────────┘
```

### File Structure

```
chatterly/
├── backend/
│   └── src/
│       ├── __tests__/         # Jest test suites (47 tests)
│       ├── config/            # App, DB, Redis, WebRTC config
│       ├── controllers/       # Auth, Profile, Admin, GDPR
│       ├── middleware/        # Auth, validation, rate limiting, error handling
│       ├── models/            # User, Report, Session, BlockedUser
│       ├── routes/            # API route definitions
│       ├── services/          # Matching, Socket, Moderation, AI, Email
│       └── utils/             # Helper utilities
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages (chat, login, profile, etc.)
│       ├── components/       # Reusable React components
│       ├── styles/           # Global CSS
│       └── utils/            # Auth utilities, socket manager
├── docker-compose.yml        # Production Docker config
└── docker-compose.dev.yml    # Development Docker config
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `PUT /api/profile/password` - Change password
- `POST /api/profile/upgrade` - Upgrade to Pro
- `GET /api/profile/export` - Export user data (GDPR)
- `DELETE /api/profile/delete` - Delete account (GDPR)

### Blocking
- `GET /api/blocking/blocked` - Get blocked users
- `POST /api/blocking/block` - Block a user
- `POST /api/blocking/unblock` - Unblock a user

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/reports` - Get reports queue
- `PUT /api/admin/reports/:id` - Update report status
- `POST /api/admin/users/:id/ban` - Ban user
- `POST /api/admin/users/:id/suspend` - Suspend user

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks MongoDB)

### Analytics
- `GET /api/analytics/dashboard` - Real-time dashboard data
- `GET /api/analytics/metrics` - Prometheus metrics

## Socket Events

### Client → Server
- `find_match` - Start searching for a match
- `chat_message` - Send a chat message
- `webrtc_signal` - WebRTC signaling data
- `typing` - Typing indicator
- `report_user` - Report current partner
- `end_call` - End current call
- `block_user` - Block current partner

### Server → Client
- `match_found` - Successfully matched with a user
- `searching` - Currently searching for match
- `chat_message` - Received a chat message
- `webrtc_signal` - WebRTC signaling data
- `typing` - Partner typing indicator
- `call_ended` - Call ended notification
- `error` - Error notification

## User Type System

### Free Users (🆓)
- **Gender Preferences**: Limited to "Everyone" or same gender only
- **Matching Weights**: 80% same gender, 20% opposite gender
- **Features**: Basic video chat, text messaging

### Pro Users (⭐)
- **Gender Preferences**: Full access (Everyone, Male, Female)
- **Matching Weights**: 80% opposite gender, 20% same gender
- **Features**: Priority matching, interest tags, HD video, no ads

## Testing

### Run Tests
```bash
cd backend
npm test                 # Run all tests
npm test -- --coverage  # Run with coverage
npm test -- --watch     # Watch mode
```

### Test Coverage
- **Matching Service**: 14 tests - Queue management, compatibility, gender filtering
- **Moderation Service**: 16 tests - Profanity detection, AI analysis
- **Abuse Prevention**: 17 tests - Flagging, warnings, suspension

## Security Features

- WebRTC encryption for video/audio
- JWT-based authentication in httpOnly cookies
- Rate limiting (API + Socket)
- Input validation with Zod
- XSS protection via Helmet CSP
- CORS policies
- Account lockout after failed attempts
- CSRF protection via SameSite cookies

## Scripts

### Backend
```bash
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm run start    # Production start
npm run test     # Run Jest tests
npm run lint     # Run ESLint
```

### Frontend
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production start
npm run lint     # Run ESLint
```

## Deployment

### Docker Production
```bash
docker-compose up -d --build
```

### Development
```bash
docker-compose -f docker-compose.dev.yml up --build
```

## Environment Setup

1. Copy `.env.example` to `.env` in backend directory
2. Set your `JWT_SECRET` (generate a secure random string)
3. Configure MongoDB and Redis URLs
4. (Optional) Configure SendGrid for email
5. (Optional) Configure Sentry DSN for error tracking

## Monitoring

- **Sentry**: Error tracking and performance monitoring
- **Winston**: Structured logging with security events
- **Prometheus Metrics**: Available at `/api/analytics/metrics`
- **Health Checks**: `/health` and `/health/ready`
- **Real-time Dashboard**: `/api/analytics/dashboard`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact support@chatterly.com.

---

**Chatterly** - Connect with the world, one conversation at a time. 🚀
