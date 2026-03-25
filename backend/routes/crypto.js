/**
 * Crypto Payment Routes (CoinRemitter)
 * --------------------------------------
 * POST /api/crypto/create-invoice  — Create a USDT invoice for a note purchase
 * GET  /api/crypto/status/:id      — Poll invoice payment status
 * POST /api/crypto/webhook         — CoinRemitter server-to-server payment callback
 */

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const cryptoController = require('../controllers/cryptoController');

// Create a new crypto invoice for purchasing a note (auth required)
router.post('/create-invoice', requireAuth, cryptoController.createInvoice);

// Poll the status of a specific invoice (auth required)
router.get('/status/:invoiceId', requireAuth, cryptoController.getInvoiceStatus);

// CoinRemitter webhook — no auth (server-to-server, use express.urlencoded)
// CoinRemitter sends application/x-www-form-urlencoded
router.post(
  '/webhook',
  express.urlencoded({ extended: false }),
  cryptoController.handleWebhook
);

module.exports = router;
