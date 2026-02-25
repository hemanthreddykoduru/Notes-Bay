import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Clock, Loader, PlayCircle, BarChart, Globe, Search, Filter } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Courses = () => {
    const [allCourses, setAllCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('All');
    const [selectedLanguage, setSelectedLanguage] = useState('All');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/courses`);
            setAllCourses(data);
            setFilteredCourses(data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = allCourses;

        if (searchQuery) {
            result = result.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (selectedLevel !== 'All') {
            result = result.filter(c => c.level === selectedLevel);
        }
        if (selectedLanguage !== 'All') {
            result = result.filter(c => c.language === selectedLanguage);
        }

        setFilteredCourses(result);
    }, [searchQuery, selectedLevel, selectedLanguage, allCourses]);

    // Extract unique languages and levels for filters
    const languages = ['All', ...new Set(allCourses.map(c => c.language).filter(Boolean))];
    const levels = ['All', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'];


    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-12">
            {/* Header Banner */}
            <div className="bg-indigo-900 text-white py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-extrabold sm:text-5xl lg:text-6xl tracking-tight">
                        Explore Our Catalog
                    </h1>
                    <p className="mt-4 text-xl sm:text-2xl text-indigo-200 max-w-3xl">
                        Gain new skills, earn certificates, and advance your career with world-class courses.
                    </p>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 shrink-0">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
                        <div className="flex items-center gap-2 mb-6 text-gray-900 dark:text-white font-bold text-lg border-b border-gray-100 dark:border-gray-700 pb-3">
                            <Filter className="w-5 h-5" />
                            Filters
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Level</label>
                            <div className="space-y-2">
                                {levels.map(lvl => (
                                    <label key={lvl} className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="level"
                                            value={lvl}
                                            checked={selectedLevel === lvl}
                                            onChange={() => setSelectedLevel(lvl)}
                                            className="mr-2 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                        />
                                        {lvl}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Language</label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {languages.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </aside>

                {/* Course List */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    ) : filteredCourses.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No courses found</h3>
                            <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search query.</p>
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedLanguage('All'); setSelectedLevel('All'); }}
                                className="mt-4 text-indigo-600 font-medium hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-4">
                                Showing {filteredCourses.length} {filteredCourses.length === 1 ? 'result' : 'results'}
                            </div>
                            {filteredCourses.map((course) => (
                                <Link
                                    key={course.id}
                                    to={`/courses/${course.id}`}
                                    className="group flex flex-col sm:flex-row bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300"
                                >
                                    <div className="relative w-full sm:w-64 h-48 sm:h-auto shrink-0 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                        {course.thumbnail_url ? (
                                            <img
                                                src={course.thumbnail_url}
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <PlayCircle className="w-12 h-12 text-gray-400" />
                                            </div>
                                        )}
                                        {course.price === 0 && (
                                            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded shadow-sm">
                                                FREE
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col flex-1 p-6">
                                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {course.title}
                                        </h3>
                                        <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-2 text-sm leading-relaxed">
                                            {course.description || 'No description provided.'}
                                        </p>

                                        <div className="flex items-center gap-4 mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {course.level && (
                                                <div className="flex items-center">
                                                    <BarChart className="w-4 h-4 mr-1.5" /> {course.level}
                                                </div>
                                            )}
                                            {course.estimated_duration && (
                                                <div className="flex items-center">
                                                    <Clock className="w-4 h-4 mr-1.5" /> {course.estimated_duration}
                                                </div>
                                            )}
                                            {course.language && (
                                                <div className="flex items-center">
                                                    <Globe className="w-4 h-4 mr-1.5" /> {course.language}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-6 flex items-center justify-between">
                                            <div className="flex flex-col sm:flex-row sm:items-center text-sm gap-2">
                                                {course.profiles?.avatar_url && (
                                                    <img src={course.profiles.avatar_url} alt="Instructor" className="w-6 h-6 rounded-full" />
                                                )}
                                                <span className="text-gray-900 dark:text-gray-200 font-semibold">{course.profiles?.full_name || 'Expert Instructor'}</span>
                                                {course.profiles?.title && (
                                                    <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">- {course.profiles.title}</span>
                                                )}
                                            </div>
                                            <div className="text-xl font-black text-gray-900 dark:text-white">
                                                {course.price > 0 ? `₹${course.price}` : 'Free'}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Courses;
