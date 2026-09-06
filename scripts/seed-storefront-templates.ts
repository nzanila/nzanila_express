import { DEFAULT_STOREFRONT_CONFIG, STOREFRONT_TEMPLATES } from '../artifacts/seller-central/src/lib/storefront-types';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');

const rows = STOREFRONT_TEMPLATES.map((template, index) => ({
  id: template.id,
  name: template.name,
  description: template.description,
  preview_image: template.preview,
  category: template.category,
  default_config: { ...DEFAULT_STOREFRONT_CONFIG, ...template.config, storeId: 0, updatedAt: new Date().toISOString() },
  is_active: true,
  sort_order: index,
  updated_at: new Date().toISOString(),
}));

const response = await fetch(`${url}/rest/v1/storefront_templates?on_conflict=id`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(rows),
});

if (!response.ok) throw new Error(`Template seed failed: ${response.status} ${await response.text()}`);
console.log(`Seeded ${rows.length} storefront templates.`);
