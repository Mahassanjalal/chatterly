"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../config/logger");
const env_1 = require("../config/env");
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
    // Don't log known operational errors
    if (!(err instanceof AppError) || !err.isOperational) {
        logger_1.logger.error('Error:', {
            message: err.message,
            stack: env_1.appConfig.isDevelopment ? err.stack : undefined,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
        });
    }
    // Don't send response if headers already sent
    if (res.headersSent) {
        return next(err);
    }
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors,
        });
    }
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        return res.status(400).json({
            error: 'Validation error',
            details: Object.values(err.errors).map((e) => e.message),
        });
    }
    if (err instanceof mongoose_1.default.Error.CastError) {
        return res.status(400).json({
            error: 'Invalid ID format',
        });
    }
    // MongoDB duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            error: `${field} already exists`,
        });
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
        });
    }
    // Default error
    return res.status(500).json({
        error: env_1.appConfig.isDevelopment ? err.message : 'Internal server error',
    });
};
exports.errorHandler = errorHandler;
