import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ShoppingBag, Store, Lock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/i18n/locale-context';
import { locales } from '@/lib/i18n/translations';

type CountryCode = 'BI' | 'RW';

const COUNTRY_OPTIONS: Record<CountryCode, { label: string; flag: string; dialCode: string }> = {
  BI: { label: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
  RW: { label: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
};

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
  'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&q=80',
  'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=600&q=80',
];

export function SignupPage() {
  const { tr, locale, setLocale } = useLocale();
  const { signUp, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const [signUpStep, setSignUpStep] = useState<'role' | 'form'>('role');
  const [signUpRole, setSignUpRole] = useState<'buyer' | 'seller'>('buyer');
  const [signUpName, setSignUpName] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpCountryCode, setSignUpCountryCode] = useState<CountryCode>('BI');
  const [signUpError, setSignUpError] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);

  const currentLanguage = locales.find((item) => item.code === locale) ?? locales[0];

  const normalizePhone = (code: CountryCode, value: string) => {
    const digits = value.replace(/\D/g, '');
    return `${COUNTRY_OPTIONS[code].dialCode}${digits}`;
  };

  if (isAuthenticated && user) {
    setLocation('/onboarding');
    return null;
  }

  const handleSignUp = async () => {
    setSignUpError('');
    setSignUpLoading(true);
    const result = await signUp(normalizePhone(signUpCountryCode, signUpPhone), signUpName, signUpRole, signUpPassword);
    setSignUpLoading(false);
    if (result.error) { setSignUpError(result.error); return; }
    setLocation('/onboarding');
  };

  return (
    <div className="min-h-[100dvh] bg-[#f0f2f5] flex flex-col relative overflow-hidden">
      {/* 3D Animated Background */}
      <div className="absolute inset-0 z-0" style={{ perspective: '900px', perspectiveOrigin: '50% 50%' }}>
        <style>{`
          @keyframes su-float1 { 0%,100%{transform:translateZ(0) rotateX(8deg) rotateY(-6deg) translateY(0)} 33%{transform:translateZ(60px) rotateX(-4deg) rotateY(10deg) translateY(-30px)} 66%{transform:translateZ(30px) rotateX(6deg) rotateY(-8deg) translateY(-15px)} }
          @keyframes su-float2 { 0%,100%{transform:translateZ(0) rotateX(-5deg) rotateY(8deg) translateY(0)} 33%{transform:translateZ(45px) rotateX(7deg) rotateY(-5deg) translateY(-25px)} 66%{transform:translateZ(70px) rotateX(-3deg) rotateY(4deg) translateY(-10px)} }
          @keyframes su-float3 { 0%,100%{transform:translateZ(0) rotateX(6deg) rotateY(-7deg) translateY(0)} 33%{transform:translateZ(55px) rotateX(-6deg) rotateY(6deg) translateY(-20px)} 66%{transform:translateZ(20px) rotateX(4deg) rotateY(-4deg) translateY(-35px)} }
          @keyframes su-pulse { 0%,100%{opacity:0.12} 50%{opacity:0.22} }
        `}</style>
        {BG_IMAGES.map((img, i) => (
          <div
            key={i}
            className="absolute rounded-2xl overflow-hidden"
            style={{
              width: `${150 + (i % 3) * 55}px`,
              height: `${150 + (i % 3) * 55}px`,
              left: `${(i * 16 + 3) % 80}%`,
              top: `${(i * 19 + 7) % 80}%`,
              animation: `su-float${(i % 3) + 1} ${13 + i * 2}s ease-in-out infinite, su-pulse ${8 + i * 1.5}s ease-in-out infinite`,
              animationDelay: `${i * -1.5}s`,
              opacity: 0.15,
              transformStyle: 'preserve-3d',
              boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
            }}
          >
            <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>

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
        <div className="w-full max-w-md">
          {signUpStep === 'role' ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-3">
                <img src="/logo.png" alt="Nzanila" className="mx-auto h-16 w-16 object-contain" />
              </div>

              <button
                onClick={() => setLocation('/auth')}
                className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={16} /> {tr('auth.signIn')}
              </button>

              <div className="rounded-3xl bg-white p-8 shadow-2xl border border-gray-100">
                <div className="text-center mb-6">
                  <p className="text-2xl font-extrabold text-gray-900">{tr('auth.title')}</p>
                  <p className="mt-2 text-base text-gray-500">{tr('auth.chooseRole')}</p>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={() => { setSignUpRole('buyer'); setSignUpStep('form'); }}
                    className="group flex w-full items-center gap-5 rounded-2xl border-2 border-gray-200 p-5 text-left transition-all hover:border-[#1a5f4a] hover:bg-[#1a5f4a]/5 active:scale-[0.98]"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1a5f4a]/10 group-hover:bg-[#1a5f4a]/20 transition-colors">
                      <ShoppingBag size={26} className="text-[#1a5f4a]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-800">{tr('auth.buyer')}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{tr('auth.buyerDesc')}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-[#1a5f4a] transition-colors" />
                  </button>
                  <button
                    onClick={() => { setSignUpRole('seller'); setSignUpStep('form'); }}
                    className="group flex w-full items-center gap-5 rounded-2xl border-2 border-gray-200 p-5 text-left transition-all hover:border-[#ff6a00] hover:bg-[#ff6a00]/5 active:scale-[0.98]"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ff6a00]/10 group-hover:bg-[#ff6a00]/20 transition-colors">
                      <Store size={26} className="text-[#ff6a00]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-800">{tr('auth.seller')}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{tr('auth.sellerDesc')}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-[#ff6a00] transition-colors" />
                  </button>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500">
                {tr('auth.hasAccount')}{' '}
                <button onClick={() => setLocation('/auth')} className="font-semibold text-[#ff6a00] hover:underline">
                  {tr('auth.signIn')}
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-3">
                <img src="/logo.png" alt="Nzanila" className="mx-auto h-16 w-16 object-contain" />
              </div>

              <button
                onClick={() => setSignUpStep('role')}
                className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={16} /> {locale === 'fr' ? 'Retour' : locale === 'rn' ? 'Subira inyuma' : locale === 'sw' ? 'Rudi' : 'Back'}
              </button>

              <div className="rounded-3xl bg-white p-8 shadow-2xl border border-gray-100">
                <div className="text-center mb-6">
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${signUpRole === 'seller' ? 'bg-[#ff6a00]/10' : 'bg-[#1a5f4a]/10'}`}>
                    {signUpRole === 'seller' ? <Store size={26} className="text-[#ff6a00]" /> : <ShoppingBag size={26} className="text-[#1a5f4a]" />}
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{tr('auth.signUp')}</p>
                  <p className="mt-2 text-base text-gray-500">
                    {signUpRole === 'seller'
                      ? (locale === 'fr' ? 'Compte vendeur' : locale === 'rn' ? 'Konti mugurisha' : locale === 'sw' ? 'Akaunti ya muuzaji' : 'Seller account')
                      : (locale === 'fr' ? 'Compte acheteur' : locale === 'rn' ? 'Konti mugura' : locale === 'sw' ? 'Akaunti ya mnunuzi' : 'Buyer account')}
                  </p>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">{tr('auth.fullName')}</label>
                    <input
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder={locale === 'fr' ? 'ex. Jean Ndayisaba' : locale === 'rn' ? 'urugero. Jean Ndayisaba' : locale === 'sw' ? 'mf. Jean Ndayisaba' : 'e.g. Jean Ndayisaba'}
                      className="h-13 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">{tr('auth.phone')}</label>
                    <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#ff6a00] focus-within:ring-2 focus-within:ring-[#ff6a00]/20 focus-within:bg-white transition-all">
                      <select
                        value={signUpCountryCode}
                        onChange={(e) => setSignUpCountryCode(e.target.value as CountryCode)}
                        className="bg-transparent py-4 pl-4 pr-2 text-base font-semibold text-gray-700 outline-none"
                      >
                        {Object.entries(COUNTRY_OPTIONS).map(([code, option]) => (
                          <option key={code} value={code}>{option.flag} {option.dialCode}</option>
                        ))}
                      </select>
                      <input
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        placeholder={signUpCountryCode === 'BI' ? '61 23 4567' : '78 123 4567'}
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
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder={locale === 'fr' ? 'Min. 6 caractères' : locale === 'rn' ? 'Nibura inyuguti 6' : locale === 'sw' ? 'Herufi 6 au zaidi' : 'Min. 6 characters'}
                        type="password"
                        className="h-13 flex-1 bg-transparent px-4 text-base outline-none"
                      />
                    </div>
                  </div>

                  {signUpError && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                      <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                      <p className="text-sm font-medium text-red-700">{signUpError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleSignUp}
                    disabled={!signUpName.trim() || !signUpPhone.trim() || signUpPassword.length < 6 || signUpLoading}
                    className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40 transition-all active:scale-[0.98]"
                  >
                    {signUpLoading
                      ? (locale === 'fr' ? 'Création…' : locale === 'rn' ? 'Kubanga…' : locale === 'sw' ? 'Inaunda…' : 'Creating…')
                      : tr('auth.signUp')}
                  </button>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500">
                {tr('auth.hasAccount')}{' '}
                <button onClick={() => setLocation('/auth')} className="font-semibold text-[#ff6a00] hover:underline">
                  {tr('auth.signIn')}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
