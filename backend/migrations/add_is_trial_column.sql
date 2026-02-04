-- Add is_trial column to subscriptions table
-- This column tracks whether a subscription is a free trial or paid

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;

-- Add comment to column for documentation
COMMENT ON COLUMN subscriptions.is_trial IS 'Indicates if this subscription is a free trial (true) or paid subscription (false)';

-- Optional: Create index for faster trial lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_trial 
ON subscriptions(user_id, is_trial) 
WHERE is_trial = true;
