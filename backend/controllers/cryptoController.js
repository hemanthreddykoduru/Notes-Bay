/**
 * Crypto Payment Controller (CoinRemitter / USDT-TRC20)
 * -------------------------------------------------------
 * Handles all crypto payment flows:
 *   - createInvoice   : Creates a CoinRemitter invoice for a note purchase
 *   - getInvoiceStatus: Polls invoice status (frontend polling + on-demand verify)
 *   - handleWebhook   : Receives CoinRemitter callbacks on payment confirmation
 *
 * Uses the Supabase SERVICE ROLE key for webhook inserts (unauthenticated context).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const coinremitter = require('../config/coinremitter');

// ---------------------------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------------------------

// Standard client (respects RLS) — used for authenticated routes
const supabase = require('../config/supabase');

// Admin client (bypasses RLS) — used ONLY for the webhook (no user session)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY // fallback for dev
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CRYPTO_DISCOUNT = 0.10; // 10% discount for crypto payments
const INVOICE_EXPIRE_MINUTES = 15;

// ---------------------------------------------------------------------------
// Helper: Fulfill a confirmed crypto order
//   - Marks crypto_orders as paid
//   - Inserts into purchases (idempotent via order_id check)
// ---------------------------------------------------------------------------

async function fulfillOrder(cryptoOrder, txid, paidAmount, client = supabaseAdmin) {
  const { id, user_id, note_id, invoice_id, amount_inr } = cryptoOrder;

  // 1. Update crypto_orders status and exact paid amount
  const { error: updateError } = await client
    .from('crypto_orders')
    .update({
      status: 'paid',
      txid: txid || null,
      amount_usdt: paidAmount || cryptoOrder.amount_usdt,
    })
    .eq('id', id)
    .eq('status', 'pending'); // Only update if still pending (idempotency guard)

  if (updateError) {
    console.error('[Crypto] Error updating crypto_order status:', updateError);
    throw updateError;
  }

  // 2. Idempotency check: avoid duplicate purchase records
  const { data: existingPurchase } = await client
    .from('purchases')
    .select('id')
    .eq('order_id', invoice_id)
    .maybeSingle();

  if (existingPurchase) {
    console.log(`[Crypto] Purchase already recorded for invoice ${invoice_id}. Skipping.`);
    return;
  }

  // 3. Insert purchase record — this grants access to the note
  const { error: purchaseError } = await client
    .from('purchases')
    .insert([{
      user_id,
      note_id,
      payment_id: txid || `crypto_${invoice_id}`,
      order_id: invoice_id,
      amount: amount_inr,
      status: 'completed',
      payment_method: 'crypto',
    }]);

  if (purchaseError) {
    console.error('[Crypto] Error inserting purchase:', purchaseError);
    throw purchaseError;
  }

  console.log(`[Crypto] Order fulfilled: invoice=${invoice_id}, user=${user_id}, note=${note_id}`);
}

// ---------------------------------------------------------------------------
// POST /api/crypto/create-invoice
// Body: { noteId }
// Auth: JWT required
// ---------------------------------------------------------------------------

exports.createInvoice = async (req, res) => {
  try {
    const { noteId } = req.body;
    const userId = req.user.id;

    if (!noteId) {
      return res.status(400).json({ error: 'noteId is required' });
    }

    // 1. Fetch note price
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, price')
      .eq('id', noteId)
      .eq('is_active', true)
      .single();

    if (noteError || !note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // 2. Check if already purchased (prevent duplicate payment)
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('note_id', noteId)
      .eq('status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      return res.status(409).json({ error: 'You already own this note.' });
    }

    // 3. Check for an existing pending crypto invoice for same user+note
    //    (prevent duplicate invoices if user clicks button twice)
    const { data: pendingOrder } = await supabase
      .from('crypto_orders')
      .select('*')
      .eq('user_id', userId)
      .eq('note_id', noteId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (pendingOrder) {
      // For cached orders, we might have saved the URL in wallet_address
      const invoiceUrl =
        (pendingOrder.wallet_address && pendingOrder.wallet_address.startsWith('http'))
          ? pendingOrder.wallet_address
          : `https://coinremitter.com/invoice/${pendingOrder.invoice_id}`;

      return res.json({
        invoiceId: pendingOrder.invoice_id,
        invoiceUrl,
        walletAddress: pendingOrder.wallet_address,
        amount: pendingOrder.amount_usdt,
        amountInr: pendingOrder.amount_inr,
        expiresAt: pendingOrder.expires_at,
      });
    }

    // 4. Calculate discounted INR amount (CoinRemitter converts to LTC internally)
    const discountedAmountInr = note.price * (1 - CRYPTO_DISCOUNT);

    // Guard: CoinRemitter enforces a minimum of ~0.015 LTC (~₹125).
    // Reject if the discounted price is too low to create an invoice.
    if (discountedAmountInr < 125) {
      return res.status(400).json({
        error: `This note's price (₹${note.price}) is below the minimum required for crypto payment (₹${Math.ceil(125 / (1 - CRYPTO_DISCOUNT))}). Please use Razorpay instead.`,
      });
    }

    // 5. Create CoinRemitter invoice with INR amount + fiat_currency='INR'
    //    CoinRemitter handles the INR → LTC conversion automatically
    const invoice = await coinremitter.createInvoice(
      discountedAmountInr,
      `NotesBay - ${note.title}`,
      `Purchase of note: ${note.title}`
    );

    // Log full response for debugging
    console.log('[CoinRemitter] Invoice fields:', JSON.stringify(Object.keys(invoice)));
    console.log('[CoinRemitter] Invoice data:', JSON.stringify({
      id: invoice.id,
      invoice_id: invoice.invoice_id,
      url: invoice.url,
      amount: invoice.amount,
      address: invoice.address,
      expire_on_timestamp: invoice.expire_on_timestamp,
      status: invoice.status,
    }));

    // CoinRemitter invoice responses use 'url' (hosted payment page), not a raw 'address'.
    // We store the invoice URL in wallet_address for display in the modal.
    const invoiceId_cr = invoice.invoice_id || invoice.id;
    const invoiceUrl = invoice.url || `https://coinremitter.com/invoice/${invoiceId_cr}`;

    // Immediately fetch invoice details to get the actual LTC address and amount.
    // The create-invoice response sometimes lacks these; the GET endpoint always has them.
    let ltcAddress = invoice.address || null;
    let ltcAmount = parseFloat(invoice.amount) || 0;
    try {
      const invoiceDetails = await coinremitter.getInvoice(invoiceId_cr);
      console.log('[CoinRemitter] Invoice details:', JSON.stringify(invoiceDetails));
      ltcAddress = invoiceDetails.address || ltcAddress;
      ltcAmount = parseFloat(invoiceDetails.amount || invoiceDetails.total_amount?.crypto) || ltcAmount;
    } catch (fetchErr) {
      console.warn('[CoinRemitter] Could not fetch invoice details:', fetchErr.message);
      // Non-fatal — we still have the invoice URL
    }

    // expire_on_timestamp is milliseconds from CoinRemitter v1 API
    const expiresAt = invoice.expire_on_timestamp
      ? new Date(invoice.expire_on_timestamp).toISOString()
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 6. Store in crypto_orders
    const { error: insertError } = await supabase
      .from('crypto_orders')
      .insert([{
        user_id: userId,
        note_id: noteId,
        invoice_id: invoiceId_cr,
        wallet_address: ltcAddress || invoiceUrl,  // fallback to URL if no address
        amount_usdt: ltcAmount,
        amount_inr: note.price,
        status: 'pending',
        expires_at: expiresAt,
      }]);

    if (insertError) {
      console.error('[Crypto] Error storing crypto_order:', insertError);
      throw insertError;
    }

    // 7. Respond with everything the frontend needs to render the payment UI
    return res.json({
      invoiceId: invoiceId_cr,
      invoiceUrl,                 // CoinRemitter hosted payment page
      walletAddress: ltcAddress,  // raw LTC address (for direct wallet payments)
      amount: ltcAmount,          // LTC amount to send
      amountInr: note.price,      // Original INR price for display
      expiresAt,
    });

  } catch (error) {
    console.error('[Crypto] createInvoice error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to create crypto invoice' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/crypto/status/:invoiceId
// Auth: JWT required
// ---------------------------------------------------------------------------

exports.getInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.id;

    // 1. Fetch our local record (also verifies ownership)
    const { data: order, error: orderError } = await supabase
      .from('crypto_orders')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // 2. Short-circuit if we already know it's paid or expired
    if (order.status === 'paid') {
      return res.json({ status: 'paid', txid: order.txid });
    }

    // 3. Check expiry
    if (new Date(order.expires_at) < new Date()) {
      // Mark as expired if not already done
      if (order.status !== 'expired') {
        await supabase
          .from('crypto_orders')
          .update({ status: 'expired' })
          .eq('id', order.id);
      }
      return res.json({ status: 'expired' });
    }

    // 4. Query CoinRemitter for live status using invoice_id
    const invoice = await coinremitter.getInvoice(invoiceId);

    // CoinRemitter v1: status 'paid' means fully paid
    const isPaid = invoice.status === 'paid';

    if (isPaid) {
      // Fulfill the order (insert into purchases, mark as paid)
      await fulfillOrder(order, invoice.txid, supabaseAdmin);
      return res.json({ status: 'paid', txid: invoice.txid });
    }

    // 5. Not yet paid
    return res.json({ status: 'pending' });

  } catch (error) {
    console.error('[Crypto] getInvoiceStatus error:', error.message);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/crypto/webhook
// No auth (CoinRemitter server-to-server callback)
// Body: CoinRemitter sends form-encoded data with invoice_id, status, txid, etc.
// ---------------------------------------------------------------------------

exports.handleWebhook = async (req, res) => {
  try {
    // CoinRemitter sends application/x-www-form-urlencoded
    const { id: invoiceId, status, txid } = req.body || {};

    console.log(`[Crypto Webhook] Received: invoice=${invoiceId} status=${status} txid=${txid}`);

    // CoinRemitter validates the webhook URL by sending a test POST with no body.
    // Always return 200 so validation passes.
    if (!invoiceId) {
      return res.status(200).json({ received: true });
    }

    // status === '2' means paid in CoinRemitter
    if (String(status) !== '2') {
      // Not a paid event — we only care about confirmed payments
      return res.status(200).json({ received: true });
    }

    // 1. Look up the order in our DB (use admin client — no user session)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('crypto_orders')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle();

    if (orderError || !order) {
      console.error(`[Crypto Webhook] Order not found for invoice ${invoiceId}`);
      return res.status(200).json({ received: true }); // Always 200 to stop CoinRemitter retries
    }

    // 2. Only process if still pending (idempotency)
    if (order.status !== 'pending') {
      console.log(`[Crypto Webhook] Already processed invoice ${invoiceId}. Skipping.`);
      return res.status(200).json({ received: true });
    }

    // 4. Verify via CoinRemitter API before fulfilling (prevents fake webhooks)
    const invoiceData = await coinremitter.getInvoice(invoiceId);
    if (invoiceData.status !== 'paid') {
      console.warn(`[Crypto Webhook] CoinRemitter API says NOT paid for invoice ${invoiceId}. Ignoring.`);
      return res.status(200).json({ received: true });
    }

    // 5. Fulfill the order (passing the actual crypto amount received)
    const exactPaidAmount = parseFloat(invoiceData.amount || invoiceData.total_amount?.crypto) || 0;
    await fulfillOrder(order, txid || invoiceData.txid, exactPaidAmount, supabaseAdmin);

    console.log(`[Crypto Webhook] Successfully fulfilled invoice ${invoiceId}`);
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Crypto Webhook] Error:', error.message);
    // Always return 200 to CoinRemitter — we don't want infinite retries
    return res.status(200).json({ error: 'Internal error', received: true });
  }
};
