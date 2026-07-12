import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import Toast from '../components/common/Toast';

export default function ServiceOnboarding() {
    const { id, orderId } = useParams();
    const navigate = useNavigate();
    const [service, setService] = useState(null);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    navigate('/login');
                    return;
                }

                // Fetch Service Details (we only really need the questions)
                const { data: serviceData } = await api.get(`/services/${id}`);
                setService(serviceData);

                // Check if this order actually belongs to the user and hasn't been onboarded yet
                const { data: orderData } = await api.get(`/service-orders/${orderId}`);
                
                setOrder(orderData);
                
                // If order status is already 'in_progress' or 'completed', they already filled the form
                if (orderData.status !== 'pending') {
                    setCompleted(true);
                }
            } catch (error) {
                console.error('Error fetching onboarding details:', error);
                setToast({ message: 'Error loading page', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, orderId, navigate]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post(`/service-orders/${orderId}/onboard`, { answers });
            
            setCompleted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Submit Error:', error);
            setToast({ message: error.message || 'Something went wrong', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
                <div className="flex-grow flex justify-center items-center">
                    <Loader className="animate-spin h-10 w-10 text-indigo-500" />
                </div>
            </div>
        );
    }

    if (completed) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-10 text-center max-w-md w-full border border-gray-100 dark:border-gray-700">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">All Set!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            We have received your details. The team will start working on your service request immediately.
                        </p>
                        <button 
                            onClick={() => navigate('/learning')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors w-full"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    if (!service || (!service.questions || service.questions.length === 0)) {
        // No questions for this service, automatically mark as completed
        return (
             <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
                <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Your order has been placed. No further details are needed.</p>
                    <button onClick={() => navigate('/learning')} className="bg-indigo-600 text-white py-2 px-6 rounded-lg">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">Almost there!</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Please provide a few details so we can fulfill your order for <span className="font-semibold text-indigo-600 dark:text-indigo-400">{service.title}</span>.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700/50 p-6 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {service.questions.map((q, index) => (
                            <div key={q.id}>
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                    {index + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}
                                </label>
                                
                                {q.type === 'textarea' ? (
                                    <textarea 
                                        required={q.required}
                                        rows="4"
                                        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Type your answer here..."
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    />
                                ) : q.type === 'date' ? (
                                    <input 
                                        type="date"
                                        required={q.required}
                                        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    />
                                ) : (
                                    <input 
                                        type={q.type === 'url' ? 'url' : 'text'}
                                        required={q.required}
                                        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder={q.type === 'url' ? 'https://...' : 'Your answer...'}
                                        value={answers[q.id] || ''}
                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}

                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-white font-bold text-lg bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all duration-200 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader className="animate-spin h-6 w-6" />
                                ) : (
                                    <>
                                        Submit Details <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
