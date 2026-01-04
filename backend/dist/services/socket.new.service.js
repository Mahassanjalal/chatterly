"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const redis_1 = require("../config/redis");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
class SocketService {
    constructor(server) {
        this.waitingUsers = new Set();
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: env_1.appConfig.cors.origin,
                methods: ['GET', 'POST'],
            },
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    throw new Error('Authentication error');
                }
                const decoded = jsonwebtoken_1.default.verify(token, env_1.appConfig.jwt.secret);
                const user = await user_model_1.User.findById(decoded.id);
                if (!user) {
                    throw new Error('User not found');
                }
                socket.userId = user.id;
                next();
            }
            catch (error) {
                next(new Error('Authentication error'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`User connected: ${socket.userId}`);
            socket.on('find_match', () => this.handleFindMatch(socket));
            socket.on('signal', (data) => this.handleSignal(socket, data));
            socket.on('end_call', () => this.handleEndCall(socket));
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }
    async handleFindMatch(socket) {
        if (!socket.userId)
            return;
        // Remove user from waiting list if they were already there
        this.waitingUsers.delete(socket.userId);
        // Find a random match from waiting users
        const waitingArray = Array.from(this.waitingUsers);
        if (waitingArray.length > 0) {
            const randomIndex = Math.floor(Math.random() * waitingArray.length);
            const matchedUserId = waitingArray[randomIndex];
            // Remove matched user from waiting list
            this.waitingUsers.delete(matchedUserId);
            // Notify both users about the match
            this.io.to(socket.id).emit('match_found', {
                targetUserId: matchedUserId,
                initiator: true,
            });
            this.io.to(matchedUserId).emit('match_found', {
                targetUserId: socket.userId,
                initiator: false,
            });
            // Store the match in Redis for 5 minutes
            await redis_1.redis.setEx(`match:${socket.userId}`, 300, JSON.stringify({ partnerId: matchedUserId }));
            await redis_1.redis.setEx(`match:${matchedUserId}`, 300, JSON.stringify({ partnerId: socket.userId }));
        }
        else {
            // Add user to waiting list
            this.waitingUsers.add(socket.userId);
        }
    }
    handleSignal(socket, data) {
        if (!socket.userId)
            return;
        const { signal, to } = data;
        this.io.to(to).emit('signal', {
            signal,
            from: socket.userId,
        });
    }
    async handleEndCall(socket) {
        if (!socket.userId)
            return;
        const matchData = await redis_1.redis.get(`match:${socket.userId}`);
        if (matchData) {
            const { partnerId } = JSON.parse(matchData);
            // Notify partner about call end
            this.io.to(partnerId).emit('call_ended');
            // Clean up Redis data
            await redis_1.redis.del(`match:${socket.userId}`);
            await redis_1.redis.del(`match:${partnerId}`);
        }
    }
    handleDisconnect(socket) {
        if (!socket.userId)
            return;
        this.waitingUsers.delete(socket.userId);
        logger_1.logger.info(`User disconnected: ${socket.userId}`);
    }
}
exports.SocketService = SocketService;
