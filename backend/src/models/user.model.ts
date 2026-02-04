import { Schema, model, Document } from 'mongoose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// User validation schema
export const userSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  gender: z.enum(['male', 'female', 'other']).optional(),
  type: z.enum(['free', 'pro']).default('free'),
  dateOfBirth: z.string().refine((val) => {
    const dob = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 18;
  }, { message: "You must be at least 18 years old" }),
})

export type UserInput = z.infer<typeof userSchema>

// User document interface
export interface IUser extends Document {
  name: string
  email: string
  password: string
  gender?: 'male' | 'female' | 'other'
  dateOfBirth: Date
  type: 'free' | 'pro'
  status: 'active' | 'suspended' | 'banned'
  role: 'user' | 'moderator' | 'admin'
  flags: {
    isEmailVerified: boolean
    requiresCaptcha: boolean
    isUnderReview: boolean
  }
  stats: {
    reportCount: number
    warningCount: number
    lastWarningDate?: Date
    connectionCount: number
    averageCallDuration: number
  }
  restrictions: {
    isSuspended: boolean
    suspensionReason?: string
    suspensionExpiresAt?: Date
    isPermBanned: boolean
    banReason?: string
  }
  // Email verification fields
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  // Password reset fields
  passwordResetToken?: string
  passwordResetExpires?: Date
  // Blocked users
  blockedUsers: string[]
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

// Mongoose schema
const userMongooseSchema = new Schema<IUser>(
  {
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
    },
    // Email verification fields
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    // Password reset fields
    passwordResetToken: String,
    passwordResetExpires: Date,
    // Blocked users
    blockedUsers: [{
      type: String,
      ref: 'User'
    }]
  },
  {
    timestamps: true,
  }
)

// Hash password before saving
userMongooseSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Compare password method
userMongooseSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Create indexes for high-performance queries at scale
// Primary lookup indexes
userMongooseSchema.index({ email: 1 }, { unique: true })
userMongooseSchema.index({ status: 1 })
userMongooseSchema.index({ role: 1 })
userMongooseSchema.index({ createdAt: -1 })

// Matching and queue optimization indexes
userMongooseSchema.index({ type: 1, gender: 1 }) // For matching queries
userMongooseSchema.index({ type: 1, status: 1 }) // For active user queries
userMongooseSchema.index({ 'flags.isEmailVerified': 1 }) // For verified users filter

// Moderation and safety indexes
userMongooseSchema.index({ 'stats.reportCount': -1 })
userMongooseSchema.index({ 'stats.warningCount': -1 })
userMongooseSchema.index({ 'restrictions.isSuspended': 1 })
userMongooseSchema.index({ 'restrictions.isPermBanned': 1 })

// Token lookup indexes (for auth flows)
userMongooseSchema.index({ emailVerificationToken: 1 }, { sparse: true })
userMongooseSchema.index({ passwordResetToken: 1 }, { sparse: true })

// Compound indexes for common queries
userMongooseSchema.index({ status: 1, type: 1, createdAt: -1 })
userMongooseSchema.index({ status: 1, 'flags.isEmailVerified': 1 })

export const User = model<IUser>('User', userMongooseSchema)
