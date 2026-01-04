"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingPreferences = exports.matchingPreferencesValidation = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
// Matching preferences validation schema
exports.matchingPreferencesValidation = zod_1.z.object({
    languages: zod_1.z.array(zod_1.z.string()),
    interests: zod_1.z.array(zod_1.z.string()),
    ageRange: zod_1.z.object({
        min: zod_1.z.number().min(18).max(100),
        max: zod_1.z.number().min(18).max(100)
    }),
    location: zod_1.z.object({
        country: zod_1.z.string().optional(),
        region: zod_1.z.string().optional()
    }).optional()
});
// Mongoose schema
const mongooseSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User',
        unique: true
    },
    languages: [{
            type: String,
            required: true
        }],
    interests: [{
            type: String,
            required: true
        }],
    ageRange: {
        min: {
            type: Number,
            required: true,
            min: 18,
            max: 100
        },
        max: {
            type: Number,
            required: true,
            min: 18,
            max: 100
        }
    },
    location: {
        country: String,
        region: String
    }
}, {
    timestamps: true
});
// Create indexes
mongooseSchema.index({ userId: 1 });
mongooseSchema.index({ languages: 1 });
mongooseSchema.index({ interests: 1 });
exports.MatchingPreferences = (0, mongoose_1.model)('MatchingPreferences', mongooseSchema);
