import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { Star, User } from 'lucide-react';

export default function ReviewsSection({ noteId }) {
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchReviews();
        checkUser();
    }, [noteId]);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    };

    const fetchReviews = async () => {
        try {
            const { data } = await api.get(`/reviews/note/${noteId}`);
            setReviews(data);
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return alert('Please login to review');

        setSubmitting(true);
        try {
            await api.post('/reviews', { noteId, rating, comment });
            setComment('');
            setRating(5);
            fetchReviews(); // Refresh list
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reviews & Ratings</h3>

            {/* Add Review Form */}
            {user && (
                <form onSubmit={handleSubmit} className="mb-10 bg-gray-50 dark:bg-gray-700/30 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Write a Review</h4>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rating</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-6 h-6 ${star <= rating ? 'text-amber-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows="3"
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                            placeholder="Share your thoughts about this note..."
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Post Review'}
                    </button>
                </form>
            )}

            {/* Reviews List */}
            {loading ? (
                <div className="text-gray-500 dark:text-gray-400">Loading reviews...</div>
            ) : reviews.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No reviews yet. Be the first to review!</p>
            ) : (
                <div className="space-y-6">
                    {reviews.map((review) => (
                        <div key={review.id} className="flex gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                    <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 dark:text-white">{review.user?.full_name || 'Anonymous'}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">• {new Date(review.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-0.5 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                                        />
                                    ))}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                    {review.comment}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
