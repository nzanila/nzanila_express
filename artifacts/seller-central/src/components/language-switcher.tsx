import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLocale } from '../lib/i18n/locale-context';
import { locales } from '../lib/i18n/translations';

/**
 * Language picker. Deliberately reachable from the shell on every page, and from the
 * signed-out screens too — a seller who cannot read English must be able to change the
 * language BEFORE they manage to sign in.
 */
export function LanguageSwitcher({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { tr } = useLocale();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = locales.find(l => l.code === locale) ?? locales[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); };
  }, [open]);

  const trigger = tone === 'dark'
    ? 'text-white/70 hover:bg-white/10 hover:text-white'
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

  return <div ref={ref} className="relative">
    <button onClick={() => setOpen(v => !v)} aria-haspopup="listbox" aria-expanded={open}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${trigger}`}>
      <Globe size={15} />
      <span>{current.flag}</span>
      <span className="hidden sm:inline">{current.label}</span>
    </button>

    {open && <ul role="listbox" aria-label={tr("sc.language")}
      className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl">
      {locales.map(option => {
        const active = option.code === locale;
        return <li key={option.code}>
          <button role="option" aria-selected={active}
            onClick={() => { setLocale(option.code); setOpen(false); }}
            className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-gray-50 ${active ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
            <span className="text-base">{option.flag}</span>
            <span className="flex-1">{option.label}</span>
            {active && <Check size={15} className="text-[#ff9900]" />}
          </button>
        </li>;
      })}
    </ul>}
  </div>;
}
