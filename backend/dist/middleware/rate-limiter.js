"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = require("../config/redis");
const user_model_1 = require("../models/user.model");
// Generic API rate limiter
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    store: new rate_limit_redis_1.default({
        sendCommand: (...args) => redis_1.redis.sendCommand(args)
    }),
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
// More strict limiter for auth endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 requests per window
    store: new rate_limit_redis_1.default({
        sendCommand: (...args) => redis_1.redis.sendCommand(args)
    }),
    message: 'Too many login attempts from this IP, please try again after an hour'
});
// Dynamic rate limiter based on user status
const dynamicLimiter = async (req, res, next) => {
    if (!req.user) {
        return next();
    }
    const user = await user_model_1.User.findById(req.user._id);
    if (!user) {
        return next();
    }
    // Apply stricter rate limits for users with flags
    if (user.flags.requiresCaptcha || user.flags.isUnderReview) {
        const strictLimiter = (0, express_rate_limit_1.default)({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 30, // Very limited requests
            store: new rate_limit_redis_1.default({
                sendCommand: (...args) => redis_1.redis.sendCommand(args)
            }),
            message: 'Request limit exceeded. Please try again later.'
        });
        return strictLimiter(req, res, next);
    }
    // Normal users proceed
    next();
};
exports.dynamicLimiter = dynamicLimiter;
