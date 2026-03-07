import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-8 text-white sm:px-10">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/" className="hover:bg-emerald-700 p-2 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-emerald-100">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-8 sm:px-10 space-y-8 text-gray-600">
          
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              Welcome to ZedPOS. We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and share information when you use the ZedPOS mobile application and website (the "Service").
            </p>``
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information to provide and improve our Service:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, and business details when you register.</li>
              <li><strong>Business Data:</strong> Inventory items, sales transactions, and customer details that you input into the Point of Sale system.</li>
              <li><strong>Usage Data:</strong> Diagnostic data, app performance metrics, and device information to help us troubleshoot bugs and improve the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use the collected data for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, maintain, and secure the ZedPOS system.</li>
              <li>To sync your sales and inventory data securely to the cloud (via Supabase).</li>
              <li>To authenticate users and manage staff roles (Owner, Cashier, etc.).</li>
              <li>To provide customer support and respond to your requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Sharing and Third Parties</h2>
            <p>
              We do not sell your personal or business data. We only share data with trusted third-party service providers necessary to operate the Service, such as cloud hosting providers (Vercel) and database infrastructure (Supabase), which are bound by strict data security standards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Retention and Deletion</h2>
            <p>
              We retain your data for as long as your account is active. You have the right to request the deletion of your account and all associated business data at any time. To request data deletion, please contact us at the email address provided below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Security</h2>
            <p>
              We implement industry-standard security measures, including encryption in transit and at rest, to protect your data. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at: <br/><br/>
              <strong>Email:</strong> thezedpos@gmail.com <br/>
              <strong>Developer:</strong> CHIMESI
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}