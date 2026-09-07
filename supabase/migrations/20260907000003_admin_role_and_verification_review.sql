-- Admin role + the review trail a human leaves when granting or refusing verification.
--
-- The document table itself is owned by the seller-side work; this migration only adds
-- what the admin review needs, and is written additively so either side can land first.

ALTER TABLE marketplace_users
  ADD COLUMN IF NOT EXISTS verification_note TEXT,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_by BIGINT,
  ADD COLUMN IF NOT EXISTS verification_submission_note TEXT;

-- Statuses used across seller + admin: not_submitted | pending | approved | rejected
ALTER TABLE marketplace_users
  ALTER COLUMN verification_status SET DEFAULT 'not_submitted';

UPDATE marketplace_users
   SET verification_status = 'not_submitted'
 WHERE verification_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_users_verification_status
  ON marketplace_users(verification_status);

-- Documents table, created here too (IF NOT EXISTS) so the admin can be built and
-- reviewed before the seller-side upload lands. Shape matches the agreed contract.
CREATE TABLE IF NOT EXISTS seller_verification_documents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_svd_user ON seller_verification_documents(user_id);

-- Audit log: who decided what, and why. Kept separate from the user row so a later
-- decision never erases the reasoning behind an earlier one.
CREATE TABLE IF NOT EXISTS verification_reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  reviewer_id BIGINT,
  decision TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_reviews_user ON verification_reviews(user_id);
