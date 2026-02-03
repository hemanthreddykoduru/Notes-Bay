import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { FileText, Lock, BookOpen } from 'lucide-react';
import ReviewsSection from '../components/ReviewsSection';
import Breadcrumbs from '../components/Breadcrumbs';
import SocialShare from '../components/SocialShare';
import RelatedNotes from '../components/RelatedNotes';
import NoteDetailSkeleton from '../components/NoteDetailSkeleton';
import SecurePDFViewer from '../components/SecurePDFViewer';

import SkyscraperAd from '../components/SkyscraperAd';
import LeaderboardAd from '../components/LeaderboardAd';

export default function NoteDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [note, setNote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [purchased, setPurchased] = useState(false);
    const [processing, setProcessing] = useState(false);
    // removed duplicate
    const [showReader, setShowReader] = useState(false);
    const [subPrice, setSubPrice] = useState(100);

    useEffect(() => {
        fetchNoteDetails();
        fetchConfig();
        window.scrollTo(0, 0); // Scroll to top when note ID changes
    }, [id]);

    const fetchConfig = async () => {
        try {
            const { data } = await api.get('/config/subscription_price');
            if (data && data.value) setSubPrice(data.value);
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const fetchNoteDetails = async () => {
        try {
            setLoading(true); // Reset loading when id changes
            const { data } = await api.get(`/notes/${id}`);
            setNote(data);
            if (data.hasAccess) {
                setPurchased(true);
            }
        } catch (error) {
            console.error('Error fetching note:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login');
            return;
        }

        if (purchased) {
            alert('You already have access to this note!');
            return;
        }

        setProcessing(true);
        try {
            // 1. Create Order
            const { data: order } = await api.post('/payments/create-order', { noteId: note.id });

            // 2. Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: 'NotesBay',
                description: `Purchase ${note.title}`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        await api.post('/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            noteId: note.id
                        });
                        alert('Payment Successful!');
                        setPurchased(true); // Grant access immediately
                        fetchNoteDetails(); // Refresh to get PDF URL
                    } catch (verifyError) {
                        console.error(verifyError);
                        alert('Payment Verification Failed');
                    }
                },
                prefill: {
                    email: session.user.email,
                },
                theme: {
                    color: '#4f46e5',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error('Payment Error:', error);
            alert('Something went wrong initializing payment');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <NoteDetailSkeleton />;
    if (!note) return <div>Note not found</div>;

    const breadcrumbItems = [
        { label: note.subject, link: `/?search=${encodeURIComponent(note.subject)}` },
        { label: note.title }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200 overflow-visible">
            {/* Breadcrumbs */}
            <Breadcrumbs items={breadcrumbItems} />

            <div className="flex flex-col lg:flex-row gap-6 items-start">

                <div className="flex-1 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg min-w-0">
                    <div className="px-4 py-5 sm:px-6 flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h3 className="text-2xl leading-6 font-medium text-gray-900 dark:text-white">{note.title}</h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">{note.subject}</p>
                        </div>
                        {/* Social Share */}
                        <SocialShare title={note.title} url={window.location.href} />
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                            <div className="h-96 bg-gray-100 dark:bg-gray-900 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded overflow-hidden relative">
                                {note.preview_url ? (
                                    note.preview_url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                        <img
                                            src={note.preview_url}
                                            alt={note.title}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <iframe
                                            src={`${note.preview_url}#toolbar=0&navpanes=0&scrollbar=0`}
                                            className="w-full h-full overflow-hidden"
                                            title="Preview"
                                            scrolling="no"
                                        />
                                    )
                                ) : (
                                    <FileText className="h-24 w-24 text-gray-400 dark:text-gray-600" />
                                )}
                            </div>

                            <div className="flex flex-col justify-between space-y-6">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Description</h4>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                        {note.description || "No description available for this note."}
                                    </p>
                                </div>

                                {purchased ? ( // Show Secure Reader Button
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-lg text-center font-medium flex items-center justify-center">
                                            <Lock className="w-5 h-5 mr-2" />
                                            You have full access
                                        </div>
                                        <button
                                            onClick={() => setShowReader(true)}
                                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                        >
                                            <BookOpen className="h-5 w-5 mr-2" />
                                            Read Now (Secure Viewer)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">

                                        {/* Subscription Option (Best Value) */}
                                        <div className="border-2 border-indigo-500 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20 relative overflow-hidden cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors" onClick={() => navigate('/pricing')}>
                                            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                                BEST VALUE
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h5 className="font-bold text-gray-900 dark:text-white">Unlock All Notes</h5>
                                                    <p className="text-sm text-indigo-700 dark:text-indigo-300">Get unlimited access to everything</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-2xl font-bold text-indigo-900 dark:text-indigo-200">₹{subPrice}</span>
                                                    <span className="text-xs text-indigo-600 dark:text-indigo-400">/ year</span>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors">
                                                    Upgrade to Pro
                                                </button>
                                            </div>
                                        </div>

                                        {/* OR Divider */}
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                            </div>
                                            <div className="relative flex justify-center">
                                                <span className="px-2 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">or buy individually</span>
                                            </div>
                                        </div>

                                        {/* Single Purchase Option */}
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-800">
                                            <div className="flex justify-between items-center mb-3">
                                                <div>
                                                    <h5 className="font-medium text-gray-900 dark:text-white">Single Note Access</h5>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Lifetime access to this note only</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xl font-bold text-gray-900 dark:text-white">₹{note.price}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleBuy}
                                                disabled={processing}
                                                className="w-full py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium rounded-md shadow-sm transition-colors"
                                            >
                                                {processing ? 'Processing...' : 'Buy This Note Only'}
                                            </button>
                                        </div>



                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Right Sidebar Ad (Skyscraper 160x600) - Desktop Only */}
                {!purchased && (
                    <div className="hidden lg:block shrink-0 w-[160px]">
                        <SkyscraperAd />
                    </div>
                )}

            </div>



            {/* Related Notes Section */}
            <RelatedNotes currentNoteId={id} subject={note.subject} />

            {/* Leaderboard Ad (Non-Subscribers Only) */}
            {
                !purchased && (
                    <LeaderboardAd />
                )
            }

            {/* Reviews Section */}
            <div className="mt-8 px-4 sm:px-6">
                <ReviewsSection noteId={id} />
            </div>

            {/* Secure Reader Modal */}
            {
                showReader && purchased && note.file_url && (
                    <SecurePDFViewer
                        fileUrl={note.file_url}
                        title={note.title}
                        onClose={() => setShowReader(false)}
                    />
                )
            }
        </div >
    );
}
