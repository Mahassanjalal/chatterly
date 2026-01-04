"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = exports.reportValidation = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
// Report validation schema
exports.reportValidation = zod_1.z.object({
    reportedUserId: zod_1.z.string(),
    reporterUserId: zod_1.z.string(),
    reason: zod_1.z.enum(['inappropriate_behavior', 'harassment', 'spam', 'underage', 'other']),
    description: zod_1.z.string().optional(),
    evidenceUrls: zod_1.z.array(zod_1.z.string()).optional()
});
// Mongoose schema
const mongooseSchema = new mongoose_1.Schema({
    reportedUserId: {
        type: String,
        required: true,
        ref: 'User'
    },
    reporterUserId: {
        type: String,
        required: true,
        ref: 'User'
    },
    reason: {
        type: String,
        required: true,
        enum: ['inappropriate_behavior', 'harassment', 'spam', 'underage', 'other']
    },
    description: String,
    evidenceUrls: [String],
    status: {
        type: String,
        required: true,
        enum: ['pending', 'investigating', 'resolved', 'dismissed'],
        default: 'pending'
    },
    moderatorNotes: String,
    resolvedAt: Date
}, {
    timestamps: true
});
// Create indexes
mongooseSchema.index({ reportedUserId: 1 });
mongooseSchema.index({ reporterUserId: 1 });
mongooseSchema.index({ status: 1 });
mongooseSchema.index({ createdAt: 1 });
exports.Report = (0, mongoose_1.model)('Report', mongooseSchema);
