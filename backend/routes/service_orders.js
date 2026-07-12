const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

// Get specific order details for the onboarding flow
router.get('/:orderId', requireAuth, async (req, res) => {
    try {
        const { data: order, error } = await supabase
            .from('service_orders')
            .select('*')
            .eq('id', req.params.orderId)
            .eq('user_id', req.user.id)
            .single();

        if (error) throw error;
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        res.json(order);
    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ error: err.message });
    }
});

// Submit answers for the onboarding form
router.post('/:orderId/onboard', requireAuth, async (req, res) => {
    try {
        const { answers } = req.body;
        
        // Ensure the order belongs to this user and is pending
        const { data: order, error: fetchError } = await supabase
            .from('service_orders')
            .select('*')
            .eq('id', req.params.orderId)
            .eq('user_id', req.user.id)
            .single();
            
        if (fetchError || !order) return res.status(404).json({ error: 'Order not found' });
        if (order.status !== 'pending') return res.status(400).json({ error: 'Order already onboarded' });

        const { error: updateError } = await supabase
            .from('service_orders')
            .update({ 
                question_answers: answers,
                status: 'in_progress'
            })
            .eq('id', req.params.orderId);

        if (updateError) throw updateError;
        
        res.json({ success: true, message: 'Onboarding completed successfully' });
    } catch (err) {
        console.error('Error in onboarding:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
