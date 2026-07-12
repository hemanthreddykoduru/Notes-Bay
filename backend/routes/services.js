const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

const checkAdmin = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
        if (error) return false;
        return data?.role === 'admin';
    } catch (error) {
        return false;
    }
};

// Public: Get all published services
router.get('/', async (req, res) => {
    try {
        const { data: services, error } = await supabase
            .from('services')
            .select(`
                id, title, description, price, original_price, offer_text, thumbnail_url, is_published,
                features, turnaround_time, variants, questions, created_at
            `)
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(services);
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get all services (including drafts)
router.get('/admin', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { data: services, error } = await supabase
            .from('services')
            .select(`
                id, title, description, price, original_price, offer_text, thumbnail_url, is_published,
                features, turnaround_time, variants, questions, created_at
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(services);
    } catch (err) {
        console.error('Error fetching admin services:', err);
        res.status(500).json({ error: err.message });
    }
});

// Public: Get single service
router.get('/:id', async (req, res) => {
    try {
        const { data: service, error } = await supabase
            .from('services')
            .select(`
                id, title, description, price, original_price, offer_text, thumbnail_url, is_published,
                features, turnaround_time, variants, questions, created_at
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!service) return res.status(404).json({ error: 'Service not found' });
        
        res.json(service);
    } catch (err) {
        console.error('Error fetching service:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Create service
router.post('/', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { 
            title, description, price, original_price, offer_text, thumbnail_url, is_published,
            features, turnaround_time, variants, questions
        } = req.body;
        
        const { data, error } = await supabase
            .from('services')
            .insert([{ 
                title, description, price, original_price, offer_text, thumbnail_url, is_published,
                features, turnaround_time, variants, questions, provider_id: req.user.id
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error('Error creating service:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Update service
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { 
            title, description, price, original_price, offer_text, thumbnail_url, is_published,
            features, turnaround_time, variants, questions
        } = req.body;
        
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (price !== undefined) updates.price = price;
        if (original_price !== undefined) updates.original_price = original_price;
        if (offer_text !== undefined) updates.offer_text = offer_text;
        if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url;
        if (is_published !== undefined) updates.is_published = is_published;
        if (features !== undefined) updates.features = features;
        if (turnaround_time !== undefined) updates.turnaround_time = turnaround_time;
        if (variants !== undefined) updates.variants = variants;
        if (questions !== undefined) updates.questions = questions;

        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' });

        const { data, error } = await supabase
            .from('services')
            .update(updates)
            .eq('id', req.params.id)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        console.error('Error updating service:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete service
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.user.id);
        if (!isAdmin) return res.status(403).json({ error: 'Admins only' });

        const { error } = await supabase
            .from('services')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ message: 'Service deleted successfully' });
    } catch (err) {
        console.error('Error deleting service:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
