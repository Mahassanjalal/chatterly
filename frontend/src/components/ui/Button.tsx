"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glow?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      glow = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 ease-out rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none overflow-hidden";

    const variants = {
      primary: cn(
        "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-900",
        "hover:from-cyan-300 hover:to-blue-400",
        "active:from-cyan-500 active:to-blue-600",
        "focus:ring-cyan-400/50",
        glow && "shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]"
      ),
      secondary: cn(
        "bg-slate-700/80 text-slate-100 border border-slate-600",
        "hover:bg-slate-600 hover:border-slate-500",
        "active:bg-slate-700",
        "focus:ring-slate-500/50"
      ),
      ghost: cn(
        "bg-transparent text-slate-300",
        "hover:bg-slate-800/50 hover:text-slate-100",
        "active:bg-slate-800",
        "focus:ring-slate-500/30"
      ),
      danger: cn(
        "bg-gradient-to-r from-rose-500 to-pink-600 text-white",
        "hover:from-rose-400 hover:to-pink-500",
        "active:from-rose-600 active:to-pink-700",
        "focus:ring-rose-500/50",
        glow && "shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:shadow-[0_0_30px_rgba(244,63,94,0.6)]"
      ),
      outline: cn(
        "bg-transparent text-cyan-400 border-2 border-cyan-400/50",
        "hover:bg-cyan-400/10 hover:border-cyan-400",
        "active:bg-cyan-400/20",
        "focus:ring-cyan-400/30"
      ),
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-5 py-2.5 text-base",
      lg: "px-6 py-3 text-lg",
      xl: "px-8 py-4 text-xl",
    };

    const loadingSpinner = (
      <svg
        className="animate-spin h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          "hover:-translate-y-0.5 active:translate-y-0",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {/* Shine Effect */}
        <span
          className={cn(
            "absolute inset-0 -translate-x-full",
            "bg-gradient-to-r from-transparent via-white/20 to-transparent",
            "group-hover:animate-shimmer",
            !loading && !disabled && "group-hover:translate-x-full transition-transform duration-1000"
          )}
        />
        
        {/* Loading Spinner */}
        {loading && loadingSpinner}
        
        {/* Left Icon */}
        {!loading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Content */}
        <span className="relative z-10">{children}</span>
        
        {/* Right Icon */}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
