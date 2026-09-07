import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { t, type Locale } from './translations';

/**
 * Seller Central's language. Deliberately the same contract as the buyer app
 * (artifacts/global-marketplace/src/lib/i18n) — same Locale union, same t(), and the
 * SAME storage key, so a seller who picks Swahili on the marketplace stays in Swahili
 * when they open Seller Central instead of being reset to the default.
 */
type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  tr: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Module-level mirror of the active locale, kept in sync by LocaleProvider.
 *
 * Exists so tg() below can translate where a hook is illegal. Mirrors the same addition
 * in the buyer app's context so the two stay one contract rather than two.
 */
let activeLocale: Locale = 'fr';

const STORAGE_KEY = 'nzanila-locale';
const SUPPORTED: Locale[] = ['fr', 'sw', 'en'];
const DEFAULT_LOCALE: Locale = 'fr';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    let saved: string | null = null;
    // A browser with site data blocked throws on read; the app must still boot.
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { return DEFAULT_LOCALE; }
    // Kirundi was retired as a UI language; anyone still carrying 'rn' is migrated to
    // French rather than left on a locale that no longer exists.
    if (saved && !SUPPORTED.includes(saved as Locale)) {
      try { localStorage.setItem(STORAGE_KEY, DEFAULT_LOCALE); } catch { /* not fatal */ }
      return DEFAULT_LOCALE;
    }
    return (saved as Locale | null) ?? DEFAULT_LOCALE;
  });

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* choice is still live this session */ }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    // Keep the module-level mirror in step so tg() works outside component bodies.
    activeLocale = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, tr: (key) => t(locale, key) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

/**
 * Hook-free translate, for anywhere useLocale() would be a Rules-of-Hooks violation:
 * render helpers, event handlers, useEffect callbacks, and components rendered outside
 * the provider.
 *
 * Use `tr` from useLocale() inside component bodies — it re-renders on a language change.
 * `tg` reads a snapshot and does not, so a value read once in a handler is correct at the
 * moment it is read, which is what a handler needs.
 */
export function tg(key: string): string {
  return t(activeLocale, key);
}
