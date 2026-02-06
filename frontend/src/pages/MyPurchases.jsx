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
        let mounted = true;
        setLoading(true);

        // Failsafe: Force stop loading after 3 seconds
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                setLoading((prev) => {
                    if (prev) {
                        console.warn("MyPurchases fetch timed out safely.");
                        return false;
                    }
                    return prev;
                });
            }
        }, 3000);

        const fetchPurchases = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return; // Protected route usually handles this, but good to be safe.

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
                if (mounted) setPurchases(data);
            } catch (error) {
                console.error('Error fetching purchases:', error);
            } finally {
                if (mounted) {
                    clearTimeout(safetyTimer);
                    setLoading(false);
                }
            }
        };

        fetchPurchases();

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
        };
    }, []);

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
