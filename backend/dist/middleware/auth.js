"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const user_model_1 = require("../models/user.model");
const error_1 = require("./error");
const auth = async (req, res, next) => {
    try {
        let token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token && req.cookies) {
            token = req.cookies.token;
        }
        if (!token) {
            throw new error_1.AppError(401, 'Access token required');
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.appConfig.jwt.secret);
        const user = await user_model_1.User.findById(decoded.id);
        if (!user) {
            throw new error_1.AppError(401, 'User not found');
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof error_1.AppError) {
            return next(error);
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next(new error_1.AppError(401, 'Invalid token'));
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new error_1.AppError(401, 'Token expired'));
        }
        next(new error_1.AppError(401, 'Authentication failed'));
    }
};
exports.auth = auth;
