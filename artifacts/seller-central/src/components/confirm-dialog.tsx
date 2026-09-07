import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { tg } from '../lib/i18n/locale-context';

/**
 * In-app confirmation dialog, replacing window.confirm/window.alert.
 *
 * Native dialogs freeze the whole tab while they are up, cannot be styled or translated
 * into Kirundi/French alongside the rest of the app, and are suppressed outright by some
 * in-app browsers — which would let a delete fire with no prompt at all on exactly the
 * devices most of our buyers use.
 */
export type ConfirmSpec = {
  title: string;
  description?: string;
  /** Extra detail rendered above the buttons — what is about to be acted on. */
  body?: React.ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  /** 'alert' drops the Cancel button: a message to acknowledge, not a choice. */
  variant?: 'confirm' | 'alert';
  onConfirm?: () => Promise<void> | void;
};

export function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setBusy(false); setError(''); }, [spec]);

  useEffect(() => {
    if (!spec) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [spec, busy, onClose]);

  if (!spec) return null;
  const isAlert = spec.variant === 'alert';
  const tone = spec.tone === 'danger' || (!spec.tone && !isAlert)
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-[#ff9900] hover:bg-[#e68a00]';

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await spec.onConfirm?.();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work. Please try again.');
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
    onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={spec.title}
      className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">{spec.title}</h2>
          {spec.description && <p className="mt-1 text-sm text-gray-500">{spec.description}</p>}
        </div>
        <button onClick={onClose} disabled={busy} aria-label={tg("sc.close")}
          className="-mr-1.5 -mt-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40">
          <X size={17} />
        </button>
      </div>
      {spec.body && <div className="mt-4">{spec.body}</div>}
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        {!isAlert && <button onClick={onClose} disabled={busy}
          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">{tg('sc.cancel')}</button>}
        <button onClick={confirm} disabled={busy}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${tone}`}>
          {busy ? 'Working…' : spec.confirmLabel}
        </button>
      </div>
    </div>
  </div>;
}

/**
 * Single dialog host for this app.
 *
 * The seller app raises these from a dozen places across one very large file — product
 * deletes, store deletes, save confirmations, form validation. Threading dialog state
 * through each of those components separately would mean a dozen near-identical
 * useState/render pairs, so one host is mounted at the root and `setNotice` addresses it
 * from anywhere. Only one dialog is ever on screen at a time, so a single slot is enough.
 */
let deliver: (spec: ConfirmSpec | null) => void = () => {};

export function NoticeHost() {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  useEffect(() => {
    deliver = setSpec;
    return () => { deliver = () => {}; };
  }, []);
  return <ConfirmDialog spec={spec} onClose={() => setSpec(null)} />;
}

export function setNotice(spec: ConfirmSpec) { deliver(spec); }
