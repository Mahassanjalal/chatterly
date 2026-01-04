"use client";

import { useState } from "react";
import Link from "next/link";
import Footer from "../../components/Footer";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Is Chatterly really free to use?",
    answer: "Yes! Chatterly offers a free tier that allows you to connect with random strangers worldwide. We also offer a Pro subscription with additional features like advanced gender preferences and priority matching."
  },
  {
    question: "Is my video chat private and secure?",
    answer: "Absolutely. We use end-to-end encryption (WebRTC) for all video and audio streams. Your conversations are peer-to-peer, meaning they go directly between you and your chat partner without being stored on our servers."
  },
  {
    question: "Do you record or save my video conversations?",
    answer: "No. Video and audio streams are not recorded or stored. We only use automated systems to scan for inappropriate content in real-time to keep the platform safe, but these scans do not save your conversations."
  },
  {
    question: "What if I encounter inappropriate behavior?",
    answer: "You can immediately end the chat and report the user. Click the report button during any chat, and our moderation team will review the report. Repeat offenders are permanently banned from the platform."
  },
  {
    question: "Do I need to create an account?",
    answer: "Yes, an account is required to use Chatterly. This helps us maintain a safer community and allows you to customize your preferences. Registration is quick and only requires an email address."
  },
  {
    question: "What are the age requirements?",
    answer: "You must be at least 18 years old to use Chatterly. We take age verification seriously and may request proof of age. Anyone found to be under 18 will have their account terminated."
  },
  {
    question: "How does the matching system work?",
    answer: "Our intelligent matching algorithm considers your gender preferences, location (optional), and connection quality to find you the best chat partners. Pro users get priority matching and more control over preferences."
  },
  {
    question: "Can I choose who I chat with?",
    answer: "Chatterly is designed for random matching, but you can set gender preferences. If you don't like your current match, you can skip to the next person (with cooldown periods to prevent abuse)."
  },
  {
    question: "What should I do if my camera or microphone isn't working?",
    answer: "First, make sure you've granted Chatterly permission to access your camera and microphone in your browser settings. Try refreshing the page or restarting your browser. If issues persist, check our troubleshooting guide or contact support."
  },
  {
    question: "Can I use Chatterly on my mobile device?",
    answer: "Yes! Chatterly works on mobile browsers (Chrome, Safari, etc.). For the best experience, we recommend using the latest version of your mobile browser. Native mobile apps are coming soon!"
  },
  {
    question: "What are the Pro features?",
    answer: "Pro subscribers get: No ads, priority matching, advanced gender preferences, HD video quality, and custom filters. Pro users also support the platform and help us keep the free tier available."
  },
  {
    question: "How do I delete my account?",
    answer: "Go to your Profile > Settings > Account > Delete Account. This will permanently remove all your data from our systems within 30 days, in compliance with GDPR and data protection regulations."
  },
  {
    question: "What languages does Chatterly support?",
    answer: "Currently, Chatterly's interface is in English, but you can chat with people who speak any language. We're working on adding more interface languages and real-time chat translation features."
  },
  {
    question: "Is there a time limit on chats?",
    answer: "No, you can chat as long as both parties want to continue. However, we do have idle timeout features to prevent inactive connections from using server resources."
  },
  {
    question: "Can I block someone?",
    answer: "Yes, you can block users to prevent future matches with them. Go to your account settings to manage your blocked users list."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
            <p className="text-gray-600">Find answers to common questions about Chatterly</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center gap-4 hover:bg-purple-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 flex-1">
                    {faq.question}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-purple-600 transition-transform duration-200 flex-shrink-0 ${
                      openIndex === index ? 'transform rotate-180' : ''
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4 text-gray-700 animate-slideDown">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="mb-6">Our support team is here to help!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/contact"
                className="bg-white text-purple-600 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Contact Support
              </Link>
              <a 
                href="mailto:support@chatterly.com"
                className="bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-8 rounded-lg hover:bg-white/30 transition-colors"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
