-- Remove template-injected credentials that real storefronts are still publishing.
--
-- 20260907000009 cleared some of these, but a re-check against the live database found
-- seven values surviving across three stores. They are not seller-entered: each is a
-- byte-exact match for a default that shipped inside the 'warehouse' template and the
-- old company-capacity renderer, both of which have since been corrected in code.
--
-- Live examples found:
--   store 1  (Jean Fresh Traders) - "15+" years, "98%" on-time, "50,000 m²" factory, "80%" export
--   store 81 (QA Test Store 2)    - "10K+" units available, "98%" on-time shipping
--
-- Buyers are being shown operational claims these businesses never made. Blanking the
-- value (not removing the entry) leaves the seller a labelled field to fill in, and the
-- renderers now hide any metric whose value is empty, so nothing renders until they do.

-- stats modules: {"value": "...", "label": "...", "suffix": "..."}
UPDATE stores
SET storefront_config = REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(storefront_config::text, '"value": "15+"', '"value": ""'),
        '"value": "98%"', '"value": ""'),
      '"value": "10K+"', '"value": ""'),
    '"value": "80%"', '"value": ""')::jsonb,
    updated_at = now()
WHERE storefront_config::text ~ '"value": "(15\+|98%|10K\+|80%)"';

-- company-capacity props: named fields rather than a stats array
UPDATE stores
SET storefront_config = REPLACE(
      REPLACE(
        REPLACE(storefront_config::text, '"factorySize": "50,000 m²"', '"factorySize": ""'),
      '"yearsInBusiness": "15+"', '"yearsInBusiness": ""'),
    '"exportPercentage": "80%"', '"exportPercentage": ""')::jsonb,
    updated_at = now()
WHERE storefront_config::text ~ '"(factorySize": "50,000 m²|yearsInBusiness": "15\+|exportPercentage": "80%)"';
