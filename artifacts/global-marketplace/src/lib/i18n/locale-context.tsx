import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { t, type Locale } from '@/lib/i18n/translations';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  tr: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'nzanila-locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'rn';
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved && ['rn', 'fr', 'en'].includes(saved) ? saved : 'rn';
  });

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'rn' ? 'rn' : locale;
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
