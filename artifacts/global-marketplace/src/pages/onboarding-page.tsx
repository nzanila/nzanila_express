import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ShoppingBag, Store, MapPin, Building2, CheckCircle, Clock, AlertCircle, ChevronRight, ChevronDown, Globe } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { locales } from '@/lib/i18n/translations';
import { useAuth } from '@/lib/auth-context';
import { COUNTRIES, isValidPhone, phoneHint, type CountryCode } from '@/lib/phone';
import { LocationSearchPicker, type LocationData } from '@/components/location-search-picker';
import { CommerceBackground } from '@/components/commerce-background';
import { ConfirmDialog, type ConfirmSpec } from '@/components/confirm-dialog';

type OnboardingStep =
  | 'welcome'
  | 'account-type'
  | 'create-account'
  | 'buyer-location'
  | 'seller-business'
  | 'seller-location'
  | 'seller-details'
  | 'seller-verification'
  | 'buyer-complete'
  | 'seller-complete';

type Language = 'fr' | 'sw' | 'en';
// CountryCode comes from '@/lib/phone' — a local 'BI'-only alias used to shadow it,
// which silently prevented any other country from being selectable.

// Countries come from the shared phone lib so validation and the picker cannot drift.
const COUNTRY_OPTIONS = COUNTRIES;

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  'account-type': 'Choose Type',
  'create-account': 'Create Account',
  'buyer-location': 'Location',
  'seller-business': 'Business',
  'seller-location': 'Shop Location',
  'seller-details': 'Details',
  'seller-verification': 'Verification',
  'buyer-complete': 'All Done',
  'seller-complete': 'All Done',
};

const STEP_ORDER: OnboardingStep[] = [
  'welcome', 'account-type', 'create-account',
  'buyer-location',
  'seller-business', 'seller-location', 'seller-details',
  'seller-verification', 'buyer-complete', 'seller-complete'
];

