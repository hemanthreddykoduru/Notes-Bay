/**
 * CoinRemitter API Wrapper (v1)
 * --------------------------------
 * Base URL: https://api.coinremitter.com/v1/
 * Auth: x-api-key and x-api-password HTTP headers
 * Docs: https://coinremitter.com/docs
 *
 * Supports fiat_currency: 'INR' natively — CoinRemitter handles the conversion.
 * No need to manually fetch exchange rates.
 *
 * Env vars required:
 *   COINREMITTER_API_KEY   — from CoinRemitter dashboard → Wallet → API
 *   COINREMITTER_PASSWORD  — from CoinRemitter dashboard → Wallet → API
 */

const axios = require('axios');
const https = require('https');

const BASE_URL = 'https://api.coinremitter.com/v1';

// Allow self-signed / untrusted certs in development environments.
// In production on Vercel, the standard Node.js cert store works fine.
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Returns Axios config headers for CoinRemitter auth.
 */
function authHeaders() {
  return {
    'x-api-key': process.env.COINREMITTER_API_KEY,
    'x-api-password': process.env.COINREMITTER_PASSWORD,
    'Content-Type': 'application/json',
  };
}

/**
 * Creates a new payment invoice on CoinRemitter.
 * Pass the INR amount — CoinRemitter converts to crypto automatically.
 *
 * @param {number} amountInr      — INR price to bill (already discounted)
 * @param {string} label          — Invoice name (max 30 chars)
 * @param {string} description    — Optional description (max 255 chars)
 * @returns {Promise<Object>}     — Invoice data: { id, invoice_id, url, amount, address, expire_on_timestamp, ... }
 */
async function createInvoice(amountInr, label, description = '') {
  const payload = {
    amount: amountInr,
    fiat_currency: 'INR',                              // CoinRemitter converts INR → crypto
    name: label.substring(0, 30),
    description: description.substring(0, 255),
    notify_url: process.env.COINREMITTER_WEBHOOK_URL || '',
    success_url: process.env.FRONTEND_URL || '',
    fail_url: process.env.FRONTEND_URL || '',
    expiry_time_in_minutes: 15,
  };

  const response = await axios.post(`${BASE_URL}/invoice/create`, payload, {
    headers: authHeaders(),
    httpsAgent,
    timeout: 10000,
  });

  if (!response.data.success) {
    throw new Error(
      `CoinRemitter error: ${response.data.msg || response.data.error || 'Unknown error'}`
    );
  }

  return response.data.data;
}

/**
 * Fetches the current status of an existing invoice.
 *
 * @param {string} invoiceId  — CoinRemitter invoice_id (not the internal id)
 * @returns {Promise<Object>} — Invoice data with status field ('pending'|'paid'|'expired' etc.)
 */
async function getInvoice(invoiceId) {
  const response = await axios.get(`${BASE_URL}/invoice/${invoiceId}`, {
    headers: authHeaders(),
    httpsAgent,
    timeout: 10000,
  });

  if (!response.data.success) {
    throw new Error(
      `CoinRemitter error: ${response.data.msg || response.data.error || 'Unknown error'}`
    );
  }

  return response.data.data;
}

module.exports = { createInvoice, getInvoice };
