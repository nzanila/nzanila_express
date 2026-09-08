import { t, type Locale } from './i18n/translations';
import { templateString } from './template-strings.i18n.generated';
import { templateStringsEn } from './template-strings.generated';
import { MODULE_DEFINITIONS, type StorefrontConfig, type StorefrontSection } from './storefront-types';

// Every string the storefront builder shows on the canvas falls into one of three buckets,
// and each is translated differently:
//
//   1. Builder chrome (palette labels, field names, buttons)  -> hand-written `sf.*` keys.
//   2. Template copy the seller has not edited                -> the hand-translated
//      template dictionary (template-strings.i18n.generated.ts), looked up by the
//      module's template key. A saved config keeps the template id and the template's
//      module ids, so the key can be rebuilt at render time.
//   3. Palette defaults the seller has not edited ("Special Offer", "Shop Now")
//                                                             -> `sf.default.*` keys.
//
// Anything the seller typed themselves is shown as typed. The canvas is the seller's own
// draft, so it is never machine-translated here; the buyer-facing storefront handles that
// (global-marketplace/src/lib/storefront-i18n.ts).

/** A key that exists in the dictionary, translated; undefined when the key is unknown. */
function known(locale: Locale, key: string): string | undefined {
  const value = t(locale, key);
  return value === key ? undefined : value;
}

/** Section tab name: template dictionary first, then the generic section keys. */
export function sectionLabel(locale: Locale, config: Pick<StorefrontConfig, 'template'> | undefined, section: Pick<StorefrontSection, 'id' | 'name'>): string {
  const name = section.name || section.id;
  if (config?.template) {
    const key = `tpl.${config.template}.section.${section.id}.name`;
    if (templateStringsEn[key] === name) return templateString(locale, key);
  }
  // Only substitute when the saved name is still the English default; a seller who
  // renamed a tab keeps their own wording.
  const generic = `sf.section.${section.id}`;
  if (t('en', generic) === name) return known(locale, generic) ?? name;
  return name;
}

/**
 * A module's text prop as it should read on the canvas: the hand translation when the
 * value is still the template's or the palette's English default, the seller's own words
 * otherwise. `path` is the dotted prop path the template dictionary uses
 * ("title", "features.0.description").
 */
export function moduleText(
  locale: Locale,
  config: Pick<StorefrontConfig, 'template'> | undefined,
  sectionId: string | undefined,
  moduleId: string,
  moduleType: string,
  path: string,
  value: unknown,
): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (!text.trim()) return text;
  if (config?.template && sectionId) {
    const key = `tpl.${config.template}.${sectionId}.${moduleId}.${path}`;
    if (templateStringsEn[key] === text) return templateString(locale, key);
  }
  const defaultKey = `sf.default.${moduleType}.${path}`;
  if (t('en', defaultKey) === text) return known(locale, defaultKey) ?? text;
  return text;
}

/** Palette name of a module type. */
export function moduleLabel(locale: Locale, type: string): string {
  return known(locale, `sf.module.${type}.label`) ?? MODULE_DEFINITIONS.find(def => def.type === type)?.label ?? type;
}

/** Palette description of a module type. */
export function moduleDescription(locale: Locale, type: string): string {
  return known(locale, `sf.module.${type}.description`) ?? MODULE_DEFINITIONS.find(def => def.type === type)?.description ?? '';
}

/** Palette category tab. */
export function categoryLabel(locale: Locale, id: string, fallback: string): string {
  return known(locale, `sf.category.${id}`) ?? fallback;
}

/** Properties-panel label for a prop key ("buttonText" -> "Button text"). */
export function fieldLabel(locale: Locale, key: string): string {
  return known(locale, `sf.field.${key}`) ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
}
