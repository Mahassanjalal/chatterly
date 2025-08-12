import { Schema, model, Document } from 'mongoose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// User validation schema
export const userSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  gender: z.enum(['male', 'female', 'other']).optional(),
  preferredGender: z.enum(['male', 'female', 'both']).default('both'),
})

export type UserInput = z.infer<typeof userSchema>

// User document interface
export interface IUser extends Document {
  name: string
  email: string
  password: string
  gender?: 'male' | 'female' | 'other'
  preferredGender: 'male' | 'female' | 'both'
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
    preferredGender: {
      type: String,
      enum: ['male', 'female', 'both'],
      default: 'both',
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

// Create indexes
userMongooseSchema.index({ email: 1 })

export const User = model<IUser>('User', userMongooseSchema)
