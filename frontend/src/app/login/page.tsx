"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Video, ArrowLeft, Shield, Sparkles, Zap } from "lucide-react";
import AuthForm from "../../components/AuthForm";
import { login } from "../../utils/auth";
import Button from "../../components/ui/Button";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const features = [
  { icon: Shield, text: "Secure, encrypted connections" },
  { icon: Sparkles, text: "AI-powered matching" },
  { icon: Zap, text: "Lightning fast video" },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (data: { email: string; password: string }) => {
    setLoading(true);
    setError("");
    try {
      await login(data.email, data.password);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-8 absolute top-8 left-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-xl font-bold gradient-text">Chatterly</span>
          </Link>

          {/* Content */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl font-bold text-white mb-6"
            >
              Welcome back to{" "}
              <span className="gradient-text">Chatterly</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-slate-300 text-lg mb-12 max-w-md"
            >
              Connect with millions of people worldwide through crystal-clear video chat.
            </motion.p>

            {/* Feature List */}
            <motion.div variants={fadeInUp} className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-slate-300">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div 
              variants={fadeInUp}
              className="mt-12 flex gap-8"
            >
              <div>
                <p className="text-3xl font-bold text-white">10M+</p>
                <p className="text-slate-400 text-sm">Active Users</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">190+</p>
                <p className="text-slate-400 text-sm">Countries</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">4.9</p>
                <p className="text-slate-400 text-sm">Rating</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden mb-8"
        >
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Video className="w-6 h-6 text-slate-900" />
            </div>
            <span className="text-2xl font-bold gradient-text">Chatterly</span>
          </Link>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute top-8 left-8 lg:hidden"
        >
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/")}
          >
            Back
          </Button>
        </motion.div>

        {/* Login Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-slate-400">
              Welcome back! Please enter your details.
            </p>
          </div>

          <AuthForm 
            type="login" 
            onSubmit={handleLogin} 
            loading={loading} 
            error={error} 
          />

          {/* Forgot Password */}
          <div className="mt-6 text-center">
            <Link 
              href="/forgot-password" 
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-sm">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-slate-400">
            Dont have an account?{" "}
            <Link 
              href="/register" 
              className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute bottom-8 text-slate-500 text-sm"
        >
          Protected by reCAPTCHA and subject to our{" "}
          <Link href="/privacy" className="text-slate-400 hover:text-slate-300">
            Privacy Policy
          </Link>
          {" "}and{" "}
          <Link href="/terms" className="text-slate-400 hover:text-slate-300">
            Terms of Service
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
