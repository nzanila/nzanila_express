/**
 * Extracts every translatable string out of the storefront template catalogue.
 *
 * The 17 templates in artifacts/seller-central/src/lib/storefront-types.ts carry their copy
 * inside untyped module `props`, nested several levels deep and mixed in with colours, URLs
 * and layout enums. Translating that in place means hunting through ~3,400 lines of config.
 * This produces a flat, keyed catalogue instead.
 *
 * Rules it follows:
 *
 *   - Keys are `tpl.<templateId>.<modulePath>.<field>` — deterministic from the config, so
 *     re-running after a template edit produces stable keys and no human naming decisions.
 *   - {{tokens}} are left completely intact. They are resolved twice downstream (at store
 *     creation and again at render), so a translation must carry the placeholder through
 *     untouched and let resolution run over the translated string.
 *   - English source only. Nothing here is translated.
 *   - Two flags are emitted for review: `token` for strings carrying a {{placeholder}}, and
 *     `suspect` for strings that read like a fabricated credential or statistic. The second
 *     exists because the catalogue previously shipped invented factory sizes, export
 *     percentages and delivery guarantees; those should be deleted, not translated into
 *     three languages.
 *
 * Usage: pnpm tsx scripts/extract-template-strings.ts
 * Writes artifacts/seller-central/src/lib/template-strings.generated.ts
 */

import { writeFileSync } from 'node:fs';
import { STOREFRONT_TEMPLATES } from '../artifacts/seller-central/src/lib/storefront-types';

/** Prop names that hold human-readable copy. Anything not listed is skipped, so a new
 *  colour or URL field never leaks into the translation catalogue by accident. */
const COPY_FIELDS = new Set([
  'title', 'subtitle', 'description', 'buttonText', 'label', 'altText', 'alt',
  'name', 'sublabel', 'tagline', 'verificationLabel', 'yearsActive', 'suffix',
  'placeholder', 'heading', 'caption', 'badge', 'note', 'cta', 'ctaText',
  'mainMarkets', 'nearestPort', 'factorySize', 'workers', 'monthlyCapacity',
  'productionLines', 'yearsInBusiness', 'exportPercentage', 'rdEngineers', 'rdStaff',
  'responseTime', 'onTimeDelivery', 'transactionLevel', 'value',
]);

/** Never translatable, even when the field name looks like copy. */
const NEVER = new Set(['icon', 'type', 'id', 'slug', 'productSource', 'layout', 'videoType', 'aspectRatio']);

const isUrl = (value: string) => /^(https?:\/\/|data:|\/|#)/.test(value) || /\.(jpg|jpeg|png|webp|mp4|svg)$/i.test(value);
const isColor = (value: string) => /^#[0-9a-f]{3,8}$/i.test(value);
const isNumeric = (value: string) => /^[\d\s.,+%-]+$/.test(value);

/** Reads like a claim about the business rather than a label. */
const SUSPECT = /\b(ISO ?\d{4,}|RoHS|FCC|CE Marking|FDA|OHSAS|AAA|\d+\s*(m²|pcs|kg|units)|\d+%|\d+\s*\+?\s*(years|workers|countries)|Xiamen|Dar es Salaam)\b/i;

type Entry = { key: string; text: string; template: string; path: string; flags: string[] };
const entries: Entry[] = [];
const seen = new Map<string, string>();

function walk(node: unknown, templateId: string, path: string[], keyPath: string[]) {
  if (typeof node === 'string') {
    const field = path[path.length - 1];
    if (!field || NEVER.has(field) || !COPY_FIELDS.has(field)) return;
    const text = node.trim();
    if (!text || isUrl(text) || isColor(text)) return;
    // A bare number with no words is a value, not copy — unless it carries a unit.
    if (isNumeric(text) && !/[a-z]/i.test(text)) return;

    const key = `tpl.${templateId}.${keyPath.join('.')}`;
    const flags: string[] = [];
    if (/\{\{\w+\}\}/.test(text)) flags.push('token');
    if (SUSPECT.test(text)) flags.push('suspect');

    const previous = seen.get(key);
    if (previous !== undefined && previous !== text) flags.push('duplicate-key');
    seen.set(key, text);
    entries.push({ key, text, template: templateId, path: path.join('.'), flags });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, templateId, [...path, String(index)], [...keyPath, String(index)]));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [name, value] of Object.entries(node as Record<string, unknown>)) {
      walk(value, templateId, [...path, name], [...keyPath, name]);
    }
  }
}

for (const template of STOREFRONT_TEMPLATES) {
  // The picker's own copy is translatable too — a seller reads it before choosing.
  entries.push({ key: `tpl.${template.id}.meta.name`, text: template.name, template: template.id, path: 'name', flags: [] });
  entries.push({ key: `tpl.${template.id}.meta.description`, text: template.description, template: template.id, path: 'description', flags: [] });

  for (const section of template.config.sections) {
    entries.push({ key: `tpl.${template.id}.section.${section.slug}.name`, text: section.name, template: template.id, path: `sections.${section.slug}.name`, flags: [] });
    section.modules.forEach(module => {
      walk(module.props, template.id, [`sections`, section.slug, module.id, 'props'], [section.slug, module.id]);
    });
  }
}

const dict = entries.map(e => `  ${JSON.stringify(e.key)}: ${JSON.stringify(e.text)},`).join('\n');
const meta = entries
  .filter(e => e.flags.length)
  .map(e => `  ${JSON.stringify(e.key)}: ${JSON.stringify(e.flags)},`)
  .join('\n');

const output = `// GENERATED by scripts/extract-template-strings.ts — do not edit by hand.
// Re-run the script after changing STOREFRONT_TEMPLATES.
//
// English source strings for the storefront template catalogue, keyed as
// tpl.<templateId>.<section>.<moduleId>.<propPath>. The {{tokens}} are intentionally
// left unresolved: translate the string with the placeholder still in it, and let the
// existing creation-time and render-time resolution substitute into the translated text.
//
// ${entries.length} strings across ${STOREFRONT_TEMPLATES.length} templates.

export const templateStringsEn: Record<string, string> = {
${dict}
};

// Strings needing a human look before translation.
//   token    — carries a {{placeholder}}; keep it intact and in a position that still
//              reads correctly once substituted.
//   suspect  — reads like a credential or statistic about the business rather than a
//              label. Check it is correct before translating; the catalogue previously
//              shipped invented factory sizes and delivery guarantees.
export const templateStringFlags: Record<string, string[]> = {
${meta}
};
`;

const path = new URL('../artifacts/seller-central/src/lib/template-strings.generated.ts', import.meta.url).pathname;
writeFileSync(path, output);

const flagged = entries.filter(e => e.flags.length);
console.log(`${entries.length} strings across ${STOREFRONT_TEMPLATES.length} templates`);
console.log(`  with {{tokens}}: ${entries.filter(e => e.flags.includes('token')).length}`);
console.log(`  suspect (credential/statistic): ${entries.filter(e => e.flags.includes('suspect')).length}`);
console.log(`  duplicate keys: ${entries.filter(e => e.flags.includes('duplicate-key')).length}`);
console.log(`\nwrote ${path}`);
if (flagged.length) {
  console.log('\nflagged for review:');
  for (const e of flagged.slice(0, 40)) console.log(`  [${e.flags.join(',')}] ${e.key}\n      ${e.text.slice(0, 100)}`);
  if (flagged.length > 40) console.log(`  … and ${flagged.length - 40} more`);
}
