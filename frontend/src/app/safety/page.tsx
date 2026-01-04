"use client";

import Link from "next/link";
import Footer from "../../components/Footer";

export default function SafetyCenter() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="flex-grow py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/" className="text-purple-600 hover:text-purple-700 flex items-center gap-2 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900">Safety Center</h1>
            </div>
            <p className="text-gray-600">Your safety is our top priority. Learn how we keep Chatterly safe for everyone.</p>
          </div>

          {/* Safety Features */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">End-to-End Encryption</h3>
              <p className="text-gray-600">
                All video and audio streams use WebRTC encryption. Your conversations are private and secure.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Age Verification</h3>
              <p className="text-gray-600">
                All users must be 18+. We verify ages and remove underage accounts immediately.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Moderation</h3>
              <p className="text-gray-600">
                Automated systems detect and prevent inappropriate content in real-time.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Report & Block</h3>
              <p className="text-gray-600">
                Instantly report inappropriate behavior and block users. Our team reviews all reports.
              </p>
            </div>
          </div>

          {/* Safety Tips */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Safety Tips</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Never share personal information",
                  description: "Don't share your full name, address, phone number, email, or social media accounts.",
                  icon: "🔒"
                },
                {
                  title: "Be respectful",
                  description: "Treat others how you want to be treated. Harassment and hate speech are not tolerated.",
                  icon: "🤝"
                },
                {
                  title: "Report inappropriate behavior",
                  description: "If someone makes you uncomfortable, report them immediately and end the chat.",
                  icon: "⚠️"
                },
                {
                  title: "Don't meet strangers in person",
                  description: "Chatterly is for online conversations only. Never arrange to meet users offline.",
                  icon: "❌"
                },
                {
                  title: "Keep conversations on Chatterly",
                  description: "Don't move conversations to other platforms where we can't protect you.",
                  icon: "💬"
                },
                {
                  title: "Trust your instincts",
                  description: "If something feels wrong, end the chat immediately. Your safety comes first.",
                  icon: "🎯"
                },
                {
                  title: "No screenshots or recordings",
                  description: "Respect others' privacy. Recording or screenshotting without consent may be illegal.",
                  icon: "📸"
                },
                {
                  title: "Be aware of scams",
                  description: "Never send money or financial information to people you meet online.",
                  icon: "💰"
                }
              ].map((tip, index) => (
                <div key={index} className="flex gap-4 p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl flex-shrink-0">{tip.icon}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{tip.title}</h3>
                    <p className="text-gray-600 text-sm">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to Report */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Report Abuse</h2>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">During a Chat</h4>
                  <p className="text-gray-600">Click the warning icon (⚠️) in the chat header.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Select Report Reason</h4>
                  <p className="text-gray-600">Choose the most appropriate category for the violation.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Submit Report</h4>
                  <p className="text-gray-600">Our moderation team will review within 24 hours.</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              For urgent safety issues, email <a href="mailto:safety@chatterly.com" className="text-red-600 font-semibold hover:underline">safety@chatterly.com</a>
            </p>
          </div>

          {/* Emergency Resources */}
          <div className="bg-gray-900 text-white rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Emergency Resources</h2>
            <p className="mb-6 text-gray-300">
              If you're in immediate danger or have experienced a serious crime, contact local authorities:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2">🇺🇸 United States</h3>
                <p>Emergency: 911</p>
                <p>Cyber Tipline: 1-800-843-5678</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2">🇬🇧 United Kingdom</h3>
                <p>Emergency: 999</p>
                <p>CEOP: ceop.police.uk/safety-centre</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2">🇪🇺 European Union</h3>
                <p>Emergency: 112</p>
                <p>Europol: europol.europa.eu</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2">🌍 International</h3>
                <p>INHOPE Hotline</p>
                <p>inhope.org</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
