"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.logout = exports.login = exports.signup = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../models/user.model");
const env_1 = require("../config/env");
const error_1 = require("../middleware/error");
const asyncHandler_1 = require("../utils/asyncHandler");
const generateToken = (userId) => {
    const signOptions = {
        expiresIn: env_1.appConfig.jwt.expiresIn
    };
    return jsonwebtoken_1.default.sign({ id: userId }, env_1.appConfig.jwt.secret, signOptions);
};
const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days matching JWT_EXPIRES_IN
        ),
        httpOnly: true,
        secure: env_1.appConfig.isProduction,
        sameSite: 'lax',
    };
    res
        .status(statusCode)
        .cookie('token', token, cookieOptions)
        .json({
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
            type: user.type,
        },
    });
};
exports.signup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, password, gender, type, dateOfBirth } = await user_model_1.userSchema.parseAsync(req.body);
    const existingUser = await user_model_1.User.findOne({ email });
    if (existingUser) {
        throw new error_1.AppError(409, 'Email already registered');
    }
    const user = new user_model_1.User({
        name,
        email,
        password,
        gender,
        dateOfBirth,
        type: type || 'free'
    });
    await user.save();
    sendTokenResponse(user, 201, res);
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const user = await user_model_1.User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
        throw new error_1.AppError(401, 'Invalid credentials');
    }
    sendTokenResponse(user, 200, res);
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({
        success: true,
        message: 'User logged out',
    });
});
exports.me = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await user_model_1.User.findById(req.user?._id).select('-password');
    if (!user) {
        throw new error_1.AppError(404, 'User not found');
    }
    res.json({
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            gender: user.gender,
            type: user.type,
        }
    });
});
