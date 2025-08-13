# API Integration Documentation

This document describes how the frontend integrates with the backend API for the Chatterly application.

## Backend API Overview

The backend runs on port 4000 by default and provides the following authentication endpoints:

### Base URL
- **Local Development**: `http://localhost:4000`
- **Production**: Set via `NEXT_PUBLIC_API_URL` environment variable

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "string (2-50 characters)",
  "email": "string (valid email)",
  "password": "string (8-100 characters)"
}
```

**Success Response (201):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

**Error Response (400/409):**
```json
{
  "error": "Validation error",
  "details": [
    {
      "message": "Error description",
      "path": ["field_name"]
    }
  ]
}
```

### POST /auth/login
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "string (valid email)",
  "password": "string (min 8 characters)"
}
```

**Success Response (200):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "id": "user_id",
  "name": "User Name",
  "email": "user@example.com",
  "status": "active",
  "role": "user",
  "flags": {
    "isEmailVerified": false,
    "requiresCaptcha": false,
    "isUnderReview": false
  },
  "stats": {
    "reportCount": 0,
    "warningCount": 0,
    "connectionCount": 0,
    "averageCallDuration": 0
  },
  "restrictions": {
    "isSuspended": false,
    "isPermBanned": false
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Frontend Implementation

### Authentication Utilities

The frontend uses a centralized authentication utility (`src/utils/auth.ts`) that provides:

- **API request helpers** with automatic token attachment
- **Authentication state management** (login, logout, token storage)
- **Type-safe interfaces** for API responses
- **Error handling** for validation and authentication errors

### Key Functions

```typescript
// Login user
await login(email: string, password: string): Promise<AuthResponse>

// Register user
await register(name: string, email: string, password: string): Promise<AuthResponse>

// Get current user
await getCurrentUser(): Promise<User>

// Check authentication status
isAuthenticated(): boolean

// Get stored token
getAuthToken(): string | null

// Get stored user data
getUser(): User | null

// Logout and clear data
logout(): void
```

### Form Validation

The frontend form validation matches the backend requirements:

**Registration Form:**
- **Name**: 2-50 characters, required
- **Email**: Valid email format, required
- **Password**: 8-100 characters, required

**Login Form:**
- **Email**: Valid email format, required
- **Password**: Minimum 8 characters, required

### Error Handling

The frontend handles various error scenarios:

1. **Validation Errors**: Zod validation failures from backend
2. **Authentication Errors**: Invalid credentials
3. **Network Errors**: Connection failures
4. **Server Errors**: 5xx responses

### Data Storage

Authentication data is stored in localStorage:

- **Token**: `chatterly_token` - JWT token for API authentication
- **User**: `chatterly_user` - JSON string of user object

### Navigation Flow

1. **Successful Login/Register**: Redirect to `/chat`
2. **Authentication Required**: Middleware checks for valid token
3. **Logout**: Clear storage and redirect to home

## Environment Variables

Set these environment variables for proper API integration:

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:4000
```

```env
# Backend (.env)
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/chatterly
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

## Socket.IO Integration

The chat functionality uses Socket.IO for real-time communication:

- **Connection**: Established using the same backend URL
- **Authentication**: Token sent during connection
- **Events**: Match finding, chat messages, video signaling

## Security Considerations

1. **JWT Tokens**: Stored securely in localStorage (consider httpOnly cookies for production)
2. **CORS**: Backend configured to allow frontend origin
3. **Rate Limiting**: Backend implements rate limiting on auth routes
4. **Input Validation**: Both frontend and backend validate user input
5. **Password Security**: Backend hashes passwords with bcrypt

## Development Testing

To test the integration:

1. Start the backend server: `npm run dev` (in backend directory)
2. Start the frontend server: `npm run dev` (in frontend directory)
3. Test registration at: `http://localhost:3000/register`
4. Test login at: `http://localhost:3000/login`
5. Verify chat access at: `http://localhost:3000/chat`

## Production Deployment

For production deployment:

1. Set proper environment variables
2. Enable HTTPS for secure token transmission
3. Configure CORS for production domain
4. Set up proper database and Redis instances
5. Implement proper logging and monitoring
