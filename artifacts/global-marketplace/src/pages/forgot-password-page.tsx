import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, KeyRound, MessageSquare, ShieldCheck } from 'lucide-react';
import { sendPhoneCode, phoneErrorMessage, phoneVerificationConfigured, type PhoneConfirmation } from '@/lib/firebase-phone';
import { useLocale } from '@/lib/i18n/locale-context';

const API = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';
const SUPPORT_WHATSAPP = '250799494538';

// SMS recovery bills per message — Firebase Phone Auth only sends from a billing-enabled
// project — so it stays switched off until that is paid for. While it is off, a locked-out
// person files a request that an administrator checks against the documents already on file.
const SMS_RECOVERY_ENABLED = phoneVerificationConfigured
  && String((import.meta as any).env?.VITE_SMS_RECOVERY_ENABLED) === 'true';

const COUNTRIES = [
  { code: 'BI', dial: '257', flag: '🇧🇮', placeholder: '61 23 4567' },
  { code: 'RW', dial: '250', flag: '🇷🇼', placeholder: '78 123 4567' },
] as const;

/** Local number -> E.164, which is the only form Firebase accepts. */
function toE164(input: string, dial: string) {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  // Already carries a country code: keep it rather than prefixing a second one.
  for (const country of COUNTRIES) {
    if (digits.startsWith(country.dial)) return `+${digits}`;
  }
  return `+${dial}${digits.replace(/^0+/, '')}`;
}

