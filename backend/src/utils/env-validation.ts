import { z } from 'zod';
import { logger } from '../config/logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('4000'),
  MONGODB_URI: z.string().url().min(1, 'MongoDB URI is required'),
  REDIS_URL: z.string().url().min(1, 'Redis URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().url().min(1, 'CORS origin is required'),
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).optional().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).optional().default('100'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional().default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    const validated = envSchema.parse(process.env);
    
    // Additional security checks
    if (validated.NODE_ENV === 'production') {
      // In production, ensure JWT secret is strong
      if (validated.JWT_SECRET.length < 64) {
        logger.warn('JWT_SECRET should be at least 64 characters in production');
      }
      
      // Ensure not using default/example values
      if (validated.JWT_SECRET.includes('your-super-secret')) {
        throw new Error('Cannot use example JWT_SECRET in production!');
      }
      
      // Ensure MongoDB is not localhost in production
      if (validated.MONGODB_URI.includes('localhost') || validated.MONGODB_URI.includes('127.0.0.1')) {
        logger.warn('MongoDB is configured for localhost in production');
      }
    }
    
    logger.info('Environment variables validated successfully');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      logger.error('Environment validation failed:', missingVars);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export function logEnvConfig(config: EnvConfig): void {
  logger.info('Environment Configuration:', {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PORT,
    MONGODB_URI: config.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
    REDIS_URL: config.REDIS_URL.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
    CORS_ORIGIN: config.CORS_ORIGIN,
    JWT_SECRET: '***hidden***',
    LOG_LEVEL: config.LOG_LEVEL,
  });
}
