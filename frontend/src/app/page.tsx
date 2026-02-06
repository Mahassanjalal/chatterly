"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Video, 
  Users, 
  Shield, 
  Zap, 
  Globe, 
  Sparkles,
  MessageCircle,
  Heart,
  ArrowRight,
  Play,
  Star,
  TrendingUp,
  Clock
} from "lucide-react";
import { isAuthenticated } from "../utils/auth";
import Button from "../components/ui/Button";
import Footer from "../components/Footer";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.8 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.5 }
};

// Stats data
const stats = [
  { icon: Users, value: "10M+", label: "Active Users" },
  { icon: Globe, value: "190+", label: "Countries" },
  { icon: Video, value: "50M+", label: "Video Calls" },
  { icon: Heart, value: "98%", label: "Satisfaction" },
];

// Features data
const features = [
  {
    icon: Video,
    title: "Crystal Clear Video",
    description: "HD video quality with adaptive streaming for any connection speed",
    color: "from-cyan-400 to-blue-500"
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "End-to-end encryption with AI-powered content moderation",
    color: "from-emerald-400 to-teal-500"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Connect with someone new in under 3 seconds",
    color: "from-amber-400 to-orange-500"
  },
  {
    icon: Sparkles,
    title: "AI Matching",
    description: "Smart algorithm matches you with compatible people",
    color: "from-violet-400 to-purple-500"
  },
  {
    icon: Globe,
    title: "Global Community",
    description: "Meet people from 190+ countries and practice languages",
    color: "from-pink-400 to-rose-500"
  },
  {
    icon: MessageCircle,
    title: "Text & Video",
    description: "Chat via text or video - switch seamlessly anytime",
    color: "from-indigo-400 to-blue-500"
  }
];

// How it works steps
const steps = [
  {
    number: "01",
    title: "Create Account",
    description: "Sign up in seconds with just your email",
    icon: Users
  },
  {
    number: "02",
    title: "Set Preferences",
    description: "Choose your interests and matching preferences",
    icon: Sparkles
  },
  {
    number: "03",
    title: "Start Chatting",
    description: "Connect instantly with people worldwide",
    icon: Video
  }
];

// Testimonials
const testimonials = [
  {
    name: "Sarah M.",
    location: "New York, USA",
    text: "I've made friends from all over the world! The video quality is incredible and the AI matching really works.",
    rating: 5
  },
  {
    name: "Marcus K.",
    location: "Berlin, Germany",
    text: "Best video chat platform I've used. The security features give me peace of mind while meeting new people.",
    rating: 5
  },
  {
    name: "Yuki T.",
    location: "Tokyo, Japan",
    text: "I practice English with native speakers every day. It's amazing how quickly you can connect with someone.",
    rating: 5
  }
];

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(73267);
  const [activeTab, setActiveTab] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
    
    // Simulate dynamic user count with more realistic fluctuation
    const interval = setInterval(() => {
      setOnlineUsers(prev => {
        const change = Math.floor(Math.random() * 50) - 25;
        return Math.max(70000, prev + change);
      });
    }, 3000);

    // Auto-rotate testimonials
    const tabInterval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % testimonials.length);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(tabInterval);
    };
  }, []);

  const handleStartChat = () => {
    if (isLoggedIn) {
      router.push("/chat");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push("/")}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Video className="w-5 h-5 text-slate-900" />
              </div>
              <span className="text-xl font-bold gradient-text">Chatterly</span>
            </motion.div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium">
                How It Works
              </a>
              <a href="#testimonials" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium">
                Reviews
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {!isLoggedIn ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push("/login")}
                  >
                    Sign In
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => router.push("/register")}
                    glow
                  >
                    Get Started
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push("/profile")}
                  >
                    Profile
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => router.push("/chat")}
                    glow
                  >
                    Start Chatting
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400 text-sm font-medium">
                  {onlineUsers.toLocaleString()} people online now
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1 
                variants={fadeInUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Connect with the{" "}
                <span className="gradient-text">World</span>
                <br />
                Through Video
              </motion.h1>

              {/* Subheadline */}
              <motion.p 
                variants={fadeInUp}
                className="text-lg sm:text-xl text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0"
              >
                Experience crystal-clear video conversations with people worldwide. 
                AI-powered matching, end-to-end encryption, and stunning features.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Button 
                  size="lg" 
                  onClick={handleStartChat}
                  glow
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Start Video Chat
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  leftIcon={<Play className="w-5 h-5" />}
                >
                  Watch Demo
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div 
                variants={fadeInUp}
                className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-slate-400 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>End-to-End Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>4.9/5 Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>24/7 Active</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Main Video Preview Card */}
                <div className="glass rounded-2xl p-2 shadow-2xl shadow-cyan-500/10 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden relative">
                    {/* Mock Video Grid */}
                    <div className="absolute inset-0 grid grid-cols-2 gap-2 p-4">
                      <div className="bg-slate-700/50 rounded-lg flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center">
                          <Users className="w-8 h-8 text-cyan-400" />
                        </div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-500/20 flex items-center justify-center">
                          <Video className="w-8 h-8 text-purple-400" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating UI Elements */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-rose-500/80 flex items-center justify-center">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-700/80 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-700/80 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Stats Cards */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 glass rounded-xl p-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">10M+</p>
                      <p className="text-slate-400 text-xs">Active Users</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-4 -left-4 glass rounded-xl p-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold">4.9/5</p>
                      <p className="text-slate-400 text-xs">User Rating</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 mb-4">
                  <stat.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">
              Features
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
              Everything You Need to{" "}
              <span className="gradient-text">Connect</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-300 text-lg max-w-2xl mx-auto">
              Powerful features designed to make your video chatting experience seamless, safe, and enjoyable.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative glass rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-300"
              >
                {/* Gradient Border Effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-slate-900" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">
              How It Works
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
              Start Chatting in{" "}
              <span className="gradient-text">3 Easy Steps</span>
            </motion.h2>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative text-center"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent" />
                )}

                {/* Step Number & Icon */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/30 flex flex-col items-center justify-center group hover:border-cyan-500/60 transition-colors duration-300">
                    <span className="text-cyan-400 text-sm font-bold mb-1">{step.number}</span>
                    <step.icon className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span variants={fadeInUp} className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">
              Testimonials
            </motion.span>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
              Loved by{" "}
              <span className="gradient-text">Millions</span>
            </motion.h2>
          </motion.div>

          {/* Testimonial Carousel */}
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="glass rounded-2xl p-8 md:p-12 text-center"
              >
                {/* Stars */}
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(testimonials[activeTab].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-xl md:text-2xl text-white mb-8 leading-relaxed">
                  "{testimonials[activeTab].text}"
                </p>

                {/* Author */}
                <div>
                  <p className="text-white font-semibold">{testimonials[activeTab].name}</p>
                  <p className="text-slate-400 text-sm">{testimonials[activeTab].location}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === activeTab 
                      ? "bg-cyan-400 w-8" 
                      : "bg-slate-600 hover:bg-slate-500"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Start Your{" "}
              <span className="gradient-text">Journey</span>?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              Join millions of people already connecting on Chatterly. 
              It's free to start and takes less than a minute.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="xl" 
                onClick={handleStartChat}
                glow
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Start Chatting Now
              </Button>
            </motion.div>
            <motion.p variants={fadeInUp} className="mt-6 text-slate-400 text-sm">
              No credit card required • Free to use • Cancel anytime
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
