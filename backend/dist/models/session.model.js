"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const mongoose_1 = require("mongoose");
const sessionSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    deviceInfo: {
        userAgent: String,
        ip: String
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Create indexes
sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ lastActive: 1 });
exports.Session = (0, mongoose_1.model)('Session', sessionSchema);
