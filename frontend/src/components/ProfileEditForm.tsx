"use client";

import { useState } from "react";
import { getApiUrl, getAuthToken, User } from "../utils/auth";

interface ProfileEditFormProps {
  user: User;
  onUserUpdate: (updatedUser: Partial<User>) => void;
}

export default function ProfileEditForm({ user, onUserUpdate }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    gender: user.gender || 'male',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${getApiUrl()}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update parent component
      onUserUpdate(data.user);
      
      setSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Edit Profile</h3>
        <p className="text-gray-600">Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            required
            minLength={2}
            maxLength={50}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="px-4 py-3 bg-gray-50 rounded-lg border">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              user.type === 'pro' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {user.email}
            </span>
            
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender
          </label>
          <div className="px-4 py-3 bg-gray-50 rounded-lg border">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              user.type === 'pro' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {user.gender === 'male' ? 'Male' : user.gender === 'female' ? 'Female' : 'Other'}
            </span>
            
          </div>
          {/* <select
          disabled
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select> */}
        </div>

        {/* Account Type Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Type
          </label>
          <div className="px-4 py-3 bg-gray-50 rounded-lg border">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              user.type === 'pro' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {user.type === 'pro' ? '⭐ PRO Member' : '🆓 Free Account'}
            </span>
            {user.type === 'free' && (
              <p className="text-sm text-gray-500 mt-1">
                Upgrade to PRO for enhanced features and better matching
              </p>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
