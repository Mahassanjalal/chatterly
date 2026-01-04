"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbusePreventionService = void 0;
const user_model_1 = require("../models/user.model");
const report_model_1 = require("../models/report.model");
const logger_1 = require("../config/logger");
class AbusePreventionService {
    // Check if a user needs to be reviewed based on their activity
    static async shouldReviewUser(userId) {
        try {
            const user = await user_model_1.User.findById(userId);
            if (!user)
                return false;
            // Check for multiple criteria
            const recentReports = await report_model_1.Report.find({
                reportedUserId: userId,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            }).count();
            // User should be reviewed if:
            // 1. They have received multiple reports in the last 24 hours
            // 2. They have a high warning count
            // 3. Their average call duration is suspiciously low (potential spammer)
            if (recentReports >= 3 ||
                user.stats.warningCount >= 5 ||
                (user.stats.connectionCount > 10 && user.stats.averageCallDuration < 10)) {
                await user_model_1.User.findByIdAndUpdate(userId, {
                    'flags.isUnderReview': true,
                    'flags.requiresCaptcha': true
                });
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error('Error in shouldReviewUser:', error);
            return false;
        }
    }
    // Update user stats after a call
    static async updateUserStats(userId, callDuration) {
        try {
            const user = await user_model_1.User.findById(userId);
            if (!user)
                return;
            // Calculate new average call duration
            const totalDuration = user.stats.averageCallDuration * user.stats.connectionCount + callDuration;
            const newConnectionCount = user.stats.connectionCount + 1;
            const newAverageDuration = totalDuration / newConnectionCount;
            await user_model_1.User.findByIdAndUpdate(userId, {
                $set: {
                    'stats.averageCallDuration': newAverageDuration,
                    'stats.connectionCount': newConnectionCount
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error in updateUserStats:', error);
        }
    }
    // Handle a user report
    static async handleReport(reportData) {
        try {
            const report = new report_model_1.Report(reportData);
            await report.save();
            const user = await user_model_1.User.findById(reportData.reportedUserId);
            if (!user)
                return;
            // Update user's report count
            const newReportCount = user.stats.reportCount + 1;
            await user_model_1.User.findByIdAndUpdate(reportData.reportedUserId, {
                $inc: { 'stats.reportCount': 1 }
            });
            // Check if immediate action is needed
            if (newReportCount >= 10) {
                await user_model_1.User.findByIdAndUpdate(reportData.reportedUserId, {
                    status: 'suspended',
                    'restrictions.isSuspended': true,
                    'restrictions.suspensionReason': 'Multiple user reports',
                    'restrictions.suspensionExpiresAt': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                });
            }
            else if (newReportCount >= 5) {
                await user_model_1.User.findByIdAndUpdate(reportData.reportedUserId, {
                    'flags.isUnderReview': true,
                    'flags.requiresCaptcha': true
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error in handleReport:', error);
        }
    }
    // Issue a warning to a user
    static async issueWarning(userId, reason) {
        try {
            const user = await user_model_1.User.findById(userId);
            if (!user)
                return;
            const newWarningCount = user.stats.warningCount + 1;
            await user_model_1.User.findByIdAndUpdate(userId, {
                $inc: { 'stats.warningCount': 1 },
                $set: { 'stats.lastWarningDate': new Date() }
            });
            // Apply restrictions based on warning count
            if (newWarningCount >= 3) {
                await user_model_1.User.findByIdAndUpdate(userId, {
                    status: 'suspended',
                    'restrictions.isSuspended': true,
                    'restrictions.suspensionReason': reason,
                    'restrictions.suspensionExpiresAt': new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error in issueWarning:', error);
        }
    }
}
exports.AbusePreventionService = AbusePreventionService;
