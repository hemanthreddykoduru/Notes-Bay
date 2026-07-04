import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import axios from 'axios';
import { PlayCircle, CheckCircle, ChevronLeft, Menu, X, Loader, HelpCircle, FileText, MessageCircle, User, Download, Lock, Send, Reply } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

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
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionIndex: optionIndex }
    const [completedItems, setCompletedItems] = useState([]); // Track completed IDs

    // Q&A State
    const [questions, setQuestions] = useState([]);
    const [newQuestionText, setNewQuestionText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [replyingToId, setReplyingToId] = useState(null);
    const [loadingQA, setLoadingQA] = useState(false);
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingAnswerId, setEditingAnswerId] = useState(null);
    const [editAnswerText, setEditAnswerText] = useState('');

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

    useEffect(() => {
        const checkRole = async () => {
            if (user) {
                const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                if (data?.role === 'admin') setIsAdmin(true);
            }
        };
        checkRole();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'qa' && id) fetchQA();
    }, [activeTab, id]);

    const fetchQA = async () => {
        setLoadingQA(true);
        try {
            const { data } = await axios.get(`${API_URL}/qa/course/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuestions(data);
        } catch (error) {
            console.error('Failed to load QA', error);
        } finally {
            setLoadingQA(false);
        }
    };

    const handlePostQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestionText.trim()) return;
        try {
            const { data } = await axios.post(`${API_URL}/qa/course/${id}`, {
                content: newQuestionText,
                lesson_id: activeItem?.id
            }, { headers: { Authorization: `Bearer ${token}` } });
            setQuestions([data, ...questions]);
            setNewQuestionText('');
            setShowQuestionForm(false);
        } catch (error) {
            console.error('Failed to post question', error);
            alert('Failed to post question');
        }
    };

    const handlePostReply = async (e, questionId) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        try {
            const { data } = await axios.post(`${API_URL}/qa/reply/${questionId}`, {
                content: replyText
            }, { headers: { Authorization: `Bearer ${token}` } });

            setQuestions(questions.map(q => {
                if (q.id === questionId) {
                    return { ...q, course_answers: [...(q.course_answers || []), data] };
                }
                return q;
            }));
            setReplyText('');
            setReplyingToId(null);
        } catch (error) {
            console.error('Failed to post reply', error);
            alert('Failed to post reply');
        }
    };

    const handleEditAnswer = async (e, questionId, answerId) => {
        e.preventDefault();
        if (!editAnswerText.trim()) return;
        try {
            const { data } = await axios.put(`${API_URL}/qa/reply/${answerId}`, {
                content: editAnswerText
            }, { headers: { Authorization: `Bearer ${token}` } });

            setQuestions(questions.map(q => {
                if (q.id === questionId) {
                    return {
                        ...q,
                        course_answers: q.course_answers.map(a =>
                            a.id === answerId ? data : a
                        )
                    };
                }
                return q;
            }));
            setEditingAnswerId(null);
            setEditAnswerText('');
        } catch (error) {
            console.error('Failed to edit reply', error);
            alert('Failed to edit reply');
        }
    };

    const handleDeleteAnswer = async (questionId, answerId) => {
        if (!window.confirm('Are you sure you want to delete this reply?')) return;
        try {
            await axios.delete(`${API_URL}/qa/reply/${answerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setQuestions(questions.map(q => {
                if (q.id === questionId) {
                    return {
                        ...q,
                        course_answers: q.course_answers.filter(a => a.id !== answerId)
                    };
                }
                return q;
            }));
        } catch (error) {
            console.error('Failed to delete reply', error);
            alert('Failed to delete reply');
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
        console.log("handleQuizFinish called. activeItem:", activeItem);
        if (!activeItem || !activeItem.questions || activeItem.questions.length === 0) {
            console.log("No questions found, setting perfect score.");
            setQuizScore(100);
            setQuizState('results');
            handleItemComplete();
            return;
        }

        let correct = 0;
        activeItem.questions.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.correctOptionIndex) {
                correct++;
            }
        });

        const score = Math.round((correct / activeItem.questions.length) * 100);
        setQuizScore(score);
        setQuizState('results');

        if (score >= activeItem.passing_score_percentage) {
            handleItemComplete();
        }
    };

    const handleQuizNextItem = () => {
        // Find next item in current module
        let foundCurrent = false;
        let nextItemToLoad = null;

        for (const module of course.course_modules || []) {
            const allItems = [...(module.lessons || []), ...(module.quizzes || [])]
                .sort((a, b) => a.order_index - b.order_index);

            for (const item of allItems) {
                if (foundCurrent) {
                    nextItemToLoad = item;
                    break;
                }
                if (item.id === activeItem.id && item.type === activeItem.type) {
                    foundCurrent = true;
                }
            }
            if (nextItemToLoad) break;
        }

        if (nextItemToLoad) {
            setActiveItem(nextItemToLoad);
            setQuizState('intro');
            setCurrentQuestionIndex(0);
            setSelectedAnswers({});
        } else {
            navigate('/my-learning');
        }
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
                            {activeItem.video_url && getYoutubeEmbedUrl(activeItem.video_url) ? (
                                <iframe
                                    key={`iframe-${activeItem.id}`}
                                    src={getYoutubeEmbedUrl(activeItem.video_url)}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={activeItem.title}
                                ></iframe>
                            ) : (activeItem.video_ticket || activeItem.video_url) ? (
                                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black" onContextMenu={(e) => e.preventDefault()}>
                                    <video
                                        key={`video-${activeItem.id}`}
                                        controls
                                        controlsList="nodownload"
                                        disablePictureInPicture
                                        className="w-full h-full object-contain"
                                        src={activeItem.video_ticket ? `${API_URL}/courses/proxy-video?ticket=${activeItem.video_ticket}` : activeItem.video_url?.trim()}
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
                            {console.log("Rendering Quiz Block. State:", quizState, "Item:", activeItem)}
                            {quizState === 'intro' && (
                                <div className="text-center max-w-lg">
                                    <HelpCircle className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                                    <h2 className="text-3xl font-bold text-white mb-4">Quiz: {activeItem.title}</h2>
                                    <p className="text-gray-400 mb-8">Test your knowledge to ensure you've grasped the concepts from this section. Passing score: <span className="text-white font-bold">{activeItem.passing_score_percentage}%</span></p>
                                    <button onClick={() => {
                                        setQuizState('playing');
                                        setCurrentQuestionIndex(0);
                                        setSelectedAnswers({});
                                    }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/30">
                                        Start Quiz
                                    </button>
                                </div>
                            )}
                            {quizState === 'playing' && (
                                <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-xl">
                                    {(!activeItem.questions || activeItem.questions.length === 0) ? (
                                        <div className="text-center text-gray-400 py-10">
                                            <p className="mb-4">This quiz has no questions yet.</p>
                                            <button onClick={handleQuizFinish} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors">
                                                Finish Quiz
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center text-gray-400 text-sm font-semibold mb-6 pb-4 border-b border-gray-700">
                                                <span>Question {currentQuestionIndex + 1} of {activeItem.questions.length}</span>
                                                <span>Passing: {activeItem.passing_score_percentage}%</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-8">{activeItem.questions[currentQuestionIndex].text}</h3>
                                            <div className="space-y-4">
                                                {activeItem.questions[currentQuestionIndex].options.map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestionIndex]: i })}
                                                        className={`w-full text-left p-5 rounded-lg border-2 transition-all duration-200 ${selectedAnswers[currentQuestionIndex] === i
                                                            ? 'bg-indigo-600/20 border-indigo-500 text-white relative pl-12'
                                                            : 'bg-gray-700/30 hover:bg-gray-700 border-gray-600 hover:border-gray-500 text-gray-300'
                                                            }`}
                                                    >
                                                        {selectedAnswers[currentQuestionIndex] === i && (
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                                            </div>
                                                        )}
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="mt-10 flex justify-end">
                                                {currentQuestionIndex < activeItem.questions.length - 1 ? (
                                                    <button
                                                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                                        disabled={selectedAnswers[currentQuestionIndex] === undefined}
                                                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors"
                                                    >
                                                        Next Question <ChevronRight className="w-4 h-4 ml-1 inline" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleQuizFinish}
                                                        disabled={selectedAnswers[currentQuestionIndex] === undefined}
                                                        className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-600/20"
                                                    >
                                                        Submit Answers
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {quizState === 'results' && (
                                <div className={`text-center max-w-lg bg-gray-800 p-10 rounded-xl border-2 ${quizScore >= activeItem.passing_score_percentage ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-red-500/50 shadow-lg shadow-red-500/10'}`}>
                                    {quizScore >= activeItem.passing_score_percentage ? (
                                        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                                    ) : (
                                        <X className="w-20 h-20 text-red-500 mx-auto mb-6" />
                                    )}
                                    <h2 className="text-4xl font-black text-white mb-2">{quizScore >= activeItem.passing_score_percentage ? 'Passed!' : 'Try Again'}</h2>
                                    <p className="text-gray-300 text-lg mb-8">You scored <span className="font-bold text-white">{quizScore}%</span>. The passing score is {activeItem.passing_score_percentage}%.</p>
                                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                                        <button onClick={() => setQuizState('intro')} className="px-6 py-3 border-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 rounded-lg transition-colors font-bold">
                                            Retake Quiz
                                        </button>
                                        {quizScore >= activeItem.passing_score_percentage && (
                                            <button onClick={handleQuizNextItem} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold shadow-md shadow-indigo-600/30">
                                                Continue Learning
                                            </button>
                                        )}
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
                                </div>
                            )}

                            {activeTab === 'qa' && (
                                <div className="animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Questions & Answers</h3>
                                        <button
                                            onClick={() => setShowQuestionForm(!showQuestionForm)}
                                            className="text-sm font-semibold border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            {showQuestionForm ? 'Cancel' : 'Ask a Question'}
                                        </button>
                                    </div>

                                    {showQuestionForm && (
                                        <form onSubmit={handlePostQuestion} className="mb-8 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                            <textarea
                                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                                rows="3"
                                                placeholder="What do you want to ask?"
                                                value={newQuestionText}
                                                onChange={(e) => setNewQuestionText(e.target.value)}
                                            ></textarea>
                                            <div className="flex justify-end mt-2">
                                                <button
                                                    type="submit"
                                                    disabled={!newQuestionText.trim()}
                                                    className="flex items-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                                >
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Post Question
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {loadingQA ? (
                                        <div className="flex justify-center py-12"><Loader className="w-8 h-8 text-indigo-500 animate-spin" /></div>
                                    ) : questions.length > 0 ? (
                                        <div className="space-y-6">
                                            {questions.map((q) => (
                                                <div key={q.id} className="flex gap-4">
                                                    {q.profiles?.avatar_url ? (
                                                        <img src={q.profiles.avatar_url} alt="User" className="w-10 h-10 rounded-full shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full shrink-0 flex items-center justify-center font-bold text-gray-500">
                                                            {q.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                                            {q.profiles?.full_name || 'Student'}
                                                            <span className="text-xs text-gray-500 font-normal ml-2">
                                                                {new Date(q.created_at).toLocaleDateString()}
                                                            </span>
                                                        </h4>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 mb-2 whitespace-pre-wrap">{q.content}</p>

                                                        {/* Answers */}
                                                        {q.course_answers?.map(a => (
                                                            <div key={a.id} className="flex gap-4 mt-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                                                {a.profiles?.avatar_url ? (
                                                                    <img src={a.profiles.avatar_url} alt="Instructor" className="w-8 h-8 rounded-full shrink-0" />
                                                                ) : (
                                                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full shrink-0 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-xs border border-indigo-200 dark:border-indigo-800">
                                                                        {a.profiles?.full_name?.[0]?.toUpperCase() || 'IN'}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                                        {a.profiles?.full_name || 'Instructor'}
                                                                        {a.is_instructor_reply && <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] px-2 py-0.5 rounded ml-2">Instructor</span>}
                                                                        <span className="text-xs text-gray-500 font-normal ml-2">{new Date(a.created_at).toLocaleDateString()}</span>
                                                                    </h4>
                                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{a.content}</p>

                                                                    {/* Edit/Delete Actions */}
                                                                    {(isAdmin || user?.id === a.user_id) && editingAnswerId !== a.id && (
                                                                        <div className="flex gap-3 mt-2">
                                                                            <button onClick={() => { setEditingAnswerId(a.id); setEditAnswerText(a.content); }} className="text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">Edit</button>
                                                                            <button onClick={() => handleDeleteAnswer(q.id, a.id)} className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:hover:text-red-400">Delete</button>
                                                                        </div>
                                                                    )}

                                                                    {/* Edit Form */}
                                                                    {editingAnswerId === a.id && (
                                                                        <form onSubmit={(e) => handleEditAnswer(e, q.id, a.id)} className="mt-3 flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                value={editAnswerText}
                                                                                onChange={(e) => setEditAnswerText(e.target.value)}
                                                                                autoFocus
                                                                            />
                                                                            <button type="submit" disabled={!editAnswerText.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-xs font-medium">Save</button>
                                                                            <button type="button" onClick={() => setEditingAnswerId(null)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1.5 rounded-md text-xs font-medium">Cancel</button>
                                                                        </form>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Reply Form Trigger (Admins only) */}
                                                        {isAdmin && replyingToId !== q.id && (
                                                            <button
                                                                onClick={() => setReplyingToId(q.id)}
                                                                className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center"
                                                            >
                                                                <Reply className="w-3 h-3 mr-1" /> Reply
                                                            </button>
                                                        )}

                                                        {/* Reply Form */}
                                                        {replyingToId === q.id && (
                                                            <form onSubmit={(e) => handlePostReply(e, q.id)} className="mt-4 flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                    placeholder="Type your reply..."
                                                                    value={replyText}
                                                                    onChange={(e) => setReplyText(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <button type="submit" disabled={!replyText.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded-md text-sm font-medium">
                                                                    Send
                                                                </button>
                                                                <button type="button" onClick={() => setReplyingToId(null)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-2 rounded-md text-sm font-medium">
                                                                    Cancel
                                                                </button>
                                                            </form>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No questions yet</h3>
                                            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                                Be the first to ask a question! Your instructor and peers will be able to answer it.
                                            </p>
                                        </div>
                                    )}
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
