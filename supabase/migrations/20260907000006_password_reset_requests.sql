-- Password recovery by human review.
--
-- There is no email or SMS delivery in this system, so a self-service reset link is not
-- possible. Instead a locked-out user files a request with identifying details, an admin
-- checks it against the documents already on file, and issues a new password.
--
-- Deliberately NOT stored here: any password. The issued password is generated server
-- side, hashed straight into marketplace_users, and shown to the admin exactly once.

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id BIGSERIAL PRIMARY KEY,
  -- Nullable: a request is accepted even when the phone matches no account, so the form
  -- cannot be used to discover which numbers are registered.
  user_id BIGINT REFERENCES marketplace_users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  full_name TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_by BIGINT,
  handled_at TIMESTAMPTZ,
  admin_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status
  ON password_reset_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user
  ON password_reset_requests(user_id);
