/**
 * CryptoPaymentModal
 * -------------------
 * Full-screen payment modal for USDT-TRC20 crypto payments via CoinRemitter.
 *
 * Features:
 *   - Displays wallet address with copy-to-clipboard
 *   - QR code generated client-side via qrcode.react (no external API)
 *   - Countdown timer (15 minutes, real-time)
 *   - Live payment status polling every 8 seconds
 *   - Calls onSuccess() when payment is confirmed
 *   - Calls onClose() when user dismisses or timer expires
 *
 * Props:
 *   @param {string}   invoiceId     — CoinRemitter invoice ID
 *   @param {string}   walletAddress — USDT-TRC20 wallet address
 *   @param {number}   amount        — USDT amount to send (discounted)
 *   @param {number}   amountInr     — Original INR price (for display)
 *   @param {string}   expiresAt     — ISO timestamp when invoice expires
 *   @param {function} onSuccess     — Called when payment confirmed
 *   @param {function} onClose       — Called when modal is closed
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Clock, CheckCircle, AlertCircle, Loader2, Bitcoin } from 'lucide-react';
import api from '../../../lib/api';

// How often to poll the backend for payment status (milliseconds)
const POLL_INTERVAL_MS = 8000;

export default function CryptoPaymentModal({
  invoiceId,
  invoiceUrl,
  walletAddress,
  amount,
  amountInr,
  expiresAt,
  onSuccess,
  onClose,
}) {
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);     // seconds remaining
  const [status, setStatus] = useState('pending');    // 'pending' | 'paid' | 'expired' | 'error'
  const [paymentMode, setPaymentMode] = useState(walletAddress ? 'direct' : 'link'); // 'direct' or 'link'

  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Countdown timer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setStatus((prev) => (prev === 'pending' ? 'expired' : prev));
        clearInterval(timerRef.current);
      }
    };

    updateCountdown(); // Run immediately
    timerRef.current = setInterval(updateCountdown, 1000);

    return () => clearInterval(timerRef.current);
  }, [expiresAt]);

  // ---------------------------------------------------------------------------
  // Live payment status polling
  // ---------------------------------------------------------------------------
  const pollStatus = useCallback(async () => {
    if (status !== 'pending') return; // Stop polling once resolved
    try {
      const { data } = await api.get(`/crypto/status/${invoiceId}`);
      if (data.status === 'paid') {
        setStatus('paid');
        clearInterval(pollRef.current);
        // Slight delay so user sees the success state before modal closes
        setTimeout(() => onSuccess(), 2000);
      } else if (data.status === 'expired') {
        setStatus('expired');
        clearInterval(pollRef.current);
      }
    } catch (err) {
      console.error('[CryptoModal] Poll error:', err);
      // Don't show an error to user on poll failure — just retry next cycle
    }
  }, [invoiceId, status, onSuccess]);

  useEffect(() => {
    pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [pollStatus]);

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Copy to clipboard (copies invoice URL or wallet address)
  // ---------------------------------------------------------------------------
  const copyTarget = paymentMode === 'direct' ? walletAddress : (invoiceUrl || walletAddress || '');
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = copyTarget;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isExpiredOrPaid = status === 'expired' || status === 'paid';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crypto Payment"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-600 to-indigo-600">
          <div className="flex items-center gap-2 text-white">
            <Bitcoin className="w-5 h-5" />
            <h2 className="text-lg font-bold">Pay with Crypto <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 ml-1">LTC · Litecoin</span></h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Status Banner ── */}
        {status === 'paid' && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border-b border-green-200 dark:border-green-700 px-6 py-3 text-green-700 dark:text-green-300 font-medium">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>Payment received! Unlocking your note…</span>
          </div>
        )}
        {status === 'expired' && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-700 px-6 py-3 text-red-700 dark:text-red-300 font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Invoice expired. Please start a new payment.</span>
          </div>
        )}

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">

          {/* Discount badge */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Original price: <span className="line-through">₹{amountInr}</span>
            </div>
            <div className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold px-3 py-1 rounded-full">
              10% Crypto Discount Applied 🎉
            </div>
          </div>

          {/* Dual Payment Modes */}
          {walletAddress && invoiceUrl && (
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setPaymentMode('direct')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${paymentMode === 'direct' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-700 dark:text-indigo-300' : 'text-gray-500  hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Scan Address
              </button>
              <button
                onClick={() => setPaymentMode('link')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${paymentMode === 'link' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-700 dark:text-indigo-300' : 'text-gray-500  hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Payment Link
              </button>
            </div>
          )}

          {/* Amount info */}
          <div className="text-center bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4">
            {paymentMode === 'direct' && amount > 0 ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Send exactly</p>
                <div className="flex items-end justify-center gap-1.5">
                  <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 tracking-tight">
                    {amount.toFixed(8)}
                  </p>
                  <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 pb-1">LTC</p>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Network: Litecoin (LTC)</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">You pay (after 10% discount)</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  ₹{(amountInr * 0.9).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Exact LTC amount shown on payment page
                </p>
              </>
            )}
          </div>

          {/* QR Code + Pay Button */}
          <div className="flex flex-col items-center gap-3">
            <div className={`p-3 bg-white rounded-xl shadow-inner border border-gray-200 dark:border-gray-700 transition-opacity ${isExpiredOrPaid ? 'opacity-30' : 'opacity-100'}`}>
              <QRCodeSVG
                value={copyTarget || 'https://coinremitter.com'}
                size={160}
                bgColor="#ffffff"
                fgColor="#312e81"
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {paymentMode === 'direct' ? 'Scan with your Litecoin wallet' : 'Scan to open payment page'}
            </p>

            {/* Primary CTA: Open CoinRemitter payment page */}
            {paymentMode === 'link' && invoiceUrl && !isExpiredOrPaid && (
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all shadow-sm"
              >
                🔗 Open Payment Page
              </a>
            )}
          </div>

          {/* Payment URL / Wallet Address copy */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              {paymentMode === 'direct' ? 'Wallet Address (Litecoin)' : 'Payment Link'}
            </label>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700">
              <code className="flex-1 text-xs text-gray-800 dark:text-gray-200 break-all font-mono leading-relaxed">
                {copyTarget}
              </code>
              <button
                onClick={handleCopy}
                disabled={isExpiredOrPaid}
                title="Copy"
                className="shrink-0 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied
                  ? <Check className="w-4 h-4 text-green-500" />
                  : <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                }
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-1">✓ Copied!</p>
            )}
          </div>

          {/* Timer + Status row */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3">
            {/* Countdown */}
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${status === 'expired' ? 'text-red-500' : 'text-indigo-500'}`} />
              <span className={`font-mono font-bold text-lg ${
                status === 'expired'
                  ? 'text-red-500'
                  : timeLeft !== null && timeLeft < 120
                    ? 'text-orange-500'
                    : 'text-indigo-600 dark:text-indigo-400'
              }`}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">remaining</span>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm">
              {status === 'pending' && (
                <>
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span className="text-gray-600 dark:text-gray-400">Waiting…</span>
                </>
              )}
              {status === 'paid' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Confirmed!</span>
                </>
              )}
              {status === 'expired' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-500 font-medium">Expired</span>
                </>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 leading-relaxed">
            ⚠️ Open the payment page to see the exact LTC amount. Send on the <strong>Litecoin network only</strong>. Payments are non-refundable.
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel payment and go back
          </button>
        </div>
      </div>
    </div>
  );
}
