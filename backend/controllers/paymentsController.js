const supabase = require('../config/supabase');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

// POST /create-order
exports.createOrder = async (req, res) => {
  try {
    const { noteId } = req.body;
    
    // Fetch note price
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('price')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const options = {
      amount: note.price * 100, // amount in paisa
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { noteId, userId: req.user.id }
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating order' });
  }
};

// POST /verify
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      noteId
    } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Fetch note to get price
      const { data: note } = await supabase.from('notes').select('price').eq('id', noteId).single();

      const { data, error } = await supabase
        .from('purchases')
        .insert([{
          user_id: req.user.id,
          note_id: noteId,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: note.price,
          status: 'completed'
        }]);

      if (error) throw error;

      res.json({ success: true, message: 'Payment verified and purchase recorded' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error verifying payment' });
  }
};

// POST /create-subscription-order
exports.createSubscriptionOrder = async (req, res) => {
  try {
    // 1. Fetch Price from Config
    let price = 100; // Default
    const { data: config } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'subscription_price')
        .single();
    
    if (config) {
        price = parseInt(config.value);
    }

    const options = {
      amount: price * 100, // Convert to paise
      currency: 'INR',
      receipt: `sub_${Date.now()}`,
      notes: { type: 'subscription', userId: req.user.id }
    };

    const order = await razorpay.orders.create(options);
    
    // Create Pending Subscription
    const startDate = new Date();
    const { error } = await supabase
        .from('subscriptions')
        .insert([{
            user_id: req.user.id,
            plan_type: 'pro',
            start_date: startDate.toISOString(),
            end_date: startDate.toISOString(), // Placeholder until active
            payment_id: 'pending',
            order_id: order.id,
            amount: price,
            status: 'pending'
        }]);

    if (error) {
        console.error('Error creating pending subscription:', error);
        return res.status(500).json({ error: 'Failed to initialize subscription record' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating subscription order' });
  }
};

// POST /verify-subscription
exports.verifySubscription = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Activate Subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_id: razorpay_payment_id,
        })
        .eq('order_id', razorpay_order_id);

      if (error) throw error;

      res.json({ success: true, message: 'Subscription activated successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error verifying subscription' });
  }
};

// POST /webhook
exports.handleWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== req.headers['x-razorpay-signature']) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  try {
    if (event.event === 'order.paid') {
      const { payload } = event;
      const payment = payload.payment.entity;
      const order = payload.order.entity;
      
      const { notes, id: orderId, amount } = order;
      const { id: paymentId } = payment;
      const userId = notes.userId;

      // Type 1: Subscription Payment
      if (notes.type === 'subscription') {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_id: paymentId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount: amount / 100
          })
          .eq('order_id', orderId);

        if (error) throw error;
        console.log(`Webhook: Subscription verified for order ${orderId}`);
      } 
      
      // Type 2: Individual Note Purchase
      else if (notes.noteId) {
        const noteId = notes.noteId;
        const { data: existing } = await supabase
            .from('purchases')
            .select('id')
            .eq('order_id', orderId)
            .single();

        if (!existing) {
            const { error } = await supabase
            .from('purchases')
            .insert([{
                user_id: userId,
                note_id: noteId,
                payment_id: paymentId,
                order_id: orderId,
                amount: amount / 100,
                status: 'completed'
            }]);
            
            if (error) throw error;
            console.log(`Webhook: Note purchase verified for order ${orderId}`);
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// GET /subscription-status
exports.getSubscriptionStatus = async (req, res) => {
  try {
    // 1. Check for Active Subscription
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .limit(1)
      .single();

    if (subData) {
        return res.json({ isSubscribed: true });
    }

    // 2. Check if Admin (Fallback)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();
    
    if (profile && profile.role === 'admin') {
        return res.json({ isSubscribed: true, isAdmin: true });
    }

    res.json({ isSubscribed: false });

  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /activate-free-trial
exports.activateFreeTrial = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Check if user already has an active subscription
    const { data: activeSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('end_date', new Date().toISOString())
      .limit(1);

    if (activeSubscription && activeSubscription.length > 0) {
      return res.status(400).json({ 
        error: 'You already have an active subscription' 
      });
    }

    // 2. Check if user has already used a free trial
    const { data: previousTrial } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_trial', true)
      .limit(1);

    if (previousTrial && previousTrial.length > 0) {
      return res.status(400).json({ 
        error: 'You have already used your free trial' 
      });
    }

    // 3. Create free trial subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + 2); // 2 hours trial

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_id: 'free_trial',
        order_id: `trial_${userId}_${Date.now()}`,
        amount: 0,
        status: 'active',
        is_trial: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating free trial:', error);
      return res.status(500).json({ error: 'Failed to activate free trial' });
    }

    res.json({ 
      success: true, 
      message: 'Free trial activated successfully',
      subscription: {
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        is_trial: true
      }
    });

  } catch (error) {
    console.error('Error activating free trial:', error);
    res.status(500).json({ error: 'Error activating free trial' });
  }
};
