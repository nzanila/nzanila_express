import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Phone, ShoppingBag, Store, Shield, ChevronRight, Lock, MessageCircle, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/i18n/locale-context';

type Step = 'role' | 'phone-register' | 'phone-login' | 'otp' | 'done';

export function AuthPage() {
  const { tr } = useLocale();
  const { signUp, signIn, verifyOtp, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState<{ otp: string; whatsappUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (isAuthenticated && user) {
    setLocation(user.role === 'seller' ? '/supplier' : '/');
    return null;
  }

  const handleRoleSelect = (r: 'buyer' | 'seller') => {
    setRole(r);
    setStep('phone-register');
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);
    const result = await signUp(phone, name, role);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setPhone(result.phone || phone);
    setOtpData({ otp: result.otp || '', whatsappUrl: result.whatsappUrl || '' });
    setStep('otp');
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const result = await signIn(phone);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setOtpData({ otp: result.otp || '', whatsappUrl: result.whatsappUrl || '' });
    setStep('otp');
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    const result = await verifyOtp(phone, otp);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setStep('done');
    setTimeout(() => {
      setLocation(result.user?.role === 'seller' ? '/supplier' : '/');
    }, 500);
  };

  const copyOtp = () => {
    if (otpData?.otp) {
      navigator.clipboard.writeText(otpData.otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          {step !== 'role' && (
            <button onClick={() => { setError(''); setOtpData(null); setStep(step === 'otp' ? (otpData && !name ? 'phone-login' : 'phone-register') : 'role'); }} className="rounded-lg p-1.5 hover:bg-muted">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
          )}
          <div className="flex-1 text-center">
            <p className="text-sm font-bold text-foreground">
              {step === 'role' ? 'Join Nzanila' : step === 'otp' ? 'Verify via WhatsApp' : step === 'done' ? 'Welcome!' : role === 'seller' ? 'Create Seller Account' : 'Create Buyer Account'}
            </p>
          </div>
          {step !== 'role' && <div className="w-8" />}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Step: Choose Role */}
          {step === 'role' && (
            <div className="space-y-4">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <img src="/logo.png" alt="Nzanila" className="h-10 w-auto" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Welcome to Nzanila Express</h1>
                <p className="mt-2 text-sm text-muted-foreground">Choose how you want to use the platform</p>
              </div>

              <button onClick={() => handleRoleSelect('buyer')} className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <ShoppingBag size={28} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">I want to buy</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Browse products, compare prices, and order from verified suppliers</p>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </button>

              <button onClick={() => handleRoleSelect('seller')} className="flex w-full items-center gap-4 rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Store size={28} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-foreground">I want to sell</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">List your products, manage orders, and grow your wholesale business</p>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </button>

              <div className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button onClick={() => setStep('phone-login')} className="font-semibold text-primary hover:underline">
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Step: Phone (Register) */}
          {step === 'phone-register' && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${role === 'seller' ? 'bg-emerald-500/10' : 'bg-primary/10'}`}>
                  {role === 'seller' ? <Store size={24} className="text-emerald-600" /> : <ShoppingBag size={24} className="text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">Registering as <span className="font-semibold text-foreground">{role === 'seller' ? 'Seller' : 'Buyer'}</span></p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jean Ndayisaba"
                  className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">WhatsApp number</label>
                <div className="flex items-center rounded-xl border border-border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="flex items-center gap-2 border-r border-border px-3">
                    <span className="text-lg">🇧🇮</span>
                    <span className="text-sm font-semibold text-foreground">+257</span>
                  </div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="61 23 4567"
                    type="tel"
                    className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">We'll send a verification code via WhatsApp</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                onClick={handleRegister}
                disabled={!name.trim() || !phone.trim() || loading}
                className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {loading ? 'Sending code…' : 'Continue'}
              </button>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Shield size={16} className="flex-shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">Your phone number is encrypted and never shared with third parties.</p>
              </div>
            </div>
          )}

          {/* Step: Phone (Login) */}
          {step === 'phone-login' && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Phone size={24} className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Sign in with your WhatsApp number</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Phone number</label>
                <div className="flex items-center rounded-xl border border-border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <div className="flex items-center gap-2 border-r border-border px-3">
                    <span className="text-lg">🇧🇮</span>
                    <span className="text-sm font-semibold text-foreground">+257</span>
                  </div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="61 23 4567"
                    type="tel"
                    className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                onClick={handleLogin}
                disabled={!phone.trim() || loading}
                className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {loading ? 'Sending code…' : 'Send verification code'}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Don't have an account?{' '}
                <button onClick={() => { setStep('role'); setPhone(''); setError(''); }} className="font-semibold text-primary hover:underline">
                  Sign up
                </button>
              </p>
            </div>
          )}

          {/* Step: OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <MessageCircle size={24} className="text-emerald-600" />
                </div>
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to</p>
                <p className="mt-1 text-sm font-bold text-foreground">🇧🇮 {phone}</p>
              </div>

              {/* WhatsApp link + OTP display */}
              {otpData && (
                <div className="space-y-3">
                  <a
                    href={otpData.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 h-12 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <MessageCircle size={18} />
                    Open WhatsApp
                  </a>

                  {/* OTP display for demo */}
                  <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">Your verification code</p>
                    <p className="text-2xl font-bold tracking-[0.3em] text-emerald-800 font-mono">{otpData.otp}</p>
                    <button
                      onClick={copyOtp}
                      className="mt-2 flex items-center gap-1 mx-auto text-xs text-emerald-600 hover:text-emerald-800"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy code'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Verification code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="h-14 w-full rounded-xl border border-border bg-card px-4 text-center text-2xl font-bold tracking-[0.5em] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6 || loading}
                className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {loading ? 'Verifying…' : 'Verify & sign in'}
              </button>

              <button
                onClick={() => { setError(''); setOtp(''); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Didn't receive the code? Check your WhatsApp
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <Shield size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Welcome to Nzanila!</h2>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting you to the {role === 'seller' ? 'supplier dashboard' : 'marketplace'}…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
