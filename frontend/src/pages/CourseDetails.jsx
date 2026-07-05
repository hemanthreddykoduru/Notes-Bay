import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PlayCircle, Clock, BookOpen, Lock, Loader, Check, Award, Globe, BarChart, ChevronDown, ChevronUp, MonitorPlay, FileText, MonitorSmartphone, HelpCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CourseDetails = () => {
    const { id } = useParams();
    const { user, token, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState({});
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchCourseDetails();
        if (!authLoading && user && token) {
            checkEnrollment();
        }
    }, [id, user, token, authLoading]);

    const fetchCourseDetails = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/courses/${id}`);
            setCourse(data);

            // Expand first module by default
            if (data.course_modules?.length > 0) {
                setExpandedModules({ [data.course_modules[0].id]: true });
            }
        } catch (error) {
            console.error('Error fetching course details:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkEnrollment = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/courses/check-enrollment/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEnrolled(data.isEnrolled);
        } catch (error) {
            console.error('Error checking enrollment:', error);
        }
    };

    const toggleModule = (modId) => {
        setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
    };

    const handleEnroll = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (isEnrolled) {
            navigate(`/learn/${course.id}`);
            return;
        }

        setProcessing(true);
        try {
            if (course.price === 0) {
                await axios.post(`${API_URL}/courses/${course.id}/enroll`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsEnrolled(true);
                navigate(`/learn/${course.id}`);
            } else {
                const { data: order } = await axios.post(`${API_URL}/payments/create-course-order`, { courseId: course.id }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const options = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                    amount: order.amount,
                    currency: order.currency,
                    name: 'NotesBay',
                    description: `Enroll in ${course.title}`,
                    order_id: order.id,
                    handler: async function (response) {
                        try {
                            await axios.post(`${API_URL}/payments/verify-course`, {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                courseId: course.id
                            }, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            setIsEnrolled(true);
                            navigate(`/learn/${course.id}`);
                        } catch (verifyError) {
                            console.error('Payment Verification Failed:', verifyError);
                            alert('Payment Verification Failed');
                        }
                    },
                    prefill: { email: user.email },
                    theme: { color: '#4f46e5' },
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            }
        } catch (error) {
            console.error('Enrollment Error:', error);
            alert('Something went wrong during enrollment');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
                <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Course Not Found</h2>
                <Link to="/courses" className="mt-6 text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
                    &larr; Back to Catalog
                </Link>
            </div>
        );
    }

    const totalLessons = course.course_modules?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0;
    const totalQuizzes = course.course_modules?.reduce((acc, mod) => acc + (mod.quizzes?.length || 0), 0) || 0;
    const skills = course.skills || [];
    const learningObjectives = course.learning_objectives || [];
    const requirements = course.requirements || [];

    return (
        <div className="w-full bg-white dark:bg-gray-900 pb-20 relative font-sans">
            {/* Hero Section */}
            <div className="bg-gray-900 text-white pt-12 pb-24 lg:pb-32 lg:pt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:w-2/3 pr-0 lg:pr-12">
                        {/* Breadcrumbs */}
                        <nav className="flex text-sm font-medium text-gray-400 mb-6">
                            <Link to="/courses" className="hover:text-white transition-colors">Courses</Link>
                            <span className="mx-2">&gt;</span>
                            <span className="text-gray-200">{course.level || 'All Levels'}</span>
                        </nav>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight tight-leading mb-4">
                            {course.title}
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl leading-relaxed">
                            {course.description || "Master this subject with our comprehensive video course."}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-300 mb-8">
                            {course.profiles && (
                                <div className="flex items-center text-white">
                                    {course.profiles.avatar_url && (
                                        <img src={course.profiles.avatar_url} alt="Instructor" className="w-8 h-8 rounded-full border border-gray-600 mr-2" />
                                    )}
                                    <span className="font-semibold">{course.profiles.full_name}</span>
                                </div>
                            )}
                            {course.level && (
                                <div className="flex items-center">
                                    <BarChart className="w-4 h-4 mr-1.5" />
                                    <span>{course.level}</span>
                                </div>
                            )}
                            {course.language && (
                                <div className="flex items-center">
                                    <Globe className="w-4 h-4 mr-1.5" />
                                    <span>{course.language}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 lg:-mt-24 relative z-10">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                    {/* Left Column: Course Details */}
                    <div className="lg:w-2/3 space-y-12">

                        {/* Mobile Action Card (Only visible on small screens) */}
                        <div className="lg:hidden bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <div className="relative aspect-video">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <MonitorPlay className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="flex flex-col mb-4">
                                    {course.original_price && Number(course.original_price) > Number(course.price) && (
                                        <span className="text-lg text-gray-400 dark:text-gray-500 line-through font-normal">
                                            ₹{course.original_price}
                                        </span>
                                    )}
                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                        {course.price > 0 ? `₹${course.price}` : 'Free'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleEnroll}
                                    disabled={processing}
                                    className={`w-full py-3.5 text-white font-bold rounded-lg shadow-md transition-colors text-lg ${processing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {processing ? 'Processing...' : isEnrolled ? 'Go to Course' : 'Enroll Now'}
                                </button>
                                {course.offer_text && (
                                    <p className="text-center text-sm font-semibold text-green-600 dark:text-green-400 mt-2">
                                        {course.offer_text}
                                    </p>
                                )}

                            </div>
                        </div>

                        {/* What you'll learn */}
                        {learningObjectives.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 sm:p-8 rounded-xl">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">What you'll learn</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    {learningObjectives.map((obj, i) => (
                                        <div key={i} className="flex items-start">
                                            <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3 shrink-0 mt-0.5" />
                                            <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{obj}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Skills you'll gain</h2>
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill, i) => (
                                        <span key={i} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold border border-indigo-100 dark:border-indigo-800">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Requirements */}
                        {requirements.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Requirements</h2>
                                <ul className="list-disc pl-5 space-y-2">
                                    {requirements.map((req, i) => (
                                        <li key={i} className="text-gray-700 dark:text-gray-300">{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Program Outline */}
                        {course.program_outline && course.program_outline.length > 0 && (
                            <div className="mb-12">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Program Outline</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {course.program_outline.map((card, idx) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                            {card.tag && (
                                                <p className="text-[#3b82f6] dark:text-blue-400 font-semibold text-sm mb-2">{card.tag}</p>
                                            )}
                                            {card.title && (
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{card.title}</h3>
                                            )}
                                            {card.description && (
                                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                                                    {card.description}
                                                </p>
                                            )}
                                            {card.bullets && (
                                                <ul className="space-y-3">
                                                    {card.bullets.split('\n').filter(b => b.trim()).map((bullet, bIdx) => (
                                                        <li key={bIdx} className="flex items-start">
                                                            <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mt-2 mr-3"></span>
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{bullet.trim()}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Syllabus */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course Curriculum</h2>
                                <div className="text-sm text-gray-500">
                                    {course.course_modules?.length || 0} sections • {totalLessons} lessons
                                </div>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                                {course.course_modules?.length > 0 ? (
                                    course.course_modules.map((module, index) => (
                                        <div key={module.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                                            <button
                                                onClick={() => toggleModule(module.id)}
                                                className="w-full flex items-center justify-between p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {expandedModules[module.id] ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Section {index + 1}: {module.title}</h3>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500 whitespace-nowrap hidden sm:block">
                                                    {module.lessons?.length || 0} lessons {module.quizzes?.length > 0 && `• ${module.quizzes.length} quiz`}
                                                </div>
                                            </button>

                                            {expandedModules[module.id] && (
                                                <div className="bg-white dark:bg-gray-900 px-4 sm:px-6 py-2">
                                                    <ul className="py-2 space-y-1">
                                                        {module.lessons?.map((lesson, lIndex) => (
                                                            <li key={lesson.id} className="flex items-center justify-between py-2 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded -mx-2 group">
                                                                <div className="flex items-center">
                                                                    <MonitorPlay className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                                                                    <span className={`text-sm ${lesson.is_free_preview ? 'text-indigo-600 dark:text-indigo-400 font-medium underline cursor-pointer' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                        {lesson.title}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center text-sm text-gray-500">
                                                                    {lesson.is_free_preview && <span className="mr-3 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded font-semibold hidden sm:inline-block">Preview</span>}
                                                                    {lesson.duration_seconds > 0 ? (
                                                                        <span>{Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, '0')}</span>
                                                                    ) : (
                                                                        <Lock className="w-3.5 h-3.5" />
                                                                    )}
                                                                </div>
                                                            </li>
                                                        ))}
                                                        {module.quizzes?.map((quiz) => (
                                                            <li key={quiz.id} className="flex items-center justify-between py-2 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded -mx-2">
                                                                <div className="flex items-center">
                                                                    <HelpCircle className="w-4 h-4 text-purple-500 mr-3 shrink-0" />
                                                                    <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">Quiz: {quiz.title}</span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 font-medium">
                                                                    {quiz.passing_score_percentage}% to pass
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        Curriculum details coming soon.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Action Card (Desktop) */}
                    <div className="hidden lg:block lg:w-1/3">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 sticky top-24">
                            <div className="relative aspect-video group cursor-pointer">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <MonitorPlay className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <PlayCircle className="w-16 h-16 text-white drop-shadow-lg" />
                                </div>
                                <div className="absolute bottom-4 font-bold text-sm text-center w-full text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                                    Preview this course
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex flex-col mb-6">
                                    {course.original_price && Number(course.original_price) > Number(course.price) && (
                                        <span className="text-xl text-gray-400 dark:text-gray-500 line-through font-normal">
                                            ₹{course.original_price}
                                        </span>
                                    )}
                                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                                        {course.price > 0 ? `₹${course.price}` : 'Free'}
                                    </span>
                                </div>

                                <button
                                    onClick={handleEnroll}
                                    disabled={processing}
                                    className={`w-full py-4 text-white font-bold rounded-lg shadow-md transition-colors text-lg mb-4 ${processing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {processing ? 'Processing...' : isEnrolled ? 'Go to Course' : 'Enroll Now'}
                                </button>
                                {course.offer_text && (
                                    <p className="text-center text-sm font-semibold text-green-600 dark:text-green-400 mb-4 -mt-2">
                                        {course.offer_text}
                                    </p>
                                )}



                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">This course includes:</h4>
                                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                        <li className="flex items-center">
                                            <MonitorPlay className="w-4 h-4 mr-3 text-gray-400" />
                                            {course.estimated_duration ? course.estimated_duration : 'On-demand video'}
                                        </li>
                                        {totalQuizzes > 0 && (
                                            <li className="flex items-center">
                                                <HelpCircle className="w-4 h-4 mr-3 text-gray-400" />
                                                {totalQuizzes} practice quizzes
                                            </li>
                                        )}
                                        <li className="flex items-center">
                                            <FileText className="w-4 h-4 mr-3 text-gray-400" />
                                            Assignments
                                        </li>
                                        <li className="flex items-center">
                                            <MonitorSmartphone className="w-4 h-4 mr-3 text-gray-400" />
                                            Access on mobile and TV
                                        </li>
                                        <li className="flex items-center">
                                            <Award className="w-4 h-4 mr-3 text-gray-400" />
                                            Certificate of completion
                                        </li>
                                    </ul>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                                    <a href="#" className="text-sm font-semibold text-indigo-600 hover:underline">Share</a>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <a href="#" className="text-sm font-semibold text-indigo-600 hover:underline">Gift this course</a>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
};

export default CourseDetails;
