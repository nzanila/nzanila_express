import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ShoppingBag, Store, MapPin, Building2, CheckCircle, Clock, AlertCircle, ChevronRight, ChevronDown, Globe } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { locales } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/auth-context';
import { LocationSearchPicker, type LocationData } from '@/components/location-search-picker';
import { OnboardingBackground } from '@/components/onboarding-background';

type OnboardingStep =
  | 'welcome'
  | 'account-type'
  | 'create-account'
  | 'buyer-province'
  | 'buyer-city'
  | 'buyer-zone'
  | 'buyer-landmark'
  | 'seller-business'
  | 'seller-province'
  | 'seller-city'
  | 'seller-zone'
  | 'seller-details'
  | 'seller-verification'
  | 'buyer-complete'
  | 'seller-complete';

type Language = 'en' | 'fr' | 'rn' | 'sw';
type CountryCode = 'BI' | 'RW';

const COUNTRY_OPTIONS: Record<CountryCode, { label: string; flag: string; dialCode: string }> = {
  BI: { label: 'Burundi', flag: '🇧🇮', dialCode: '+257' },
  RW: { label: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
};

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  'account-type': 'Choose Type',
  'create-account': 'Create Account',
  'buyer-province': 'Province',
  'buyer-city': 'Commune',
  'buyer-zone': 'Zone',
  'buyer-landmark': 'Address',
  'seller-business': 'Business',
  'seller-province': 'Province',
  'seller-city': 'Commune',
  'seller-zone': 'Zone',
  'seller-details': 'Details',
  'seller-verification': 'Verification',
  'buyer-complete': 'All Done',
  'seller-complete': 'All Done',
};

const STEP_ORDER: OnboardingStep[] = [
  'welcome', 'account-type', 'create-account',
  'buyer-province', 'buyer-city', 'buyer-zone', 'buyer-landmark',
  'seller-business', 'seller-province', 'seller-city', 'seller-zone', 'seller-details',
  'seller-verification', 'buyer-complete', 'seller-complete'
];

const BUYER_STEPS: OnboardingStep[] = ['buyer-province', 'buyer-city', 'buyer-zone', 'buyer-landmark'];
const SELLER_STEPS: OnboardingStep[] = ['seller-business', 'seller-province', 'seller-city', 'seller-zone', 'seller-details'];

function StepProgress({ currentStep }: { currentStep: OnboardingStep }) {
  const isBuyer = BUYER_STEPS.includes(currentStep);
  const isSeller = SELLER_STEPS.includes(currentStep);
  const steps = isBuyer ? BUYER_STEPS : isSeller ? SELLER_STEPS : [];
  const idx = steps.indexOf(currentStep);
  if (idx < 0) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 mb-4">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full transition-all ${i === idx ? 'bg-[#ff6a00] w-5' : i < idx ? 'bg-[#1a5f4a]' : 'bg-gray-300'}`} />
        </div>
      ))}
    </div>
  );
}

