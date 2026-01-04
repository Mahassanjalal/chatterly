"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const cookie_1 = __importDefault(require("cookie"));
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const matching_service_1 = require("./matching.service");
const moderation_service_1 = require("./moderation.service");
class SocketService {
    constructor(server) {
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
                let token = socket.handshake.auth.token;
                if (!token && socket.handshake.headers.cookie) {
                    const cookies = cookie_1.default.parse(socket.handshake.headers.cookie);
                    token = cookies.token;
                }
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
            socket.on('find_match', (data) => this.handleFindMatch(socket, data));
            socket.on('chat_message', (data) => this.handleChatMessage(socket, data));
            socket.on('typing', () => this.handleTyping(socket));
            socket.on('webrtc_signal', (data) => this.handleWebRTCSignal(socket, data));
            socket.on('end_call', () => this.handleEndCall(socket));
            socket.on('report_user', (data) => this.handleReportUser(socket, data));
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }
    async handleFindMatch(socket, data) {
        if (!socket.userId)
            return;
        try {
            // Remove user from any existing queue/match
            matching_service_1.matchingService.removeUserFromQueue(socket.userId);
            const otherUserId = matching_service_1.matchingService.removeUserFromMatch(socket.userId);
            if (otherUserId) {
                // Notify other user that match ended
                this.notifyUserByUserId(otherUserId, 'match_ended', { reason: 'partner_left' });
            }
            // Try to find a match with gender preferences
            const match = await matching_service_1.matchingService.addUserToQueue(socket.userId, socket.id, data?.preferredGender);
            if (match) {
                // Match found! Store match ID on both sockets
                socket.matchId = match.matchId;
                // Get the other user's socket
                const otherUserSocket = this.getSocketByUserId(match.user2.userId);
                if (otherUserSocket) {
                    otherUserSocket.matchId = match.matchId;
                }
                // Notify both users about the match
                socket.emit('match_found', {
                    matchId: match.matchId,
                    partner: {
                        id: match.user2.user._id,
                        name: match.user2.user.name,
                    },
                    isInitiator: true,
                });
                this.notifyUserByUserId(match.user2.userId, 'match_found', {
                    matchId: match.matchId,
                    partner: {
                        id: match.user1.user._id,
                        name: match.user1.user.name,
                    },
                    isInitiator: false,
                });
                logger_1.logger.info(`Match created: ${match.matchId}`);
            }
            else {
                // No match found, user added to waiting queue
                socket.emit('searching', {
                    message: 'Looking for someone to chat with...',
                    queueStats: matching_service_1.matchingService.getQueueStats(),
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error in handleFindMatch:', error);
            socket.emit('match_error', { message: 'Failed to find a match. Please try again.' });
        }
    }
    handleChatMessage(socket, data) {
        if (!socket.userId || !socket.matchId)
            return;
        const match = matching_service_1.matchingService.getMatch(socket.matchId);
        if (!match)
            return;
        // Clean the message
        const cleanedMessage = moderation_service_1.moderationService.cleanMessage(data.message);
        // Determine the other user
        const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId;
        // Send message to the other user
        this.notifyUserByUserId(otherUserId, 'chat_message', {
            message: cleanedMessage,
            sender: 'stranger',
            timestamp: new Date().toISOString(),
        });
    }
    handleTyping(socket) {
        if (!socket.userId || !socket.matchId)
            return;
        const match = matching_service_1.matchingService.getMatch(socket.matchId);
        if (!match)
            return;
        // Determine the other user
        const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId;
        // Send typing indicator to the other user
        this.notifyUserByUserId(otherUserId, 'typing', {});
    }
    handleWebRTCSignal(socket, signalData) {
        if (!socket.userId || !socket.matchId)
            return;
        const match = matching_service_1.matchingService.getMatch(socket.matchId);
        if (!match)
            return;
        // Determine the other user
        const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId;
        // Forward WebRTC signal to the other user
        this.notifyUserByUserId(otherUserId, 'webrtc_signal', signalData);
    }
    handleReportUser(socket, data) {
        if (!socket.userId || !socket.matchId)
            return;
        const match = matching_service_1.matchingService.getMatch(socket.matchId);
        if (!match)
            return;
        const reportedUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId;
        // Log the report (in a real app, you'd store this in the database)
        logger_1.logger.warn(`User ${socket.userId} reported user ${reportedUserId}: ${data.reason}`);
        // End the match
        this.handleEndCall(socket);
        socket.emit('report_submitted', { message: 'Report submitted successfully' });
    }
    handleEndCall(socket) {
        if (!socket.userId)
            return;
        // Remove user from queue if they're waiting
        matching_service_1.matchingService.removeUserFromQueue(socket.userId);
        // Remove user from active match and get partner ID
        const otherUserId = matching_service_1.matchingService.removeUserFromMatch(socket.userId);
        if (otherUserId) {
            // Notify the other user that the call ended
            this.notifyUserByUserId(otherUserId, 'call_ended', { reason: 'partner_left' });
            // Clear match ID from the other user's socket
            const otherSocket = this.getSocketByUserId(otherUserId);
            if (otherSocket) {
                otherSocket.matchId = undefined;
            }
        }
        // Clear match ID from current socket
        socket.matchId = undefined;
        socket.emit('call_ended', { reason: 'you_left' });
    }
    handleDisconnect(socket) {
        if (!socket.userId)
            return;
        // Handle the disconnect the same way as ending a call
        this.handleEndCall(socket);
        logger_1.logger.info(`User disconnected: ${socket.userId}`);
    }
    getSocketByUserId(userId) {
        for (const [socketId, socket] of this.io.sockets.sockets) {
            const authSocket = socket;
            if (authSocket.userId === userId) {
                return authSocket;
            }
        }
        return undefined;
    }
    notifyUserByUserId(userId, event, data) {
        const userSocket = this.getSocketByUserId(userId);
        if (userSocket) {
            userSocket.emit(event, data);
        }
    }
    // Public method to get current stats
    getStats() {
        return {
            connectedUsers: this.io.sockets.sockets.size,
            waitingUsers: matching_service_1.matchingService.getUsersInQueue(),
            activeMatches: matching_service_1.matchingService.getActiveMatches(),
            queueStats: matching_service_1.matchingService.getQueueStats(),
        };
    }
}
exports.SocketService = SocketService;
