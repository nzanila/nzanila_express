import { Languages, X } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Shown once, right after the buyer changes the interface language.
 *
 * Switching language translates the app's own UI immediately, but not the sellers' listings —
 * those are their own words. Rather than leaving that difference to be discovered, we offer
 * it here. Answering either way is remembered, so the question is not asked again.
 *
 * Deliberately a prompt and not an automatic rewrite: the model is unreliable on short
 * product names ("Watch" -> "Angalia", the verb "look at"), so silently restating every
 * seller's listing in another language would misrepresent them.
 */
export function TranslateContentPrompt() {
  const { tr, contentPromptOpen, setTranslateContent, dismissContentPrompt } = useLocale();
  if (!contentPromptOpen) return null;

  return (
    <div
      role="dialog"
      aria-label={tr('translate.promptTitle')}
      className="fixed bottom-4 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-border bg-white p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700">
          <Languages size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{tr('translate.promptTitle')}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{tr('translate.promptBody')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTranslateContent(true)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              {tr('translate.promptYes')}
            </button>
            <button
              type="button"
              onClick={() => setTranslateContent(false)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              {tr('translate.promptNo')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissContentPrompt}
          aria-label={tr('ui.close')}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
