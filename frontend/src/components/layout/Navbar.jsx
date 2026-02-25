import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { LogOut, User, Menu, X, ShoppingBag, Heart, BookOpen } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('user');
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            else setRole('user');
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
        if (data) setRole(data.role);
    };

    const handleLogout = async () => {
        // Immediate UI feedback
        localStorage.removeItem('notesbay_session_token');
        setUser(null);
        navigate('/login');

        // App cleanup
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <nav className="bg-white dark:bg-gray-800 shadow transition-colors duration-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/home" className="flex-shrink-0 flex items-center">
                            <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">NotesBay</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        <ThemeToggle />

                        {user ? (
                            <>
                                {role === 'admin' && (
                                    <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium">
                                        Admin
                                    </Link>
                                )}
                                <Link to="/home" className="text-gray-900 dark:text-gray-100 px-3 py-2 rounded-md text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                                    Home
                                </Link>
                                <Link to="/pricing" className="text-gray-900 dark:text-gray-100 px-3 py-2 rounded-md text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                                    Subscription
                                </Link>
                                <Link to="/courses" className="text-gray-900 dark:text-gray-100 px-3 py-2 rounded-md text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                                    Courses
                                </Link>
                                <Link to="/my-learning" className="text-gray-900 dark:text-gray-100 px-3 py-2 rounded-md text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                                    My Learning
                                </Link>
                                <Link to="/my-purchases" className="text-gray-900 dark:text-gray-100 px-3 py-2 rounded-md text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                                    My Purchases
                                </Link>
                                <Link to="/wishlist" className="text-gray-900 dark:text-gray-100 px-3 py-2 rounded-md text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                                    Wishlist
                                </Link>

                                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2" aria-hidden="true" />

                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                        <Link to="/account" className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[150px] truncate hover:text-indigo-600 dark:hover:text-indigo-400">
                                            My Account
                                        </Link>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        title="Sign out"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-500"
                            >
                                Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center">
                        <ThemeToggle />
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="ml-4 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {user ? (
                            <>
                                <Link to="/home" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    Home
                                </Link>
                                <Link to="/pricing" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    Subscription
                                </Link>
                                <Link to="/courses" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    Courses
                                </Link>
                                <Link to="/my-learning" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    My Learning
                                </Link>
                                <Link to="/my-purchases" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    My Purchases
                                </Link>
                                <Link to="/wishlist" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    Wishlist
                                </Link>
                                <Link to="/account" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    My Account
                                </Link>
                                {role === 'admin' && (
                                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        Admin Dashboard
                                    </Link>
                                )}
                                <button
                                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-center px-4 py-2 mt-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-medium">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
