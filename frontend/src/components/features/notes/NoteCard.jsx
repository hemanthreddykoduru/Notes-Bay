import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Star, Heart, Sparkles } from 'lucide-react';
import api from '../../../lib/api';

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
    return (
        <div
            className="group relative flex flex-col h-full bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-3xl shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-pointer"
            onClick={() => navigate(`/notes/${note.id}`)}
        >
            {/* Wishlist Button */}
            <button
                onClick={toggleWishlist}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-gray-900/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 z-10 group/heart"
            >
                <Heart
                    className={`w-5 h-5 transition-colors ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover/heart:text-red-400'}`}
                />
            </button>

            {/* Note Preview Image */}
            <div className="relative aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                <img
                    src={note.preview_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000"}
                    alt={note.title}
                    loading="lazy"
                    className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                />

                {/* Subject Badge (Floating) */}
                <span className="absolute bottom-4 left-4 z-20 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white shadow-lg backdrop-blur-md">
                    {note.subject}
                </span>
            </div>

            {/* Content Body */}
            <div className="flex flex-col flex-1 p-6">
                <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {note.average_rating ? Number(note.average_rating).toFixed(1) : 'New'}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">({note.review_count || 0} reviews)</span>
                </div>

                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                    {note.title}
                </h3>

                <div className="mt-auto pt-4 flex items-center justify-between">
                    {isSubscribed ? (
                        <div className="w-full py-2.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl text-center text-sm font-bold border border-green-500/20">
                            Unlocked via Pro
                        </div>
                    ) : (
                        <div className="flex flex-col w-full gap-3">
                            <div className="flex items-center justify-between w-full">
                                <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                    ₹{note.price}
                                </span>
                                <span className="text-indigo-500 dark:text-indigo-400 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Details <ArrowRight className="w-4 h-4" />
                                </span>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/pricing');
                                }}
                                className="w-full py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
                                Get All for ₹{subPrice}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
    );
}
