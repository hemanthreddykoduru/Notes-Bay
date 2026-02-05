import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import GenericPageSkeleton from './skeletons/GenericPageSkeleton';

export default function ProtectedRoute({ children }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                navigate('/login');
            }
            setLoading(false);
        });
    }, [navigate]);

    if (loading) return <GenericPageSkeleton />;

    return children;
}
