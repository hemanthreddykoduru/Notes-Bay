import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader, CheckCircle, Clock } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import api from '../lib/api';

export default function Services() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const { data } = await api.get('/services');
                setServices(data);
            } catch (error) {
                console.error('Error fetching services:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <Navbar />
            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-4">
                        Premium Services
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Hire experts to help you achieve your goals faster. Browse our specialized services below.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader className="animate-spin h-10 w-10 text-indigo-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service) => (
                            <Link 
                                to={`/services/${service.id}`} 
                                key={service.id}
                                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700/50 flex flex-col h-full transform hover:-translate-y-1"
                            >
                                <div className="aspect-video w-full overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
                                    {service.thumbnail_url ? (
                                        <img 
                                            src={service.thumbnail_url} 
                                            alt={service.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-500/20 to-purple-500/20">
                                            <span className="text-indigo-300 font-semibold">Service</span>
                                        </div>
                                    )}
                                    {service.offer_text && (
                                        <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                            {service.offer_text}
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 flex flex-col flex-grow">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                                        {service.title}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">
                                        {service.description}
                                    </p>
                                    
                                    {service.turnaround_time && (
                                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-4 bg-indigo-50 dark:bg-indigo-900/30 w-fit px-2.5 py-1 rounded-md">
                                            <Clock className="h-3.5 w-3.5" />
                                            Turnaround: {service.turnaround_time}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                        <div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Starting at</span>
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-black text-gray-900 dark:text-white">
                                                    ₹{service.variants?.length > 0 ? Math.min(...service.variants.map(v => v.price)) : service.price}
                                                </span>
                                                {service.original_price > (service.variants?.length > 0 ? Math.min(...service.variants.map(v => v.price)) : service.price) && (
                                                    <span className="text-sm text-gray-400 line-through mb-1">
                                                        ₹{service.original_price}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white text-gray-400 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                {!loading && services.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <p className="text-gray-500 dark:text-gray-400">No services are currently available.</p>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
