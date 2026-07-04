import React from 'react';
import { CreditCard, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

const CancellationRefund = () => {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                    Cancellation & Refund Policy
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    Last updated: {new Date().toLocaleDateString()}
                </p>
            </div>

            <div className="space-y-8">

                {/* Overview */}
                <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                            <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Policy Overview</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        At StudentNotes, we strive to provide high-quality digital educational resources. Due to the digital nature of our products (instant access/download), our refund and cancellation policies are strict to prevent abuse. However, we are committed to fair treatment and will work with you to resolve legitimate issues.
                    </p>
                </section>

                {/* Cancellation Policy */}
                <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Cancellation Policy</h2>
                    </div>
                    <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Subscription Services</h3>
                        <p>
                            If you have subscribed to a recurring payment plan:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>You may cancel your subscription at any time through your account settings or by contacting support.</li>
                            <li>Your cancellation will take effect at the end of the current billing cycle.</li>
                            <li>You will retain access to subscriber features until the current period expires.</li>
                            <li>We do not provide partial refunds for unused time in the current billing cycle.</li>
                        </ul>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">One-Time Purchases</h3>
                        <p>
                            For one-time purchases of notes or bundles, cancellation is not applicable once the transaction is complete and the content has been delivered/accessed.
                        </p>
                    </div>
                </section>

                {/* Refund Policy */}
                <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Refund Policy</h2>
                    </div>
                    <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                        <p>
                            We generally do not offer refunds for digital products once they have been accessed or downloaded. However, we may offer a refund under the following exceptional circumstances:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li><strong>Technical Defect:</strong> If the file is corrupt or technically defective and we cannot resolve the issue within 48 hours.</li>
                            <li><strong>Duplicate Purchase:</strong> If you accidentally purchased the same item twice.</li>
                            <li><strong>Misrepresentation:</strong> If the content is significantly different from the description provided.</li>
                        </ul>
                        <p className="mt-4">
                            Refund requests must be made within <strong>7 days</strong> of the original purchase. To request a refund, please contact our support team with your order details and reason for the request.
                        </p>
                    </div>
                </section>

                {/* Contact Support */}
                <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                            <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Need Help?</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        If you have any questions about our Cancellation and Refund Policy, please contact us:
                    </p>
                    <ul className="ml-4 mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                        <li>Email: contact@notesbay.com</li>
                        <li>Phone: +91 98765 43210</li>
                    </ul>
                </section>

            </div>
        </div>
    );
};

export default CancellationRefund;
