import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, CheckCircle, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { supabase } from '../lib/supabase';
import Toast from '../components/common/Toast';

export default function ServiceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [toast, setToast] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchService = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/services/${id}`);
                if (!res.ok) throw new Error('Service not found');
                const data = await res.json();
                setService(data);
                // Pre-select first variant if it exists, otherwise leave null (base price)
                if (data.variants && data.variants.length > 0) {
                    setSelectedVariant(data.variants[0]);
                }
            } catch (error) {
                console.error('Error fetching service:', error);
                setToast({ message: 'Error loading service details', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchService();
    }, [id]);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePurchase = async () => {
        setProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Must be logged in to buy a service (since we need onboarding)
                navigate('/login', { state: { returnTo: `/services/${id}` } });
                return;
            }

            const res = await loadRazorpay();
            if (!res) {
                setToast({ message: 'Razorpay SDK failed to load. Are you online?', type: 'error' });
                return;
            }

            // Create Order
            const orderRes = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/create-service-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ 
                    serviceId: id,
                    variant: selectedVariant 
                })
            });
            const order = await orderRes.json();
            if (order.error) throw new Error(order.error);

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "NotesBay",
                description: `Purchase: ${service.title}${selectedVariant ? ` - ${selectedVariant.name}` : ''}`,
                order_id: order.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/verify-service`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                serviceId: id,
                                variant: selectedVariant
                            })
                        });
                        
                        const verifyData = await verifyRes.json();
                        if (verifyData.error) throw new Error(verifyData.error);
                        
                        // Navigate to onboarding page, pass order ID
                        navigate(`/services/${id}/onboarding/${verifyData.orderId}`);
                    } catch (err) {
                        console.error('Payment Verification Error:', err);
                        setToast({ message: 'Payment verification failed.', type: 'error' });
                    }
                },
                prefill: {
                    email: session.user.email,
                },
                theme: {
                    color: "#4f46e5"
                }
            };
            
            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (error) {
            console.error('Purchase Error:', error);
            setToast({ message: error.message || 'Something went wrong', type: 'error' });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-grow flex justify-center items-center">
                    <Loader className="animate-spin h-10 w-10 text-indigo-500" />
                </div>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex-grow flex justify-center items-center text-gray-500">Service not found.</div>
            </div>
        );
    }

    const displayPrice = selectedVariant ? selectedVariant.price : service.price;
    const isBasePrice = !selectedVariant;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <Navbar />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left side: Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                                {service.title}
                            </h1>
                            <div className="flex items-center gap-4 mb-8 text-sm">
                                {service.turnaround_time && (
                                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg">
                                        <Clock className="h-4 w-4" />
                                        Expected Delivery: {service.turnaround_time}
                                    </div>
                                )}
                            </div>
                            
                            {service.thumbnail_url && (
                                <img 
                                    src={service.thumbnail_url} 
                                    alt={service.title} 
                                    className="w-full rounded-2xl object-cover aspect-video mb-8 border border-gray-100 dark:border-gray-700" 
                                />
                            )}

                            <div className="prose prose-indigo dark:prose-invert max-w-none mb-10">
                                <h3 className="text-xl font-bold mb-4">About this service</h3>
                                <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                                    {service.description}
                                </p>
                            </div>

                            {service.features && service.features.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">What's Included</h3>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {service.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side: Checkout Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 dark:border-gray-700/50">
                            {service.offer_text && (
                                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-4 py-1.5 rounded-full shadow-lg transform rotate-3">
                                    {service.offer_text}
                                </div>
                            )}

                            <div className="mb-6">
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Price</p>
                                <div className="flex items-end gap-3">
                                    <span className="text-4xl font-black text-gray-900 dark:text-white">
                                        ₹{displayPrice}
                                    </span>
                                    {isBasePrice && service.original_price > displayPrice && (
                                        <span className="text-lg text-gray-400 line-through mb-1">
                                            ₹{service.original_price}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Variants Selection */}
                            {service.variants && service.variants.length > 0 && (
                                <div className="mb-8 space-y-3">
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Select Option:</p>
                                    {service.variants.map((v, i) => (
                                        <div 
                                            key={i}
                                            onClick={() => setSelectedVariant(v)}
                                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex justify-between items-center ${
                                                selectedVariant === v 
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm' 
                                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                                            }`}
                                        >
                                            <span className={`font-semibold ${selectedVariant === v ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {v.name}
                                            </span>
                                            <span className={`font-bold ${selectedVariant === v ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                                                ₹{v.price}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={handlePurchase}
                                disabled={processing}
                                className="w-full flex items-center justify-center py-4 px-6 rounded-2xl text-white font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                            >
                                {processing ? (
                                    <Loader className="animate-spin h-6 w-6" />
                                ) : (
                                    <>
                                        Continue to Payment <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </button>
                            
                            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                                <span>Secure payment powered by Razorpay</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
