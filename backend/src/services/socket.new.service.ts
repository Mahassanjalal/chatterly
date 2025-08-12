import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { logger } from '../config/logger'
import { appConfig } from '../config/env'
import { redis } from '../config/redis'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

export class SocketService {
  private io: Server
  private waitingUsers: Set<string> = new Set()

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: appConfig.cors.origin,
        methods: ['GET', 'POST'],
      },
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          throw new Error('Authentication error')
        }

        const decoded = jwt.verify(token, appConfig.jwt.secret) as { id: string }
        const user = await User.findById(decoded.id)

        if (!user) {
          throw new Error('User not found')
        }

        socket.userId = user.id
        next()
      } catch (error) {
        next(new Error('Authentication error'))
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User connected: ${socket.userId}`)

      socket.on('find_match', () => this.handleFindMatch(socket))
      socket.on('signal', (data) => this.handleSignal(socket, data))
      socket.on('end_call', () => this.handleEndCall(socket))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })
  }

  private async handleFindMatch(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    // Remove user from waiting list if they were already there
    this.waitingUsers.delete(socket.userId)

    // Find a random match from waiting users
    const waitingArray = Array.from(this.waitingUsers)
    if (waitingArray.length > 0) {
      const randomIndex = Math.floor(Math.random() * waitingArray.length)
      const matchedUserId = waitingArray[randomIndex]

      // Remove matched user from waiting list
      this.waitingUsers.delete(matchedUserId)

      // Notify both users about the match
      this.io.to(socket.id).emit('match_found', {
        targetUserId: matchedUserId,
        initiator: true,
      })

      this.io.to(matchedUserId).emit('match_found', {
        targetUserId: socket.userId,
        initiator: false,
      })

      // Store the match in Redis for 5 minutes
      await redis.setEx(
        `match:${socket.userId}`,
        300,
        JSON.stringify({ partnerId: matchedUserId })
      )
      await redis.setEx(
        `match:${matchedUserId}`,
        300,
        JSON.stringify({ partnerId: socket.userId })
      )
    } else {
      // Add user to waiting list
      this.waitingUsers.add(socket.userId)
    }
  }

  private handleSignal(socket: AuthenticatedSocket, data: any) {
    if (!socket.userId) return

    const { signal, to } = data
    this.io.to(to).emit('signal', {
      signal,
      from: socket.userId,
    })
  }

  private async handleEndCall(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    const matchData = await redis.get(`match:${socket.userId}`)
    if (matchData) {
      const { partnerId } = JSON.parse(matchData)
      
      // Notify partner about call end
      this.io.to(partnerId).emit('call_ended')
      
      // Clean up Redis data
      await redis.del(`match:${socket.userId}`)
      await redis.del(`match:${partnerId}`)
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    this.waitingUsers.delete(socket.userId)
    logger.info(`User disconnected: ${socket.userId}`)
  }
}
