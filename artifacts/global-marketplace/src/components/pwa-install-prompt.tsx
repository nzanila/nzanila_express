import { useEffect, useState, useCallback } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { tr } = useLocale();

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Auto-show the bottom sheet after 1s
    const timer = setTimeout(() => {
      setShowSheet(true);
    }, 1000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) {
      // No native prompt available — just dismiss the sheet
      setShowSheet(false);
      return;
    }
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') {
        setShowSheet(false);
      }
    } catch {
      // prompt() can fail on some browsers
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  const handleDismiss = () => {
    setShowSheet(false);
  };

  if (!showSheet) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/50 lg:hidden"
        onClick={handleDismiss}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="mx-auto max-w-lg rounded-t-3xl bg-white px-6 pt-6 pb-8 shadow-2xl">
          {/* Drag handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-gray-300" />

          {/* Logo */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#ff6a00]/10 shadow-sm">
            <img src="/logo.png" alt="Nzanila" className="h-12 w-12 object-contain" />
          </div>

          {/* Text */}
          <h2 className="text-center text-lg font-extrabold text-gray-900">
            {tr('pwa.installTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">
            {tr('pwa.installDesc')}
          </p>

          {/* Install button — primary CTA */}
          <button
            onClick={handleInstall}
            disabled={installing}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FF6A00] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#ff6a00]/25 transition-all hover:bg-[#e55f00] active:scale-[0.98] disabled:opacity-60"
          >
            {installing ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Installing…
              </>
            ) : (
              <>
                <Download size={20} />
                {tr('pwa.installButton')}
              </>
            )}
          </button>

          {/* Secondary — how to install on iOS */}
          <button
            onClick={handleDismiss}
            className="mt-3 w-full text-center text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            {tr('pwa.notNow')}
          </button>

          {/* iOS helper hint */}
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
              <Smartphone size={13} />
              <span>{tr('pwa.iosHint')}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
