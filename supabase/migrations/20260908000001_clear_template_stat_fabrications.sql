-- Finish clearing template-injected statistics from live storefronts.
--
-- 20260908000000 cleared values that matched a marker outright, but stats modules store
-- the number and its unit in SEPARATE fields — {"value": "2,000", "suffix": " m²"} — so
-- "2,000 m²" never appeared as one string and survived. This finishes the job.
--
-- Each target is matched on BOTH value and label, so a seller who legitimately typed the
-- same number under a different label keeps it. Evidence these are not seller-entered:
--
--   store 1  "Jean Fresh Traders"  published "50K+ Products"  — actually lists 40 products
--                                  published "120+ Countries" — a Burundi produce trader
--   store 81 "QA Test Store 2"     published "2,000 m² Warehouse area" and
--                                  "24 hrs Dispatch target"   — actually lists 1 product
--
-- The labels come from template defaults that shipped in the 'warehouse' design and an
-- older stats block; both have since been corrected in storefront-types.ts. The value is
-- blanked rather than the field removed, so the seller keeps a labelled field to fill in,
-- and the renderers hide any metric whose value is empty.

DO $$
DECLARE
  store_row   RECORD;
  new_config  jsonb;
  section_i   int;
  module_i    int;
  stat_i      int;
  stat_val    text;
  stat_label  text;
BEGIN
  FOR store_row IN SELECT id, storefront_config FROM stores WHERE storefront_config IS NOT NULL LOOP
    new_config := store_row.storefront_config;

    FOR section_i IN 0 .. COALESCE(jsonb_array_length(new_config->'sections'), 0) - 1 LOOP
      FOR module_i IN 0 .. COALESCE(jsonb_array_length(new_config->'sections'->section_i->'modules'), 0) - 1 LOOP
        FOR stat_i IN 0 .. COALESCE(jsonb_array_length(
              new_config->'sections'->section_i->'modules'->module_i->'props'->'stats'), 0) - 1 LOOP

          stat_val   := new_config->'sections'->section_i->'modules'->module_i->'props'->'stats'->stat_i->>'value';
          stat_label := new_config->'sections'->section_i->'modules'->module_i->'props'->'stats'->stat_i->>'label';

          IF (stat_val, stat_label) IN (
               ('2,000', 'Warehouse area'),
               ('24',    'Dispatch target'),
               ('50K',   'Products'),
               ('120',   'Countries')
             ) THEN
            new_config := jsonb_set(
              new_config,
              ARRAY['sections', section_i::text, 'modules', module_i::text, 'props', 'stats', stat_i::text, 'value'],
              '""'::jsonb
            );
          END IF;

        END LOOP;
      END LOOP;
    END LOOP;

    IF new_config IS DISTINCT FROM store_row.storefront_config THEN
      UPDATE stores SET storefront_config = new_config, updated_at = now() WHERE id = store_row.id;
      RAISE NOTICE 'Cleared template stat fabrications on store %', store_row.id;
    END IF;
  END LOOP;
END $$;
