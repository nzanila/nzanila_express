import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { t, type Locale } from '@/lib/i18n/translations';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  tr: (key: string) => string;
  /** Whether seller-authored content (product names, descriptions) is machine-translated. */
  translateContent: boolean;
  setTranslateContent: (on: boolean) => void;
  /** True right after a language change, until the buyer answers the content prompt. */
  contentPromptOpen: boolean;
  dismissContentPrompt: () => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'nzanila-locale';
// Separate from the UI language on purpose. The hand-written UI is always translated; the
// seller's own words are only ever machine-translated when the buyer asks for it, because
// the model is unreliable on short product names ("Watch" -> "Angalia", the verb).
const CONTENT_KEY = 'nzanila-translate-content';
const SUPPORTED: Locale[] = ['fr', 'sw', 'en'];
const DEFAULT_LOCALE: Locale = 'fr';

// Module-level mirror of the active locale, kept in sync by LocaleProvider below.
//
// `tr` from useLocale() is the normal way to translate, but it can only be called from a
// component body. Plenty of UI text lives in nested render helpers and in the shadcn
// primitives, where adding a hook is not possible. `tg` reads the same locale without a
// hook. It stays correct because changing the locale re-renders the provider's subtree,
// which re-runs these helpers.
let currentLocale: Locale = DEFAULT_LOCALE;

/** Translate outside a component body. Prefer useLocale().tr inside components. */
export function tg(key: string): string {
  return t(currentLocale, key);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    const saved = localStorage.getItem(STORAGE_KEY);
    // Kirundi was retired as a UI language; anyone still carrying 'rn' in storage is
    // migrated to French rather than being left on a locale that no longer exists.
    if (saved && !SUPPORTED.includes(saved as Locale)) {
      localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE);
      return DEFAULT_LOCALE;
    }
    return (saved as Locale | null) ?? DEFAULT_LOCALE;
  });

  const [translateContent, setTranslateContentState] = useState<boolean>(() => {
    try { return localStorage.getItem(CONTENT_KEY) === '1'; } catch { return false; }
  });
  const [contentPromptOpen, setContentPromptOpen] = useState(false);

  currentLocale = locale;

  const setTranslateContent = (on: boolean) => {
    setTranslateContentState(on);
    setContentPromptOpen(false);
    try { localStorage.setItem(CONTENT_KEY, on ? '1' : '0'); } catch {}
  };

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    currentLocale = next;
    setLocaleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    // Changing the interface language does not translate the sellers' own listings, so
    // offer it rather than leaving the buyer to discover the per-item control. Only asked
    // when content translation is off — if it is already on, it simply follows the new
    // language.
    try {
      if (localStorage.getItem(CONTENT_KEY) !== '1') setContentPromptOpen(true);
    } catch {}
  };

  const dismissContentPrompt = () => setContentPromptOpen(false);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, tr: (key) => t(locale, key), translateContent, setTranslateContent, contentPromptOpen, dismissContentPrompt }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
