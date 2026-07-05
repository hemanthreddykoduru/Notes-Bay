import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Pencil, X, BookOpen, Layers } from 'lucide-react';
import AdminCourseModules from './AdminCourseModules';

export default function AdminCourses({ setToast }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [managingCurriculum, setManagingCurriculum] = useState(null); // stores course object
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '0',
        original_price: '0',
        offer_text: '',
        thumbnail: null,
        is_published: false,
        level: 'All Levels',
        language: 'English',
        estimated_duration: '',
        skills: '',
        learning_objectives: '',
        requirements: ''
    });

    useEffect(() => {
        fetchCourses();

        // Realtime
        const channel = supabase
            .channel('admin:courses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setCourses((prev) => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setCourses((prev) => prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c)));
                } else if (payload.eventType === 'DELETE') {
                    setCourses((prev) => prev.filter((c) => c.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchCourses = async () => {
        try {
            const { data } = await api.get('/courses/admin/all');
            setCourses(data);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setToast({ message: 'Failed to fetch courses', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (files) {
            setFormData({ ...formData, [name]: files[0] });
        } else if (type === 'checkbox') {
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const uploadFile = async (file, bucket) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let thumbnailUrl = editingCourse ? editingCourse.thumbnail_url : null;
            if (formData.thumbnail) {
                thumbnailUrl = await uploadFile(formData.thumbnail, 'previews'); // using previews bucket for thumbnails
            }

            const courseData = {
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                original_price: parseFloat(formData.original_price) || 0,
                offer_text: formData.offer_text,
                is_published: formData.is_published,
                thumbnail_url: thumbnailUrl,
                level: formData.level,
                language: formData.language,
                estimated_duration: formData.estimated_duration,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                learning_objectives: formData.learning_objectives.split('\n').map(s => s.trim()).filter(Boolean),
                requirements: formData.requirements.split('\n').map(s => s.trim()).filter(Boolean),
                program_outline: formData.program_outline
            };

            if (editingCourse) {
                await api.put(`/courses/${editingCourse.id}`, courseData);
                setToast({ message: 'Course updated successfully!', type: 'success' });
            } else {
                await api.post('/courses', courseData);
                setToast({ message: 'Course added successfully!', type: 'success' });
            }

            handleCancel();
            fetchCourses();
        } catch (error) {
            console.error('Error saving course:', error);
            setToast({ message: `Error saving course`, type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (course) => {
        setEditingCourse(course);
        setFormData({
            title: course.title,
            description: course.description || '',
            price: course.price.toString(),
            original_price: course.original_price ? course.original_price.toString() : '0',
            offer_text: course.offer_text || '',
            is_published: course.is_published,
            thumbnail: null,
            level: course.level || 'All Levels',
            language: course.language || 'English',
            estimated_duration: course.estimated_duration || '',
            skills: (course.skills || []).join(', '),
            learning_objectives: (course.learning_objectives || []).join('\n'),
            requirements: (course.requirements || []).join('\n'),
            program_outline: course.program_outline || []
        });
        setShowForm(true);
    };

    const handleDelete = async () => {
        const { id } = deleteConfirmation;
        try {
            await api.delete(`/courses/${id}`);
            setToast({ message: 'Course deleted successfully', type: 'success' });
            fetchCourses();
        } catch (error) {
            console.error('Error deleting course:', error);
            setToast({ message: 'Failed to delete course', type: 'error' });
        } finally {
            setDeleteConfirmation({ isOpen: false, id: null });
        }
    };

    const handleTogglePublish = async (course) => {
        try {
            const newStatus = !course.is_published;
            setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_published: newStatus } : c));
            await api.put(`/courses/${course.id}`, { is_published: newStatus });
            setToast({ message: `Course ${newStatus ? 'Published' : 'Unpublished'}`, type: 'success' });
        } catch (error) {
            console.error('Error toggling course status:', error);
            setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_published: !course.is_published } : c));
            setToast({ message: 'Failed to update course status', type: 'error' });
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingCourse(null);
        setFormData({
            title: '', description: '', price: '0', original_price: '0', offer_text: '', thumbnail: null, is_published: false,
            level: 'Beginner', language: 'English', estimated_duration: '', skills: '', learning_objectives: '', requirements: '',
            program_outline: []
        });
    };

    if (loading) return <div>Loading courses...</div>;

    if (managingCurriculum) {
        return <AdminCourseModules course={managingCurriculum} onBack={() => setManagingCurriculum(null)} setToast={setToast} />;
    }

    return (
        <div className="mt-12">
            {/* Delete Confirmation */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-md w-full p-6">
                        <div className="flex items-center mb-4 text-red-600 dark:text-red-400">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete this course? This action cannot be undone.</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setDeleteConfirmation({ isOpen: false, id: null })} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Courses</h2>
                <button
                    onClick={() => { handleCancel(); setShowForm(true); }}
                    className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <Plus className="h-5 w-5 mr-1" />
                    Add Course
                </button>
            </div>

            {showForm && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8 relative border border-gray-200 dark:border-gray-700">
                    <button onClick={handleCancel} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="h-6 w-6" />
                    </button>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        {editingCourse ? 'Edit Course' : 'Add New Course'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" name="title" placeholder="Course Title" required value={formData.title} onChange={handleChange}
                            className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <input type="number" name="original_price" placeholder="Crossed-out Price (₹)" min="0" value={formData.original_price} onChange={handleChange}
                                className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            <input type="number" name="price" placeholder="Final Price (₹) - 0 for Free" min="0" required value={formData.price} onChange={handleChange}
                                className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            <input type="text" name="offer_text" placeholder="Offer text (e.g. 20% FLAT OFF)" value={formData.offer_text} onChange={handleChange}
                                className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                                <select name="level" value={formData.level} onChange={handleChange} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none">
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="All Levels">All Levels</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                                <input type="text" name="language" placeholder="e.g. English" value={formData.language} onChange={handleChange} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (e.g. "4 Weeks")</label>
                                <input type="text" name="estimated_duration" placeholder="e.g. 10 hours" value={formData.estimated_duration} onChange={handleChange} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            </div>
                        </div>

                        <textarea name="description" placeholder="Course Description Overview" rows="3" value={formData.description} onChange={handleChange}
                            className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none"></textarea>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Skills Gained (Comma separated)</label>
                            <input type="text" name="skills" placeholder="React, Node.js, Deployment" value={formData.skills} onChange={handleChange} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Learning Objectives (One per line)</label>
                                <textarea name="learning_objectives" placeholder="- Build fullstack apps&#10;- Deploy to production" rows="4" value={formData.learning_objectives} onChange={handleChange} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none"></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Requirements (One per line)</label>
                                <textarea name="requirements" placeholder="- Basic HTML/CSS&#10;- A computer" rows="4" value={formData.requirements} onChange={handleChange} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none"></textarea>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <label className="block text-sm font-semibold text-gray-900 dark:text-white">Program Outline (Grid Cards)</label>
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, program_outline: [...(prev.program_outline || []), { tag: '', title: '', description: '', bullets: '' }] }))} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md font-medium hover:bg-indigo-200">
                                    + Add Card
                                </button>
                            </div>
                            <div className="space-y-4">
                                {(formData.program_outline || []).map((card, idx) => (
                                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 relative">
                                        <button type="button" onClick={() => setFormData(prev => {
                                            const newOutline = [...prev.program_outline];
                                            newOutline.splice(idx, 1);
                                            return { ...prev, program_outline: newOutline };
                                        })} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <input type="text" placeholder="Top Tag (e.g. Prompt LLMs Reliably)" value={card.tag} onChange={e => {
                                                const newOutline = [...formData.program_outline];
                                                newOutline[idx].tag = e.target.value;
                                                setFormData({ ...formData, program_outline: newOutline });
                                            }} className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white outline-none" />
                                            
                                            <input type="text" placeholder="Main Title (e.g. Week 1 - Session 1)" value={card.title} onChange={e => {
                                                const newOutline = [...formData.program_outline];
                                                newOutline[idx].title = e.target.value;
                                                setFormData({ ...formData, program_outline: newOutline });
                                            }} className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white outline-none" />
                                        </div>
                                        
                                        <textarea placeholder="Description" rows="2" value={card.description} onChange={e => {
                                            const newOutline = [...formData.program_outline];
                                            newOutline[idx].description = e.target.value;
                                            setFormData({ ...formData, program_outline: newOutline });
                                        }} className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-sm mb-3 text-gray-900 dark:text-white outline-none"></textarea>
                                        
                                        <textarea placeholder="Bullet points (one per line)" rows="3" value={card.bullets} onChange={e => {
                                            const newOutline = [...formData.program_outline];
                                            newOutline[idx].bullets = e.target.value;
                                            setFormData({ ...formData, program_outline: newOutline });
                                        }} className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white outline-none"></textarea>
                                    </div>
                                ))}
                                {(!formData.program_outline || formData.program_outline.length === 0) && (
                                    <p className="text-sm text-gray-500 italic text-center py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">No outline cards added yet. Click "+ Add Card" to start building the grid layout.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <input type="checkbox" id="is_published" name="is_published" checked={formData.is_published} onChange={handleChange} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                            <label htmlFor="is_published" className="text-sm font-medium text-gray-700 dark:text-gray-300">Publish Immediately</label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Thumbnail Image {editingCourse && '(Leave empty to keep existing)'}
                            </label>
                            <label className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                                <span>{formData.thumbnail ? formData.thumbnail.name : 'Choose Image File'}</span>
                                <input type="file" name="thumbnail" accept="image/*" required={!editingCourse} onChange={handleChange} className="hidden" />
                            </label>
                        </div>
                        <div className="flex gap-4 pt-2">
                            <button type="submit" disabled={uploading} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium shadow-sm">
                                {uploading ? 'Processing...' : (editingCourse ? 'Update Course' : 'Save Course')}
                            </button>
                            <button type="button" onClick={handleCancel} className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-6 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 sm:rounded-xl overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {courses.map(course => (
                        <li key={course.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center">
                                <BookOpen className="h-10 w-10 text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-4 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{course.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">₹{course.price}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-3 mt-2 sm:mt-0">
                                <button
                                    onClick={() => handleTogglePublish(course)}
                                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors active:scale-95 ${course.is_published ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'}`}
                                >
                                    {course.is_published ? 'Published' : 'Draft'}
                                </button>
                                <button
                                    onClick={() => setManagingCurriculum(course)}
                                    className="flex items-center px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                >
                                    <Layers className="w-4 h-4 mr-1.5" />
                                    Curriculum
                                </button>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleEdit(course)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                        <Pencil className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => setDeleteConfirmation({ isOpen: true, id: course.id })} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                    {courses.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No courses found. Create your first course!
                        </div>
                    )}
                </ul>
            </div>
        </div>
    );
}
