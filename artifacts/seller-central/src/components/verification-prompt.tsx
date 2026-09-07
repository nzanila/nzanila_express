import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, X, AlertTriangle } from 'lucide-react';
import { needsVerificationAction, type VerificationStatus } from '../lib/verification-status';
import { useLocale } from '../lib/i18n/locale-context';

// Asks an unverified seller to send their documents.
//
// Shown once per browser session, not on every navigation — a prompt that reappears on
// every page load gets clicked away without being read. After it is dismissed the sidebar
// badge is what keeps it findable.

const DISMISS_KEY = 'sc_verify_prompt_dismissed';

// The dismissal records *which* state was dismissed, so a seller who dismisses the
// "get verified" prompt and is later rejected sees the new prompt rather than silence.
function wasDismissed(status: VerificationStatus): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === status;
  } catch {
    // Private mode or blocked storage: show it. Better a repeated prompt than none.
    return false;
  }
}

function rememberDismissal(status: VerificationStatus) {
  try {
    sessionStorage.setItem(DISMISS_KEY, status);
  } catch { /* nothing to do — it just shows again next navigation */ }
}

export function VerificationPrompt({ status }: { status: VerificationStatus | null }) {
  const { tr } = useLocale();
  const [location, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  const onVerificationPage = location.startsWith('/seller-central/verification');
  const show = !!status && needsVerificationAction(status) && !dismissed && !wasDismissed(status) && !onVerificationPage;
  if (!show || !status) return null;

  const rejected = status === 'rejected';

  const close = () => {
    rememberDismissal(status);
    setDismissed(true);
  };

  const go = () => {
    // Reaching the page counts as answering the prompt, so it does not come back after.
    rememberDismissal(status);
    setDismissed(true);
    setLocation('/seller-central/verification');
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="verify-prompt-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${rejected ? 'bg-orange-100 text-orange-600' : 'bg-[#fff4e5] text-[#ff9900]'}`}>
            {rejected ? <AlertTriangle size={24} /> : <Shield size={24} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="verify-prompt-title" className="text-lg font-bold text-gray-900">
              {rejected ? 'Your verification needs changes' : 'Verify your business'}
            </h2>
            <p className="mt-1.5 text-sm text-gray-600">
              {rejected
                ? 'We could not verify your business with what you sent. Open verification to read our note and send your documents again.'
                : 'Send your business documents to get the verified badge on your store. Buyers order more from verified sellers. Any one document is enough to start.'}
            </p>
          </div>
          <button type="button" onClick={close} aria-label={tr("sc.close")} className="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">{tr('sc.not-now')}</button>
          <button type="button" onClick={go} className="rounded-xl bg-[#ff9900] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e88b00]">
            {rejected ? 'See what to fix' : 'Verify my business'}
          </button>
        </div>
      </div>
    </div>
  );
}
