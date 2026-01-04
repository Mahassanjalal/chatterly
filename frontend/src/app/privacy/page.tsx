"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: January 2025</p>
        </div>

        <div className="prose prose-purple max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Chatterly ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our video chat service.
            </p>
            <p className="text-gray-700 mb-4">
              Please read this privacy policy carefully. By using Chatterly, you agree to the collection and use of 
              information in accordance with this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-700 mb-4">When you register for an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Email address</li>
              <li>Name or username</li>
              <li>Password (encrypted)</li>
              <li>Gender (optional)</li>
              <li>Account preferences</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Usage Information</h3>
            <p className="text-gray-700 mb-4">We automatically collect certain information when you use our Service:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Device information (type, operating system, browser)</li>
              <li>IP address and approximate location</li>
              <li>Connection timestamps and duration</li>
              <li>Usage patterns and preferences</li>
              <li>Technical data (WebRTC connection quality, errors)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Video and Chat Content</h3>
            <p className="text-gray-700 mb-4">
              <strong>Important:</strong> Video and audio communications are peer-to-peer encrypted and are NOT 
              stored on our servers. We do not record, save, or monitor your video conversations except:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Automated safety scanning for inappropriate content (real-time, not stored)</li>
              <li>When reported by users for moderation review (temporary storage for investigation)</li>
              <li>Text chat messages may be temporarily stored for moderation purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-4">We use the collected information for:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Providing and maintaining the Service</li>
              <li>Matching you with other users based on preferences</li>
              <li>Authenticating your identity and managing your account</li>
              <li>Detecting and preventing abuse, fraud, and illegal activity</li>
              <li>Enforcing our Terms of Service</li>
              <li>Improving and optimizing the Service</li>
              <li>Sending important service notifications</li>
              <li>Responding to your requests and support inquiries</li>
              <li>Analyzing usage trends and gathering demographic information</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Share Your Information</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information. We may share information in the following circumstances:
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 With Other Users</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Your display name or username during chats</li>
              <li>Your gender preference (if you choose to share)</li>
              <li>Connection status (online/offline)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 With Service Providers</h3>
            <p className="text-gray-700 mb-4">
              We work with third-party service providers who help us operate the Service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Cloud hosting services (AWS, Google Cloud, etc.)</li>
              <li>Database providers (MongoDB Atlas, Redis Cloud)</li>
              <li>Email service providers (SendGrid, etc.)</li>
              <li>Analytics providers (Google Analytics, Mixpanel)</li>
              <li>Content moderation services</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 For Legal Reasons</h3>
            <p className="text-gray-700 mb-4">We may disclose your information if required to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Comply with legal obligations or court orders</li>
              <li>Protect our rights, property, or safety</li>
              <li>Investigate potential violations of our Terms</li>
              <li>Prevent fraud or illegal activity</li>
              <li>Cooperate with law enforcement</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>End-to-end encryption for video/audio (WebRTC)</li>
              <li>HTTPS/TLS encryption for all data in transit</li>
              <li>Encrypted storage for sensitive data</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication measures</li>
              <li>Automated threat detection and prevention</li>
            </ul>
            <p className="text-gray-700 mb-4">
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your 
              information, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your information only as long as necessary for the purposes outlined in this Privacy Policy:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Account information: Until you delete your account, plus 30 days</li>
              <li>Usage logs: 90 days</li>
              <li>Security logs: 1 year</li>
              <li>Reported content: Until moderation review is complete</li>
              <li>Text chat messages: Not stored permanently (session only)</li>
              <li>Video/audio: Not stored (peer-to-peer only)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-700 mb-4">Depending on your location, you may have the following rights:</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 GDPR Rights (EU/EEA Users)</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate information</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Restriction:</strong> Limit how we use your data</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Withdraw consent:</strong> Withdraw previously given consent</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 CCPA Rights (California Users)</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Know what personal information is collected</li>
              <li>Know if personal information is sold or disclosed</li>
              <li>Access your personal information</li>
              <li>Request deletion of personal information</li>
              <li>Opt-out of the sale of personal information (we don't sell data)</li>
              <li>Non-discrimination for exercising your rights</li>
            </ul>

            <p className="text-gray-700 mb-4">
              To exercise these rights, contact us at <a href="mailto:privacy@chatterly.com" className="text-purple-600 hover:text-purple-700">privacy@chatterly.com</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-4">
              We use cookies and similar tracking technologies to track activity on our Service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li><strong>Essential cookies:</strong> Required for the Service to function</li>
              <li><strong>Analytics cookies:</strong> Help us understand how you use the Service</li>
              <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-700 mb-4">
              You can control cookies through your browser settings. Note that disabling cookies may limit 
              functionality of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our Service is not intended for users under 18 years of age. We do not knowingly collect personal 
              information from children under 18. If we discover that a child under 18 has provided us with personal 
              information, we will delete it immediately.
            </p>
            <p className="text-gray-700 mb-4">
              If you are a parent or guardian and believe your child has provided us with personal information, 
              please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your information may be transferred to and processed in countries other than your country of residence. 
              These countries may have different data protection laws. We ensure appropriate safeguards are in place 
              to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last updated" date</li>
              <li>Sending an email notification for material changes</li>
              <li>Displaying a prominent notice on the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <ul className="list-none space-y-2 text-gray-700">
              <li><strong>Email:</strong> privacy@chatterly.com</li>
              <li><strong>Data Protection Officer:</strong> dpo@chatterly.com</li>
              <li><strong>Website:</strong> www.chatterly.com/support</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> This Privacy Policy complies with GDPR, CCPA, and other major privacy 
              regulations. Users in specific jurisdictions may have additional rights under local laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
