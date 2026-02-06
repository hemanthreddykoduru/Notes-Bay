import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

const AuthHandler = () => {
    const navigate = useNavigate();
    const sessionTokenRef = useRef(localStorage.getItem('notesbay_session_token'));

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
                    alert("Access Restricted: Only @gmail.com, @gitam.in, @yahoo.com, and @outlook.com email addresses are allowed.");
                    window.location.href = '/login';
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
                    sessionTokenRef.current = localStorage.getItem('notesbay_session_token');
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
                                alert("You have been logged out because this account was logged in on another device.");
                                window.location.href = '/login'; // Force hard reload to clear skeletons/state
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

    return null;
};

export default AuthHandler;