export function ForgotPasswordPage() {
  const { tr } = useLocale();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'request' | 'requested' | 'phone' | 'code' | 'password' | 'done'>(
    SMS_RECOVERY_ENABLED ? 'phone' : 'request');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [details, setDetails] = useState('');
  const [dial, setDial] = useState('257');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmation, setConfirmation] = useState<PhoneConfirmation | null>(null);
  const [idToken, setIdToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const field = 'mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20';

  // Files a request for an administrator to handle by hand. The response is deliberately
  // the same whether or not the number matches an account, so this cannot be used to find
  // out who is registered — see the migration that creates password_reset_requests.
  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const e164 = toE164(phone, dial);
    if (e164.replace(/\D/g, '').length < 11) { setError('Enter your full phone number.'); return; }
    if (!fullName.trim()) { setError('Enter the name on your account.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/auth/password-reset-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: e164, fullName: fullName.trim(), details: details.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any)?.error || 'Could not send your request.');
      setStep('requested');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your request.');
    } finally { setBusy(false); }
  };

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const e164 = toE164(phone, dial);
    if (e164.replace(/\D/g, '').length < 11) { setError('Enter your full phone number.'); return; }
    setBusy(true);
    try {
      setConfirmation(await sendPhoneCode(e164, 'recaptcha-holder'));
      setStep('code');
    } catch (cause) {
      setError(phoneErrorMessage(cause));
    } finally { setBusy(false); }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!confirmation) { setStep('phone'); return; }
    setBusy(true);
    try {
      setIdToken(await confirmation.confirm(code.trim()));
      setStep('password');
    } catch (cause) {
      setError(phoneErrorMessage(cause));
    } finally { setBusy(false); }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any)?.error || 'Could not update your password.');
      setStep('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your password.');
    } finally { setBusy(false); }
  };

  return <div className="grid min-h-[100dvh] place-items-center bg-[#f0f2f5] p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <Link href="/auth" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={15} /> Back to sign in
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ff6a00]/10 text-[#ff6a00]"><KeyRound size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tr('ui.resetYourPassword')}</h1>
          <p className="text-sm text-gray-500">{SMS_RECOVERY_ENABLED
            ? 'We verify your phone number, then you choose a new password.'
            : 'Tell us who you are and an administrator will restore your access.'}</p>
        </div>
      </div>

      {/* Firebase requires this element to exist for its invisible reCAPTCHA. */}
      <div id="recaptcha-holder" />

      {step === 'request' ? (
        <form onSubmit={submitRequest} className="mt-6">
          <label className="block text-sm font-semibold text-gray-700">Your phone number
            <div className="mt-1.5 flex items-center rounded-xl border border-gray-300 focus-within:border-[#ff6a00]">
              <select value={dial} onChange={e => setDial(e.target.value)} aria-label={tr('ui.countryCode')}
                className="border-r border-gray-200 bg-transparent py-3 pl-3 pr-1 text-base font-semibold text-gray-700 outline-none">
                {COUNTRIES.map(country => <option key={country.code} value={country.dial}>{country.flag} +{country.dial}</option>)}
              </select>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoFocus
                placeholder={COUNTRIES.find(c => c.dial === dial)?.placeholder}
                className="min-w-0 flex-1 rounded-r-xl px-3 py-3 text-base outline-none" />
            </div>
          </label>
          <label className="mt-4 block text-sm font-semibold text-gray-700">Name on the account
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder={tr('ui.yourFullNameOrBusinessName')} className={field} />
          </label>
          <label className="mt-4 block text-sm font-semibold text-gray-700">Anything that helps us find you
            <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
              placeholder={tr('ui.optionalYourShopNameARecent')}
              className={`${field} resize-none`} />
          </label>
          <p className="mt-2 text-xs text-gray-500">An administrator checks this against the documents on your account, then calls you on this number with a new password.</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="mt-5 w-full rounded-xl bg-[#ff6a00] py-3 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Sending…' : 'Send my request'}
          </button>
        </form>
      ) : step === 'requested' ? (
        <div className="mt-6">
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Your request has been sent. An administrator will contact you on {toE164(phone, dial)}.
          </p>
          <p className="mt-3 text-sm text-gray-600">Keep your ID or business documents to hand — you will be asked to confirm the details already on your account before a new password is given out.</p>
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white">
            <MessageSquare size={15} /> Follow up on WhatsApp
          </a>
          <button onClick={() => setLocation('/auth')} className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-800">
            Back to sign in
          </button>
        </div>
      ) : step === 'phone' ? (
        <form onSubmit={requestCode} className="mt-6">
          <label className="block text-sm font-semibold text-gray-700">Your phone number
            <div className="mt-1.5 flex items-center rounded-xl border border-gray-300 focus-within:border-[#ff6a00]">
              <select value={dial} onChange={e => setDial(e.target.value)} aria-label={tr('ui.countryCode')}
                className="border-r border-gray-200 bg-transparent py-3 pl-3 pr-1 text-base font-semibold text-gray-700 outline-none">
                {COUNTRIES.map(country => <option key={country.code} value={country.dial}>{country.flag} +{country.dial}</option>)}
              </select>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoFocus
                placeholder={COUNTRIES.find(c => c.dial === dial)?.placeholder}
                className="min-w-0 flex-1 rounded-r-xl px-3 py-3 text-base outline-none" />
            </div>
          </label>
          <p className="mt-2 text-xs text-gray-500">{tr('ui.theNumberOnYourAccountWe')}</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="mt-5 w-full rounded-xl bg-[#ff6a00] py-3 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Sending code…' : 'Send me a code'}
          </button>
        </form>
      ) : step === 'code' ? (
        <form onSubmit={verifyCode} className="mt-6">
          <label className="block text-sm font-semibold text-gray-700">Enter the 6-digit code
            <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoFocus
              maxLength={6} placeholder="123456" className={`${field} tracking-[0.4em] text-center text-lg font-bold`} />
          </label>
          <p className="mt-2 text-xs text-gray-500">Sent to {toE164(phone, dial)}. It can take a minute to arrive.</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="mt-5 w-full rounded-xl bg-[#ff6a00] py-3 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Checking…' : 'Verify code'}
          </button>
          <button type="button" onClick={() => { setStep('phone'); setCode(''); setError(''); }}
            className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-800">{tr('ui.useADifferentNumber')}</button>
        </form>
      ) : step === 'password' ? (
        <form onSubmit={savePassword} className="mt-6">
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <ShieldCheck size={15} /> Phone number verified
          </p>
          <label className="block text-sm font-semibold text-gray-700">New password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
              placeholder={tr('ui.atLeast6Characters')} className={field} />
          </label>
          <label className="mt-4 block text-sm font-semibold text-gray-700">Repeat new password
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={field} />
          </label>
          {confirmPassword && <p className={`mt-2 text-xs font-semibold ${password === confirmPassword ? 'text-emerald-600' : 'text-red-600'}`}>
            {password === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
          </p>}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="mt-5 w-full rounded-xl bg-[#ff6a00] py-3 text-sm font-bold text-white disabled:opacity-50">
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      ) : (
        <div className="mt-6 text-center">
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{tr('ui.yourPasswordHasBeenChanged')}</p>
          <button onClick={() => setLocation('/auth')} className="mt-5 w-full rounded-xl bg-[#ff6a00] py-3 text-sm font-bold text-white">
            Sign in
          </button>
        </div>
      )}

      <p className="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
        {SMS_RECOVERY_ENABLED && step !== 'request' && step !== 'requested' ? <>
          Cannot receive the SMS?{' '}
          <button type="button" onClick={() => { setStep('request'); setError(''); }}
            className="font-semibold text-[#ff6a00] hover:underline">{tr('ui.askAnAdministratorInstead')}</button>
          {' · '}
        </> : null}
        <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" className="font-semibold text-[#ff6a00] hover:underline">
          Message us on WhatsApp
        </a>
      </p>
    </div>
  </div>;
}
