const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const paymentsController = require('../controllers/paymentsController');

// POST /api/payments/create-order
router.post('/create-order', requireAuth, paymentsController.createOrder);

// POST /api/payments/verify
router.post('/verify', requireAuth, paymentsController.verifyPayment);

// POST /api/payments/create-course-order
router.post('/create-course-order', requireAuth, paymentsController.createCourseOrder);

// POST /api/payments/verify-course
router.post('/verify-course', requireAuth, paymentsController.verifyCoursePayment);

// POST /api/payments/create-subscription-order
router.post('/create-subscription-order', requireAuth, paymentsController.createSubscriptionOrder);

// POST /api/payments/verify-subscription
router.post('/verify-subscription', requireAuth, paymentsController.verifySubscription);

// POST /api/payments/webhook
router.post('/webhook', express.json({ type: 'application/json' }), paymentsController.handleWebhook);

// GET /api/payments/subscription-status
router.get('/subscription-status', requireAuth, paymentsController.getSubscriptionStatus);

// POST /api/payments/activate-free-trial
router.post('/activate-free-trial', requireAuth, paymentsController.activateFreeTrial);

module.exports = router;
