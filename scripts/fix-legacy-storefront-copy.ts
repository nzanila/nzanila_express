/**
 * Repairs storefronts that were created from the old `food-grocery` and `electronics`
 * templates, before those templates were rewritten to use {{tokens}}.
 *
 * Those two templates shipped another company's identity — "Kigali Fresh Traders",
 * "BAOFENG" — and a set of fabricated credentials: a 50,000 m2 factory, Xiamen Port,
 * ISO 9001 / CE / FCC / RoHS, 98.5% on-time delivery, an AAA transaction level. All of it
 * was baked into `stores.storefront_config` at creation time, so fixing the template does
 * nothing for stores that already exist. This script fixes those rows.
 *
 * It is deliberately surgical rather than a re-apply of the new template:
 *
 *   - A value is only touched when it still EXACTLY matches the old bad default. If the
 *     seller edited it, it is theirs and it is left alone.
 *   - Identity strings are replaced with this store's own name, not blanked.
 *   - Any {{token}} still sitting in the config is resolved from the store row, using the
 *     same rules as the renderer's storeTokens().
 *
 * Nothing else in the config is rewritten, so seller customisation survives.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... pnpm tsx scripts/fix-legacy-storefront-copy.ts
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... pnpm tsx scripts/fix-legacy-storefront-copy.ts --apply
 *
 * Without --apply it is a dry run: it prints exactly what it would change and writes nothing.
 */

const apply = process.argv.includes('--apply');
const AFFECTED_TEMPLATES = ['food-grocery', 'electronics'];

type StoreRow = Record<string, any>;

/** Identity strings the old templates hardcoded, longest first so "Kigali Fresh Traders"
 *  is matched before "Kigali Fresh". */
const IDENTITY_STRINGS = [
  'Kigali Fresh Traders',
  'Kigali Fresh',
  'BAOFENG',
];

/** Exact old default values. A prop is only cleared when it still equals one of these. */
const FABRICATED_VALUES = new Set([
  // company-capacity — trade
  'Xiamen Port', '10+', '15+', '80%', '95%', '2018',
  'North America, Europe, Asia', 'North America, Europe, Asia, South America', 'East Africa',
  // company-capacity — production
  '50,000 m²', '2,000 m²', '500+', '10-50', '100,000 pcs', '5,000 kg', '10', '15', '3',
  // company-capacity — R&D
  '20', '50', '30', '0',
  // company-performance
  '2 hours', '< 24 hours', '≤10h', '98.5%', '98%', 'AAA', '95%',
]);

/** Certification sets the old templates asserted on the seller's behalf. */
const FABRICATED_CERTS = new Set(['ISO 9001', 'CE', 'FCC', 'RoHS', 'Certificate']);

/** Stat entries the old templates published as fact. Matched on value+label together. */
const FABRICATED_STATS = new Set([
  '60000|Factory Floor Area', '50000|Radios Per day', '3000|Workers Staff', '90+|Country Customer',
  '2,000|Factory Blueprint', '5,000|Monthly Capacity', '10-50|Workers, Staff', '50+|Countries Customer',
  '50000|m² Factory Area', '50000|pcs Monthly Capacity', '3000|Workers', '90+|Countries Served',
]);

function formatPhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('257')) {
    const local = digits.slice(3);
    return `+257 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return value || '';
}

/** Same shape as storeTokens() in the marketplace renderer, so a config repaired here and
 *  one resolved at render time say the same thing. */
function storeTokens(store: StoreRow): Record<string, string> {
  const value = (columnName: string) => {
    const raw = store?.[columnName];
    return raw === null || raw === undefined || raw === '' ? '' : String(raw);
  };
  const location = [value('commune') || value('location_address') || value('address'), value('province')]
    .filter(Boolean)
    .join(', ');
  return {
    companyName: value('name') || 'This supplier',
    description: value('description') || 'Contact this supplier for company and product information.',
    category: value('business_category') || 'Wholesale supply',
    phone: formatPhone(value('phone')) || value('phone') || 'Contact this supplier',
    email: value('email') || 'Contact this supplier',
    address: value('address') || value('location_address') || location || 'Location available from supplier',
    location: location || 'Burundi',
    yearsActive: value('years_active') ? `${value('years_active')} years` : 'New supplier',
  };
}

export type Change = { path: string; from: string; to: string };

export function repair(config: any, store: StoreRow, changes: Change[]): any {
  const tokens = storeTokens(store);
  const storeName = tokens.companyName;

  const repairString = (text: string, path: string): string => {
    let next = text;
    for (const identity of IDENTITY_STRINGS) {
      if (next.includes(identity)) next = next.split(identity).join(storeName);
    }
    next = next.replace(/\{\{(\w+)\}\}/g, (whole, token: string) => tokens[token] ?? whole);
    if (next !== text) changes.push({ path, from: text, to: next });
    return next;
  };

  const walk = (node: any, path: string, moduleType: string | null): any => {
    if (typeof node === 'string') return repairString(node, path);
    if (Array.isArray(node)) return node.map((item, index) => walk(item, `${path}[${index}]`, moduleType));
    if (!node || typeof node !== 'object') return node;

    const type = typeof node.type === 'string' ? node.type : moduleType;

    // A certification is a claim about a document the seller holds. Drop the ones nobody
    // here ever applied for; keep any the seller added themselves.
    if (type === 'certifications' && Array.isArray(node.certifications)) {
      const kept = node.certifications.filter((cert: any) => !FABRICATED_CERTS.has(String(cert?.name || '')));
      if (kept.length !== node.certifications.length) {
        changes.push({ path: `${path}.certifications`, from: `${node.certifications.length} entries`, to: `${kept.length} entries` });
        node = { ...node, certifications: kept };
      }
    }

    if (type === 'stats' && Array.isArray(node.stats)) {
      const cleaned = node.stats.map((stat: any) => {
        const signature = `${String(stat?.value ?? '')}|${String(stat?.label ?? '')}`;
        if (!FABRICATED_STATS.has(signature)) return stat;
        changes.push({ path: `${path}.stats`, from: signature.replace('|', ' — '), to: '(cleared)' });
        return { ...stat, value: '' };
      });
      node = { ...node, stats: cleaned };
    }

    const out: Record<string, any> = {};
    for (const [propName, propValue] of Object.entries(node)) {
      const childPath = path ? `${path}.${propName}` : propName;

      // Scalar credential fields: clear only when still equal to a known bad default.
      const isCredentialModule = type === 'company-capacity' || type === 'company-performance';
      if (isCredentialModule && typeof propValue === 'string' && FABRICATED_VALUES.has(propValue)) {
        changes.push({ path: childPath, from: propValue, to: '(cleared)' });
        out[propName] = '';
        continue;
      }
      if (isCredentialModule && propValue && typeof propValue === 'object' && !Array.isArray(propValue)) {
        const nested: Record<string, any> = {};
        for (const [nestedName, nestedValue] of Object.entries(propValue as Record<string, any>)) {
          // company-performance also carries a `metrics` array of the same invented
          // figures, each with its own invented 4.8/4.9/5.0 rating. Drop those entries
          // whole rather than leaving a labelled row with an empty value.
          if (nestedName === 'metrics' && Array.isArray(nestedValue)) {
            const kept = nestedValue.filter(metric => !FABRICATED_VALUES.has(String(metric?.value ?? '')));
            if (kept.length !== nestedValue.length) {
              changes.push({ path: `${childPath}.metrics`, from: `${nestedValue.length} metrics`, to: `${kept.length} metrics` });
            }
            nested[nestedName] = kept;
            continue;
          }
          if (typeof nestedValue === 'string' && FABRICATED_VALUES.has(nestedValue)) {
            changes.push({ path: `${childPath}.${nestedName}`, from: nestedValue, to: '(cleared)' });
            nested[nestedName] = '';
          } else {
            nested[nestedName] = walk(nestedValue, `${childPath}.${nestedName}`, type);
          }
        }
        out[propName] = nested;
        continue;
      }
      // company-performance ships a `metrics` array of the same invented figures.
      if (type === 'company-performance' && propName === 'metrics' && Array.isArray(propValue)) {
        const kept = (propValue as any[]).filter(metric => !FABRICATED_VALUES.has(String(metric?.value || '')));
        if (kept.length !== propValue.length) {
          changes.push({ path: childPath, from: `${propValue.length} metrics`, to: `${kept.length} metrics` });
        }
        out[propName] = kept;
        continue;
      }

      out[propName] = walk(propValue, childPath, type);
    }
    return out;
  };

  return walk(config, '', null);
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const query = `store_template=in.(${AFFECTED_TEMPLATES.join(',')})&select=*`;
  const response = await fetch(`${url}/rest/v1/stores?${query}`, { headers });
  if (!response.ok) throw new Error(`Could not read stores: ${response.status} ${await response.text()}`);
  const stores = (await response.json()) as StoreRow[];

  console.log(`${stores.length} store(s) created from ${AFFECTED_TEMPLATES.join(' / ')}.\n`);

  let repaired = 0;
  for (const store of stores) {
    const config = store.storefront_config;
    if (!config || typeof config !== 'object' || !Array.isArray(config.sections)) {
      console.log(`  store ${store.id} (${store.name}) — no saved design, nothing to repair`);
      continue;
    }

    const changes: Change[] = [];
    const next = repair(config, store, changes);
    if (!changes.length) {
      console.log(`  store ${store.id} (${store.name}) — already clean`);
      continue;
    }

    repaired += 1;
    console.log(`  store ${store.id} (${store.name}) — ${changes.length} change(s):`);
    for (const change of changes.slice(0, 12)) {
      const from = change.from.length > 70 ? `${change.from.slice(0, 70)}…` : change.from;
      const to = change.to.length > 70 ? `${change.to.slice(0, 70)}…` : change.to;
      console.log(`      ${change.path || '(root)'}\n        - ${from}\n        + ${to}`);
    }
    if (changes.length > 12) console.log(`      … and ${changes.length - 12} more`);

    if (apply) {
      const patch = await fetch(`${url}/rest/v1/stores?id=eq.${store.id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ storefront_config: next }),
      });
      if (!patch.ok) throw new Error(`Failed to update store ${store.id}: ${patch.status} ${await patch.text()}`);
      console.log('      written');
    }
  }

  console.log(
    apply
      ? `\nRepaired ${repaired} storefront(s).`
      : `\nDry run — ${repaired} storefront(s) would be repaired. Re-run with --apply to write.`,
  );
}

// Only run when invoked directly, so the repair logic can be exercised in isolation.
if (process.argv[1]?.endsWith('fix-legacy-storefront-copy.ts')) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
