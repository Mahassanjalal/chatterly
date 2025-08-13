"use client";

import React, { useState } from "react";

interface AuthFormProps {
  type: "login" | "register";
  onSubmit: (data: { email: string; password: string; name?: string; gender?: 'male' | 'female' | 'other'; userType?: 'free' | 'pro' }) => void;
  loading?: boolean;
  error?: string;
}

export default function AuthForm({ type, onSubmit, loading, error }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [userType, setUserType] = useState<'free' | 'pro'>('free');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      email, 
      password, 
      name: type === "register" ? name : undefined,
      gender: type === "register" ? gender : undefined,
      userType: type === "register" ? userType : undefined
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm mx-auto bg-white/60 backdrop-blur-lg rounded-xl shadow-xl p-8 flex flex-col gap-6 animate-fadeIn"
    >
      <h2 className="text-2xl font-bold text-center text-purple-700 mb-2 animate-slideDown">
        {type === "login" ? "Welcome Back!" : "Create Your Account"}
      </h2>
      {type === "register" && (
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="input-animated"
          required
          minLength={2}
          maxLength={50}
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="input-animated"
        required
      />
      <input
        type="password"
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="input-animated"
        required
        minLength={8}
        maxLength={100}
      />

      {type === "register" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value as 'male' | 'female' | 'other')}
              className="input-animated"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
            <select
              value={userType}
              onChange={e => setUserType(e.target.value as 'free' | 'pro')}
              className="input-animated"
            >
              <option value="free">🆓 Free Account</option>
              <option value="pro">⭐ PRO Account</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {userType === 'free' 
                ? 'Limited gender preferences, 80% same gender matches' 
                : 'Full gender preferences, 80% opposite gender matches'
              }
            </p>
          </div>
        </>
      )}

      {error && <div className="text-red-500 text-center animate-shake">{error}</div>}
      <button
        type="submit"
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-2 rounded-lg shadow-lg hover:scale-105 transition-transform duration-200 animate-pop"
        disabled={loading}
      >
        {loading ? "Please wait..." : type === "login" ? "Login" : "Register"}
      </button>
    </form>
  );
}
