import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Lock, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/i18n/locale-context';
import { CommerceBackground } from '@/components/commerce-background';
import { COUNTRIES, isValidPhone, phoneHint, type CountryCode } from '@/lib/phone';
import { locales } from '@/lib/i18n/translations';

const SELLER_CENTRAL_URL = 'https://seller-central.pages.dev';

// CountryCode comes from '@/lib/phone'; a local 'BI'-only alias used to shadow it.

// Shared with signup and the reset flow so the three cannot drift apart.
const COUNTRY_OPTIONS = COUNTRIES;

export function AuthPage() {
  const { tr, locale, setLocale } = useLocale();
  const { signIn, logout, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('BI');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const currentLanguage = locales.find((item) => item.code === locale) ?? locales[0];

  const normalizePhone = (code: CountryCode, value: string) => {
    const digits = value.replace(/\D/g, '');
    return `${COUNTRY_OPTIONS[code].dialCode}${digits}`;
  };

  /**
   * Where to go after signing in.
   *
   * A visitor sent here by "Add to cart" carries ?next=/product/123 so they land back on
   * the product they were trying to buy rather than the home page. Only same-site paths
   * are honoured — anything starting with // or containing a scheme is discarded, so the
   * parameter cannot be used to bounce someone to another domain after they authenticate.
   */
  const nextPath = (() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('next') || '';
      return /^\/(?!\/)/.test(raw) ? raw : '/';
    } catch { return '/'; }
  })();

  // Navigating is a side effect, so it runs in an effect rather than during render.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    // A seller who is already signed in belongs in Seller Central.
    if (user.role === 'seller') window.location.href = SELLER_CENTRAL_URL;
    else setLocation(nextPath);
  }, [isAuthenticated, user, setLocation, nextPath]);

  if (isAuthenticated && user) return null;

  const handleLogin = async () => {
    setError('');
    if (!isValidPhone(phone, countryCode)) { setError(phoneHint(countryCode)); return; }
    setLoading(true);
    const result = await signIn(normalizePhone(countryCode, phone), password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    // A seller account belongs in Seller Central. Sign them back out rather than
    // leaving a seller session live inside the buyer app.
    if (result.user?.role === 'seller') {
      await logout();
      setError('This is a seller account. Please sign in at Seller Central instead.');
      return;
    }
    setLocation(nextPath);
  };

  return (
    <div className="min-h-[100dvh] bg-[#f0f2f5] flex flex-col relative overflow-hidden">
      <CommerceBackground />


      {/* Language selector */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <button
            onClick={() => setLanguageSelectorOpen(!languageSelectorOpen)}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <span className="hidden sm:inline">{currentLanguage.label}</span>
            <span className="sm:hidden uppercase">{currentLanguage.code}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
          {languageSelectorOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLanguageSelectorOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {locales.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => { setLocale(language.code); setLanguageSelectorOpen(false); }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-gray-50"
                  >
                    <span>{language.label}</span>
                    {language.code === locale && <span className="text-[#ff6a00]">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-5xl flex-col items-center gap-12 lg:flex-row lg:gap-20">
          {/* Left: Branding */}
          <div className="flex-1 text-center lg:text-left lg:pr-8">
            <div className="mb-6 inline-flex items-center gap-4">
              <img src="/logo.png" alt={tr('ui.nzanila')} className="h-16 w-16 object-contain" />
              <h1 className="text-5xl font-bold text-[#1a5f4a] lg:text-6xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                Nzanila
              </h1>
            </div>
            <p className="mt-4 text-xl text-gray-600 lg:text-2xl">
              {tr('onboarding.subtitle')}
            </p>
            <p className="mt-2 text-base text-gray-500">
              {locale === 'fr' ? 'Marketplace B2B wholesale.' : locale === 'sw' ? 'Soko la B2B la jumla.' :
               'Wholesale B2B marketplace.'}
            </p>
          </div>

          {/* Right: Login Form */}
          <div className="w-full max-w-md">
            <div className="rounded-3xl bg-white p-8 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{tr('auth.phone')}</label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#ff6a00] focus-within:ring-2 focus-within:ring-[#ff6a00]/20 focus-within:bg-white transition-all">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value as CountryCode)}
                      className="bg-transparent py-4 pl-4 pr-2 text-base font-semibold text-gray-700 outline-none"
                    >
                      {Object.entries(COUNTRY_OPTIONS).map(([code, option]) => (
                        <option key={code} value={code}>{option.flag} {option.dialCode}</option>
                      ))}
                    </select>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={countryCode === 'BI' ? '61 23 4567' : '78 123 4567'}
                      type="tel"
                      className="h-13 flex-1 bg-transparent px-4 text-base outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{tr('auth.password')}</label>
                  <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#ff6a00] focus-within:ring-2 focus-within:ring-[#ff6a00]/20 focus-within:bg-white transition-all">
                    <div className="flex items-center border-r border-gray-200 px-4">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={tr('auth.enterPassword')}
                      type="password"
                      className="h-13 flex-1 bg-transparent px-4 text-base outline-none"
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={!phone.trim() || !password.trim() || loading}
                  className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40 transition-all active:scale-[0.98]"
                >
                  {loading ? (locale === 'fr' ? 'Connexion…' : locale === 'sw' ? 'Inaingia…' : 'Signing in…') : tr('auth.signIn')}
                </button>
                <p className="mt-3 text-center text-xs text-gray-500">{tr('ui.forgotYourPassword')} <a className="font-semibold text-[#ff6a00] hover:underline" href="/auth/forgot">{tr('ui.resetItWithYourPhoneNumber')}</a></p>
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-white p-4 shadow-2xl border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="text-sm text-gray-500">
                {tr('auth.noAccount')}{' '}
                <button onClick={() => setLocation('/onboarding')} className="font-semibold text-[#1a5f4a] hover:underline">
                  {tr('auth.signUp')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
