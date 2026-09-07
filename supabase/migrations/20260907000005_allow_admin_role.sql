-- Allow role = 'admin'.
--
-- marketplace_users.role carries a CHECK constraint that only permits buyer/seller, so
-- promoting a staff account failed with 23514. The constraint is auto-named, so find it
-- through pg_constraint rather than guessing, and re-add it with 'admin' included.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE rel.relname = 'marketplace_users'
     AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) ILIKE '%role%'
     AND pg_get_constraintdef(con.oid) ILIKE '%buyer%'
   LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE marketplace_users DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE marketplace_users
  ADD CONSTRAINT marketplace_users_role_check
  CHECK (role IN ('buyer', 'seller', 'admin'));
