import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

const AuthHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                navigate('/update-password');
            } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.email) {
                // Enforce Email Domain Restriction
                const email = session.user.email;
                const domain = email.split('@')[1]?.toLowerCase();
                const allowedDomains = ['gmail.com', 'gitam.in'];

                if (domain && !allowedDomains.includes(domain)) {
                    await supabase.auth.signOut();
                    alert("Access Restricted: Only @gmail.com and @gitam.in email addresses are allowed.");
                    navigate('/login');
                }
            }
        });

        return () => {
            if (authListener && authListener.subscription) {
                authListener.subscription.unsubscribe();
            }
        };
    }, [navigate]);

    return null;
};

export default AuthHandler;
