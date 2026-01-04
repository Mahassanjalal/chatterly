"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.connectToRedis = connectToRedis;
const redis_1 = require("redis");
const env_1 = require("./env");
const logger_1 = require("./logger");
exports.redis = (0, redis_1.createClient)({
    url: env_1.appConfig.redis.url,
});
exports.redis.on('error', (error) => {
    logger_1.logger.error('Redis client error:', error);
});
exports.redis.on('connect', () => {
    logger_1.logger.info('Successfully connected to Redis');
});
exports.redis.on('reconnecting', () => {
    logger_1.logger.warn('Redis client reconnecting');
});
async function connectToRedis() {
    try {
        await exports.redis.connect();
    }
    catch (error) {
        logger_1.logger.error('Error connecting to Redis:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await exports.redis.quit();
        logger_1.logger.info('Redis connection closed through app termination');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error closing Redis connection:', error);
        process.exit(1);
    }
});
