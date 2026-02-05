import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const isSuccess = type === 'success';

    return (
        <div className={`fixed top-20 right-4 z-[60] flex items-center p-4 rounded-xl shadow-2xl border animate-slide-in backdrop-blur-sm ${isSuccess
                ? 'bg-white/95 dark:bg-gray-800/95 border-green-500/50 text-gray-800 dark:text-white'
                : 'bg-white/95 dark:bg-gray-800/95 border-red-500/50 text-gray-800 dark:text-white'
            }`}>
            <div className={`p-2 rounded-full mr-3 ${isSuccess ? 'bg-green-100 dark:bg-green-900/30 text-green-500' : 'bg-red-100 dark:bg-red-900/30 text-red-500'
                }`}>
                {isSuccess ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>

            <div className="mr-8">
                <h4 className="font-bold text-sm">{isSuccess ? 'Success' : 'Error'}</h4>
                <p className="text-sm opacity-90">{message}</p>
            </div>

            <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-60 hover:opacity-100"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
