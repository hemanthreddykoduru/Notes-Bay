import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Sparkles, Check, Shield, Zap, BookOpen, Star } from 'lucide-react';

export default function Subscription() {
    const [loading, setLoading] = useState(false);
    const [trialLoading, setTrialLoading] = useState(false);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [canUseTrial, setCanUseTrial] = useState(true);
    const [price, setPrice] = useState(100);
    const navigate = useNavigate();

    useEffect(() => {
        checkSubscriptionStatus();
        checkTrialEligibility();
        fetchPrice();
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
            alert(`🎉 ${data.message}! Enjoy 7 days of premium access.`);
            setHasSubscription(true);
            setCanUseTrial(false);
            navigate('/');
        } catch (error) {
            console.error('Error activating free trial:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to activate free trial';
            alert(`Error: ${errorMessage}`);
        } finally {
            setTrialLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (hasSubscription) return;
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200">
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold tracking-wide uppercase mb-4 shadow-sm border border-indigo-200 dark:border-indigo-800">
                        <Star className="w-4 h-4 mr-2 text-indigo-500" />
                        Premium Access
                    </span>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                        {hasSubscription ? 'You are a Pro Member!' : 'Choose Your Plan'}
                    </h2>
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        {hasSubscription
                            ? 'You have unlimited access to every note. Keep learning and growing!'
                            : 'Start with a free trial or go premium for unlimited access.'
                        }
                    </p>
                </div>

                {hasSubscription ? (
                    // Active Subscription Card
                    <div className="relative transform hover:scale-[1.01] transition-all duration-300 ease-out">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur opacity-75"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Active Subscription</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-8">You have unlimited access to all premium features!</p>
                            <button
                                onClick={() => navigate('/')}
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                            >
                                Browse Notes
                            </button>
                        </div>
                    </div>
                ) : (
                    // Two Pricing Cards
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Free Trial Card */}
                        {canUseTrial && (
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
                                <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden h-full flex flex-col">
                                    <div className="p-8 flex-grow">
                                        <div className="text-center mb-6">
                                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Free Trial</h3>
                                            <div className="flex justify-center items-baseline my-4">
                                                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">₹0</span>
                                                <span className="text-xl text-gray-500 dark:text-gray-400 ml-2">/7 days</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Try all premium features free
                                            </p>
                                        </div>

                                        <ul className="space-y-4 mb-8">
                                            {[
                                                "Full access to all notes",
                                                "No credit card required",
                                                "Cancel anytime",
                                                "7 days of premium features"
                                            ].map((feature, index) => (
                                                <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                                                    <Check className="w-5 h-5 mr-3 text-cyan-500 flex-shrink-0" />
                                                    <span className="text-sm">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="p-8 pt-0">
                                        <button
                                            onClick={handleFreeTrial}
                                            disabled={trialLoading}
                                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-lg hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all shadow-lg flex items-center justify-center"
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
                                                    <Zap className="w-5 h-5 mr-2" />
                                                    Start Free Trial
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pro Pass Card */}
                        <div className={`relative group ${!canUseTrial ? 'md:col-span-2 max-w-md mx-auto' : ''}`}>
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
                )}
            </div>
        </div>
    );
}
