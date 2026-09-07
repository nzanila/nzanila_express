import { useEffect, useState } from 'react';
import { Languages, RotateCcw, Loader2 } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';

/**
 * Machine translation for SELLER-AUTHORED text only — store names, product titles and
 * descriptions. The app's own UI is hand-translated (see lib/i18n/translations.ts) and must
 * never be routed through this: the model would make it worse.
 *
 * Three rules this component exists to enforce, because the model is not good enough to be
 * trusted silently. On real catalogue rows, three of four product names came back wrong
 * ("Watch" -> "Angalia", the verb "look at"; "Event Decoration Service" -> event *repair*
 * service). Short titles are the worst case; longer descriptions fare better.
 *
 *   1. The seller's own words render by default. Nothing is translated until asked.
 *   2. A translation is always visibly labelled as machine-made.
 *   3. The original is one tap away, always.
 *
 * Wired as a silent automatic overlay this would put words in sellers' mouths. Wired as an
 * opt-in it helps a buyer who cannot read the seller's language, without misrepresenting
 * anyone.
 */
export function TranslatableText({
  text,
  className = '',
  as: Tag = 'span',
  controls = true,
}: {
  text: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2';
  /**
   * false = no inline Translate/Show-original buttons: the text simply follows the buyer's
   * content-translation preference. Used inside links and cards (search results, product
   * tiles, AI research hits) where a nested <button> would be invalid and would swallow the
   * click. The machine-translation label is still shown, so nothing is passed off as the
   * seller's own wording.
   */
  controls?: boolean;
}) {
  const { locale, tr, translateContent } = useLocale();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // When the buyer has opted in, seller content follows the interface language without
  // them tapping each item. Resetting on locale change stops a stale French translation
  // being shown after switching to Kiswahili.
  useEffect(() => { setTranslated(null); setShowing(false); setFailed(false); }, [locale, text]);
  useEffect(() => {
    if (!translateContent) { setShowing(false); return; }
    void translate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateContent, locale, text]);

  const clean = (text || '').trim();
  // Nothing to offer on empty text, and the endpoint caps a single string at 2000 chars.
  if (!clean || clean.length > 2000) return <Tag className={className}>{text}</Tag>;

  const translate = async () => {
    if (translated) { setShowing(true); return; }
    setLoading(true); setFailed(false);
    try {
      const response = await fetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [clean], to: locale }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { translations?: string[] };
      const result = data.translations?.[0];
      // The endpoint returns the ORIGINAL string when the model fails. Treating that as a
      // translation would label the seller's own words "machine translated" for no reason.
      if (!result || result === clean) { setFailed(true); return; }
      setTranslated(result);
      setShowing(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline">
      <Tag className={className}>{showing && translated ? translated : text}</Tag>
      {!controls ? (
        showing && translated ? (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
            <Languages size={10} /> {tr('translate.machineLabel')}
          </span>
        ) : null
      ) : (
      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {showing && translated ? (
          <>
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
              <Languages size={11} /> {tr('translate.machineLabel')}
            </span>
            <button
              type="button"
              onClick={() => setShowing(false)}
              className="inline-flex items-center gap-1 font-semibold text-muted-foreground underline hover:text-foreground"
            >
              <RotateCcw size={11} /> {tr('translate.showOriginal')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={translate}
            disabled={loading}
            className="inline-flex items-center gap-1 font-semibold text-primary underline hover:opacity-80 disabled:opacity-60"
          >
            {loading
              ? <><Loader2 size={11} className="animate-spin" /> {tr('translate.translating')}</>
              : <><Languages size={11} /> {tr('translate.action')}</>}
          </button>
        )}
        {failed && <span className="text-muted-foreground">{tr('translate.unavailable')}</span>}
      </span>
      )}
    </span>
  );
}
