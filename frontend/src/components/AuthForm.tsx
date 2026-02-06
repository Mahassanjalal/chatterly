"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Mail, Lock, Calendar } from "lucide-react";
import { cn } from "../utils/cn";

interface AuthFormProps {
  type: "login" | "register";
  onSubmit: (data: { 
    email: string; 
    password: string; 
    name?: string; 
    gender?: 'male' | 'female' | 'other'; 
    userType?: 'free' | 'pro';
    dateOfBirth?: string;
  }) => void;
  loading?: boolean;
  error?: string;
}

const inputClasses = cn(
  "w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-600",
  "text-slate-100 placeholder-slate-400",
  "focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20",
  "transition-all duration-200",
  "hover:border-slate-500"
);

export default function AuthForm({ type, onSubmit, loading, error }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dateOfBirth: "",
    gender: "male" as 'male' | 'female' | 'other',
    userType: "free" as 'free' | 'pro',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      email: formData.email, 
      password: formData.password, 
      name: type === "register" ? formData.name : undefined,
      gender: type === "register" ? formData.gender : undefined,
      userType: type === "register" ? formData.userType : undefined,
      dateOfBirth: type === "register" ? formData.dateOfBirth : undefined
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="w-full space-y-5"
    >
      {/* Name Field - Register Only */}
      {type === "register" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            Full Name
          </label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={inputClasses}
            required
            minLength={2}
            maxLength={50}
          />
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-400" />
          Email Address
        </label>
        <input
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          className={inputClasses}
          required
        />
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-400" />
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            className={cn(inputClasses, "pr-12")}
            required
            minLength={8}
            maxLength={100}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {type === "register" && (
          <p className="text-xs text-slate-500">
            Must be at least 8 characters
          </p>
        )}
      </div>

      {/* Date of Birth - Register Only */}
      {type === "register" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Date of Birth
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange("dateOfBirth", e.target.value)}
            className={inputClasses}
            required
            max={new Date().toISOString().split('T')[0]}
          />
          <p className="text-xs text-slate-500">
            You must be 18+ to use Chatterly
          </p>
        </div>
      )}

      {/* Gender - Register Only */}
      {type === "register" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Your Gender
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['male', 'female', 'other'].map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() => handleChange("gender", gender)}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                  formData.gender === gender
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                    : "border-slate-600 text-slate-400 hover:border-slate-500"
                )}
              >
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Account Type - Register Only */}
      {type === "register" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Account Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleChange("userType", "free")}
              className={cn(
                "px-4 py-3 rounded-lg border text-left transition-all duration-200",
                formData.userType === "free"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-slate-600 hover:border-slate-500"
              )}
            >
              <div className="font-medium text-slate-200">Free</div>
              <div className="text-xs text-slate-400 mt-1">
                Basic features, standard matching
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleChange("userType", "pro")}
              className={cn(
                "px-4 py-3 rounded-lg border text-left transition-all duration-200 relative overflow-hidden",
                formData.userType === "pro"
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-slate-600 hover:border-slate-500"
              )}
            >
              {formData.userType === "pro" && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-400/20 to-transparent" />
              )}
              <div className="font-medium text-slate-200 flex items-center gap-1">
                Pro
                <span className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 px-1.5 py-0.5 rounded">
                  POPULAR
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Priority matching, HD video
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full py-3.5 px-6 rounded-lg font-semibold text-base",
          "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900",
          "hover:from-cyan-300 hover:to-blue-400",
          "focus:outline-none focus:ring-2 focus:ring-cyan-400/50",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2"
        )}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Please wait...
          </>
        ) : (
          type === "login" ? "Sign In" : "Create Account"
        )}
      </button>
    </motion.form>
  );
}
