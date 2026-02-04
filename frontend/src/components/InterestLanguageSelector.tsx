"use client";

import React, { useState, useRef } from "react";

// Predefined interest categories
const INTEREST_CATEGORIES = {
  "Music": ["Pop", "Rock", "Hip-Hop", "Jazz", "Classical", "EDM", "Country", "R&B", "Metal", "Indie"],
  "Movies & TV": ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Anime", "Documentaries", "Thriller", "Fantasy"],
  "Sports": ["Football", "Basketball", "Soccer", "Tennis", "Gaming", "Swimming", "Running", "Yoga", "Cycling", "Hiking"],
  "Hobbies": ["Reading", "Cooking", "Photography", "Art", "Gaming", "Travel", "Gardening", "DIY", "Fashion", "Writing"],
  "Technology": ["Programming", "AI", "Crypto", "Startups", "Gaming", "Gadgets", "Web Dev", "Mobile Apps", "Data Science", "Cybersecurity"],
  "Lifestyle": ["Fitness", "Meditation", "Veganism", "Minimalism", "Pets", "Nature", "Sustainability", "Self-improvement", "Coffee", "Wine"],
};

// Popular languages
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "id", name: "Indonesian" },
  { code: "sv", name: "Swedish" },
  { code: "fi", name: "Finnish" },
];

interface InterestLanguageSelectorProps {
  interests: string[];
  languages: string[];
  onInterestsChange: (interests: string[]) => void;
  onLanguagesChange: (languages: string[]) => void;
  maxInterests?: number;
  maxLanguages?: number;
}

export default function InterestLanguageSelector({
  interests,
  languages,
  onInterestsChange,
  onLanguagesChange,
  maxInterests = 10,
  maxLanguages = 5,
}: InterestLanguageSelectorProps) {
  const [customInterest, setCustomInterest] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Toggle interest selection
  const toggleInterest = (interest: string) => {
    const normalizedInterest = interest.toLowerCase().trim();
    if (interests.includes(normalizedInterest)) {
      onInterestsChange(interests.filter(i => i !== normalizedInterest));
    } else if (interests.length < maxInterests) {
      onInterestsChange([...interests, normalizedInterest]);
    }
  };

  // Add custom interest
  const addCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInterest.trim() && interests.length < maxInterests) {
      const normalizedInterest = customInterest.toLowerCase().trim();
      if (!interests.includes(normalizedInterest)) {
        onInterestsChange([...interests, normalizedInterest]);
        setCustomInterest("");
      }
    }
  };

  // Toggle language selection
  const toggleLanguage = (languageCode: string) => {
    if (languages.includes(languageCode)) {
      onLanguagesChange(languages.filter(l => l !== languageCode));
    } else if (languages.length < maxLanguages) {
      onLanguagesChange([...languages, languageCode]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Interests Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Interests</h3>
            <p className="text-sm text-gray-500">
              Select up to {maxInterests} interests for better matching ({interests.length}/{maxInterests})
            </p>
          </div>
        </div>

        {/* Selected Interests */}
        {interests.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Selected interests:</p>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1 hover:bg-purple-200 transition-colors"
                >
                  {interest}
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interest Categories */}
        <div className="space-y-3">
          {Object.entries(INTEREST_CATEGORIES).map(([category, categoryInterests]) => (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
              >
                <span className="font-medium text-gray-700">{category}</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${activeCategory === category ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeCategory === category && (
                <div className="p-4 flex flex-wrap gap-2">
                  {categoryInterests.map((interest) => {
                    const isSelected = interests.includes(interest.toLowerCase());
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        disabled={!isSelected && interests.length >= maxInterests}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : interests.length >= maxInterests
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Custom Interest Input */}
        <form onSubmit={addCustomInterest} className="mt-4 flex gap-2">
          <input
            ref={customInputRef}
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            placeholder="Add custom interest..."
            disabled={interests.length >= maxInterests}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
            maxLength={30}
          />
          <button
            type="submit"
            disabled={!customInterest.trim() || interests.length >= maxInterests}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </form>
      </div>

      {/* Languages Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Languages</h3>
            <p className="text-sm text-gray-500">
              Select languages you speak for matching ({languages.length}/{maxLanguages})
            </p>
          </div>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {LANGUAGES.map((language) => {
            const isSelected = languages.includes(language.code);
            return (
              <button
                key={language.code}
                onClick={() => toggleLanguage(language.code)}
                disabled={!isSelected && languages.length >= maxLanguages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-purple-600 text-white'
                    : languages.length >= maxLanguages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {language.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
