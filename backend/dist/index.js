"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const mongodb_1 = require("./config/mongodb");
const redis_1 = require("./config/redis");
const error_1 = require("./middleware/error");
const socket_service_1 = require("./services/socket.service");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
// Create Express app
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Initialize socket service
new socket_service_1.SocketService(server);
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", env_1.appConfig.cors.origin, "wss:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: env_1.appConfig.cors.origin,
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/profile', profile_routes_1.default);
// Health check endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: env_1.appConfig.env
    });
});
app.get('/health/ready', async (req, res) => {
    // Check DB connection
    const isDbConnected = require('mongoose').connection.readyState === 1;
    if (isDbConnected) {
        res.json({ status: 'ready' });
    }
    else {
        res.status(503).json({ status: 'not ready', database: isDbConnected ? 'up' : 'down' });
    }
});
// Error handling
app.use(error_1.errorHandler);
// Start server
const start = async () => {
    try {
        // Connect to MongoDB
        await (0, mongodb_1.connectToMongoDB)();
        // Connect to Redis
        await (0, redis_1.connectToRedis)();
        // Start server
        server.listen(env_1.appConfig.port, () => {
            logger_1.logger.info(`Server is running on port ${env_1.appConfig.port}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
start();
// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    // Graceful shutdown
    process.exit(1);
});
