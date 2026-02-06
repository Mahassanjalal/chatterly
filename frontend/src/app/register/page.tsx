"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Video, ArrowLeft, Shield, Sparkles, Zap } from "lucide-react";
import AuthForm from "../../components/AuthForm";
import { register } from "../../utils/auth";
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
  { icon: Shield, text: "100% free to start" },
  { icon: Sparkles, text: "No credit card required" },
  { icon: Zap, text: "Takes less than a minute" },
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (data: { 
    email: string; 
    password: string; 
    name?: string; 
    gender?: 'male' | 'female' | 'other';
    userType?: 'free' | 'pro';
    dateOfBirth?: string;
  }) => {
    setLoading(true);
    setError("");
    try {
      if (!data.name || !data.dateOfBirth) {
        throw new Error("Name and Date of Birth are required");
      }
      await register(data.name, data.email, data.password, data.dateOfBirth, data.gender, data.userType);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
              Join{" "}
              <span className="gradient-text">Chatterly</span>
              <br />
              Today
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-slate-300 text-lg mb-12 max-w-md"
            >
              Start connecting with millions of people worldwide. It's free and takes less than a minute.
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

            {/* Testimonial */}
            <motion.div 
              variants={fadeInUp}
              className="mt-12 p-6 rounded-2xl bg-slate-800/50 border border-slate-700"
            >
              <p className="text-slate-300 italic mb-4">
                "I've made friends from all over the world. Best video chat platform I've ever used!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-slate-900 font-bold">
                  S
                </div>
                <div>
                  <p className="text-white font-medium">Sarah M.</p>
                  <p className="text-slate-400 text-sm">New York, USA</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
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

        {/* Register Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-slate-400">
              Join millions of people already connecting on Chatterly
            </p>
          </div>

          <AuthForm 
            type="register" 
            onSubmit={handleRegister} 
            loading={loading} 
            error={error} 
          />

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-sm">or</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Sign In Link */}
          <p className="text-center text-slate-400">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-slate-500 text-sm text-center"
        >
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-slate-400 hover:text-slate-300">
            Terms of Service
          </Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-slate-400 hover:text-slate-300">
            Privacy Policy
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
