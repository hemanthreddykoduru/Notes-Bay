import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Pencil, X, ChevronLeft, ChevronDown, ChevronRight, Video, HelpCircle, FileText } from 'lucide-react';

export default function AdminCourseModules({ course, onBack, setToast }) {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState({});

    // Forms state
    const [showModuleForm, setShowModuleForm] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [moduleTitle, setModuleTitle] = useState('');

    const [showLessonForm, setShowLessonForm] = useState(null); // moduleId
    const [editingLesson, setEditingLesson] = useState(null);
    const [lessonData, setLessonData] = useState({ title: '', video_url: '', duration_seconds: '', is_free_preview: false });

    const [showQuizForm, setShowQuizForm] = useState(null); // moduleId
    const [editingQuiz, setEditingQuiz] = useState(null);

    // Resource Upload State
    const [uploadingResourceFor, setUploadingResourceFor] = useState(null);
    const [resourceFile, setResourceFile] = useState(null);
    const [quizData, setQuizData] = useState({ title: '', passing_score_percentage: 80 });

    useEffect(() => {
        fetchCurriculum();
    }, [course.id]);

    const fetchCurriculum = async () => {
        setLoading(true);
        try {
            // Re-fetch course details which includes nested modules and lessons
            const { data } = await api.get(`/courses/${course.id}`);
            setModules(data.course_modules || []);

            // Auto-expand all modules
            const expanded = {};
            (data.course_modules || []).forEach(m => { expanded[m.id] = true; });
            setExpandedModules(expanded);
        } catch (error) {
            console.error('Error fetching curriculum:', error);
            setToast({ message: 'Failed to load curriculum', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (id) => {
        setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- MODULES ---
    const handleModuleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingModule) {
                await api.put(`/courses/modules/${editingModule.id}`, { title: moduleTitle, order_index: editingModule.order_index });
                setToast({ message: 'Module updated!', type: 'success' });
            } else {
                const order_index = modules.length;
                await api.post(`/courses/${course.id}/modules`, { title: moduleTitle, order_index });
                setToast({ message: 'Module added!', type: 'success' });
            }
            setModuleTitle('');
            setShowModuleForm(false);
            setEditingModule(null);
            fetchCurriculum();
        } catch (error) {
            setToast({ message: 'Failed to save module', type: 'error' });
        }
    };

    const deleteModule = async (id) => {
        if (!window.confirm('Delete this module and all its lessons?')) return;
        try {
            await api.delete(`/courses/modules/${id}`);
            setToast({ message: 'Module deleted', type: 'success' });
            fetchCurriculum();
        } catch (error) {
            setToast({ message: 'Failed to delete module', type: 'error' });
        }
    };

    // --- LESSONS ---
    const handleLessonSubmit = async (e, moduleId) => {
        e.preventDefault();
        try {
            const payload = {
                title: lessonData.title,
                video_url: lessonData.video_url,
                duration_seconds: parseInt(lessonData.duration_seconds) || 0,
                is_free_preview: lessonData.is_free_preview,
                order_index: editingLesson ? editingLesson.order_index : (modules.find(m => m.id === moduleId)?.lessons?.length || 0)
            };

            if (editingLesson) {
                await api.put(`/courses/lessons/${editingLesson.id}`, payload);
                setToast({ message: 'Lesson updated!', type: 'success' });
            } else {
                await api.post(`/courses/modules/${moduleId}/lessons`, payload);
                setToast({ message: 'Lesson added!', type: 'success' });
            }

            setLessonData({ title: '', video_url: '', duration_seconds: '', is_free_preview: false });
            setShowLessonForm(null);
            setEditingLesson(null);
            fetchCurriculum();
        } catch (error) {
            setToast({ message: 'Failed to save lesson', type: 'error' });
        }
    };

    const deleteLesson = async (id) => {
        if (!window.confirm('Delete this lesson?')) return;
        try {
            await api.delete(`/courses/lessons/${id}`);
            setToast({ message: 'Lesson deleted', type: 'success' });
            fetchCurriculum();
        } catch (error) {
            setToast({ message: 'Failed to delete lesson', type: 'error' });
        }
    };

    // --- RESOURCES ---
    const handleResourceUpload = async (e, moduleId, lessonId) => {
        e.preventDefault();
        if (!resourceFile) {
            setToast({ message: 'Please select a file first', type: 'error' });
            return;
        }

        setUploadingResourceFor(lessonId);
        const formData = new FormData();
        formData.append('file', resourceFile);

        try {
            await api.post(`/courses/modules/${moduleId}/lessons/${lessonId}/resources`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setToast({ message: 'Resource uploaded!', type: 'success' });
            setResourceFile(null);
            fetchCurriculum(); // Refresh to get the new resources array
        } catch (error) {
            console.error(error);
            setToast({ message: 'Failed to upload resource. Ensure Supabase storage bucket "course-resources" exists and is public.', type: 'error' });
        } finally {
            setUploadingResourceFor(null);
        }
    };

    const handleResourceDelete = async (moduleId, lessonId, key) => {
        if (!window.confirm('Delete this resource permanently?')) return;
        try {
            await api.delete(`/courses/modules/${moduleId}/lessons/${lessonId}/resources`, {
                data: { key }
            });
            setToast({ message: 'Resource deleted', type: 'success' });
            fetchCurriculum();
        } catch (error) {
            console.error(error);
            setToast({ message: 'Failed to delete resource', type: 'error' });
        }
    };

    // --- QUIZZES ---
    const handleQuizSubmit = async (e, moduleId) => {
        e.preventDefault();
        try {
            const payload = {
                title: quizData.title,
                passing_score_percentage: parseInt(quizData.passing_score_percentage) || 80
            };

            if (editingQuiz) {
                await api.put(`/courses/quizzes/${editingQuiz.id}`, payload);
                setToast({ message: 'Quiz updated!', type: 'success' });
            } else {
                await api.post(`/courses/modules/${moduleId}/quizzes`, payload);
                setToast({ message: 'Quiz added!', type: 'success' });
            }

            setQuizData({ title: '', passing_score_percentage: 80 });
            setShowQuizForm(null);
            setEditingQuiz(null);
            fetchCurriculum();
        } catch (error) {
            setToast({ message: 'Failed to save quiz', type: 'error' });
        }
    };

    const deleteQuiz = async (id) => {
        if (!window.confirm('Delete this quiz?')) return;
        try {
            await api.delete(`/courses/quizzes/${id}`);
            setToast({ message: 'Quiz deleted', type: 'success' });
            fetchCurriculum();
        } catch (error) {
            setToast({ message: 'Failed to delete quiz', type: 'error' });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading curriculum...</div>;

    return (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <button onClick={onBack} className="mr-4 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Curriculum Builder</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Course: {course.title}</p>
                </div>
            </div>

            <div className="mb-6">
                <button
                    onClick={() => { setEditingModule(null); setModuleTitle(''); setShowModuleForm(true); }}
                    className="flex items-center text-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-4 py-2 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Module
                </button>
            </div>

            {showModuleForm && (
                <form onSubmit={handleModuleSubmit} className="mb-6 flex items-end gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Module Title</label>
                        <input type="text" required value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)}
                            className="w-full p-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Save</button>
                    <button type="button" onClick={() => setShowModuleForm(false)} className="text-gray-500 px-4 py-2">Cancel</button>
                </form>
            )}

            <div className="space-y-4">
                {modules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">No modules yet. Add one to get started.</div>
                ) : (
                    modules.map((module, mIndex) => (
                        <div key={module.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-750 p-4 flex items-center justify-between">
                                <div className="flex items-center cursor-pointer flex-1" onClick={() => toggleModule(module.id)}>
                                    {expandedModules[module.id] ? <ChevronDown className="w-5 h-5 text-gray-400 mr-2" /> : <ChevronRight className="w-5 h-5 text-gray-400 mr-2" />}
                                    <h3 className="font-bold text-gray-900 dark:text-white">Chapter {mIndex + 1}: {module.title}</h3>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => { setEditingModule(module); setModuleTitle(module.title); setShowModuleForm(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => deleteModule(module.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {expandedModules[module.id] && (
                                <div className="p-4 bg-white dark:bg-gray-800">
                                    <ul className="space-y-2 mb-4">
                                        {(module.lessons || []).map((lesson, lIndex) => (
                                            <li key={lesson.id} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md border border-gray-100 dark:border-gray-700">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                                    <div className="flex items-center mb-2 sm:mb-0">
                                                        <Video className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{lIndex + 1}. {lesson.title}</span>
                                                            <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                <span>{Math.floor(lesson.duration_seconds / 60)}:{String(lesson.duration_seconds % 60).padStart(2, '0')}</span>
                                                                {lesson.is_free_preview && <span className="text-green-600 bg-green-100 px-1.5 rounded">Preview</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => {
                                                            setEditingLesson(lesson);
                                                            setLessonData({ title: lesson.title, video_url: lesson.video_url || '', duration_seconds: lesson.duration_seconds, is_free_preview: lesson.is_free_preview });
                                                            setShowLessonForm(module.id);
                                                        }} className="text-gray-400 hover:text-indigo-600 text-sm">Edit</button>
                                                        <button onClick={() => deleteLesson(lesson.id)} className="text-gray-400 hover:text-red-600 text-sm">Delete</button>
                                                    </div>
                                                </div>

                                                {/* Resources Sub-section */}
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600/50 pl-7">
                                                    <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Attached Resources</h5>
                                                    {(lesson.resources || []).length > 0 ? (
                                                        <ul className="space-y-1 mb-3">
                                                            {lesson.resources.map((res, i) => (
                                                                <li key={i} className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                                                    <div className="flex items-center truncate mr-2">
                                                                        <FileText className="w-3 h-3 text-indigo-500 mr-2 shrink-0" />
                                                                        <a href={res.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate" title={res.name}>{res.name}</a>
                                                                        <span className="text-gray-400 ml-2">({res.size})</span>
                                                                    </div>
                                                                    <button onClick={() => handleResourceDelete(module.id, lesson.id, res.key)} className="text-red-500 hover:text-red-700 shrink-0">
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 italic">No resources attached yet.</div>
                                                    )}

                                                    {/* Upload UI */}
                                                    <form onSubmit={(e) => handleResourceUpload(e, module.id, lesson.id)} className="flex items-center gap-2">
                                                        <input
                                                            type="file"
                                                            onChange={(e) => setResourceFile(e.target.files[0])}
                                                            className="text-xs text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={uploadingResourceFor === lesson.id}
                                                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
                                                        >
                                                            {uploadingResourceFor === lesson.id ? 'Uploading...' : 'Upload'}
                                                        </button>
                                                    </form>
                                                </div>
                                            </li>
                                        ))}
                                        {(module.quizzes || []).map((quiz, qIndex) => (
                                            <li key={`quiz-${quiz.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-md border border-indigo-100 dark:border-indigo-900/50 mt-2">
                                                <div className="flex items-center mb-2 sm:mb-0">
                                                    <HelpCircle className="w-4 h-4 text-indigo-400 mr-3" />
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Quiz: {quiz.title}</span>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Passing Score: {quiz.passing_score_percentage}%
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button onClick={() => {
                                                        setEditingQuiz(quiz);
                                                        setQuizData({ title: quiz.title, passing_score_percentage: quiz.passing_score_percentage });
                                                        setShowQuizForm(module.id);
                                                        setShowLessonForm(null);
                                                    }} className="text-gray-400 hover:text-indigo-600 text-sm">Edit</button>
                                                    <button onClick={() => deleteQuiz(quiz.id)} className="text-gray-400 hover:text-red-600 text-sm">Delete</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    {showLessonForm === module.id && (
                                        <form onSubmit={(e) => handleLessonSubmit(e, module.id)} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-md border border-gray-200 dark:border-gray-700 space-y-4 mb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Lesson Title</label>
                                                    <input type="text" required value={lessonData.title} onChange={e => setLessonData({ ...lessonData, title: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Video URL (Mux/AWS/YouTube)</label>
                                                    <input type="text" value={lessonData.video_url} onChange={e => setLessonData({ ...lessonData, video_url: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (Seconds)</label>
                                                    <input type="number" value={lessonData.duration_seconds} onChange={e => setLessonData({ ...lessonData, duration_seconds: e.target.value })}
                                                        className="w-32 px-3 py-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                                                </div>
                                                <div className="flex items-center mt-4">
                                                    <input type="checkbox" id="is_free" checked={lessonData.is_free_preview} onChange={e => setLessonData({ ...lessonData, is_free_preview: e.target.checked })}
                                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded" />
                                                    <label htmlFor="is_free" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Free Preview</label>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">Save Lesson</button>
                                                <button type="button" onClick={() => { setShowLessonForm(null); setEditingLesson(null); }} className="text-gray-500 px-4 py-2 text-sm">Cancel</button>
                                            </div>
                                        </form>
                                    )}

                                    {showQuizForm === module.id && (
                                        <form onSubmit={(e) => handleQuizSubmit(e, module.id)} className="bg-indigo-50/30 dark:bg-indigo-900/10 p-4 rounded-md border border-indigo-200 dark:border-indigo-800/50 space-y-4 mb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quiz Title</label>
                                                    <input type="text" required value={quizData.title} onChange={e => setQuizData({ ...quizData, title: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Passing Score (%)</label>
                                                    <input type="number" min="0" max="100" value={quizData.passing_score_percentage} onChange={e => setQuizData({ ...quizData, passing_score_percentage: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">Save Quiz</button>
                                                <button type="button" onClick={() => { setShowQuizForm(null); setEditingQuiz(null); }} className="text-gray-500 px-4 py-2 text-sm">Cancel</button>
                                            </div>
                                        </form>
                                    )}

                                    {!showLessonForm && !showQuizForm && (
                                        <div className="flex space-x-6 mt-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                                            <button
                                                onClick={() => { setEditingLesson(null); setLessonData({ title: '', video_url: '', duration_seconds: '', is_free_preview: false }); setShowLessonForm(module.id); setShowQuizForm(null); }}
                                                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Add Lesson
                                            </button>
                                            <button
                                                onClick={() => { setEditingQuiz(null); setQuizData({ title: '', passing_score_percentage: 80 }); setShowQuizForm(module.id); setShowLessonForm(null); }}
                                                className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:text-purple-800 dark:hover:text-purple-300 flex items-center"
                                            >
                                                <HelpCircle className="w-4 h-4 mr-1" /> Add Quiz
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
