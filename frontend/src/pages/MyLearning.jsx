import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PlayCircle, Award, Loader, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MyLearning = () => {
    const { user, token, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, in-progress, completed

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/');
            return;
        }
        fetchMyLearning();
    }, [user, authLoading]);

    const fetchMyLearning = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/courses/my-learning`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEnrollments(data);
        } catch (error) {
            console.error('Error fetching my learning:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEnrollments = enrollments.filter(course => {
        if (activeTab === 'completed') return course.progress_percentage === 100;
        if (activeTab === 'in-progress') return course.progress_percentage < 100 && course.progress_percentage > 0;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <div className="bg-indigo-900 text-white py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">My Learning</h1>
                    <p className="text-indigo-200">Track your progress and pick up where you left off.</p>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Tabs */}
                <div className="flex space-x-8 border-b border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
                    {['all', 'in-progress', 'completed'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === tab
                                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab === 'all' ? 'All Courses' : tab === 'in-progress' ? 'In Progress' : 'Completed'}
                            <span className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-0.5 px-2.5 rounded-full text-xs">
                                {tab === 'all'
                                    ? enrollments.length
                                    : enrollments.filter(c => tab === 'completed' ? c.progress_percentage === 100 : c.progress_percentage < 100 && c.progress_percentage > 0).length}
                            </span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
                    </div>
                ) : filteredEnrollments.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center max-w-2xl mx-auto mt-12">
                        <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            {activeTab === 'all'
                                ? "You haven't enrolled in any courses yet."
                                : `You don't have any courses ${activeTab.replace('-', ' ')}.`}
                        </p>
                        {activeTab === 'all' && (
                            <Link to="/courses" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                                Explore Courses
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-x-8 md:gap-y-12">
                        {filteredEnrollments.map((course) => (
                            <div key={course.id} className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                                <Link to={`/learn/${course.id}`} className="block relative aspect-video bg-gray-200 dark:bg-gray-700 overflow-hidden group">
                                    {course.thumbnail_url ? (
                                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <PlayCircle className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <PlayCircle className="w-16 h-16 text-white drop-shadow-md" />
                                    </div>
                                </Link>

                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                                        <Link to={`/learn/${course.id}`}>{course.title}</Link>
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                        {course.profiles?.full_name || 'Instructor'}
                                    </p>

                                    <div className="mt-auto">
                                        <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            <span>{course.progress_percentage}% Complete</span>
                                            {course.progress_percentage === 100 ? (
                                                <span className="flex items-center text-green-600 dark:text-green-400">
                                                    <Award className="w-4 h-4 mr-1" /> Earned Certificate
                                                </span>
                                            ) : (
                                                <span>{course.completed_lessons} / {course.total_lessons} lessons</span>
                                            )}
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
                                            <div
                                                className={`h-2 rounded-full ${course.progress_percentage === 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
                                                style={{ width: `${course.progress_percentage}%` }}
                                            ></div>
                                        </div>

                                        <Link
                                            to={`/learn/${course.id}`}
                                            className={`w-full block text-center py-2.5 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${course.progress_percentage === 100
                                                ? 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-gray-500'
                                                : 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                                                }`}
                                        >
                                            {course.progress_percentage === 0 ? 'Start Course' : course.progress_percentage === 100 ? 'Review Materials' : 'Resume Learning'}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MyLearning;
