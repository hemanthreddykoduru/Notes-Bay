-- ============================================================
-- CoinRemitter Crypto Payment Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. crypto_orders table
--    Tracks pending/paid/expired crypto payment invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS crypto_orders (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users NOT NULL,
  note_id        uuid REFERENCES notes(id) NOT NULL,
  invoice_id     text NOT NULL UNIQUE,          -- CoinRemitter invoice ID
  wallet_address text NOT NULL,                 -- USDT-TRC20 deposit address
  amount_usdt    numeric(18, 6) NOT NULL,       -- Discounted USDT amount user must send
  amount_inr     numeric NOT NULL,              -- Original INR price (for records)
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'expired')),
  txid           text,                          -- On-chain transaction ID (set on payment)
  expires_at     timestamp with time zone NOT NULL,
  created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE crypto_orders ENABLE ROW LEVEL SECURITY;

-- Users can only view their own crypto orders
CREATE POLICY "Users can view their own crypto orders." ON crypto_orders
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all crypto orders
CREATE POLICY "Admins can view all crypto orders." ON crypto_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role (backend) handles all inserts/updates via the webhook and controller
-- RLS bypassed for service role key automatically

-- ============================================================
-- 2. Add payment_method column to existing purchases table
--    Tracks whether a purchase was via Razorpay or Crypto
-- ============================================================

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'razorpay';

-- ============================================================
-- Done! Verify with:
--   SELECT * FROM crypto_orders LIMIT 1;
--   SELECT payment_method FROM purchases LIMIT 1;
-- ============================================================
