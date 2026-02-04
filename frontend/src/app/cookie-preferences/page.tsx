"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

// Cookie categories
interface CookiePreferences {
  essential: boolean;       // Always enabled, cannot be disabled
  functional: boolean;      // Remember preferences, language, etc.
  analytics: boolean;       // Usage analytics, performance tracking
  marketing: boolean;       // Advertising and marketing cookies
}

const defaultPreferences: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: false,
  marketing: false,
};

// Cookie descriptions for each category
const cookieDescriptions = {
  essential: {
    title: "Essential Cookies",
    description: "These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions made by you such as setting your privacy preferences, logging in, or filling in forms.",
    examples: ["Session cookies", "Authentication tokens", "Security cookies", "Load balancing"],
  },
  functional: {
    title: "Functional Cookies",
    description: "These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third party providers whose services we have added to our pages.",
    examples: ["Language preferences", "Theme preferences", "Chat history", "User settings"],
  },
  analytics: {
    title: "Analytics Cookies",
    description: "These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us know which pages are the most and least popular and see how visitors move around the site.",
    examples: ["Google Analytics", "Performance monitoring", "Error tracking", "Usage statistics"],
  },
  marketing: {
    title: "Marketing Cookies",
    description: "These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites.",
    examples: ["Advertising cookies", "Social media cookies", "Retargeting cookies", "Third-party trackers"],
  },
};

export default function CookiePreferencesPage() {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem("chatterly_cookie_preferences");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({ ...defaultPreferences, ...parsed, essential: true });
      } catch {
        // Use defaults if parsing fails
      }
    }
    setIsLoading(false);
  }, []);

  // Handle preference change
  const handleToggle = (category: keyof CookiePreferences) => {
    if (category === "essential") return; // Cannot disable essential cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
    setIsSaved(false);
  };

  // Save preferences
  const handleSave = () => {
    localStorage.setItem("chatterly_cookie_preferences", JSON.stringify(preferences));
    localStorage.setItem("chatterly_cookie_consent", "customized");
    setIsSaved(true);
    
    // Show success message briefly
    setTimeout(() => setIsSaved(false), 3000);
    
    // Apply cookie preferences (in a real app, this would enable/disable tracking)
    applyCookiePreferences(preferences);
  };

  // Accept all cookies
  const handleAcceptAll = () => {
    const allEnabled: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allEnabled);
    localStorage.setItem("chatterly_cookie_preferences", JSON.stringify(allEnabled));
    localStorage.setItem("chatterly_cookie_consent", "accepted");
    setIsSaved(true);
    applyCookiePreferences(allEnabled);
  };

  // Reject all optional cookies
  const handleRejectAll = () => {
    const onlyEssential: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(onlyEssential);
    localStorage.setItem("chatterly_cookie_preferences", JSON.stringify(onlyEssential));
    localStorage.setItem("chatterly_cookie_consent", "declined");
    setIsSaved(true);
    applyCookiePreferences(onlyEssential);
  };

  // Apply cookie preferences (disable/enable tracking scripts)
  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // In a real implementation, this would:
    // - Enable/disable Google Analytics
    // - Enable/disable marketing pixels
    // - Configure third-party services
    console.log("Applying cookie preferences:", prefs);
    
    // Example: Toggle analytics
    if (typeof window !== "undefined") {
      if (prefs.analytics) {
        // Enable analytics (in production, initialize Google Analytics here)
        (window as Window & { analyticsEnabled?: boolean }).analyticsEnabled = true;
      } else {
        // Disable analytics
        (window as Window & { analyticsEnabled?: boolean }).analyticsEnabled = false;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Chatterly
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Cookie Preferences</h1>
          <p className="text-gray-600">
            Manage how we use cookies to improve your experience on Chatterly
          </p>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Introduction */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">About Cookies</h2>
            <p className="text-gray-600 text-sm">
              Cookies are small text files that are placed on your device when you visit our website. 
              They help us provide you with a better experience and allow certain features to work. 
              You can choose which cookies you want to allow below.
            </p>
          </div>

          {/* Cookie categories */}
          <div className="divide-y divide-gray-200">
            {(Object.keys(cookieDescriptions) as Array<keyof typeof cookieDescriptions>).map((category) => (
              <div key={category} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {cookieDescriptions[category].title}
                      </h3>
                      {category === "essential" && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      {cookieDescriptions[category].description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cookieDescriptions[category].examples.map((example, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Toggle */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleToggle(category)}
                      disabled={category === "essential"}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences[category]
                          ? "bg-purple-600"
                          : "bg-gray-300"
                      } ${category === "essential" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences[category] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Reject All Optional
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  Accept All
                </button>
              </div>
              
              <button
                onClick={handleSave}
                className={`px-6 py-2 text-sm font-medium text-white rounded-full shadow-md transition-all ${
                  isSaved
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg"
                }`}
              >
                {isSaved ? "✓ Preferences Saved" : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>

        {/* Additional information */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">
            For more information about how we use cookies, please see our{" "}
            <Link href="/privacy" className="text-purple-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            You can change your preferences at any time by returning to this page.
          </p>
        </div>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
