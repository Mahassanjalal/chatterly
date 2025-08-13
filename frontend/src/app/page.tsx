"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthData, isAuthenticated } from "../utils/auth";

export default function LandingPage() {
  const [userCount, setUserCount] = useState(73267);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
    
    // Simulate dynamic user count
    const interval = setInterval(() => {
      setUserCount(prev => prev + Math.floor(Math.random() * 10) - 4);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStartChat = () => {
    if (isLoggedIn) {
      router.push("/chat");
    } else {
      router.push("/login");
    }
  };

  const logout = () => {
    clearAuthData();
    setIsLoggedIn(false);
    setUserCount(73267);
    router.push("/");
  };
  

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">chatterly</h1>
            <p className="text-sm text-white">Talk to strangers!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isLoggedIn && (
            <div className="flex items-center gap-4">
              <Link href="/login">
                <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors">
                  Sign In
                </button>
              </Link>
              <Link href="/register">
                <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors">
                  Register
                </button>
              </Link>
            </div>
          )}
          {isLoggedIn && (
            <div className="flex items-center gap-4">
              <Link href="/profile">
                <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors">
                  Profile
                </button>
              </Link>
              
              <button onClick={logout} className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-blue-600 text-white font-medium rounded-full transition-colors">
                Logout
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{userCount.toLocaleString()} users online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="mb-8">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Talk to strangers!
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Chatterly lets you meet new people from around the world. 
            Have fun, make friends, and discover different cultures through video chat.
          </p>
        </div>

        {/* User Stats */}
        <div className="flex justify-center items-center gap-8 mb-12">
          <div className="bg-gray-100 px-6 py-3 rounded-full">
            <span className="text-2xl">👥</span>
            <span className="ml-2 font-medium">Both</span>
          </div>
          <div className="text-blue-500 font-bold text-xl">
            {userCount.toLocaleString()} users online
          </div>
        </div>

        {/* Start Chat Button */}
        <div className="mb-12">
          <button
            onClick={handleStartChat}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:bg-blue-600 text-white text-xl font-semibold px-12 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Start Video Chat
          </button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold text-lg mb-2">Anonymous & Safe</h3>
            <p className="text-gray-600">Your privacy is protected. No registration required to start chatting.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-3">🌍</div>
            <h3 className="font-semibold text-lg mb-2">Global Community</h3>
            <p className="text-gray-600">Connect with people from every corner of the world instantly.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-lg mb-2">Instant Matching</h3>
            <p className="text-gray-600">Advanced matching algorithm finds you the perfect chat partner.</p>
          </div>
        </div>

        {/* Get App Section */}
        <div className="bg-gray-800 text-white p-8 rounded-2xl">
          <h3 className="text-2xl font-bold mb-4">Get the App</h3>
          <p className="text-gray-300 mb-6">Download Chatterly for the best mobile experience</p>
          <div className="flex justify-center gap-4">
            <button className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg flex items-center gap-3 transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.92 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              Google Play
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
