import { useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/i18n/locale-context';
import { locales } from '@/lib/i18n/translations';

type CountryCode = 'BI' | 'RW';

const COUNTRY_OPTIONS: Record<CountryCode, { label: string; flag: string; dialCode: string }> = {
  BI: { label: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
  RW: { label: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
};

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
  'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80',
  'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&q=80',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80',
  'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80',
  'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=600&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
  'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=600&q=80',
];

export function AuthPage() {
  const { tr, locale, setLocale } = useLocale();
  const { signIn, isAuthenticated, user } = useAuth();
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

  if (isAuthenticated && user) {
    setLocation(user.role === 'seller' ? '/supplier' : '/');
    return null;
  }

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const result = await signIn(normalizePhone(countryCode, phone), password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setLocation('/');
  };

  return (
    <div className="min-h-[100dvh] bg-[#f0f2f5] flex flex-col relative overflow-hidden">
      {/* 3D Animated Background */}
      <div className="absolute inset-0 z-0" style={{ perspective: '1000px', perspectiveOrigin: '50% 50%' }}>
        {BG_IMAGES.map((img, i) => (
          <div
            key={i}
            className="absolute rounded-2xl overflow-hidden"
            style={{
              width: `${160 + (i % 3) * 50}px`,
              height: `${160 + (i % 3) * 50}px`,
              left: `${(i * 11) % 85}%`,
              top: `${(i * 13 + 5) % 80}%`,
              animation: `float3d${i % 4} ${12 + i * 1.5}s ease-in-out infinite`,
              animationDelay: `${i * -1.2}s`,
              opacity: 0.2,
              transformStyle: 'preserve-3d',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
            }}
          >
            <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float3d0 { 0%,100%{transform:translateZ(0) rotateX(5deg) rotateY(-5deg) translateY(0)} 25%{transform:translateZ(40px) rotateX(-3deg) rotateY(8deg) translateY(-20px)} 50%{transform:translateZ(20px) rotateX(8deg) rotateY(-3deg) translateY(-10px)} 75%{transform:translateZ(50px) rotateX(-5deg) rotateY(5deg) translateY(-30px)} }
        @keyframes float3d1 { 0%,100%{transform:translateZ(0) rotateX(-4deg) rotateY(6deg) translateY(0)} 25%{transform:translateZ(30px) rotateX(5deg) rotateY(-8deg) translateY(-25px)} 50%{transform:translateZ(60px) rotateX(-8deg) rotateY(3deg) translateY(-5px)} 75%{transform:translateZ(10px) rotateX(3deg) rotateY(-6deg) translateY(-35px)} }
        @keyframes float3d2 { 0%,100%{transform:translateZ(0) rotateX(6deg) rotateY(-4deg) translateY(0)} 25%{transform:translateZ(50px) rotateX(-6deg) rotateY(4deg) translateY(-15px)} 50%{transform:translateZ(25px) rotateX(3deg) rotateY(-7deg) translateY(-25px)} 75%{transform:translateZ(40px) rotateX(-3deg) rotateY(6deg) translateY(-10px)} }
        @keyframes float3d3 { 0%,100%{transform:translateZ(0) rotateX(-5deg) rotateY(7deg) translateY(0)} 25%{transform:translateZ(35px) rotateX(7deg) rotateY(-5deg) translateY(-30px)} 50%{transform:translateZ(55px) rotateX(-4deg) rotateY(3deg) translateY(-20px)} 75%{transform:translateZ(15px) rotateX(5deg) rotateY(-8deg) translateY(-5px)} }
      `}</style>

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
              <img src="/logo.png" alt="Nzanila" className="h-16 w-16 object-contain" />
              <h1 className="text-5xl font-bold text-[#1a5f4a] lg:text-6xl" style={{ fontFamily: 'Syne, sans-serif' }}>
                Nzanila
              </h1>
            </div>
            <p className="mt-4 text-xl text-gray-600 lg:text-2xl">
              {tr('onboarding.subtitle')}
            </p>
            <p className="mt-2 text-base text-gray-500">
              {locale === 'fr' ? 'Marketplace B2B wholesale.' :
               locale === 'rn' ? 'Ishamba rya B2B.' :
               locale === 'sw' ? 'Soko la B2B la jumla.' :
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
                  {loading ? (locale === 'fr' ? 'Connexion…' : locale === 'rn' ? 'Kwinjira…' : locale === 'sw' ? 'Inaingia…' : 'Signing in…') : tr('auth.signIn')}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-white p-4 shadow-2xl border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="text-sm text-gray-500">
                {tr('auth.noAccount')}{' '}
                <button onClick={() => setLocation('/auth/signup')} className="font-semibold text-[#1a5f4a] hover:underline">
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
