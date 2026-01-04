"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
exports.logEnvConfig = logEnvConfig;
const zod_1 = require("zod");
const logger_1 = require("../config/logger");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().regex(/^\d+$/).transform(Number).default('4000'),
    MONGODB_URI: zod_1.z.string().url().min(1, 'MongoDB URI is required'),
    REDIS_URL: zod_1.z.string().url().min(1, 'Redis URL is required'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT secret must be at least 32 characters for security'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().url().min(1, 'CORS origin is required'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().regex(/^\d+$/).transform(Number).optional().default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().regex(/^\d+$/).transform(Number).optional().default('100'),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).optional().default('info'),
});
function validateEnv() {
    try {
        const validated = envSchema.parse(process.env);
        // Additional security checks
        if (validated.NODE_ENV === 'production') {
            // In production, ensure JWT secret is strong
            if (validated.JWT_SECRET.length < 64) {
                logger_1.logger.warn('JWT_SECRET should be at least 64 characters in production');
            }
            // Ensure not using default/example values
            if (validated.JWT_SECRET.includes('your-super-secret')) {
                throw new Error('Cannot use example JWT_SECRET in production!');
            }
            // Ensure MongoDB is not localhost in production
            if (validated.MONGODB_URI.includes('localhost') || validated.MONGODB_URI.includes('127.0.0.1')) {
                logger_1.logger.warn('MongoDB is configured for localhost in production');
            }
        }
        logger_1.logger.info('Environment variables validated successfully');
        return validated;
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            logger_1.logger.error('Environment validation failed:', missingVars);
            throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
        }
        throw error;
    }
}
function logEnvConfig(config) {
    logger_1.logger.info('Environment Configuration:', {
        NODE_ENV: config.NODE_ENV,
        PORT: config.PORT,
        MONGODB_URI: config.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        REDIS_URL: config.REDIS_URL.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        CORS_ORIGIN: config.CORS_ORIGIN,
        JWT_SECRET: '***hidden***',
        LOG_LEVEL: config.LOG_LEVEL,
    });
}
