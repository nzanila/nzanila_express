-- Add onboarding fields to marketplace_users table
ALTER TABLE marketplace_users 
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'rn',
  ADD COLUMN IF NOT EXISTS otp_code TEXT,
  ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS zone TEXT,
  ADD COLUMN IF NOT EXISTS landmark TEXT,
  ADD COLUMN IF NOT EXISTS delivery_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_full_name TEXT,
  ADD COLUMN IF NOT EXISTS product_categories TEXT[],
  ADD COLUMN IF NOT EXISTS offers_delivery BOOLEAN,
  ADD COLUMN IF NOT EXISTS offers_pickup BOOLEAN,
  ADD COLUMN IF NOT EXISTS delivery_areas TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted', 'under_review', 'verified', 'needs_changes', 'suspended')),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add indexes for onboarding queries
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON marketplace_users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON marketplace_users(onboarding_completed);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketplace_users_updated_at BEFORE UPDATE ON marketplace_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
