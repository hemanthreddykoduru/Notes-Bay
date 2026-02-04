import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import NoteCard from '../components/NoteCard';
const Hero3D = lazy(() => import('../components/Hero3D'));
import NativeAd from '../components/NativeAd';
import LeaderboardAd from '../components/LeaderboardAd';
import { Search, Filter, X, Sparkles, CheckCircle } from 'lucide-react';
import HomeSkeleton from '../components/skeletons/HomeSkeleton';

export default function Home() {
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [wishlistIds, setWishlistIds] = useState(new Set());


    // Filter State
    const [search, setSearch] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sort, setSort] = useState('latest');
    const [showFilters, setShowFilters] = useState(false);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subPrice, setSubPrice] = useState(100);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalNotes, setTotalNotes] = useState(0);
    const NOTES_PER_PAGE = 12;

    // Initialize cached values immediately on mount
    useEffect(() => {
        // Load cached subscription price instantly
        const cachedPrice = localStorage.getItem('sub_price');
        if (cachedPrice) {
            try {
                const { value } = JSON.parse(cachedPrice);
                setSubPrice(value);
            } catch (e) {
                console.error('Error parsing cached price:', e);
            }
        }

        // Load cached subscription status
        const cachedStatus = localStorage.getItem('sub_status');
        if (cachedStatus) {
            try {
                const { value, timestamp } = JSON.parse(cachedStatus);
                const age = Date.now() - timestamp;
                const FIVE_MINUTES = 5 * 60 * 1000;
                if (age < FIVE_MINUTES) {
                    setIsSubscribed(value);
                }
            } catch (e) {
                console.error('Error parsing cached status:', e);
            }
        }
    }, []);

    // Real-time Subscriptions
    useEffect(() => {
        const notesChannel = supabase
            .channel('public:notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Only add if it matches current simplistic "all" view or simplistic prepend
                    // For perfect sync with filters, re-fetching is safer, but user asked for "instant".
                    // Let's prepend it.
                    setNotes((prev) => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setNotes((prev) => prev.map((n) => (n.id === payload.new.id ? { ...n, ...payload.new } : n)));
                } else if (payload.eventType === 'DELETE') {
                    setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
                }
            })
            .subscribe();

        const configChannel = supabase
            .channel('public:app_config')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config', filter: 'key=eq.subscription_price' }, (payload) => {
                if (payload.new && payload.new.value) {
                    setSubPrice(payload.new.value);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(notesChannel);
            supabase.removeChannel(configChannel);
        };
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1); // Reset to page 1 when filters change
            fetchData();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [search, minPrice, maxPrice, sort]);

    useEffect(() => {
        fetchData();
    }, [currentPage]);

    const fetchData = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        if (sort) params.append('sort', sort);

        try {
            // Add pagination params
            params.append('page', currentPage);
            params.append('limit', NOTES_PER_PAGE);

            const notesReq = api.get(`/notes?${params.toString()}`);
            // Catch wishlist errors silently (e.g. 401 if not logged in)
            const wishlistReq = api.get('/wishlist').catch(() => ({ data: [] }));
            // Catch subscription errors silently
            const subReq = api.get('/payments/subscription-status').catch(() => ({ data: { isSubscribed: false } }));

            const [notesRes, wishlistRes, subRes] = await Promise.all([notesReq, wishlistReq, subReq]);

            // Handle paginated response
            setNotes(notesRes.data.notes || notesRes.data);
            setTotalPages(notesRes.data.pagination?.totalPages || 1);
            setTotalNotes(notesRes.data.pagination?.total || notesRes.data.length);
            setWishlistIds(new Set(wishlistRes.data.map(n => n.id)));
            setIsSubscribed(subRes.data.isSubscribed);

            // Cache subscription status for 5 minutes
            if (subRes.data.isSubscribed !== undefined) {
                localStorage.setItem('sub_status', JSON.stringify({
                    value: subRes.data.isSubscribed,
                    timestamp: Date.now()
                }));
            }

            // Fetch subscription price with caching
            try {
                // Check cache first (1 hour TTL)
                const cachedPrice = localStorage.getItem('sub_price');
                if (cachedPrice) {
                    const { value, timestamp } = JSON.parse(cachedPrice);
                    const age = Date.now() - timestamp;
                    const ONE_HOUR = 60 * 60 * 1000;

                    if (age < ONE_HOUR) {
                        // Use cached value
                        setSubPrice(value);
                        // Revalidate in background if older than 30 minutes
                        if (age > ONE_HOUR / 2) {
                            api.get('/config/subscription_price').then(({ data: config }) => {
                                if (config && config.value) {
                                    setSubPrice(config.value);
                                    localStorage.setItem('sub_price', JSON.stringify({
                                        value: config.value,
                                        timestamp: Date.now()
                                    }));
                                }
                            }).catch(e => console.error(e));
                        }
                        return; // Skip fetch if cache is fresh
                    }
                }

                // Cache miss or expired - fetch fresh data
                const { data: config } = await api.get('/config/subscription_price');
                if (config && config.value) {
                    setSubPrice(config.value);
                    localStorage.setItem('sub_price', JSON.stringify({
                        value: config.value,
                        timestamp: Date.now()
                    }));
                }
            } catch (e) {
                console.error('Error fetching subscription price:', e);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            // Fallback: try fetching notes only
            try {
                const { data } = await api.get(`/notes?${params.toString()}`);
                // Handle both paginated and non-paginated responses
                if (data.notes) {
                    setNotes(data.notes);
                    setTotalPages(data.pagination?.totalPages || 1);
                    setTotalNotes(data.pagination?.total || 0);
                } else {
                    setNotes(data);
                }
            } catch (e) {
                console.error('Error fetching notes:', e);
            }
        } finally {
            // ALWAYS set loading to false, even if errors occurred
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setMinPrice('');
        setMaxPrice('');
        setSort('latest');
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-12">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-4">
                        <span className="block">Master Your Studies with</span>
                        <span className="block text-indigo-600 dark:text-indigo-400">Premium Notes</span>
                    </h1>
                    <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                        Access high-quality study materials, summaries, and guides to ace your exams.
                    </p>

                    {/* Hero CTA */}
                    <div
                        onClick={() => {
                            if (!loading && !isSubscribed) {
                                navigate('/pricing');
                            }
                        }}
                        className={`mt-8 flex items-center justify-center ${!loading && !isSubscribed ? 'cursor-pointer' : 'cursor-default'} group`}
                    >
                        {loading ? (
                            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-lg">
                                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                                <span className="text-base sm:text-lg tracking-wide">Checking status...</span>
                            </div>
                        ) : isSubscribed ? (
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-lg shadow-amber-500/30">
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                <span className="text-base sm:text-lg tracking-wide">Premium Access Active</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-pulse" />
                                <span className="text-base sm:text-lg tracking-wide">Pay ₹{subPrice} for all notes</span>
                            </div>
                        )}
                    </div>
                </div>
                <Suspense fallback={<div className="h-64"></div>}>
                    <Hero3D />
                </Suspense>
            </div>

            {/* Leaderboard Ad - Below Hero (Non-Subscribers Only) */}
            {!isSubscribed && (
                <LeaderboardAd />
            )}

            {/* Search & Filter Bar */}
            <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Search Input */}
                    <div className="relative w-full md:w-1/2 lg:w-1/3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search notes by title or subject..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Filter Toggles & Sort */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${showFilters ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </button>

                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="latest">Newest First</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min Price (₹)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max Price (₹)</label>
                            <input
                                type="number"
                                placeholder="1000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="flex items-center text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 pb-2"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear All
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
                {totalNotes} Notes Found {totalPages > 1 && `(Page ${currentPage} of ${totalPages})`}
            </h2>

            {loading ? (
                <HomeSkeleton />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.length > 0 ? (
                        notes.map((note) => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isWishlisted={wishlistIds.has(note.id)}
                                isSubscribed={isSubscribed}
                                subPrice={subPrice}
                            />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                            <Search className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notes found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Try adjusting your search or filter to find what you're looking for.
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={clearFilters}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* Pagination Controls */}
            {
                !loading && totalPages > 1 && (
                    <div className="mt-12 flex justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>

                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`px-4 py-2 rounded-md transition-colors ${currentPage === pageNum
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )
            }
        </div >
    );
}
