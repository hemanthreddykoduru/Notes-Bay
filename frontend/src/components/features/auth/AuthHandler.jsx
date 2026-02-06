import { useEffect, useRef } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

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
                            await supabase.auth.signOut();
                            localStorage.removeItem('notesbay_session_token');
                            setLogoutReason("You have been logged out because this account was logged in on another device.");
                            setShowLogoutModal(true);
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
                                await supabase.auth.signOut();
                                localStorage.removeItem('notesbay_session_token'); // Clear my token
                                setLogoutReason("You have been logged out because this account was logged in on another device.");
                                setShowLogoutModal(true);
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Session Expired
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {logoutReason}
                        </p>
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="w-full inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
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
