import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { LogOut } from 'lucide-react';

const AuthHandler = () => {
    const navigate = useNavigate();
    const sessionTokenRef = useRef(localStorage.getItem('notesbay_session_token'));
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

                // B. Single Session Enforcement (Last Login Wins)
                if (event === 'SIGNED_IN') {
                    // Start of a FRESH login (not a reload) -> Generate new token
                    const newToken = crypto.randomUUID();
                    localStorage.setItem('notesbay_session_token', newToken);
                    sessionTokenRef.current = newToken;

                    // Update DB with this new token
                    await supabase.from('profiles').upsert({
                        id: session.user.id,
                        email: session.user.email,
                        active_session_id: newToken
                    });
                } else if (event === 'INITIAL_SESSION') {
                    // Page reload -> Use existing token from localStorage
                    // BUT: We must also check if this token is still valid in the DB!
                    const currentToken = localStorage.getItem('notesbay_session_token');
                    sessionTokenRef.current = currentToken;

                    if (session.user.id) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('active_session_id')
                            .eq('id', session.user.id)
                            .single();

                        if (profile && profile.active_session_id && profile.active_session_id !== currentToken) {
                            // Immediate UI update
                            localStorage.removeItem('notesbay_session_token');
                            setLogoutReason("You have been logged out because this account was logged in on another device.");
                            setShowLogoutModal(true);

                            // Background cleanup
                            supabase.auth.signOut().catch(console.error);
                            return;
                        }
                    }
                }

                // C. Subscribe to Profile Changes (Realtime Lockout)
                const channel = supabase
                    .channel(`public:profiles:${session.user.id}`)
                    .on('postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'profiles',
                            filter: `id=eq.${session.user.id}`
                        },
                        async (payload) => {
                            const newActiveSessionId = payload.new.active_session_id;
                            const mySessionToken = localStorage.getItem('notesbay_session_token');

                            // If DB says a DIFFERENT session is active, logout this one
                            if (newActiveSessionId && newActiveSessionId !== mySessionToken) {
                                // Immediate UI update
                                localStorage.removeItem('notesbay_session_token'); // Clear my token
                                setLogoutReason("You have been logged out because this account was logged in on another device.");
                                setShowLogoutModal(true);

                                // Background cleanup
                                supabase.auth.signOut().catch(console.error);
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
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
                            Session Expired
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
