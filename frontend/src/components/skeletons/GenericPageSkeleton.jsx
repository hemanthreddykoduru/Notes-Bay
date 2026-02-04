
export default function GenericPageSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
            <div className="max-w-3xl mx-auto">
                {/* Title */}
                <div className="h-10 sm:h-12 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-lg mb-8"></div>

                {/* Paragraphs */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>

                    <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mt-8 mb-4"></div>

                    <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-11/12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>

                    <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
