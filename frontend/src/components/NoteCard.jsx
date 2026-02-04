import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Star, Heart, Sparkles } from 'lucide-react';
import api from '../lib/api';

export default function NoteCard({ note, isWishlisted, isSubscribed, subPrice = 100 }) {
    const navigate = useNavigate();
    const [inWishlist, setInWishlist] = useState(isWishlisted);

    const toggleWishlist = async (e) => {
        e.stopPropagation(); // Prevent card click
        const previousState = inWishlist;
        setInWishlist(!previousState); // Optimistic

        try {
            if (previousState) {
                await api.delete(`/wishlist/${note.id}`);
            } else {
                await api.post(`/wishlist/${note.id}`);
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            setInWishlist(previousState); // Revert
        }
    };

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 dark:border-gray-700 relative group"
            onClick={() => navigate(`/notes/${note.id}`)} // Re-added navigation to the whole card
        >
            {/* Wishlist Button */}
            <button
                onClick={toggleWishlist}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 shadow-sm transition-all z-10"
            >
                <Heart
                    className={`w-5 h-5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                />
            </button>

            <img
                src={note.preview_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000"} // Better placeholder
                alt={note.title}
                loading="lazy"
                className="w-full h-48 object-cover"
            />
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <span className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wide">
                        {note.subject}
                    </span>
                    <div className="flex items-center text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {note.average_rating ? Number(note.average_rating).toFixed(1) : 'New'}
                        </span>
                        <span className="ml-1 text-xs text-gray-400">({note.review_count || 0})</span>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">{note.title}</h3>
                <div className="flex justify-between items-center mt-4">
                    {isSubscribed ? (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            You have full access to this note
                        </span>
                    ) : (
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">₹{note.price}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/pricing');
                                }}
                                className="group/btn flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 pl-2 pr-3 py-1 rounded-full hover:shadow-md hover:scale-105 transition-all duration-300"
                            >
                                <Sparkles className="w-3 h-3 text-yellow-200 animate-pulse" />
                                <span>or pay ₹{subPrice} for all notes</span>
                            </button>
                        </div>
                    )}

                    {!isSubscribed && (
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
                            View Details →
                        </span>
                    )}
                    {isSubscribed && (
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
                            View →
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