export function OnboardingPage() {
  const { locale, setLocale, tr } = useLocale();
  const { signUp, isAuthenticated, user, session, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<OnboardingStep>(() => {
    if (isAuthenticated && user?.role === 'seller' && !user?.onboardingCompleted) return 'seller-business';
    if (isAuthenticated && user?.role === 'buyer' && !user?.onboardingCompleted) return 'buyer-province';
    if (isAuthenticated && user?.onboardingCompleted) { setLocation('/'); return 'welcome'; }
    return 'welcome';
  });
  const [accountType, setAccountType] = useState<'buyer' | 'seller' | null>(() => {
    if (isAuthenticated && user?.role) return user.role;
    return null;
  });
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);

  const [fullName, setFullName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('BI');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(locale as Language);
  const currentLanguage = locales.find((item) => item.code === locale) ?? locales[0];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [buyerLatitude, setBuyerLatitude] = useState<number | null>(null);
  const [buyerLongitude, setBuyerLongitude] = useState<number | null>(null);
  const [showBuyerMapPicker, setShowBuyerMapPicker] = useState(false);

  const [provinces, setProvinces] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);

  const [businessName, setBusinessName] = useState('');
  const [sellerFullName, setSellerFullName] = useState('');
  const [sellerProvince, setSellerProvince] = useState('');
  const [sellerCity, setSellerCity] = useState('');
  const [sellerZone, setSellerZone] = useState('');
  const [sellerLandmark, setSellerLandmark] = useState('');
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [offersDelivery, setOffersDelivery] = useState<boolean | null>(null);
  const [offersPickup, setOffersPickup] = useState<boolean | null>(null);
  const [deliveryAreas, setDeliveryAreas] = useState('');
  const [sellerLatitude, setSellerLatitude] = useState<number | null>(null);
  const [sellerLongitude, setSellerLongitude] = useState<number | null>(null);
  const [showSellerMapPicker, setShowSellerMapPicker] = useState(false);
  const [businessDescription, setBusinessDescription] = useState('');

  // Location search picker state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationPickerMode, setLocationPickerMode] = useState<'buyer' | 'seller'>('buyer');
  const [buyerLocationData, setBuyerLocationData] = useState<LocationData | null>(null);
  const [sellerLocationData, setSellerLocationData] = useState<LocationData | null>(null);

  const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bd75c998.nzanila-api.pages.dev');
  const normalizePhone = (value: string) => `${COUNTRY_OPTIONS[countryCode].dialCode}${value.replace(/\D/g, '')}`;

  useEffect(() => { fetchProvinces(); }, []);

  useEffect(() => {
    if (province) { fetchCommunes(province); }
    else { setCommunes([]); setZones([]); setCity(''); setZone(''); }
  }, [province]);

  useEffect(() => {
    if (city) { fetchZones(city); }
    else { setZones([]); setZone(''); }
  }, [city]);

  useEffect(() => {
    if (sellerProvince) { fetchCommunes(sellerProvince); }
    else { setCommunes([]); setZones([]); setSellerCity(''); setSellerZone(''); }
  }, [sellerProvince]);

  useEffect(() => {
    if (sellerCity) { fetchZones(sellerCity); }
    else { setZones([]); setSellerZone(''); }
  }, [sellerCity]);

  const fetchProvinces = async () => {
    try {
      const res = await fetch(`${API}/api/profiles/locations/provinces`);
      const data = await res.json();
      setProvinces(data);
    } catch (err) { console.error('Failed to fetch provinces:', err); }
  };

  const fetchCommunes = async (provinceName: string) => {
    try {
      const prov = provinces.find(p => p.name === provinceName);
      if (!prov) return;
      const res = await fetch(`${API}/api/profiles/locations/provinces/${prov.id}/communes`);
      const data = await res.json();
      setCommunes(data);
    } catch (err) { console.error('Failed to fetch communes:', err); }
  };

  const fetchZones = async (communeName: string) => {
    try {
      const comm = communes.find(c => c.name === communeName);
      if (!comm) return;
      const res = await fetch(`${API}/api/profiles/locations/communes/${comm.id}/zones`);
      const data = await res.json();
      setZones(data);
    } catch (err) { console.error('Failed to fetch zones:', err); }
  };

  const handleAccountTypeSelect = (type: 'buyer' | 'seller') => {
    setAccountType(type);
    setStep('create-account');
  };

  const handleCreateAccount = async () => {
    if (!accountType) return;
    setError('');
    setLoading(true);
    const normalizedPhone = normalizePhone(phoneNumber);
    const result = await signUp(normalizedPhone, fullName, accountType, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setStep(accountType === 'buyer' ? 'buyer-province' : 'seller-business');
  };

  const handleBuyerComplete = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/profiles/onboarding/buyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken || ''}` },
        body: JSON.stringify({
          name: fullName || undefined,
          province: buyerLocationData?.province || province || undefined,
          city: buyerLocationData?.commune || city || undefined,
          zone: buyerLocationData?.zone || zone || undefined,
          landmark: buyerLocationData?.landmark || landmark || undefined,
          deliveryPhone: buyerLocationData?.phone || deliveryPhone || undefined,
          preferredLanguage: preferredLanguage || undefined,
          latitude: buyerLocationData?.latitude || undefined,
          longitude: buyerLocationData?.longitude || undefined,
          addressName: buyerLocationData?.locationName || undefined,
          directions: buyerLocationData?.directions || undefined,
          meetAtPublicLandmark: buyerLocationData?.meetAtPublicLandmark || undefined,
          approximateAddress: buyerLocationData?.approximateAddress || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to complete onboarding'); setLoading(false); return; }
      setLoading(false);
      await refreshUser();
      setStep('buyer-complete');
    } catch { setError('Network error'); setLoading(false); }
  };

  const handleSellerSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/profiles/onboarding/seller`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken || ''}` },
        body: JSON.stringify({
          name: fullName, businessName: businessName || undefined, sellerFullName: sellerFullName || undefined,
          province: sellerLocationData?.province || sellerProvince || undefined,
          city: sellerLocationData?.commune || sellerCity || undefined,
          zone: sellerLocationData?.zone || sellerZone || undefined,
          landmark: sellerLocationData?.landmark || sellerLandmark || undefined,
          productCategories: productCategories.length > 0 ? productCategories : undefined,
          offersDelivery: offersDelivery !== null ? offersDelivery : undefined, offersPickup: offersPickup !== null ? offersPickup : undefined,
          deliveryAreas: deliveryAreas || undefined, businessDescription: businessDescription || undefined,
          shopLatitude: sellerLocationData?.latitude || sellerLatitude || undefined,
          shopLongitude: sellerLocationData?.longitude || sellerLongitude || undefined,
          shopLocationApproximate: true,
          shopAddress: sellerLocationData?.approximateAddress || undefined,
          shopDirections: sellerLocationData?.directions || undefined,
          shopPhone: sellerLocationData?.phone || undefined,
          meetAtPublicLandmark: sellerLocationData?.meetAtPublicLandmark || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to submit seller information'); setLoading(false); return; }
      setLoading(false);
      await refreshUser();
      setStep('seller-verification');
    } catch { setError('Network error'); setLoading(false); }
  };

  const goBack = () => {
    setError('');
    if (isAuthenticated && user?.onboardingCompleted) { setLocation('/'); return; }
    switch (step) {
      case 'account-type': setStep('welcome'); break;
      case 'create-account': setStep('account-type'); break;
      case 'buyer-province': setStep(isAuthenticated ? '/' : 'create-account'); break;
      case 'buyer-city': setStep('buyer-province'); break;
      case 'buyer-zone': setStep('buyer-city'); break;
      case 'buyer-landmark': setStep('buyer-zone'); break;
      case 'seller-business': setStep(isAuthenticated ? '/' : 'create-account'); break;
      case 'seller-province': setStep('seller-business'); break;
      case 'seller-city': setStep('seller-province'); break;
      case 'seller-zone': setStep('seller-city'); break;
      case 'seller-details': setStep('seller-zone'); break;
      default: setLocation('/');
    }
  };

  const renderSelect = (label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[], placeholder: string, disabled?: boolean) => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 disabled:opacity-50">
        <option value="">{placeholder}</option>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );

  const renderInput = (label: string, value: string, onChange: (v: string) => void, placeholder: string, type = 'text') => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
        className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20" />
    </div>
  );

  const provPlaceholder = locale === 'fr' ? 'Choisir la province' : locale === 'rn' ? 'Hitamwo intara' : locale === 'sw' ? 'Chagua mkoa' : 'Select Province';
  const commPlaceholder = locale === 'fr' ? 'Choisir la commune' : locale === 'rn' ? 'Hitamwo komine' : locale === 'sw' ? 'Chagua wilaya' : 'Select Commune';
  const zonePlaceholder = locale === 'fr' ? 'Choisir la zone' : locale === 'rn' ? 'Hitamwo zone' : locale === 'sw' ? 'Chagua eneo' : 'Select Zone';

  return (
    <div className="min-h-[100dvh] bg-[#f0f2f5] flex flex-col relative overflow-hidden">
      <OnboardingBackground />

      {/* Header */}
      <div className="relative z-20 sticky top-0 border-b border-white/20 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          {step !== 'welcome' && (
            <button onClick={goBack} className="rounded-lg p-1.5 hover:bg-black/5">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
          )}
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-gray-800">{STEP_LABELS[step]}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setLanguageSelectorOpen(!languageSelectorOpen)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-black/5 border border-gray-200 bg-white"
            >
              <span className="hidden sm:inline">{currentLanguage.label}</span>
              <span className="sm:hidden uppercase">{currentLanguage.code}</span>
              <ChevronDown size={12} className="text-gray-400" />
            </button>
            {languageSelectorOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLanguageSelectorOpen(false)} />
                <div className="absolute top-full right-0 z-30 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
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
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm">
          <StepProgress currentStep={step} />

          {/* Welcome */}
          {step === 'welcome' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a5f4a]/10">
                  <Globe size={32} className="text-[#1a5f4a]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">{tr('onboarding.welcome')}</h1>
                <p className="mt-2 text-sm text-gray-500">{tr('onboarding.subtitle')}</p>
              </div>
              <div className="space-y-3 pt-2">
                <button onClick={() => setStep('account-type')} className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a]">
                  {tr('onboarding.createAccount')}
                </button>
                <button onClick={() => setLocation('/auth')} className="h-13 w-full rounded-xl border-2 border-gray-200 bg-white text-base font-bold text-gray-700 hover:border-[#1a5f4a]/50">
                  {tr('onboarding.login')}
                </button>
                <button onClick={() => setLocation('/')} className="h-13 w-full rounded-xl border-2 border-gray-200 bg-white text-base font-semibold text-gray-400 hover:border-gray-300 hover:text-gray-600">
                  {tr('onboarding.continueBrowsing')}
                </button>
              </div>
            </div>
          )}

          {/* Account Type */}
          {step === 'account-type' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">{tr('onboarding.chooseAccountType')}</h2>
                <p className="mt-1 text-sm text-gray-500">{tr('onboarding.chooseAccountTypeDesc')}</p>
              </div>
              <button onClick={() => handleAccountTypeSelect('buyer')} className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-[#1a5f4a] hover:bg-[#1a5f4a]/5 active:scale-[0.98]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#1a5f4a]/10">
                  <ShoppingBag size={28} className="text-[#1a5f4a]" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-800">{tr('onboarding.buyProducts')}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{tr('onboarding.buyProductsDesc')}</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
              <button onClick={() => handleAccountTypeSelect('seller')} className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-[#ff6a00] hover:bg-[#ff6a00]/5 active:scale-[0.98]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#ff6a00]/10">
                  <Store size={28} className="text-[#ff6a00]" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-800">{tr('onboarding.sellProducts')}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{tr('onboarding.sellProductsDesc')}</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>
          )}

          {/* Create Account */}
          {step === 'create-account' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-3">
                <div className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full ${accountType === 'seller' ? 'bg-[#ff6a00]/10' : 'bg-[#1a5f4a]/10'}`}>
                  {accountType === 'seller' ? <Store size={22} className="text-[#ff6a00]" /> : <ShoppingBag size={22} className="text-[#1a5f4a]" />}
                </div>
                <p className="text-sm text-gray-500">{accountType === 'seller' ? tr('onboarding.createSellerAccount') : tr('onboarding.createBuyerAccount')}</p>
              </div>

              {renderInput(tr('onboarding.fullName'), fullName, setFullName, 'e.g. Jean Ndayisaba')}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{COUNTRY_OPTIONS[countryCode].label} phone number</label>
                <div className="flex items-center rounded-xl border border-gray-200 bg-white focus-within:border-[#ff6a00] focus-within:ring-2 focus-within:ring-[#ff6a00]/20">
                  <div className="flex items-center gap-1 border-r border-gray-200 px-2">
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value as CountryCode)}
                      className="bg-transparent py-2.5 pr-1 text-base font-semibold text-gray-700 outline-none">
                      {Object.entries(COUNTRY_OPTIONS).map(([code, option]) => (
                        <option key={code} value={code}>{option.flag} {option.dialCode}</option>
                      ))}
                    </select>
                  </div>
                  <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={countryCode === 'BI' ? '61 23 4567' : '78 123 4567'} type="tel"
                    className="h-13 flex-1 bg-transparent px-3 text-base outline-none" />
                </div>
              </div>

              {renderInput(tr('auth.password'), password, setPassword, tr('auth.enterPassword'), 'password')}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.preferredLanguage')}</label>
                <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                  className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20">
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="rn">Ikirundi</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <button onClick={handleCreateAccount}
                disabled={!fullName.trim() || !phoneNumber.trim() || password.length < 6 || loading}
                className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40">
                {loading ? (locale === 'fr' ? 'Création…' : locale === 'rn' ? 'Kubanga…' : locale === 'sw' ? 'Inaunda…' : 'Creating…') : tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* === BUYER STEPS === */}

          {/* Buyer - Province */}
          {step === 'buyer-province' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a5f4a]/10">
                  <MapPin size={24} className="text-[#1a5f4a]" />
                </div>
                <p className="text-sm text-gray-500">{tr('onboarding.deliveryAddress')}</p>
              </div>
              {renderSelect(tr('onboarding.province'), province, setProvince, provinces.map(p => ({ value: p.name, label: p.name })), provPlaceholder)}
              <button onClick={() => setStep('buyer-city')} disabled={!province}
                className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Buyer - City/Commune */}
          {step === 'buyer-city' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a5f4a]/10">
                  <MapPin size={24} className="text-[#1a5f4a]" />
                </div>
                <p className="text-sm text-gray-500">{tr('onboarding.city')}</p>
              </div>
              {renderSelect(tr('onboarding.city'), city, setCity, communes.map(c => ({ value: c.name, label: c.name })), commPlaceholder)}
              <button onClick={() => setStep('buyer-zone')} disabled={!city}
                className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Buyer - Zone */}
          {step === 'buyer-zone' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a5f4a]/10">
                  <MapPin size={24} className="text-[#1a5f4a]" />
                </div>
                <p className="text-sm text-gray-500">{tr('onboarding.zone')}</p>
              </div>
              {renderSelect(tr('onboarding.zone'), zone, setZone, zones.map(z => ({ value: z.name, label: z.name })), zonePlaceholder)}
              <button onClick={() => setStep('buyer-landmark')} disabled={!zone}
                className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Buyer - Landmark + Map + Submit */}
          {step === 'buyer-landmark' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a5f4a]/10">
                  <MapPin size={24} className="text-[#1a5f4a]" />
                </div>
                <p className="text-sm text-gray-500">{locale === 'fr' ? 'Où devons-nous livrer?' : locale === 'rn' ? 'Dutwehe mugihe tuzagurage?' : locale === 'sw' ? 'Tunawezaje kukuletea?' : 'Where should we deliver?'}</p>
              </div>

              {buyerLocationData ? (
                <div className="rounded-xl bg-[#1a5f4a]/5 border border-[#1a5f4a]/20 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 text-[#1a5f4a]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{buyerLocationData.locationName} - {buyerLocationData.approximateAddress.split(',').slice(0, 2).join(',')}</p>
                      <p className="text-xs text-gray-500 mt-1">{buyerLocationData.landmark}</p>
                      {buyerLocationData.directions && <p className="text-xs text-gray-500 mt-0.5">{buyerLocationData.directions}</p>}
                    </div>
                  </div>
                  <button onClick={() => { setBuyerLocationData(null); setShowLocationPicker(true); setLocationPickerMode('buyer'); }}
                    className="mt-3 text-sm font-semibold text-[#1a5f4a] hover:underline">
                    {locale === 'fr' ? 'Modifier l\'adresse' : locale === 'rn' ? 'Hindura ahantu' : locale === 'sw' ? 'Badilisha anwani' : 'Edit address'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowLocationPicker(true); setLocationPickerMode('buyer'); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-8 text-base font-semibold text-gray-600 hover:border-[#1a5f4a] hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] transition-all"
                >
                  <MapPin size={20} />
                  {locale === 'fr' ? 'Choisir l\'adresse de livraison' : locale === 'rn' ? 'Hitamwo ahantu hazaguragwo' : locale === 'sw' ? 'Chagua anwani ya uwasilishaji' : 'Choose delivery location'}
                </button>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <button onClick={handleBuyerComplete} disabled={!buyerLocationData || loading}
                className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40">
                {loading ? (locale === 'fr' ? 'Enregistrement…' : locale === 'rn' ? 'Kubika…' : locale === 'sw' ? 'Inahifadhi…' : 'Saving…') : tr('onboarding.continue')}
              </button>

              <button onClick={() => { setBuyerLocationData({ latitude: 0, longitude: 0, approximateAddress: '', locationName: 'skipped', province: '', commune: '', zone: '', landmark: 'skipped', directions: '', phone: '', meetAtPublicLandmark: false }); }}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                {tr('onboarding.skip')}
              </button>
            </div>
          )}

          {/* === SELLER STEPS === */}

          {/* Seller - Business Info */}
          {step === 'seller-business' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00]/10">
                  <Building2 size={24} className="text-[#ff6a00]" />
                </div>
                <p className="text-sm text-gray-500">{tr('onboarding.businessInfo')}</p>
              </div>
              {renderInput(tr('onboarding.businessName'), businessName, setBusinessName, 'e.g. Nzanila Electronics')}
              {renderInput(tr('onboarding.sellerFullName'), sellerFullName, setSellerFullName, 'e.g. Jean Ndayisaba')}
              <button onClick={() => setStep('seller-province')} disabled={!businessName.trim() || !sellerFullName.trim()}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Seller - Province */}
          {step === 'seller-province' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00]/10">
                  <MapPin size={24} className="text-[#ff6a00]" />
                </div>
                <p className="text-sm text-gray-500">{tr('onboarding.province')}</p>
              </div>
              {renderSelect(tr('onboarding.province'), sellerProvince, setSellerProvince, provinces.map(p => ({ value: p.name, label: p.name })), provPlaceholder)}
              <button onClick={() => setStep('seller-city')} disabled={!sellerProvince}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Seller - City/Commune */}
          {step === 'seller-city' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00]/10">
                  <MapPin size={24} className="text-[#ff6a00]" />
                </div>
                <p className="text-sm text-gray-500">{tr('onboarding.city')}</p>
              </div>
              {renderSelect(tr('onboarding.city'), sellerCity, setSellerCity, communes.map(c => ({ value: c.name, label: c.name })), commPlaceholder)}
              <button onClick={() => setStep('seller-zone')} disabled={!sellerCity}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Seller - Zone */}
          {step === 'seller-zone' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00]/10">
                  <MapPin size={24} className="text-[#ff6a00]" />
                </div>
                <p className="text-sm text-gray-500">{tr('onboarding.zone')}</p>
              </div>
              {renderSelect(tr('onboarding.zone'), sellerZone, setSellerZone, zones.map(z => ({ value: z.name, label: z.name })), zonePlaceholder)}
              <button onClick={() => setStep('seller-details')} disabled={!sellerZone}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Seller - Details (landmark, map, description, categories, delivery) */}
          {step === 'seller-details' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00]/10">
                  <Building2 size={24} className="text-[#ff6a00]" />
                </div>
                <p className="text-sm text-gray-500">{locale === 'fr' ? 'Où se trouve votre boutique?' : locale === 'rn' ? 'Icumba ry\'ubucuruzi ryari hehe?' : locale === 'sw' ? 'Duka lako liko wapi?' : 'Where is your shop?'}</p>
              </div>

              {sellerLocationData ? (
                <div className="rounded-xl bg-[#ff6a00]/5 border border-[#ff6a00]/20 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 text-[#ff6a00]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{sellerLocationData.locationName} - {sellerLocationData.approximateAddress.split(',').slice(0, 2).join(',')}</p>
                      <p className="text-xs text-gray-500 mt-1">{sellerLocationData.landmark}</p>
                      {sellerLocationData.directions && <p className="text-xs text-gray-500 mt-0.5">{sellerLocationData.directions}</p>}
                    </div>
                  </div>
                  <button onClick={() => { setSellerLocationData(null); setShowLocationPicker(true); setLocationPickerMode('seller'); }}
                    className="mt-3 text-sm font-semibold text-[#ff6a00] hover:underline">
                    {locale === 'fr' ? 'Modifier l\'adresse' : locale === 'rn' ? 'Hindura ahantu' : locale === 'sw' ? 'Badilisha anwani' : 'Edit address'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowLocationPicker(true); setLocationPickerMode('seller'); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-8 text-base font-semibold text-gray-600 hover:border-[#ff6a00] hover:bg-[#ff6a00]/5 hover:text-[#ff6a00] transition-all"
                >
                  <MapPin size={20} />
                  {locale === 'fr' ? 'Choisir l\'emplacement de la boutique' : locale === 'rn' ? 'Hitamwo ahantu ka Zusobanuro' : locale === 'sw' ? 'Chagua eneo la duka' : 'Choose shop location'}
                </button>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{locale === 'fr' ? 'Description du commerce' : locale === 'rn' ? 'Sobanuro ry\'ubucuruzi' : locale === 'sw' ? 'Maelezo ya biashara' : 'Business Description'}</label>
                <textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder={locale === 'fr' ? 'Décrivez votre commerce...' : locale === 'rn' ? 'Sobanura ubucuruzi bwawe...' : locale === 'sw' ? 'Eleza biashara yako...' : 'Describe your business, products, and services...'}
                  rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.offersDelivery')}</label>
                <div className="flex gap-3">
                  <button onClick={() => setOffersDelivery(true)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersDelivery === true ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Oui' : locale === 'rn' ? 'Ego' : locale === 'sw' ? 'Ndiyo' : 'Yes'}
                  </button>
                  <button onClick={() => setOffersDelivery(false)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersDelivery === false ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Non' : locale === 'rn' ? 'Oya' : locale === 'sw' ? 'Hapana' : 'No'}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.offersPickup')}</label>
                <div className="flex gap-3">
                  <button onClick={() => setOffersPickup(true)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersPickup === true ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Oui' : locale === 'rn' ? 'Ego' : locale === 'sw' ? 'Ndiyo' : 'Yes'}
                  </button>
                  <button onClick={() => setOffersPickup(false)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersPickup === false ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Non' : locale === 'rn' ? 'Oya' : locale === 'sw' ? 'Hapana' : 'No'}
                  </button>
                </div>
              </div>

              {offersDelivery && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.deliveryAreas')}</label>
                  <textarea value={deliveryAreas} onChange={(e) => setDeliveryAreas(e.target.value)}
                    placeholder="e.g. Bujumbura Centre, Bujumbura Nord" rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20" />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <button onClick={handleSellerSubmit}
                disabled={!sellerLocationData || loading}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40">
                {loading ? (locale === 'fr' ? 'Envoi…' : locale === 'rn' ? 'Kohereza…' : locale === 'sw' ? 'Inatuma…' : 'Submitting…') : tr('onboarding.submitForReview')}
              </button>
            </div>
          )}

          {/* Seller Verification */}
          {step === 'seller-verification' && (
            <div className="space-y-5 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                <Clock size={28} className="text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">{tr('onboarding.verificationStatus')}</h2>
              <p className="text-sm text-gray-500">{tr('onboarding.verificationStatusDesc')}</p>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-left">
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">{tr('onboarding.verificationStatus')}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{tr('onboarding.underReview')}</p>
                    <p className="text-xs text-gray-500">{tr('onboarding.underReviewDesc')}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setLocation('/supplier')}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00]">
                {tr('onboarding.openSellerDashboard')}
              </button>
            </div>
          )}

          {/* Buyer Complete */}
          {step === 'buyer-complete' && (
            <div className="space-y-5 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1a5f4a]/10">
                <CheckCircle size={28} className="text-[#1a5f4a]" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">{tr('onboarding.buyerComplete')}</h2>
              <p className="text-sm text-gray-500">{tr('onboarding.buyerCompleteDesc')}</p>
              <button onClick={() => setLocation('/')}
                className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a]">
                {tr('onboarding.startShopping')}
              </button>
            </div>
          )}

          {/* Seller Complete */}
          {step === 'seller-complete' && (
            <div className="space-y-5 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1a5f4a]/10">
                <CheckCircle size={28} className="text-[#1a5f4a]" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">{tr('onboarding.sellerComplete')}</h2>
              <p className="text-sm text-gray-500">{tr('onboarding.sellerCompleteDesc')}</p>
              <div className="space-y-3">
                <button onClick={() => setLocation('/supplier/products')}
                  className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00]">
                  {tr('onboarding.addFirstProduct')}
                </button>
                <button onClick={() => setLocation('/supplier')}
                  className="h-13 w-full rounded-xl border-2 border-gray-200 bg-white text-base font-bold text-gray-700 hover:border-[#ff6a00]/50">
                  {tr('onboarding.openSellerDashboard')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Search Picker */}
      {showLocationPicker && (
        <LocationSearchPicker
          mode={locationPickerMode}
          onConfirm={(data) => {
            if (locationPickerMode === 'buyer') {
              setBuyerLocationData(data);
            } else {
              setSellerLocationData(data);
            }
            setShowLocationPicker(false);
          }}
          onCancel={() => setShowLocationPicker(false)}
          initialLat={locationPickerMode === 'buyer' ? (buyerLatitude || -3.3731) : (sellerLatitude || -3.3731)}
          initialLng={locationPickerMode === 'buyer' ? (buyerLongitude || 29.3644) : (sellerLongitude || 29.3644)}
        />
      )}
    </div>
  );
}
