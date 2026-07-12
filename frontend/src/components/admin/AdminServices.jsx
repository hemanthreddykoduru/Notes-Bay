import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Save, Loader, X } from 'lucide-react';
import Toast from '../common/Toast';

export default function AdminServices() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '0',
        original_price: '0',
        offer_text: '',
        thumbnail_url: '',
        is_published: false,
        turnaround_time: '',
        features: [],
        variants: [],
        questions: []
    });

    const [newFeature, setNewFeature] = useState('');
    const [newVariant, setNewVariant] = useState({ name: '', price: '' });
    const [newQuestion, setNewQuestion] = useState({ id: '', text: '', type: 'text', required: true });

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/services/admin`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch services');
            const data = await res.json();
            setServices(data);
        } catch (error) {
            console.error('Error fetching services:', error);
            setToast({ message: 'Error loading services', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const addFeature = () => {
        if (!newFeature.trim()) return;
        setFormData(prev => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
        setNewFeature('');
    };

    const removeFeature = (index) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const addVariant = () => {
        if (!newVariant.name.trim() || !newVariant.price) return;
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { ...newVariant, price: parseFloat(newVariant.price) }]
        }));
        setNewVariant({ name: '', price: '' });
    };

    const removeVariant = (index) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    };

    const addQuestion = () => {
        if (!newQuestion.text.trim()) return;
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, { ...newQuestion, id: Date.now().toString() }]
        }));
        setNewQuestion({ id: '', text: '', type: 'text', required: true });
    };

    const removeQuestion = (index) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const url = editingService 
                ? `${import.meta.env.VITE_API_URL}/api/services/${editingService.id}`
                : `${import.meta.env.VITE_API_URL}/api/services`;
            
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                original_price: parseFloat(formData.original_price)
            };

            const res = await fetch(url, {
                method: editingService ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save service');
            
            setToast({ message: `Service ${editingService ? 'updated' : 'created'} successfully!`, type: 'success' });
            setShowForm(false);
            setEditingService(null);
            fetchServices();
        } catch (error) {
            console.error('Error saving service:', error);
            setToast({ message: error.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (service) => {
        setEditingService(service);
        setFormData({
            title: service.title,
            description: service.description || '',
            price: service.price.toString(),
            original_price: service.original_price?.toString() || '0',
            offer_text: service.offer_text || '',
            thumbnail_url: service.thumbnail_url || '',
            is_published: service.is_published || false,
            turnaround_time: service.turnaround_time || '',
            features: service.features || [],
            variants: service.variants || [],
            questions: service.questions || []
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this service?')) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to delete service');
            setToast({ message: 'Service deleted successfully!', type: 'success' });
            fetchServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            setToast({ message: error.message, type: 'error' });
        }
    };

    if (loading) {
        return <div className="p-8 text-center"><Loader className="animate-spin h-8 w-8 mx-auto text-indigo-500" /></div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Services</h2>
                {!showForm && (
                    <button
                        onClick={() => {
                            setEditingService(null);
                            setFormData({
                                title: '', description: '', price: '0', original_price: '0', offer_text: '',
                                thumbnail_url: '', is_published: false, turnaround_time: '', features: [], variants: [], questions: []
                            });
                            setShowForm(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Service
                    </button>
                )}
            </div>

            {showForm ? (
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {editingService ? 'Edit Service' : 'Create New Service'}
                        </h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <input type="text" name="title" placeholder="Service Title" required value={formData.title} onChange={handleChange}
                                className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            
                            <textarea name="description" placeholder="Service Description" required rows="4" value={formData.description} onChange={handleChange}
                                className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Base Price (₹)</label>
                                <input type="number" name="price" min="0" required value={formData.price} onChange={handleChange}
                                    className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Crossed-out Price (₹)</label>
                                <input type="number" name="original_price" min="0" value={formData.original_price} onChange={handleChange}
                                    className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Offer Badge Text</label>
                                <input type="text" name="offer_text" placeholder="e.g. 20% OFF" value={formData.offer_text} onChange={handleChange}
                                    className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" name="turnaround_time" placeholder="Turnaround Time (e.g. 3-5 Business Days)" value={formData.turnaround_time} onChange={handleChange}
                                className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                            <input type="text" name="thumbnail_url" placeholder="Thumbnail Image URL" value={formData.thumbnail_url} onChange={handleChange}
                                className="p-2 border rounded w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none" />
                        </div>

                        {/* Variants Builder */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Variants (Optional Pricing Tiers)</h4>
                            <p className="text-xs text-gray-500 mb-3">If added, users can select a tier instead of the base price (e.g., 1000 Commits, 5000 Commits).</p>
                            <div className="flex gap-2 mb-3">
                                <input type="text" placeholder="Variant Name (e.g. 5000 Commits)" value={newVariant.name} onChange={e => setNewVariant({...newVariant, name: e.target.value})} className="flex-1 p-2 border rounded bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-white outline-none" />
                                <input type="number" placeholder="Price (₹)" value={newVariant.price} onChange={e => setNewVariant({...newVariant, price: e.target.value})} className="w-32 p-2 border rounded bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-white outline-none" />
                                <button type="button" onClick={addVariant} className="bg-gray-200 dark:bg-gray-700 px-3 rounded hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
                            </div>
                            <div className="space-y-2">
                                {formData.variants.map((v, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-2 rounded text-sm text-gray-300">
                                        <span>{v.name} - ₹{v.price}</span>
                                        <button type="button" onClick={() => removeVariant(i)} className="text-red-500 hover:text-red-400"><X className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Onboarding Questions Builder */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Post-Purchase Questions</h4>
                            <p className="text-xs text-gray-500 mb-3">Questions to ask the buyer immediately after payment (e.g. GitHub URL, Start Date).</p>
                            <div className="flex gap-2 mb-3">
                                <input type="text" placeholder="Question text..." value={newQuestion.text} onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} className="flex-1 p-2 border rounded bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-white outline-none" />
                                <select value={newQuestion.type} onChange={e => setNewQuestion({...newQuestion, type: e.target.value})} className="p-2 border rounded bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-white outline-none">
                                    <option value="text">Text (Short)</option>
                                    <option value="textarea">Textarea (Long)</option>
                                    <option value="date">Date</option>
                                    <option value="url">URL Link</option>
                                </select>
                                <button type="button" onClick={addQuestion} className="bg-gray-200 dark:bg-gray-700 px-3 rounded hover:bg-gray-300 dark:hover:bg-gray-600">+</button>
                            </div>
                            <div className="space-y-2">
                                {formData.questions.map((q, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-2 rounded text-sm text-gray-300">
                                        <span>{q.text} <span className="text-gray-500">({q.type})</span></span>
                                        <button type="button" onClick={() => removeQuestion(i)} className="text-red-500 hover:text-red-400"><X className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input type="checkbox" id="is_published" name="is_published" checked={formData.is_published} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                            <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900 dark:text-white">Publish Immediately</label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                            <button type="submit" disabled={saving} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                                {saving ? <Loader className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                {editingService ? 'Update Service' : 'Create Service'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-4">
                    {services.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No services found. Create your first service!</p>
                    ) : (
                        services.map(service => (
                            <div key={service.id} className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex items-center gap-4">
                                    {service.thumbnail_url ? (
                                        <img src={service.thumbnail_url} alt="" className="w-16 h-16 object-cover rounded" />
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                            <span className="text-xs text-gray-400">No Image</span>
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{service.title}</h4>
                                        <p className="text-sm text-gray-500">₹{service.price} • {service.variants?.length || 0} Variants • {service.questions?.length || 0} Questions</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${service.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {service.is_published ? 'Published' : 'Draft'}
                                    </span>
                                    <button onClick={() => handleEdit(service)} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-900/30 p-2 rounded">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
