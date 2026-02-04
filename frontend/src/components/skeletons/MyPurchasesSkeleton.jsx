
export default function MyPurchasesSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {[1, 2, 3].map((i) => (
                        <li key={i} className="px-4 py-4 sm:px-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="w-full sm:w-2/3">
                                    <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded self-start sm:self-center"></div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
