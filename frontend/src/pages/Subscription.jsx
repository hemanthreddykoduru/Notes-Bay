import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Sparkles, Check, Shield, Zap, BookOpen, Star } from 'lucide-react';
import SubscriptionSkeleton from '../components/skeletons/SubscriptionSkeleton';

export default function Subscription() {
    const [loading, setLoading] = useState(false);
    const [trialLoading, setTrialLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [canUseTrial, setCanUseTrial] = useState(true);
    const [price, setPrice] = useState(100);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [subscriptionDetails, setSubscriptionDetails] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadInitialData = async () => {
            setPageLoading(true);
            await Promise.all([
                checkSubscriptionStatus(),
                checkTrialEligibility(),
                fetchPrice()
            ]);
            setPageLoading(false);
        };
        loadInitialData();
    }, []);

    const fetchPrice = async () => {
        try {
            const { data } = await api.get('/config/subscription_price');
            if (data && data.value) setPrice(data.value);
        } catch (error) {
            console.error('Error fetching price:', error);
        }
    };

    const checkSubscriptionStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: subscriptions } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('status', 'active')
                .gt('end_date', new Date().toISOString())
                .limit(1);

            if (subscriptions && subscriptions.length > 0) {
                setHasSubscription(true);
                setSubscriptionDetails(subscriptions[0]);
            } else {
                setHasSubscription(false);
                setSubscriptionDetails(null);
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
        }
    };

    const checkTrialEligibility = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setCanUseTrial(true); // Allow trial for non-logged-in users (will redirect to login)
                return;
            }

            // Check if user has already used a trial
            const { data: previousTrial } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('is_trial', true)
                .limit(1);

            if (previousTrial && previousTrial.length > 0) {
                setCanUseTrial(false);
            }
        } catch (error) {
            console.error('Error checking trial eligibility:', error);
        }
    };

    const handleFreeTrial = async () => {
        if (hasSubscription || !canUseTrial) return;
        setTrialLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            const { data } = await api.post('/payments/activate-free-trial');
            setShowSuccessModal(true);
            setHasSubscription(true);
            setCanUseTrial(false);
        } catch (error) {
            console.error('Error activating free trial:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to activate free trial';
            alert(`Error: ${errorMessage}`);
        } finally {
            setTrialLoading(false);
        }
    };

    // Countdown timer for trial subscriptions
    useEffect(() => {
        if (!subscriptionDetails || !subscriptionDetails.is_trial) {
            setTimeRemaining(null);
            return;
        }

        const calculateTimeRemaining = () => {
            const endDate = new Date(subscriptionDetails.end_date);
            const now = new Date();
            const diff = endDate - now;

            if (diff <= 0) {
                setTimeRemaining({ expired: true });
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining({ hours, minutes, seconds, expired: false });
        };

        // Calculate immediately
        calculateTimeRemaining();

        // Update every second
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [subscriptionDetails]);

    const handleSubscribe = async () => {
        // Allow subscription if user has no subscription OR if they are currently on a trial
        if (hasSubscription && !subscriptionDetails?.is_trial) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            // 1. Create Subscription Order
            const { data: order } = await api.post('/payments/create-subscription-order');

            // 2. Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Notes-Market Pro",
                description: "1 Year Premium Subscription",
                order_id: order.id,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        await api.post('/payments/verify-subscription', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        alert('Welcome to Pro! You now have access to all notes.');
                        setHasSubscription(true);
                        navigate('/');
                    } catch (error) {
                        alert('Subscription verification failed');
                    }
                },
                prefill: {
                    email: user.email
                },
                theme: {
                    color: "#4F46E5"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (error) {
            console.error('Error initiating subscription:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to start subscription';
            alert(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200">
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {pageLoading ? (
                    // Loading Skeleton
                    <SubscriptionSkeleton />
                ) : (
                    <>
                        <div className="text-center mb-8 sm:mb-12 md:mb-16">
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold tracking-wide uppercase mb-4 shadow-sm border border-indigo-200 dark:border-indigo-800">
                                <Star className="w-4 h-4 mr-2 text-indigo-500" />
                                Premium Access
                            </span>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3 sm:mb-4">
                                {hasSubscription ? 'You are a Pro Member!' : 'Choose Your Plan'}
                            </h2>
                            <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
                                {hasSubscription
                                    ? 'You have unlimited access to every note. Keep learning and growing!'
                                    : 'Start with a free trial or go premium for unlimited access.'
                                }
                            </p>
                        </div>


                        {hasSubscription ? (
                            subscriptionDetails?.is_trial ? (
                                // Trial User: Show Trial Card + Pro Pass Card Side by Side
                                <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
                                    {/* Trial Countdown Card */}
                                    <div className="relative transform hover:scale-[1.01] transition-all duration-300 ease-out">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-75"></div>
                                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 text-center h-full flex flex-col">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                                            </div>

                                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                                                Free Trial Active
                                            </h3>

                                            {timeRemaining && !timeRemaining.expired ? (
                                                <>
                                                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">Trial expires in:</p>

                                                    {/* Countdown Timer */}
                                                    <div className="flex justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                                                                <span className="text-xl sm:text-2xl font-bold text-white">{String(timeRemaining.hours).padStart(2, '0')}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Hours</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500">:</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                                                                <span className="text-2xl font-bold text-white">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Minutes</span>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">:</span>
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                                                                <span className="text-2xl font-bold text-white">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Seconds</span>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                                        Enjoying premium features
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-gray-600 dark:text-gray-300 mb-6">Trial expired</p>
                                            )}

                                            <div className="mt-auto">
                                                <button
                                                    onClick={() => navigate('/')}
                                                    className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold rounded-xl transition-colors"
                                                >
                                                    Browse Notes
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pro Pass Upgrade Card */}
                                    <div className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
                                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden h-full flex flex-col">
                                            {/* Popular Badge */}
                                            <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                                UPGRADE
                                            </div>

                                            <div className="p-6 sm:p-8 flex-grow">
                                                <div className="text-center mb-6">
                                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Pro Pass</h3>
                                                    <div className="flex justify-center items-baseline my-4">
                                                        <span className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">₹{price}</span>
                                                        <span className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 ml-2">/year</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        Billed annually. Best value!
                                                    </p>
                                                </div>

                                                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                                                    {[
                                                        { icon: BookOpen, text: "Access to entire library" },
                                                        { icon: Zap, text: "Priority access to new uploads" },
                                                        { icon: Star, text: "Ad-free experience" },
                                                        { icon: Shield, text: "Premium quality PDFs" },
                                                    ].map((feature, index) => (
                                                        <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                                                            <feature.icon className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                                            <span className="text-sm">{feature.text}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div className="p-6 sm:p-8 pt-0">
                                                <button
                                                    onClick={handleSubscribe}
                                                    disabled={loading}
                                                    className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg flex items-center justify-center"
                                                >
                                                    {loading ? (
                                                        <span className="flex items-center">
                                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Processing...
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="w-5 h-5 mr-2" />
                                                            Get Instant Access
                                                        </>
                                                    )}
                                                </button>
                                                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
                                                    <Shield className="w-3 h-3 inline mr-1" />
                                                    Secure payment via Razorpay
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Regular Paid Subscription Card
                                <div className="relative transform hover:scale-[1.01] transition-all duration-300 ease-out">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-75"></div>
                                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-12 text-center">
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Active Subscription</h3>
                                        <p className="text-gray-600 dark:text-gray-300 mb-6 sm:mb-8">You have unlimited access to all premium features!</p>
                                        <button
                                            onClick={() => navigate('/')}
                                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                                        >
                                            Browse Notes
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            // Two Pricing Cards
                            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
                                {/* Free Trial Card */}
                                <div className="relative group">
                                    {!canUseTrial && (
                                        <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                                            USED
                                        </div>
                                    )}
                                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-60 transition duration-300 ${canUseTrial ? 'group-hover:opacity-100' : 'opacity-0'}`}></div>
                                    <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden h-full flex flex-col ${!canUseTrial ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                                        <div className="p-6 sm:p-8 flex-grow">
                                            <div className="text-center mb-6">
                                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Free Trial</h3>
                                                <div className="flex justify-center items-baseline my-4">
                                                    <span className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">₹0</span>
                                                    <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">/2 hours</span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {canUseTrial ? 'Try all premium features free' : 'Limit one trial per user'}
                                                </p>
                                            </div>

                                            <ul className="space-y-4 mb-8">
                                                {[
                                                    "Full access to all notes",
                                                    "No credit card required",
                                                    "Cancel anytime",
                                                    "2 hours of premium features"
                                                ].map((feature, index) => (
                                                    <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                                                        <Check className={`w-5 h-5 mr-3 flex-shrink-0 ${canUseTrial ? 'text-cyan-500' : 'text-gray-400'}`} />
                                                        <span className="text-sm">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-8 pt-0">
                                            <button
                                                onClick={handleFreeTrial}
                                                disabled={trialLoading || !canUseTrial}
                                                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center ${canUseTrial
                                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {trialLoading ? (
                                                    <span className="flex items-center">
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Activating...
                                                    </span>
                                                ) : (
                                                    <>
                                                        {canUseTrial ? (
                                                            <>
                                                                <Zap className="w-5 h-5 mr-2" />
                                                                Start Free Trial
                                                            </>
                                                        ) : (
                                                            "Trial Already Used"
                                                        )}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>


                                {/* Pro Pass Card */}
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
                                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden h-full flex flex-col">
                                        {/* Popular Badge */}
                                        <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            POPULAR
                                        </div>

                                        <div className="p-8 flex-grow">
                                            <div className="text-center mb-6">
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pro Pass</h3>
                                                <div className="flex justify-center items-baseline my-4">
                                                    <span className="text-5xl font-extrabold text-gray-900 dark:text-white">₹{price}</span>
                                                    <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">/year</span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Billed annually. Best value!
                                                </p>
                                            </div>

                                            <ul className="space-y-4 mb-8">
                                                {[
                                                    { icon: BookOpen, text: "Access to entire library" },
                                                    { icon: Zap, text: "Priority access to new uploads" },
                                                    { icon: Star, text: "Ad-free experience" },
                                                    { icon: Shield, text: "Premium quality PDFs" },
                                                ].map((feature, index) => (
                                                    <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                                                        <feature.icon className="w-5 h-5 mr-3 text-indigo-500 flex-shrink-0" />
                                                        <span className="text-sm font-medium">{feature.text}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-8 pt-0">
                                            <button
                                                onClick={handleSubscribe}
                                                disabled={loading}
                                                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg flex items-center justify-center"
                                            >
                                                {loading ? (
                                                    <span className="flex items-center">
                                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Processing...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-5 h-5 mr-2" />
                                                        Get Instant Access
                                                    </>
                                                )}
                                            </button>
                                            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center">
                                                <Shield className="w-3 h-3 mr-1" />
                                                Secure payment via Razorpay
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </>
                )}
            </div >

            {/* Success Modal */}
            {
                showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in duration-300">
                            {/* Decorative gradient border */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 animate-pulse"></div>

                            <div className="relative">
                                {/* Success Icon */}
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center animate-in zoom-in duration-500">
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>

                                {/* Title */}
                                <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                                    🎉 Free Trial Activated!
                                </h3>

                                {/* Message */}
                                <p className="text-center text-gray-600 dark:text-gray-300 mb-8 text-lg">
                                    Enjoy <span className="font-bold text-indigo-600 dark:text-indigo-400">2 hours</span> of premium access to all notes!
                                </p>

                                {/* Features List */}
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
                                    <ul className="space-y-2">
                                        {[
                                            "Unlimited note access",
                                            "Ad-free experience",
                                            "Premium quality PDFs"
                                        ].map((feature, index) => (
                                            <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        navigate('/');
                                    }}
                                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg"
                                >
                                    Start Exploring Notes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
