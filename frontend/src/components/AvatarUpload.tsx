"use client";

import React, { useState, useRef, useCallback } from "react";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName: string;
  onAvatarChange: (avatarUrl: string | null) => void;
}

// Generate a simple avatar placeholder
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Random gradient backgrounds for default avatars
const AVATAR_GRADIENTS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-rose-500",
];

const getGradientForName = (name: string): string => {
  // Use name to deterministically pick a gradient
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

export default function AvatarUpload({
  currentAvatar,
  userName,
  onAvatarChange,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to upload avatar');
      }

      const data = await response.json();
      onAvatarChange(data.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
      setPreviewUrl(currentAvatar || null);
    } finally {
      setIsUploading(false);
    }
  }, [currentAvatar, onAvatarChange]);

  // Handle avatar removal
  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove avatar');
      }

      setPreviewUrl(null);
      onAvatarChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const gradient = getGradientForName(userName);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative group">
        <div
          className={`w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg ${
            !previewUrl ? `bg-gradient-to-br ${gradient}` : ''
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
              {getInitials(userName)}
            </div>
          )}
        </div>

        {/* Upload overlay */}
        <button
          onClick={triggerFileInput}
          disabled={isUploading}
          className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={triggerFileInput}
          disabled={isUploading}
          className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors disabled:text-gray-400"
        >
          {previewUrl ? 'Change Photo' : 'Upload Photo'}
        </button>
        {previewUrl && (
          <button
            onClick={handleRemoveAvatar}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors disabled:text-gray-400"
          >
            Remove
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 text-center">
        Recommended: Square image, at least 200x200 pixels.<br />
        Max file size: 5MB. Formats: JPEG, PNG, GIF, WebP
      </p>
    </div>
  );
}
