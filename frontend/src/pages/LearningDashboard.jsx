import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import axios from 'axios';
import { PlayCircle, CheckCircle, ChevronLeft, Menu, X, Loader, HelpCircle, FileText, MessageCircle, User, Download, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LearningDashboard = () => {
    const { id } = useParams(); // Course ID
    const { user, token, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [activeItem, setActiveItem] = useState(null); // Can be a lesson or quiz
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, q&a, downloads
    const [quizState, setQuizState] = useState('intro'); // intro, playing, results
    const [quizScore, setQuizScore] = useState(0);
    const [completedItems, setCompletedItems] = useState([]); // Track completed IDs

    const videoRef = useRef(null);

    // Helper to safely extract YouTube Embed URLs to bypass adblocker script blocking,
    // and also handles if the user pastes raw <iframe src="..."> code from YouTube directly.
    const getYoutubeEmbedUrl = (url) => {
        if (!url) return null;
        try {
            // Check if it's a raw iframe embed code
            if (url.includes('<iframe')) {
                const srcMatch = url.match(/src="([^"]+)"/);
                if (srcMatch && srcMatch[1]) {
                    // Extract just the URL part
                    url = srcMatch[1];
                }
            }

            const urlObj = new URL(url);
            if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
                if (urlObj.pathname.startsWith('/embed/')) {
                    return url; // Already an embed URL
                }
                const videoId = urlObj.searchParams.get('v');
                if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0`;
            } else if (urlObj.hostname === 'youtu.be') {
                const videoId = urlObj.pathname.slice(1);
                if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0`;
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/login');
            return;
        }
        fetchCourseData();
    }, [id, user, authLoading]);

    const fetchCourseData = async () => {
        try {
            // Hit the secure endpoint that validates enrollment and returns secure URLs
            const { data } = await axios.get(`${API_URL}/courses/${id}/learn`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourse(data);

            // Fetch progress
            try {
                const { data: progressData } = await axios.get(`${API_URL}/courses/${id}/progress`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (progressData?.completedIds) {
                    setCompletedItems(progressData.completedIds);
                }
            } catch (pErr) {
                console.error('Error fetching progress:', pErr);
            }

            if (data.course_modules?.[0]) {
                const firstModule = data.course_modules[0];
                if (firstModule.lessons?.length > 0) {
                    setActiveItem({ ...firstModule.lessons[0], type: 'lesson' });
                } else if (firstModule.quizzes?.length > 0) {
                    setActiveItem({ ...firstModule.quizzes[0], type: 'quiz' });
                    setQuizState('intro');
                }
            }
        } catch (error) {
            console.error('Error fetching learning data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemComplete = async () => {
        if (!activeItem || completedItems.includes(activeItem.id)) return;

        try {
            await axios.post(`${API_URL}/courses/${id}/progress`, {
                item_id: activeItem.id,
                item_type: activeItem.type
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCompletedItems(prev => [...prev, activeItem.id]);

            // Note: Auto-advance could be implemented here
            console.log(`Marked ${activeItem?.type} ${activeItem?.id} as complete!`);
        } catch (err) {
            console.error('Failed to save progress:', err);
            alert('Failed to save progress. Please try again.');
        }
    };

    const handleQuizFinish = () => {
        setQuizScore(100);
        setQuizState('results');
        handleItemComplete();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <Loader className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
                <h2 className="text-2xl font-bold mb-4">Course not available</h2>
                <Link to="/my-learning" className="text-indigo-400 hover:text-indigo-300">Return to My Learning</Link>
            </div>
        );
    }

    return (
        <div className="relative flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">

            {/* Header / Navbar */}
            <header className="absolute top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 z-20">
                <div className="flex items-center space-x-4">
                    <Link to="/my-learning" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition group flex items-center font-medium">
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        <span className="hidden sm:inline">My Learning</span>
                    </Link>
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2 hidden sm:block"></div>
                    <h1 className="font-bold text-lg truncate max-w-sm sm:max-w-md md:max-w-xl">{course.title}</h1>
                </div>

                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                    {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col pt-16 h-full transition-all duration-300 overflow-y-auto ${sidebarOpen ? 'lg:pr-80' : ''}`}>

                {/* Video Player / Quiz Container */}
                <div className="bg-black w-full">
                    {activeItem?.type === 'lesson' ? (
                        <div key={`video-container-${activeItem.id}`} className="w-full max-w-6xl mx-auto aspect-video relative group bg-black">
                            {getYoutubeEmbedUrl(activeItem.video_url) ? (
                                <iframe
                                    key={`iframe-${activeItem.id}`}
                                    src={getYoutubeEmbedUrl(activeItem.video_url)}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={activeItem.title}
                                ></iframe>
                            ) : activeItem.video_url ? (
                                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
                                    <video
                                        key={`video-${activeItem.id}`}
                                        controls
                                        autoPlay
                                        controlsList="nodownload"
                                        className="w-full h-full object-contain"
                                        src={activeItem.video_url.trim()}
                                        onEnded={handleItemComplete}
                                    >
                                        Your browser does not support the HTML5 video tag.
                                    </video>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-900 border border-gray-800">
                                    <PlayCircle className="w-20 h-20 mb-4 opacity-50" />
                                    <p className="font-semibold text-lg">Video Temporarily Unavailable</p>
                                    <p className="text-sm mt-2 text-gray-500">Awaiting secure signed URL integration.</p>
                                </div>
                            )}
                        </div>
                    ) : activeItem?.type === 'quiz' ? (
                        <div className="w-full max-w-6xl mx-auto py-16 md:py-24 px-4 md:px-8 flex items-center justify-center bg-gray-900 border-b border-gray-800 min-h-[500px]">
                            {quizState === 'intro' && (
                                <div className="text-center max-w-lg">
                                    <HelpCircle className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                                    <h2 className="text-3xl font-bold text-white mb-4">Quiz: {activeItem.title}</h2>
                                    <p className="text-gray-400 mb-8">Test your knowledge to ensure you've grasped the concepts from this section. Passing score: <span className="text-white font-bold">{activeItem.passing_score_percentage}%</span></p>
                                    <button onClick={() => setQuizState('playing')} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                                        Start Quiz
                                    </button>
                                </div>
                            )}
                            {quizState === 'playing' && (
                                <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-xl border border-gray-700">
                                    <div className="flex justify-between items-center text-gray-400 text-sm font-semibold mb-6">
                                        <span>Question 1 of 1</span>
                                        <span>Passing: {activeItem.passing_score_percentage}%</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-6">Which of these best describes this topic?</h3>
                                    <div className="space-y-3">
                                        {['It is a critical component of the system.', 'It is completely optional.', 'It was deprecated recently.', 'None of the above'].map((opt, i) => (
                                            <button key={i} className="w-full text-left p-4 rounded-lg bg-gray-700/50 hover:bg-gray-600 border border-gray-600 hover:border-indigo-500 text-gray-200 transition-colors">
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-8 flex justify-end">
                                        <button onClick={handleQuizFinish} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                                            Submit Answer
                                        </button>
                                    </div>
                                </div>
                            )}
                            {quizState === 'results' && (
                                <div className="text-center max-w-lg bg-gray-800 p-8 rounded-xl border border-gray-700">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2>
                                    <p className="text-gray-300 mb-6">You scored {quizScore}%. The passing score is {activeItem.passing_score_percentage}%.</p>
                                    <div className="flex justify-center gap-4">
                                        <button onClick={() => setQuizState('intro')} className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors font-medium">
                                            Retake Quiz
                                        </button>
                                        <button onClick={() => {
                                            // Auto-advance to next item logic can go here
                                            alert("Advance to next lesson not fully implemented in mock.");
                                        }} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold">
                                            Continue Learning
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-6xl aspect-video bg-gray-900 flex items-center justify-center text-gray-500">
                            Select an item from the curriculum to begin.
                        </div>
                    )}
                </div>

                {/* Content Below Player */}
                {activeItem && (
                    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                {activeItem.type === 'lesson' ? 'Lesson:' : 'Quiz:'} {activeItem.title}
                            </h2>
                            <button
                                onClick={handleItemComplete}
                                disabled={completedItems.includes(activeItem.id)}
                                className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-md font-bold transition-colors shadow-sm
                                    ${completedItems.includes(activeItem.id)
                                        ? 'bg-green-600 text-white cursor-default'
                                        : 'bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900'}`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                <span>{completedItems.includes(activeItem.id) ? 'Completed' : 'Mark Complete'}</span>
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="border-b border-gray-200 dark:border-gray-800 mb-8">
                            <nav className="flex space-x-8 overflow-x-auto">
                                {[
                                    { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4 mr-2 inline" /> },
                                    { id: 'qa', label: 'Q&A', icon: <MessageCircle className="w-4 h-4 mr-2 inline" /> },
                                    { id: 'downloads', label: 'Downloads', icon: <Download className="w-4 h-4 mr-2 inline" /> }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center ${activeTab === tab.id
                                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tabs Content */}
                        <div className="pb-12">
                            {activeTab === 'overview' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About this {activeItem.type}</h3>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {activeItem.description || `In this ${activeItem.type}, we will explore the core concepts related to ${activeItem.title}. Make sure to pay close attention to the examples provided.`}
                                        </p>
                                    </div>

                                    <hr className="border-gray-200 dark:border-gray-800" />

                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Instructor</h3>
                                        <div className="flex items-start">
                                            {course.profiles?.avatar_url ? (
                                                <img src={course.profiles.avatar_url} alt="Instructor" className="w-12 h-12 rounded-full mr-4" />
                                            ) : (
                                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mr-4 shrink-0 border border-indigo-200 dark:border-indigo-800">
                                                    <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-indigo-600 dark:text-indigo-400">{course.profiles?.full_name || 'Instructor Name'}</h4>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{course.profiles?.title || 'Expert Instructor'}</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{course.profiles?.bio || 'Passionate about sharing knowledge and helping students grow.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'qa' && (
                                <div className="animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Questions & Answers</h3>
                                        <button
                                            disabled
                                            className="text-sm font-semibold border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-md bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed transition-colors"
                                            title="Q&A feature coming soon"
                                        >
                                            Ask a Question
                                        </button>
                                    </div>

                                    {/* Empty Q&A State */}
                                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No questions yet</h3>
                                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                            Q&A feature is currently under development. Soon you'll be able to ask the instructor questions here!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'downloads' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Resources for this {activeItem.type}</h3>

                                    {(activeItem.resources || []).length > 0 ? (
                                        (activeItem.resources || []).map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                                <div className="flex items-center">
                                                    <FileText className="w-5 h-5 text-indigo-500 mr-3 shrink-0" />
                                                    <div>
                                                        <p className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">{file.name}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">{file.size}</p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    download={file.name}
                                                    className="p-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors shrink-0"
                                                    title="Download File"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-gray-500 dark:text-gray-400 p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                            No downloadable resources are attached to this lesson.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </main>

            {/* Sidebar (Curriculum) */}
            <aside
                className={`fixed lg:absolute inset-y-0 right-0 z-30 w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out flex flex-col pt-16 h-full ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 shrink-0">
                    <h3 className="font-bold text-gray-900 dark:text-white">Course Content</h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {course?.course_modules?.map((module, mIndex) => (
                        <div key={module.id} className="border-b border-gray-200 dark:border-gray-800">
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10 backdrop-blur-sm">
                                <h4 className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                    Section {mIndex + 1}
                                </h4>
                                <h5 className="font-bold text-gray-900 dark:text-white text-sm">{module.title}</h5>
                                <div className="text-xs text-gray-500 mt-1">
                                    {module.lessons?.length || 0} / {module.lessons?.length || 0} | {module.lessons?.reduce((acc, l) => acc + Math.floor(l.duration_seconds / 60), 0)} min
                                </div>
                            </div>

                            <ul className="py-2">
                                {module.lessons?.map((lesson, lIndex) => {
                                    const isActive = activeItem?.id === lesson.id && activeItem?.type === 'lesson';
                                    const isCompleted = completedItems.includes(lesson.id);
                                    return (
                                        <li key={lesson.id} className="px-2 py-0.5">
                                            <button
                                                onClick={() => {
                                                    setActiveItem({ ...lesson, type: 'lesson' });
                                                    setQuizState('intro');
                                                }}
                                                className={`w-full flex items-start p-3 rounded-md text-left transition-colors ${isActive
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                <div className="mt-0.5 mr-3 shrink-0">
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500 fill-green-100" />
                                                    ) : isActive ? (
                                                        <PlayCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-900/50" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 text-transparent"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{lesson.title}</p>
                                                    <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <PlayCircle className="w-3 h-3 mr-1" />
                                                        {lesson.duration_seconds > 0 ? `${Math.floor(lesson.duration_seconds / 60)} min` : 'Video'}
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}

                                {module.quizzes?.map((quiz, qIndex) => {
                                    const isActive = activeItem?.id === quiz.id && activeItem?.type === 'quiz';
                                    const isCompleted = completedItems.includes(quiz.id);
                                    return (
                                        <li key={`quiz-${quiz.id}`} className="px-2 py-0.5">
                                            <button
                                                onClick={() => {
                                                    setActiveItem({ ...quiz, type: 'quiz' });
                                                    setQuizState('intro');
                                                }}
                                                className={`w-full flex items-start p-3 rounded-md text-left transition-colors ${isActive
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                    }`}
                                            >
                                                <div className="mt-0.5 mr-3 shrink-0">
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500 fill-green-100" />
                                                    ) : isActive ? (
                                                        <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 text-transparent"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>Quiz: {quiz.title}</p>
                                                    <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <HelpCircle className="w-3 h-3 mr-1" />
                                                        Knowledge Check
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-20"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

        </div>
    );
};

export default LearningDashboard;
