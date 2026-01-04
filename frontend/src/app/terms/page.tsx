"use client";

import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-8">
          <Link href="/" className="text-purple-600 hover:text-purple-700 flex items-center gap-2 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600">Last updated: January 2025</p>
        </div>

        <div className="prose prose-purple max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using Chatterly ("the Service"), you accept and agree to be bound by the terms and 
              provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              Chatterly is a random video chat platform that connects users worldwide for spontaneous video and text 
              conversations. The Service provides WebRTC-based peer-to-peer video connections and text chat functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Conduct and Responsibilities</h2>
            <p className="text-gray-700 mb-4">You agree to use the Service only for lawful purposes. You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Engage in any illegal, harmful, or abusive behavior</li>
              <li>Share explicit, obscene, or inappropriate content</li>
              <li>Harass, threaten, or intimidate other users</li>
              <li>Impersonate any person or entity</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Share personal information of others without consent</li>
              <li>Use the Service if you are under 18 years of age</li>
              <li>Record or screenshot conversations without explicit consent</li>
              <li>Use bots, scripts, or automated tools to access the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Age Requirements</h2>
            <p className="text-gray-700 mb-4">
              You must be at least 18 years old to use Chatterly. By using the Service, you represent and warrant 
              that you are 18 years of age or older. We reserve the right to request proof of age and terminate 
              accounts that violate this requirement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Privacy and Data Protection</h2>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, 
              and protect your personal information. By using the Service, you consent to our data practices as 
              described in the Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Content Moderation</h2>
            <p className="text-gray-700 mb-4">
              We employ automated and manual moderation systems to maintain a safe environment. We reserve the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Monitor video and text content for violations</li>
              <li>Terminate connections that violate our guidelines</li>
              <li>Ban users who repeatedly violate our terms</li>
              <li>Cooperate with law enforcement when necessary</li>
              <li>Remove or restrict access to any content at our discretion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              The Service and its original content, features, and functionality are owned by Chatterly and are 
              protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimers and Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE 
              THE ACCURACY, RELIABILITY, OR AVAILABILITY OF THE SERVICE. WE ARE NOT RESPONSIBLE FOR THE CONDUCT OF 
              OTHER USERS OR ANY CONTENT SHARED THROUGH THE SERVICE.
            </p>
            <p className="text-gray-700 mb-4">
              IN NO EVENT SHALL CHATTERLY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE 
              DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Account Termination</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to terminate or suspend your account and access to the Service immediately, without 
              prior notice or liability, for any reason, including but not limited to breach of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will 
              provide at least 30 days notice prior to any new terms taking effect. Continued use of the Service after 
              changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], 
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <ul className="list-none space-y-2 text-gray-700">
              <li><strong>Email:</strong> legal@chatterly.com</li>
              <li><strong>Website:</strong> www.chatterly.com/support</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Important Notice:</strong> By clicking "I Accept" or using the Service, you acknowledge that 
              you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
