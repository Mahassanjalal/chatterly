import winston from 'winston'
import { appConfig } from './env'

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
)

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
]

// Add file transport in production
if (appConfig.isProduction) {
  transports.push(
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  )
}

export const logger = winston.createLogger({
  level: appConfig.isDevelopment ? 'debug' : 'info',
  format,
  transports,
})
