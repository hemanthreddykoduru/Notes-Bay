import { useEffect, useState } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import MyPurchasesSkeleton from '../components/skeletons/MyPurchasesSkeleton';

export default function MyPurchases() {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // We need an endpoint to get user's purchases with note details
            // Since we didn't create a specific relation in the backend API yet for "purchases expanded"
            // We can either create a new endpoint or use Supabase client directly if RLS allows.
            // Let's use Supabase client directly for reading purchases as we set up RLS.
            // But we need to join with notes.

            const { data, error } = await supabase
                .from('purchases')
                .select(`
            *,
            notes (
                id,
                title,
                subject,
                file_url
            )
        `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPurchases(data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <MyPurchasesSkeleton />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Purchases</h1>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {purchases.length > 0 ? (
                        purchases.map((purchase) => (
                            <li key={purchase.id}>
                                <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-indigo-600">
                                            {purchase.notes.title}
                                        </h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                            {purchase.notes.subject}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Purchased on {new Date(purchase.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex space-x-4">
                                        <Link
                                            to={`/notes/${purchase.notes.id}`}
                                            className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                            <FileText className="h-4 w-4 mr-1" />
                                            View Note
                                        </Link>
                                    </div>
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-4 sm:px-6 text-gray-500">
                            You haven't purchased any notes yet.
                            <Link to="/" className="ml-2 text-indigo-600 hover:text-indigo-800">Browse Notes</Link>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
