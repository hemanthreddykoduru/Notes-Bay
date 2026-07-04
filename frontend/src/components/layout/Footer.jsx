import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Brand Info */}
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center space-x-2">
                            <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xl font-bold text-gray-900 dark:text-white">NotesBay</span>
                        </Link>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Your one-stop destination for premium study materials. Ace your exams with high-quality notes from top students.
                        </p>
                        <div className="flex space-x-4 pt-2">
                            <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                <Linkedin className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Home</Link>
                            </li>
                            <li>
                                <Link to="/pricing" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Pricing</Link>
                            </li>
                            <li>
                                <Link to="/my-purchases" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">My Purchases</Link>
                            </li>
                            <li>
                                <Link to="/wishlist" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Wishlist</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support & Legal */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Support</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/support" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Contact Us</Link>
                            </li>
                            <li>
                                <Link to="/terms-of-service" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Terms of Service</Link>
                            </li>
                            <li>
                                <Link to="/privacy-policy" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Privacy Policy</Link>
                            </li>
                            <li>
                                <Link to="/cancellation-refund" className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">Refund Policy</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info (Short) */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Contact</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start space-x-3 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span>Gitam University, Bengaluru, India</span>
                            </li>
                            <li className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span>+91 98765 43210</span>
                            </li>
                            <li className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="h-5 w-5 text-indigo-500 shrink-0" />
                                <span>contact@notesbay.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} NotesBay. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
