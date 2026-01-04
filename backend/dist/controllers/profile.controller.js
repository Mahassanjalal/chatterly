"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgradeToPro = exports.changePassword = exports.updateProfile = exports.getUserProfile = void 0;
const user_model_1 = require("../models/user.model");
const error_1 = require("../middleware/error");
const asyncHandler_1 = require("../utils/asyncHandler");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = require("../config/logger");
// Get user profile
// Get user profile by ID
exports.getUserProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
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
            status: user.status,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }
    });
});
// Update user profile
exports.updateProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, gender } = req.body;
    const userId = req.user?._id;
    // Check if email is being changed and if it's already taken
    if (email) {
        const existingUser = await user_model_1.User.findOne({
            email,
            _id: { $ne: userId }
        });
        if (existingUser) {
            throw new error_1.AppError(409, 'Email already in use');
        }
    }
    // Update user profile
    const updateData = {};
    if (name)
        updateData.name = name;
    if (email)
        updateData.email = email;
    if (gender)
        updateData.gender = gender;
    const updatedUser = await user_model_1.User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-password');
    if (!updatedUser) {
        throw new error_1.AppError(404, 'User not found');
    }
    logger_1.logger.info(`User profile updated: ${userId}`);
    res.json({
        message: 'Profile updated successfully',
        user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            gender: updatedUser.gender,
            type: updatedUser.type,
            status: updatedUser.status,
            role: updatedUser.role,
        }
    });
});
// Change password
exports.changePassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?._id;
    // Get user with password
    const user = await user_model_1.User.findById(userId);
    if (!user) {
        throw new error_1.AppError(404, 'User not found');
    }
    // Verify current password
    const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw new error_1.AppError(400, 'Current password is incorrect');
    }
    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
    // Update password
    await user_model_1.User.findByIdAndUpdate(userId, {
        password: hashedNewPassword
    });
    logger_1.logger.info(`Password changed for user: ${userId}`);
    res.json({
        message: 'Password changed successfully'
    });
});
// Upgrade to Pro
exports.upgradeToPro = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?._id;
    const user = await user_model_1.User.findById(userId);
    if (!user) {
        throw new error_1.AppError(404, 'User not found');
    }
    if (user.type === 'pro') {
        throw new error_1.AppError(400, 'User is already a Pro member');
    }
    // In a real application, you would:
    // 1. Process payment with Stripe/PayPal
    // 2. Verify payment success
    // 3. Then upgrade the user
    // For now, we'll simulate successful payment
    await user_model_1.User.findByIdAndUpdate(userId, {
        type: 'pro'
    });
    logger_1.logger.info(`User upgraded to Pro: ${userId}`);
    res.json({
        message: 'Successfully upgraded to Pro membership!',
        user: {
            type: 'pro'
        }
    });
});
