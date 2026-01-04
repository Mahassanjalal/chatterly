"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.userSchema = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
// User validation schema
exports.userSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
    gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
    type: zod_1.z.enum(['free', 'pro']).default('free'),
    dateOfBirth: zod_1.z.string().refine((val) => {
        const dob = new Date(val);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        return age >= 18;
    }, { message: "You must be at least 18 years old" }),
});
// Mongoose schema
const userMongooseSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: false,
    },
    dateOfBirth: {
        type: Date,
        required: true,
    },
    type: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user'
    },
    flags: {
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        requiresCaptcha: {
            type: Boolean,
            default: false
        },
        isUnderReview: {
            type: Boolean,
            default: false
        }
    },
    stats: {
        reportCount: {
            type: Number,
            default: 0
        },
        warningCount: {
            type: Number,
            default: 0
        },
        lastWarningDate: Date,
        connectionCount: {
            type: Number,
            default: 0
        },
        averageCallDuration: {
            type: Number,
            default: 0
        }
    },
    restrictions: {
        isSuspended: {
            type: Boolean,
            default: false
        },
        suspensionReason: String,
        suspensionExpiresAt: Date,
        isPermBanned: {
            type: Boolean,
            default: false
        },
        banReason: String
    }
}, {
    timestamps: true,
});
// Hash password before saving
userMongooseSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Compare password method
userMongooseSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Create indexes
userMongooseSchema.index({ email: 1 });
userMongooseSchema.index({ status: 1 });
userMongooseSchema.index({ role: 1 });
userMongooseSchema.index({ createdAt: -1 });
userMongooseSchema.index({ 'stats.reportCount': -1 });
exports.User = (0, mongoose_1.model)('User', userMongooseSchema);
