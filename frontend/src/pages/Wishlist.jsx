import { useEffect, useState } from 'react';
import api from '../lib/api';
import NoteCard from '../components/features/notes/NoteCard';
import { Heart } from 'lucide-react';

import WishlistSkeleton from '../components/skeletons/WishlistSkeleton';

export default function Wishlist() {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subPrice, setSubPrice] = useState(100);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        // Failsafe: Force stop loading after 3 seconds
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                setLoading((prev) => {
                    if (prev) {
                        console.warn("Wishlist fetch timed out safely.");
                        return false;
                    }
                    return prev;
                });
            }
        }, 3000);

        const loadData = async () => {
            try {
                // Parallel fetch
                const wishlistPromise = api.get('/wishlist');
                const configPromise = api.get('/config/subscription_price').catch(() => ({ data: { value: 100 } }));

                const [wishlistRes, configRes] = await Promise.all([wishlistPromise, configPromise]);

                if (mounted) {
                    setWishlist(wishlistRes.data);
                    if (configRes.data && configRes.data.value) {
                        setSubPrice(configRes.data.value);
                    }
                }
            } catch (error) {
                console.error('Error fetching wishlist data:', error);
            } finally {
                if (mounted) {
                    clearTimeout(safetyTimer);
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
        };
    }, []);

    const removeFromWishlist = (noteId) => {
        setWishlist(prev => prev.filter(note => note.id !== noteId));
    };

    if (loading) return <WishlistSkeleton />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                <Heart className="w-8 h-8 mr-3 text-red-500 fill-current" />
                My Wishlist
            </h1>

            {wishlist.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Your wishlist is empty</h3>
                    <p className="text-gray-500 dark:text-gray-400">Save items you want to buy later!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {wishlist.map((note) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            isWishlisted={true} // Always true on wishlist page
                            onWishlistChange={() => removeFromWishlist(note.id)}
                            subPrice={subPrice}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
