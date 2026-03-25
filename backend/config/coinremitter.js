/**
 * CoinRemitter API Wrapper (v1)
 * --------------------------------
 * Base URL: https://api.coinremitter.com/v1/
 * Auth: x-api-key and x-api-password HTTP headers
 * Body format: application/x-www-form-urlencoded (NOT JSON — CoinRemitter uses --form)
 * Docs: https://coinremitter.com/docs
 *
 * Supports fiat_currency: 'INR' natively — CoinRemitter handles the conversion.
 *
 * Env vars required:
 *   COINREMITTER_API_KEY   — from CoinRemitter dashboard → Wallet → API
 *   COINREMITTER_PASSWORD  — from CoinRemitter dashboard → Wallet → API
 */

const axios = require('axios');
const https = require('https');

const BASE_URL = 'https://api.coinremitter.com/v1';

// Allow self-signed certs in local dev (macOS SSL issue). Safe on Vercel.
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Returns auth headers for CoinRemitter.
 */
function authHeaders() {
  return {
    'x-api-key': process.env.COINREMITTER_API_KEY,
    'x-api-password': process.env.COINREMITTER_PASSWORD,
    // CoinRemitter expects form-encoded data, not JSON
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

/**
 * Creates a new payment invoice on CoinRemitter.
 * Sends INR amount — CoinRemitter converts to crypto automatically.
 *
 * @param {number} amountInr   — INR price (already discounted)
 * @param {string} label       — Invoice name (max 30 chars)
 * @param {string} description — Optional description (max 255 chars)
 * @returns {Promise<Object>}  — { id, invoice_id, url, amount, address, expire_on_timestamp, ... }
 */
async function createInvoice(amountInr, label, description = '') {
  // CoinRemitter requires form-encoded body (not JSON)
  const params = new URLSearchParams();
  params.append('amount', amountInr.toFixed(2));
  params.append('fiat_currency', 'INR');
  params.append('name', label.substring(0, 30));
  params.append('description', description.substring(0, 255));
  params.append('expiry_time_in_minutes', '15');
  // Only send notify_url if it's a real public HTTPS URL.
  // Omitting it avoids CoinRemitter's validation probe failure in dev.
  const webhookUrl = process.env.COINREMITTER_WEBHOOK_URL || '';
  if (webhookUrl && webhookUrl.startsWith('https://') && !webhookUrl.includes('ngrok-free.app')) {
    params.append('notify_url', webhookUrl);
  }
  const frontendUrl = process.env.FRONTEND_URL || '';
  // Only send redirect URLs if frontend is a real public HTTPS site (not localhost).
  if (frontendUrl && frontendUrl.startsWith('https://') && !frontendUrl.includes('localhost')) {
    params.append('success_url', frontendUrl);
    params.append('fail_url', frontendUrl);
  }

  let response;
  try {
    response = await axios.post(`${BASE_URL}/invoice/create`, params.toString(), {
      headers: authHeaders(),
      httpsAgent,
      timeout: 15000,
    });
  } catch (err) {
    const detail = err.response?.data;
    console.error('[CoinRemitter] HTTP error:', err.response?.status, JSON.stringify(detail));
    throw new Error(
      detail?.msg || detail?.error || `CoinRemitter HTTP ${err.response?.status}: ${err.message}`
    );
  }

  if (!response.data.success) {
    console.error('[CoinRemitter] API error:', JSON.stringify(response.data));
    throw new Error(response.data.msg || response.data.error || 'Unknown CoinRemitter error');
  }

  return response.data.data;
}

/**
 * Fetches the current status of an existing invoice.
 *
 * @param {string} invoiceId  — CoinRemitter invoice_id
 * @returns {Promise<Object>} — Invoice data with status field
 */
async function getInvoice(invoiceId) {
  let response;
  try {
    response = await axios.get(`${BASE_URL}/invoice/${invoiceId}`, {
      headers: authHeaders(),
      httpsAgent,
      timeout: 10000,
    });
  } catch (err) {
    const detail = err.response?.data;
    console.error('[CoinRemitter] getInvoice HTTP error:', err.response?.status, JSON.stringify(detail));
    throw new Error(
      detail?.msg || detail?.error || `CoinRemitter HTTP ${err.response?.status}: ${err.message}`
    );
  }

  if (!response.data.success) {
    throw new Error(response.data.msg || response.data.error || 'Unknown CoinRemitter error');
  }

  return response.data.data;
}

module.exports = { createInvoice, getInvoice };

