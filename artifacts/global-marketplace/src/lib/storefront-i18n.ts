import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { t, type Locale } from '@/lib/i18n/translations';
import { templateString } from './template-strings.i18n.generated';
import { templateStringsEn } from './template-strings.generated';

// Storefront (canvas) copy on the buyer-facing store page, translated in three layers:
//
//   1. Template copy the seller never edited  -> the hand-translated template dictionary,
//      keyed by template id + section + module id + prop path. A saved config keeps the
//      template id and the template's module ids, so the key can be rebuilt here.
//   2. Palette defaults the seller never edited ("Special Offer", "Shop Now")
//                                              -> `ui.sf.default.*` keys.
//   3. Everything the seller typed themselves  -> Workers AI (/api/translate), automatically,
//      into the buyer's interface language, cached per string and direction. The page shows
//      a single "machine translated · show original" bar so nothing is passed off as the
//      seller's own wording, and the original is one tap away.
//
// Product NAMES are deliberately left out of layer 3 (see storefront-renderer.tsx header):
// the model fails hardest on short catalogue names. Section copy has enough context.

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';

type TemplateRef = { template?: string } | undefined;

function known(locale: Locale, key: string): string | undefined {
  const value = t(locale, key);
  return value === key ? undefined : value;
}

/** Section tab name: template dictionary first, then the generic section keys. */
export function sectionLabel(locale: Locale, config: TemplateRef, section: { id: string; name: string }): string {
  const name = section.name || section.id;
  if (config?.template) {
    const key = `tpl.${config.template}.section.${section.id}.name`;
    if (templateStringsEn[key] === name) return templateString(locale, key);
  }
  const generic = `ui.sf.section.${section.id}`;
  if (t('en', generic) === name) return known(locale, generic) ?? name;
  return name;
}

/**
 * Hand translation for a module text prop when it is still a template or palette default;
 * undefined when the seller wrote it themselves (the caller then falls back to machine
 * translation). `path` is the dotted prop path ("title", "features.0.description").
 */
export function handTranslation(locale: Locale, config: TemplateRef, sectionId: string | undefined, moduleId: string, moduleType: string, path: string, text: string): string | undefined {
  if (!text.trim()) return undefined;
  if (config?.template && sectionId) {
    const key = `tpl.${config.template}.${sectionId}.${moduleId}.${path}`;
    if (templateStringsEn[key] === text) return templateString(locale, key);
  }
  const defaultKey = `ui.sf.default.${moduleType}.${path}`;
  if (t('en', defaultKey) === text) return known(locale, defaultKey);
  return undefined;
}

// ---- machine translation of seller-authored copy ---------------------------------------

// Rough source-language guess so the model is not asked to translate French as English.
// Only the three marketplace languages are considered; a wrong guess degrades to the
// endpoint's original-text fallback, never to an error.
const HINTS: Record<Locale, string[]> = {
  fr: ['le', 'la', 'les', 'des', 'et', 'pour', 'vous', 'nous', 'une', 'avec', 'votre', 'nos', 'est', 'sur', 'de'],
  sw: ['na', 'ya', 'wa', 'kwa', 'za', 'ni', 'bidhaa', 'yetu', 'sisi', 'wetu', 'zetu', 'katika', 'kutoka', 'hapa'],
  en: ['the', 'and', 'for', 'with', 'your', 'our', 'we', 'you', 'to', 'of', 'in', 'from', 'products', 'quality'],
};

export function guessLanguage(texts: string[]): Locale {
  const words = texts.join(' ').toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean);
  const score = (locale: Locale) => words.filter(word => HINTS[locale].includes(word)).length;
  const ranked = (['fr', 'sw', 'en'] as Locale[]).map(locale => [locale, score(locale)] as const).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : 'en';
}

const cache = new Map<string, string>();
const cacheKey = (from: string, to: string, text: string) => `${from}:${to}:${text}`;

async function translateBatch(texts: string[], from: Locale, to: Locale): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const pending = Array.from(new Set(texts.filter(text => text.trim() && text.length <= 2000 && !cache.has(cacheKey(from, to, text)))));
  texts.forEach(text => { const hit = cache.get(cacheKey(from, to, text)); if (hit) out.set(text, hit); });
  for (let i = 0; i < pending.length; i += 50) {
    const chunk = pending.slice(i, i + 50);
    try {
      const response = await fetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: chunk, from, to }),
      });
      if (!response.ok) continue;
      const data = await response.json() as { translations?: string[] };
      chunk.forEach((text, index) => {
        const result = data.translations?.[index];
        // The endpoint returns the original when the model fails; that is not a translation.
        if (result && result !== text) { cache.set(cacheKey(from, to, text), result); out.set(text, result); }
      });
    } catch { /* leave these strings in the seller's own words */ }
  }
  return out;
}

