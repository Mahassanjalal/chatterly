"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("chatterly_cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("chatterly_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("chatterly_cookie_consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-2xl animate-slideUp">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700">
          <p>
            We use cookies to enhance your experience, analyze site traffic, and for security purposes. 
            By clicking &quot;Accept&quot;, you agree to our use of cookies as described in our{" "}
            <Link href="/privacy" className="text-purple-600 hover:underline font-medium">
              Privacy Policy
            </Link>.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <button
            onClick={handleDecline}
            className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-md hover:shadow-lg transition-all"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
