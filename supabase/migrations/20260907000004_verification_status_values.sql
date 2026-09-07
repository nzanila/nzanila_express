-- Align marketplace_users.verification_status with the values the seller submission
-- flow and the admin review flow actually write.
--
-- 20240830000003 created the column with:
--   CHECK (verification_status IN ('not_submitted','under_review','verified','needs_changes','suspended'))
-- but both new flows use 'pending' / 'approved' / 'rejected', so every submit and every
-- approve/reject would have failed on a constraint violation.
--
-- 'suspended' is deliberately kept. It means the account is banned by an admin, which is
-- not a judgement about the documents — folding it into 'rejected' would let a seller
-- silently clear a ban by resubmitting paperwork.

-- The original constraint was auto-named, so find it rather than guessing the name.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'marketplace_users'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%verification_status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE marketplace_users DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Move existing rows onto the new vocabulary before re-adding the constraint.
UPDATE marketplace_users SET verification_status = 'pending'  WHERE verification_status = 'under_review';
UPDATE marketplace_users SET verification_status = 'approved' WHERE verification_status = 'verified';
UPDATE marketplace_users SET verification_status = 'rejected' WHERE verification_status = 'needs_changes';
UPDATE marketplace_users SET verification_status = 'not_submitted' WHERE verification_status IS NULL;

-- Anything unexpected (from before the column was constrained) falls back to the start
-- state rather than blocking the migration.
UPDATE marketplace_users
SET verification_status = 'not_submitted'
WHERE verification_status NOT IN ('not_submitted', 'pending', 'approved', 'rejected', 'suspended');

ALTER TABLE marketplace_users
  ADD CONSTRAINT marketplace_users_verification_status_check
  CHECK (verification_status IN ('not_submitted', 'pending', 'approved', 'rejected', 'suspended'));

ALTER TABLE marketplace_users ALTER COLUMN verification_status SET DEFAULT 'not_submitted';