const BUYER_STEPS: OnboardingStep[] = ['buyer-location'];
const SELLER_STEPS: OnboardingStep[] = ['seller-business', 'seller-location', 'seller-details'];

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
  const { signUp, isAuthenticated, user, session, refreshUser, logout } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<OnboardingStep>(() => {
    if (isAuthenticated && user?.role === 'seller' && !user?.onboardingCompleted) return 'seller-business';
    if (isAuthenticated && user?.role === 'buyer' && !user?.onboardingCompleted) return 'buyer-location';
    return 'welcome';
  });
  // Bounce a user who lands here already onboarded. Redirecting is a side effect, so it
  // belongs in an effect rather than in the state initializer. The success screens are
  // excluded: finishing onboarding sets onboardingCompleted, and without this guard the
  // user would be thrown home before ever seeing the confirmation.
  const doneSteps: OnboardingStep[] = ['buyer-complete', 'seller-verification', 'seller-complete'];
  useEffect(() => {
    if (isAuthenticated && user?.onboardingCompleted && !doneSteps.includes(step)) setLocation('/');
  }, [isAuthenticated, user?.onboardingCompleted, step, setLocation]);
  const [accountType, setAccountType] = useState<'buyer' | 'seller' | null>(() => {
    if (isAuthenticated && user?.role) return user.role;
    return null;
  });
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);

  const [fullName, setFullName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('BI');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(locale as Language);
  const currentLanguage = locales.find((item) => item.code === locale) ?? locales[0];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Buyer location
  const [buyerLocationData, setBuyerLocationData] = useState<LocationData | null>(null);
  const [showBuyerLocationPicker, setShowBuyerLocationPicker] = useState(false);

  // Seller state
  const [businessName, setBusinessName] = useState('');
  const [sellerFullName, setSellerFullName] = useState('');
  const [sellerLocationData, setSellerLocationData] = useState<LocationData | null>(null);
  const [showSellerLocationPicker, setShowSellerLocationPicker] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [offersDelivery, setOffersDelivery] = useState<boolean | null>(null);
  const [offersPickup, setOffersPickup] = useState<boolean | null>(null);
  const [deliveryAreas, setDeliveryAreas] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');

  const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');
  const normalizePhone = (value: string) => `${COUNTRY_OPTIONS[countryCode].dialCode}${value.replace(/\D/g, '')}`;

  const handleAccountTypeSelect = (type: 'buyer' | 'seller') => {
    setAccountType(type);
    setStep('create-account');
  };

  const handleCreateAccount = async () => {
    if (!accountType) return;
    setError('');
    if (password !== passwordConfirm) { setError('Passwords do not match.'); return; }
    // The phone is the sign-in identifier and the API rejects a blank one, so require it
    // here rather than sending '' and surfacing a confusing server error.
    if (!phoneNumber.trim()) { setError('Phone number is required — you sign in with it.'); return; }
    if (!isValidPhone(phoneNumber, countryCode)) { setError(phoneHint(countryCode)); return; }
    setLoading(true);
    const normalizedPhone = normalizePhone(phoneNumber);
    const result = await signUp(normalizedPhone, fullName, accountType, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setStep(accountType === 'buyer' ? 'buyer-location' : 'seller-business');
  };

  const askCancelOnboarding = () => setConfirm({
    title: 'Cancel and delete your account?',
    description: 'Everything you have entered so far is removed. This cannot be undone.',
    confirmLabel: 'Delete my account',
    tone: 'danger',
    onConfirm: handleCancelOnboarding,
  });

  const handleCancelOnboarding = async () => {
    setError('');
    setLoading(true);

    try {
      if (isAuthenticated && session?.accessToken) {
        const res = await fetch(`${API}/api/profiles/account`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data?.error) throw new Error(data.error);
          throw new Error('Could not cancel onboarding. Please try again.');
        }
      }

      await logout();
      setLocation('/auth');
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel your account right now.');
      // Rethrown so the confirmation dialog reports the failure in place and stays open,
      // rather than closing as though the account had been deleted.
      throw cancelError;
    } finally {
      setLoading(false);
    }
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
          province: buyerLocationData?.province || undefined,
          city: buyerLocationData?.commune || undefined,
          zone: buyerLocationData?.zone || undefined,
          landmark: buyerLocationData?.landmark || undefined,
          deliveryPhone: buyerLocationData?.phone || undefined,
          preferredLanguage: preferredLanguage || undefined,
          latitude: buyerLocationData?.latitude ?? undefined,
          longitude: buyerLocationData?.longitude ?? undefined,
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
          province: sellerLocationData?.province || undefined,
          city: sellerLocationData?.commune || undefined,
          zone: sellerLocationData?.zone || undefined,
          landmark: sellerLocationData?.landmark || undefined,
          productCategories: productCategories.length > 0 ? productCategories : undefined,
          offersDelivery: offersDelivery !== null ? offersDelivery : undefined,
          offersPickup: offersPickup !== null ? offersPickup : undefined,
          deliveryAreas: deliveryAreas || undefined,
          businessDescription: businessDescription || undefined,
          shopLatitude: sellerLocationData?.latitude || undefined,
          shopLongitude: sellerLocationData?.longitude || undefined,
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
      // Signed-in users go home; '/' is a route, not a step, so it must not go through setStep.
      case 'buyer-location': if (isAuthenticated) setLocation('/'); else setStep('create-account'); break;
      case 'seller-business': if (isAuthenticated) setLocation('/'); else setStep('create-account'); break;
      case 'seller-location': setStep('seller-business'); break;
      case 'seller-details': setStep('seller-location'); break;
      default: setLocation('/');
    }
  };

  const renderInput = (label: string, value: string, onChange: (v: string) => void, placeholder: string, type = 'text') => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
        className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20" />
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#f0f2f5] flex flex-col relative overflow-hidden">
      <CommerceBackground />

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
          <div className="relative flex items-center gap-2">
            {step !== 'welcome' && (
              <button
                type="button"
                onClick={askCancelOnboarding}
                disabled={loading}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
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
                <label className="mb-2 block text-sm font-semibold text-gray-700">{COUNTRY_OPTIONS[countryCode].label} phone number <span className="text-red-500">*</span></label>
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
                <p className="mt-1.5 text-xs text-gray-500">Use a real number you can receive SMS on — it verifies your account and is the only way to recover it if you forget your password.</p>
              </div>

              {renderInput(tr('auth.password'), password, setPassword, tr('auth.enterPassword'), 'password')}
              {renderInput('Verify password', passwordConfirm, setPasswordConfirm, 'Repeat your password', 'password')}
              {passwordConfirm && <p className={`-mt-3 text-xs font-semibold ${password === passwordConfirm ? 'text-emerald-600' : 'text-red-600'}`}>{password === passwordConfirm ? `✓ ${tr('auth.passwordsMatch')}` : `✕ ${tr('auth.passwordsDoNotMatch')}`}</p>}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.preferredLanguage')}</label>
                <select value={preferredLanguage} onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                  className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20">
                  <option value="fr">{tr('ui.franais')}</option>
                  <option value="sw">{tr('ui.kiswahili')}</option>
                  <option value="en">{tr('ui.english')}</option>
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button onClick={handleCreateAccount}
                  disabled={!fullName.trim() || password.length < 6 || password !== passwordConfirm || loading}
                  className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40">
                  {loading ? (locale === 'fr' ? 'Création…' : locale === 'sw' ? 'Inaunda…' : 'Creating…') : tr('onboarding.continue')}
                </button>
                <button
                  type="button"
                  onClick={askCancelOnboarding}
                  disabled={loading}
                  className="w-full text-center text-xs font-medium text-gray-400 transition hover:text-red-500 disabled:opacity-50"
                >
                  Cancel & delete account
                </button>
              </div>
            </div>
          )}

          {/* === BUYER LOCATION (optional) === */}
          {step === 'buyer-location' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a5f4a]/10">
                  <MapPin size={24} className="text-[#1a5f4a]" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  {locale === 'fr' ? 'Ajouter votre lieu de livraison' : locale === 'sw' ? 'Ongeza eneo la uwasilishaji' : 'Add your delivery location'}
                </h2>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {locale === 'fr' ? 'Allez au lieu où vous souhaitez recevoir votre commande, puis appuyez sur "Utiliser ma position". Vous pouvez aussi rechercher un lieu ou déplacer le point manuellement. Ajoutez un repère pour que le vendeur vous trouve facilement.'
                    : locale === 'sw' ? 'Nenda mahali unapopokea oda yako, kisha gusa "Tumia eneo langu". Unaweza pia kutafuta mahali au kusogeza nukta kwa mkono. Ongeza kivinjari ili muuzaji akupate kwa urahisi.'
                    : 'Where should we deliver your order? You can go to the place where you want to receive the order, then tap "Use my current location". You can also search or move the pin manually. Add a landmark so the seller can find you easily.'}
                </p>
              </div>

              {buyerLocationData ? (
                <div className="rounded-xl bg-[#1a5f4a]/5 border border-[#1a5f4a]/20 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 text-[#1a5f4a]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{buyerLocationData.approximateAddress.split(',').slice(0, 2).join(',')}</p>
                      {buyerLocationData.landmark && <p className="text-xs text-gray-500 mt-1">{buyerLocationData.landmark}</p>}
                      {buyerLocationData.directions && <p className="text-xs text-gray-500 mt-0.5">{buyerLocationData.directions}</p>}
                    </div>
                  </div>
                  <button onClick={() => { setBuyerLocationData(null); setShowBuyerLocationPicker(true); }}
                    className="mt-3 text-sm font-semibold text-[#1a5f4a] hover:underline">
                    {locale === 'fr' ? 'Modifier l\'adresse' : locale === 'sw' ? 'Badilisha anwani' : 'Edit address'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowBuyerLocationPicker(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-8 text-base font-semibold text-gray-600 hover:border-[#1a5f4a] hover:bg-[#1a5f4a]/5 hover:text-[#1a5f4a] transition-all"
                >
                  <MapPin size={20} />
                  {locale === 'fr' ? 'Choisir l\'adresse de livraison' : locale === 'sw' ? 'Chagua anwani ya uwasilishaji' : 'Choose delivery location'}
                </button>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <button onClick={handleBuyerComplete} disabled={loading}
                className="h-13 w-full rounded-xl bg-[#1a5f4a] text-base font-bold text-white hover:bg-[#154a3a] disabled:opacity-40">
                {loading ? (locale === 'fr' ? 'Enregistrement…' : locale === 'sw' ? 'Inahifadhi…' : 'Saving…') : tr('onboarding.continue')}
              </button>

              <button onClick={() => { setBuyerLocationData({ latitude: 0, longitude: 0, approximateAddress: '', locationName: 'skipped', province: '', commune: '', zone: '', landmark: 'skipped', landmarkPhoto: '', directions: '', phone: '', meetAtPublicLandmark: false }); }}
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
              <button onClick={() => setStep('seller-location')} disabled={!businessName.trim() || !sellerFullName.trim()}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40">
                {tr('onboarding.continue')}
              </button>
            </div>
          )}

          {/* Seller - Shop Location (map picker) */}
          {step === 'seller-location' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00]/10">
                  <MapPin size={24} className="text-[#ff6a00]" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  {locale === 'fr' ? 'Emplacement de la boutique' : locale === 'sw' ? 'Eneo la duka' : 'Shop Location'}
                </h2>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {locale === 'fr' ? 'Ajoutez l\'emplacement de votre boutique ou lieu de vente habituel. Allez à votre boutique, puis appuyez sur "Utiliser ma position". Cela aide les acheteurs et livreurs à vous trouver plus facilement.'
                    : locale === 'sw' ? 'Ongeza eneo la duka lako au mahali unapouza kwa kawaida. Nenda kwenye duka lako, kisha gusa "Tumia eneo langu". Hii inasaidia wanunuzi na wasafirishaji kukupata kwa urahisi.'
                    : 'Please add the location of your shop or normal selling place. Go to your shop or business location before choosing the position. This helps buyers and couriers find you more easily.'}
                </p>
              </div>

              {sellerLocationData ? (
                <div className="rounded-xl bg-[#ff6a00]/5 border border-[#ff6a00]/20 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 text-[#ff6a00]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{sellerLocationData.approximateAddress.split(',').slice(0, 2).join(',')}</p>
                      {sellerLocationData.landmark && <p className="text-xs text-gray-500 mt-1">{sellerLocationData.landmark}</p>}
                      {sellerLocationData.directions && <p className="text-xs text-gray-500 mt-0.5">{sellerLocationData.directions}</p>}
                    </div>
                  </div>
                  <button onClick={() => { setSellerLocationData(null); setShowSellerLocationPicker(true); }}
                    className="mt-3 text-sm font-semibold text-[#ff6a00] hover:underline">
                    {locale === 'fr' ? 'Modifier l\'adresse' : locale === 'sw' ? 'Badilisha anwani' : 'Edit address'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSellerLocationPicker(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white py-8 text-base font-semibold text-gray-600 hover:border-[#ff6a00] hover:bg-[#ff6a00]/5 hover:text-[#ff6a00] transition-all"
                >
                  <MapPin size={20} />
                  {locale === 'fr' ? 'Choisir l\'emplacement de la boutique' : locale === 'sw' ? 'Chagua eneo la duka' : 'Choose shop location'}
                </button>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <button onClick={() => setStep('seller-details')}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00]">
                {tr('onboarding.continue')}
              </button>

              <button onClick={() => { setSellerLocationData({ latitude: 0, longitude: 0, approximateAddress: '', locationName: 'skipped', province: '', commune: '', zone: '', landmark: '', landmarkPhoto: '', directions: '', phone: '', meetAtPublicLandmark: false }); setStep('seller-details'); }}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
                {locale === 'fr' ? 'Ajouter l\'emplacement plus tard' : locale === 'sw' ? 'Ongeza eneo baadaye' : 'Add location later'}
              </button>
            </div>
          )}

          {/* Seller - Details (description, delivery) */}
          {step === 'seller-details' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-4">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff6a00]/10">
                  <Building2 size={24} className="text-[#ff6a00]" />
                </div>
                <p className="text-sm text-gray-500">
                  {locale === 'fr' ? 'Plus de détails sur votre commerce' : locale === 'sw' ? 'Maelezo zaidi ya biashara yako' : 'More details about your business'}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{locale === 'fr' ? 'Description du commerce' : locale === 'sw' ? 'Maelezo ya biashara' : 'Business Description'}</label>
                <textarea value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder={locale === 'fr' ? 'Décrivez votre commerce...' : locale === 'sw' ? 'Eleza biashara yako...' : 'Describe your business, products, and services...'}
                  rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.offersDelivery')}</label>
                <div className="flex gap-3">
                  <button onClick={() => setOffersDelivery(true)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersDelivery === true ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Oui' : locale === 'sw' ? 'Ndiyo' : 'Yes'}
                  </button>
                  <button onClick={() => setOffersDelivery(false)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersDelivery === false ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Non' : locale === 'sw' ? 'Hapana' : 'No'}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.offersPickup')}</label>
                <div className="flex gap-3">
                  <button onClick={() => setOffersPickup(true)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersPickup === true ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Oui' : locale === 'sw' ? 'Ndiyo' : 'Yes'}
                  </button>
                  <button onClick={() => setOffersPickup(false)}
                    className={`flex-1 h-12 rounded-xl border-2 text-base font-semibold transition-all ${offersPickup === false ? 'border-[#1a5f4a] bg-[#1a5f4a]/5 text-[#1a5f4a]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                    {locale === 'fr' ? 'Non' : locale === 'sw' ? 'Hapana' : 'No'}
                  </button>
                </div>
              </div>

              {offersDelivery && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">{tr('onboarding.deliveryAreas')}</label>
                  <textarea value={deliveryAreas} onChange={(e) => setDeliveryAreas(e.target.value)}
                    placeholder={tr('ui.egBujumburaCentreBujumburaNord')} rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20" />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <button onClick={handleSellerSubmit} disabled={loading}
                className="h-13 w-full rounded-xl bg-[#ff6a00] text-base font-bold text-white hover:bg-[#e55f00] disabled:opacity-40">
                {loading ? (locale === 'fr' ? 'Envoi…' : locale === 'sw' ? 'Inatuma…' : 'Submitting…') : tr('onboarding.submitForReview')}
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

      {/* Location Search Pickers */}
      {showBuyerLocationPicker && (
        <LocationSearchPicker
          mode="buyer"
          onConfirm={(data) => {
            setBuyerLocationData(data);
            setShowBuyerLocationPicker(false);
          }}
          onCancel={() => setShowBuyerLocationPicker(false)}
        />
      )}
      {showSellerLocationPicker && (
        <LocationSearchPicker
          mode="seller"
          onConfirm={(data) => {
            setSellerLocationData(data);
            setShowSellerLocationPicker(false);
          }}
          onCancel={() => setShowSellerLocationPicker(false)}
        />
      )}

      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
