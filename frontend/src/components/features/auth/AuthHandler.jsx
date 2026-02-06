import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { LogOut } from 'lucide-react';

const AuthHandler = () => {
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutReason, setLogoutReason] = useState('');

    useEffect(() => {
        // 1. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                navigate('/update-password');
            }

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.email) {
                // A. Email Domain Validation
                const email = session.user.email;
                const domain = email.split('@')[1]?.toLowerCase();
                const allowedDomains = ['gmail.com', 'gitam.in', 'yahoo.com', 'outlook.com'];

                if (domain && !allowedDomains.includes(domain)) {
                    await supabase.auth.signOut();
                    setLogoutReason("Access Restricted: Only @gmail.com, @gitam.in, @yahoo.com, and @outlook.com email addresses are allowed.");
                    setShowLogoutModal(true);
                    return;
                }
            }
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [navigate]);

    return (
        <>
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-8 text-center transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-6">
                            <LogOut className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                            {logoutReason.includes('Restricted') ? 'Access Restricted' : 'Session Expired'}
                        </h3>
                        <p className="text-base text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            {logoutReason}
                        </p>
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="w-full inline-flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-500/20 transition-all duration-200"
                        >
                            Log in Again
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default AuthHandler;
