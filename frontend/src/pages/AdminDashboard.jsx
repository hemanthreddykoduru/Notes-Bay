import { useEffect, useState } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Pencil, X, TrendingUp, Users, FileText, DollarSign, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdminDashboardSkeleton from '../components/skeletons/AdminDashboardSkeleton'; // Import Skeleton

import Toast from '../components/common/Toast';

export default function AdminDashboard() {
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        type: null, // 'note' or 'message'
        id: null,
    });

    const [notes, setNotes] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [toast, setToast] = useState(null);
    const [subPrice, setSubPrice] = useState(100);
    const [updatingPrice, setUpdatingPrice] = useState(false);
    const [supportMessages, setSupportMessages] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        price: '',
        description: '',
        file: null,
        preview: null,
    });

    useEffect(() => {
        let mounted = true;
        fetchData();

        // Failsafe: Force stop loading after 10 seconds
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                setLoading((prev) => {
                    if (prev) {
                        console.warn("Admin dashboard fetch timed out safely.");
                        setToast({ message: 'Dashboard is taking unusually long to load. Some data may be missing.', type: 'error' });
                        return false;
                    }
                    return prev;
                });
            }
        }, 10000);

        // Realtime subscriptions
        const notesChannel = supabase
            .channel('admin:notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setNotes((prev) => [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setNotes((prev) => prev.map((n) => (n.id === payload.new.id ? { ...n, ...payload.new } : n)));
                } else if (payload.eventType === 'DELETE') {
                    setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
                }
            })
            .subscribe();

        const messagesChannel = supabase
            .channel('admin:messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setSupportMessages((prev) => [payload.new, ...prev]);
                    setToast({ message: 'New support message received!', type: 'success' });
                } else if (payload.eventType === 'DELETE') {
                    setSupportMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
            supabase.removeChannel(notesChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Note: Individual fetches handle their own errors/sets
            await Promise.all([
                fetchNotes().catch(e => console.error(e)),
                fetchStats().catch(e => console.error(e)),
                fetchConfig().catch(e => console.error(e)),
                fetchSupportMessages().catch(e => console.error(e))
            ]);
        } catch (error) {
            console.error('Error in batch fetchData:', error);
            setToast({ message: 'Error loading dashboard components', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/analytics/stats');
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchConfig = async () => {
        try {
            const { data } = await api.get('/config/subscription_price');
            if (data && data.value) setSubPrice(data.value);
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const fetchSupportMessages = async () => {
        try {
            const { data } = await api.get('/support/messages');
            setSupportMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const confirmDelete = async () => {
        const { type, id } = deleteConfirmation;
        if (!type || !id) return;

        try {
            if (type === 'message') {
                await api.delete(`/support/${id}`);
                setToast({ message: 'Message deleted successfully', type: 'success' });
                fetchSupportMessages();
            } else if (type === 'note') {
                await api.delete(`/notes/${id}`);
                setToast({ message: 'Note deleted successfully', type: 'success' });
                fetchNotes();
                fetchStats(); // Update active note count
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            setToast({ message: `Failed to delete ${type}`, type: 'error' });
        } finally {
            setDeleteConfirmation({ isOpen: false, type: null, id: null });
        }
    };

    const handleDeleteMessage = (id) => {
        setDeleteConfirmation({ isOpen: true, type: 'message', id });
    };

    const handleUpdatePrice = async () => {
        setUpdatingPrice(true);
        try {
            await api.post('/config/subscription_price', { value: subPrice });
            setToast({ message: 'Subscription price updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating price:', error);
            setToast({ message: 'Failed to update price', type: 'error' });
        } finally {
            setUpdatingPrice(false);
        }
    };

    const fetchNotes = async () => {
        try {
            const { data } = await api.get('/notes/admin/all');
            setNotes(data);
        } catch (error) {
            console.error('Error fetching notes:', error);
            setToast({ message: 'Failed to fetch notes', type: 'error' });
        }
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (files) {
            setFormData({ ...formData, [name]: files[0] });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const uploadFile = async (file, bucket) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let fileUrl = editingNote ? editingNote.file_url : '';
            if (formData.file) {
                fileUrl = await uploadFile(formData.file, 'notes');
            }

            let previewUrl = editingNote ? editingNote.preview_url : '';
            if (formData.preview) {
                previewUrl = await uploadFile(formData.preview, 'previews');
            }

            const noteData = {
                title: formData.title,
                subject: formData.subject,
                price: formData.price,
                description: formData.description,
                file_url: fileUrl,
                preview_url: previewUrl
            };

            if (editingNote) {
                await api.put(`/notes/${editingNote.id}`, noteData);
                setToast({ message: 'Note updated successfully!', type: 'success' });
            } else {
                await api.post('/notes', noteData);
                setToast({ message: 'Note added successfully!', type: 'success' });
            }

            setShowForm(false);
            setEditingNote(null);
            setFormData({ title: '', subject: '', price: '', description: '', file: null, preview: null });
            fetchData();

        } catch (error) {
            console.error('Error saving note:', error);
            const message = error.response?.data?.error || error.message;
            setToast({ message: `Error: ${message}`, type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (note) => {
        setEditingNote(note);
        setFormData({
            title: note.title,
            subject: note.subject,
            price: note.price,
            description: note.description || '',
            file: null,
            preview: null
        });
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setDeleteConfirmation({ isOpen: true, type: 'note', id });
    };

    const handleToggleStatus = async (note) => {
        try {
            const newStatus = !note.is_active;

            // Optimistic update
            setNotes((prev) => prev.map((n) => (String(n.id) === String(note.id) ? { ...n, is_active: newStatus } : n)));

            await api.put(`/notes/${note.id}`, { is_active: newStatus });

            setToast({ message: `Note is now ${newStatus ? 'Active' : 'Inactive'}`, type: 'success' });

            // Re-fetch to ensure data consistency
            fetchNotes();
        } catch (error) {
            console.error('Error updating status:', error);
            // Revert
            setNotes((prev) => prev.map((n) => (String(n.id) === String(note.id) ? { ...n, is_active: !note.is_active } : n)));
            setToast({ message: 'Failed to update status', type: 'error' });
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingNote(null);
        setFormData({ title: '', subject: '', price: '', description: '', file: null, preview: null });
    };

    if (loading) return <AdminDashboardSkeleton />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-md w-full p-6 transform transition-all scale-100">
                        <div className="flex items-center mb-4 text-red-600 dark:text-red-400">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete this {deleteConfirmation.type}?
                            {deleteConfirmation.type === 'note' &&
                                <span className="block mt-2 text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                    This action cannot be undone. Users who purchased this note may lose access.
                                </span>
                            }
                        </p>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setDeleteConfirmation({ isOpen: false, type: null, id: null })}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Dashboard</h1>

            {/* Rest of the component... */}
            {stats && (
                <div className="mb-12 space-y-8">
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-4">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{stats.totalRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4">
                                <Users className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Users</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                            <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-4">
                                <FileText className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Notes</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{notes.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Internal Revenue Chart */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                                <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                                Revenue Trend (Last 30 Days)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                            tickFormatter={(str) => {
                                                const d = new Date(str);
                                                return `${d.getDate()}/${d.getMonth() + 1}`;
                                            }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#6B7280' }}
                                            tickFormatter={(val) => `₹${val}`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#F3F4F6' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Selling Notes */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Selling Notes</h3>
                            {stats.topNotes.length > 0 ? (
                                <div className="space-y-4">
                                    {stats.topNotes.map((note, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center">
                                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 mr-3">
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium text-gray-800 dark:text-white truncate max-w-[150px] sm:max-w-xs">{note.name}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                                {note.sales} sales
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-10">No sales data yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Global Settings Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-12">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-indigo-500" />
                    Global Settings
                </h3>
                <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pro Subscription Price (₹)
                    </label>
                    <div className="flex gap-4">
                        <input
                            type="number"
                            value={subPrice}
                            onChange={(e) => setSubPrice(e.target.value)}
                            className="block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button
                            onClick={handleUpdatePrice}
                            disabled={updatingPrice}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {updatingPrice ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Support Messages Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-12">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" />
                    Support Messages
                </h3>
                {supportMessages.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">From</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {supportMessages.map((msg) => (
                                    <tr key={msg.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{msg.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{msg.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {msg.subject}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                            {msg.message}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleDeleteMessage(msg.id)}
                                                className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No new messages.</p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Notes</h2>
                <button
                    onClick={() => {
                        setEditingNote(null);
                        setFormData({ title: '', subject: '', price: '', description: '', file: null, preview: null });
                        setShowForm(!showForm);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <Plus className="h-5 w-5 mr-1" />
                    Add Note
                </button>
            </div>

            {
                showForm && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8 relative border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleCancel}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                            {editingNote ? 'Edit Note' : 'Add New Note'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" name="title" placeholder="Title" required
                                    value={formData.title} onChange={handleChange}
                                    className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                                <input type="text" name="subject" placeholder="Subject" required
                                    value={formData.subject} onChange={handleChange}
                                    className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                                <input type="number" name="price" placeholder="Price (₹)" required min="1"
                                    value={formData.price} onChange={handleChange}
                                    className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            {/* Description Field */}
                            <div>
                                <textarea
                                    name="description"
                                    placeholder="Note Description (Detailed explanation, what's included, etc.)"
                                    rows="4"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                ></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Full PDF {editingNote && '(Leave empty to keep existing)'}
                                    </label>
                                    <label className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                                        <span>{formData.file ? formData.file.name : 'Choose PDF File'}</span>
                                        <input type="file" name="file" accept=".pdf" required={!editingNote} onChange={handleChange} className="hidden" />
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Preview (Image/PDF) {editingNote && '(Leave empty to keep existing)'}
                                    </label>
                                    <label className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                                        <span>{formData.preview ? formData.preview.name : 'Choose Preview File'}</span>
                                        <input type="file" name="preview" accept=".pdf,.png,.jpg,.jpeg" required={!editingNote} onChange={handleChange} className="hidden" />
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button type="submit" disabled={uploading} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors shadow-sm">
                                    {uploading ? 'Processing...' : (editingNote ? 'Update Note' : 'Save Note')}
                                </button>
                                <button type="button" onClick={handleCancel} className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 px-6 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 sm:rounded-xl overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {notes.map(note => (
                        <li key={note.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center">
                                <FileText className="h-10 w-10 text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-4 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{note.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{note.subject} • ₹{note.price}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-3 mt-2 sm:mt-0">
                                <button
                                    onClick={() => handleToggleStatus(note)}
                                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors active:scale-95 ${note.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'}`}
                                    title="Click to toggle visibility"
                                >
                                    {note.is_active ? 'Active' : 'Inactive'}
                                </button>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(note)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(note.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                    {notes.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No notes found. Create your first note above!
                        </div>
                    )}
                </ul>
            </div>
        </div >
    );
}
