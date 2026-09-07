import { useCallback, useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { useLocale } from '../lib/i18n/locale-context';

// Offers to install Seller Central as an app.
//
// Deliberately the same behaviour as the marketplace's PwaInstallPrompt, because a seller
// who uses both should meet the same thing twice, not two different ideas: mobile only, a
// bottom sheet over a backdrop, and it appears on every visit rather than remembering a
// dismissal. Someone who taps "not now" today is being asked again tomorrow, which is the
// point — the offer is the whole feature.
//
// Chrome and Edge fire `beforeinstallprompt`, which we hold and replay on tap; the event is
// single-use and only valid in response to a gesture. Safari fires nothing and exposes no
// API, so iOS gets written instructions instead of a button that cannot work.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

export function InstallAppPrompt() {
  const { tr } = useLocale();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already installed, or on a desktop where a home-screen icon means little.
    if (isStandalone() || !isMobile()) return;

    const onBeforeInstall = (event: Event) => {
      // Suppress Chrome's own mini-infobar so the seller gets one offer, not two.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setShowSheet(false);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // A beat after load, so it never competes with the first paint.
    const timer = window.setTimeout(() => setShowSheet(true), 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const install = useCallback(async () => {
    // Safari, or Chrome before the event lands: the sheet's iOS hint is the instruction,
    // so closing is the only honest thing the button can do.
    if (!deferred) { setShowSheet(false); return; }
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // Spent either way — calling prompt() twice on one event throws.
      setDeferred(null);
      if (outcome === 'accepted') setShowSheet(false);
    } catch {
      // Some browsers reject prompt() outright; leave the sheet up with the iOS hint.
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  if (!showSheet) return null;

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 lg:hidden" onClick={() => setShowSheet(false)} />

      <div
        className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden"
        style={{ animation: 'sc-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        role="dialog"
        aria-modal="true"
        aria-label={tr('pwa.installTitle')}
      >
        <div className="mx-auto max-w-lg rounded-t-3xl bg-white px-6 pt-6 pb-8 shadow-2xl">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-300" />

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#233548] shadow-sm">
            <img src="/app-icon-192.png" alt="" className="h-12 w-12 rounded-xl object-contain" />
          </div>

          <h2 className="text-center text-lg font-extrabold text-gray-900">{tr('pwa.installTitle')}</h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">{tr('pwa.installBody')}</p>

          <button
            type="button"
            onClick={install}
            disabled={installing}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FF6A00] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#ff6a00]/25 transition-all hover:bg-[#e55f00] active:scale-[0.98] disabled:opacity-60"
          >
            {installing ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Download size={20} />
            )}
            <span className="min-w-0 break-words">{tr('pwa.install')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSheet(false)}
            className="mt-3 w-full text-center text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            {tr('pwa.dismiss')}
          </button>

          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-gray-500">
              <Smartphone size={13} className="shrink-0" />
              <span>{tr('pwa.iosHint')}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