export type StorefrontTranslator = {
  /** Display text for a module prop: hand translation, machine translation, or the original. */
  text: (sectionId: string | undefined, moduleId: string, moduleType: string, path: string, value: unknown) => string;
  /** True while at least one machine-translated string is on screen. */
  machineTranslated: boolean;
  /** Whether the buyer has asked to see the seller's own words instead. */
  showOriginal: boolean;
  setShowOriginal: (on: boolean) => void;
  loading: boolean;
};

const TEXT_PATHS = ['title', 'subtitle', 'description', 'buttonText', 'brand', 'discount', 'alt', 'altText'];
const ARRAY_PATHS: Record<string, string[]> = {
  slides: ['headline', 'subheadline', 'ctaLabel', 'title', 'subtitle', 'buttonText'],
  features: ['title', 'description'],
  stats: ['label'],
  categories: ['name', 'sublabel'],
  certifications: ['name', 'description'],
  shippingMethods: ['name', 'time'],
  badges: ['name'],
  products: ['name'],
  regions: ['label'],
};

type Section = { id: string; name: string; modules: Array<{ id: string; type: string; props: Record<string, unknown> }> };

/** Every seller-visible string in the config, with the address needed to look it up. */
function collectStrings(config: { template?: string; sections: Section[] }): Array<{ sectionId: string; moduleId: string; moduleType: string; path: string; text: string }> {
  const rows: Array<{ sectionId: string; moduleId: string; moduleType: string; path: string; text: string }> = [];
  for (const section of config.sections) {
    for (const mod of section.modules) {
      const props = mod.props || {};
      for (const path of TEXT_PATHS) {
        const value = props[path];
        if (typeof value === 'string' && value.trim()) rows.push({ sectionId: section.id, moduleId: mod.id, moduleType: mod.type, path, text: value });
      }
      for (const [key, fields] of Object.entries(ARRAY_PATHS)) {
        const items = props[key];
        if (!Array.isArray(items)) continue;
        items.forEach((item, index) => {
          if (typeof item === 'string') { if (item.trim()) rows.push({ sectionId: section.id, moduleId: mod.id, moduleType: mod.type, path: `${key}.${index}`, text: item }); return; }
          if (!item || typeof item !== 'object') return;
          for (const field of fields) {
            const value = (item as Record<string, unknown>)[field];
            if (typeof value === 'string' && value.trim()) rows.push({ sectionId: section.id, moduleId: mod.id, moduleType: mod.type, path: `${key}.${index}.${field}`, text: value });
          }
        });
      }
      // product-comparison stores its feature rows as plain strings
      if (Array.isArray(props.features) && props.features.every(item => typeof item === 'string')) {
        (props.features as string[]).forEach((text, index) => { if (text.trim()) rows.push({ sectionId: section.id, moduleId: mod.id, moduleType: mod.type, path: `features.${index}`, text }); });
      }
    }
  }
  return rows;
}

export function useStorefrontTranslator(config: { template?: string; sections: Section[] } | null | undefined, locale: Locale): StorefrontTranslator {
  const [machine, setMachine] = useState<Map<string, string>>(new Map());
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Seller-authored strings = everything the hand dictionaries do not cover.
  const sellerStrings = useMemo(() => {
    if (!config) return [] as string[];
    return Array.from(new Set(collectStrings(config)
      .filter(row => handTranslation(locale, config, row.sectionId, row.moduleId, row.moduleType, row.path, row.text) === undefined)
      .map(row => row.text)));
  }, [config, locale]);

  useEffect(() => {
    let cancelled = false;
    setMachine(new Map());
    if (!sellerStrings.length) return;
    const from = guessLanguage(sellerStrings);
    if (from === locale) return;
    setLoading(true);
    translateBatch(sellerStrings, from, locale)
      .then(result => { if (!cancelled) setMachine(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sellerStrings, locale]);

  return useMemo<StorefrontTranslator>(() => ({
    text: (sectionId, moduleId, moduleType, path, value) => {
      const original = value === null || value === undefined ? '' : String(value);
      if (!original.trim()) return original;
      const hand = handTranslation(locale, config ?? undefined, sectionId, moduleId, moduleType, path, original);
      if (hand !== undefined) return hand;
      if (showOriginal) return original;
      return machine.get(original) ?? original;
    },
    machineTranslated: machine.size > 0,
    showOriginal,
    setShowOriginal,
    loading,
  }), [config, locale, machine, showOriginal, loading]);
}

const passthrough: StorefrontTranslator = {
  text: (_section, _module, _type, _path, value) => value === null || value === undefined ? '' : String(value),
  machineTranslated: false,
  showOriginal: false,
  setShowOriginal: () => {},
  loading: false,
};

export const StorefrontTranslatorContext = createContext<StorefrontTranslator>(passthrough);

export function useStorefrontText() {
  return useContext(StorefrontTranslatorContext);
}
