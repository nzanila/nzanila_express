-- Kiswahili category names.
--
-- The marketplace ships three UI languages (French, Kiswahili, English), but the
-- categories table only ever had name_en / name_fr / name_rn, so Swahili category
-- names had nowhere to live. Kirundi was retired as a UI language; name_rn is left
-- in place rather than dropped, because dropping a populated-capable column is
-- destructive and Kirundi is still understood by the AI research search.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_sw text;

COMMENT ON COLUMN categories.name_sw IS 'Kiswahili display name; falls back to categories.name when null.';
