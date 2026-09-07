-- Remove credentials the platform asserted on sellers' behalf.
--
-- The storefront module defaults shipped regulatory certifications (ISO 9001, CE, FCC,
-- RoHS, FDA), manufacturing scale (a 50,000 m2 factory, Xiamen Port, export percentages)
-- and delivery guarantees ("< 24 hours", "98.5% on-time", an "AAA" transaction level).
-- A seller who added one of those modules and never opened it published all of it as fact.
-- The defaults are fixed in code; this clears what was already saved.
--
-- Two rules keep it away from anything a seller actually owns:
--
--   1. A capacity or performance module is only cleared when EVERY value in it still
--      exactly matches a value the platform shipped. One seller-typed figure anywhere in
--      the module and the whole module is left alone.
--   2. A certification is only dropped when the seller attached no document to it. An
--      entry with an uploaded image is the seller's own evidence and is kept -- which is
--      why store 2 keeps its ISO 9001 and loses only CE, FCC and RoHS.
--
-- Statistics bands are deliberately NOT touched. Those are editorial numbers on a
-- marketing strip rather than claims about credentials, and clearing them would leave a
-- visibly empty band on a live storefront.
--
-- Each statement writes one field and is guarded on the module type still sitting at that
-- index, so it is skipped rather than misapplied if a seller has since reordered modules.
--
-- Planned from the live storefront configs read at 2026-09-07T20:56:59.195Z.
-- 18 field(s) across 3 store(s): 81, 2, 1.

-- Reversible: the affected configs are copied first.
CREATE TABLE IF NOT EXISTS storefront_config_backup_20260907 (
  store_id           INTEGER PRIMARY KEY,
  storefront_config  JSONB,
  backed_up_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO storefront_config_backup_20260907 (store_id, storefront_config)
SELECT id, storefront_config FROM stores WHERE id IN (81, 2, 1)
ON CONFLICT (store_id) DO NOTHING;

-- ---- store 81 ----
-- was: 5+
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,tradeInfo,yearsInBusiness}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: East Africa
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,tradeInfo,mainMarkets}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 60%
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,tradeInfo,exportPercentage}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: Dar es Salaam
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,tradeInfo,nearestPort}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 2
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,rdInfo,rdEngineers}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 5
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,rdInfo,rdStaff}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 2,000 m²
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,productionInfo,factorySize}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 25+
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,productionInfo,workers}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 10,000 units
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,productionInfo,monthlyCapacity}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 3
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,1,props,productionInfo,productionLines}', '""'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,1,type}' = 'company-capacity';

-- was: 1 entries
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,2,props,certifications}', '[]'::jsonb, false)
 WHERE id = 81
   AND storefront_config #>> '{sections,2,modules,2,type}' = 'certifications';

-- ---- store 2 ----
-- was: RoHS
UPDATE stores
   SET storefront_config = storefront_config #- '{sections,1,modules,2,props,certifications,3}'
 WHERE id = 2
   AND storefront_config #>> '{sections,1,modules,2,type}' = 'certifications';

-- was: FCC
UPDATE stores
   SET storefront_config = storefront_config #- '{sections,1,modules,2,props,certifications,2}'
 WHERE id = 2
   AND storefront_config #>> '{sections,1,modules,2,type}' = 'certifications';

-- was: CE
UPDATE stores
   SET storefront_config = storefront_config #- '{sections,1,modules,2,props,certifications,1}'
 WHERE id = 2
   AND storefront_config #>> '{sections,1,modules,2,type}' = 'certifications';

-- ---- store 1 ----
-- was: 3 entries
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,2,props,certifications}', '[]'::jsonb, false)
 WHERE id = 1
   AND storefront_config #>> '{sections,2,modules,2,type}' = 'certifications';

-- was: < 24 hours
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,3,props,responseTime}', '""'::jsonb, false)
 WHERE id = 1
   AND storefront_config #>> '{sections,2,modules,3,type}' = 'company-performance';

-- was: 98.5%
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,3,props,onTimeDelivery}', '""'::jsonb, false)
 WHERE id = 1
   AND storefront_config #>> '{sections,2,modules,3,type}' = 'company-performance';

-- was: AAA
UPDATE stores
   SET storefront_config = jsonb_set(storefront_config, '{sections,2,modules,3,props,transactionLevel}', '""'::jsonb, false)
 WHERE id = 1
   AND storefront_config #>> '{sections,2,modules,3,type}' = 'company-performance';

-- To undo:
--   UPDATE stores s SET storefront_config = b.storefront_config
--     FROM storefront_config_backup_20260907 b WHERE b.store_id = s.id;
