import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, KeyRound, MessageSquare, ShieldCheck, Store } from 'lucide-react';
import { sendPhoneCode, phoneErrorMessage, phoneVerificationConfigured, type PhoneConfirmation } from '../lib/firebase-phone';
import { useLocale } from '../lib/i18n/locale-context';

// Phone-verified password reset for sellers. Mirrors the buyer app's flow — same lib, same
// server endpoint — so a fix to one behaves the same in the other.

const API = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';
const SUPPORT_WHATSAPP = '250799494538';
const SIGN_IN_HREF = '/seller-central/login';

// SMS recovery bills per message — Firebase Phone Auth only sends from a billing-enabled
// project — so it stays switched off until that is paid for. While it is off, a locked-out
// seller files a request that an administrator checks against the documents already on file.
const SMS_RECOVERY_ENABLED = phoneVerificationConfigured
  && String((import.meta as any).env?.VITE_SMS_RECOVERY_ENABLED) === 'true';

/** Local Burundi number -> E.164, which is the only form Firebase accepts. */
function toE164(input: string) {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('257')) return `+${digits}`;
  return `+257${digits.replace(/^0+/, '')}`;
}

export function ForgotPasswordPage() {
  const { tr } = useLocale();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'request' | 'requested' | 'phone' | 'code' | 'password' | 'done'>(
    SMS_RECOVERY_ENABLED ? 'phone' : 'request');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [details, setDetails] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmation, setConfirmation] = useState<PhoneConfirmation | null>(null);
  const [idToken, setIdToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const field = 'mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-[#ff9900] focus:ring-2 focus:ring-[#ff9900]/20';
  const primary = 'w-full rounded-xl bg-[#ff9900] py-3 text-sm font-bold text-white hover:bg-[#e68a00] disabled:opacity-50';

  // Files a request for an administrator to handle by hand. The response is the same
  // whether or not the number matches an account, so this cannot be used to find out who
  // is registered — see the migration that creates password_reset_requests.
  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const e164 = toE164(phone);
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
    const e164 = toE164(phone);
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

  return <div className="grid min-h-[100dvh] place-items-center bg-[#232f3e] p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <Link href={SIGN_IN_HREF} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={15} />{tr('sc.back-to-sign-in')}</Link>

      <div className="mt-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff4e5] text-[#ff9900]"><KeyRound size={20} /></span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tr('sc.reset-your-password')}</h1>
          <p className="text-sm text-gray-500">{SMS_RECOVERY_ENABLED
            ? 'We verify your phone number, then you choose a new password.'
            : 'Tell us who you are and an administrator will restore your access.'}</p>
        </div>
      </div>

      {/* Firebase requires this element to exist for its invisible reCAPTCHA. */}
      <div id="recaptcha-holder" />

      {step === 'request' ? (
        <form onSubmit={submitRequest} className="mt-6">
          <label className="block text-sm font-semibold text-gray-700">{tr('sc.your-phone-number')}<div className="mt-1.5 flex items-center rounded-xl border border-gray-300 focus-within:border-[#ff9900]">
              <span className="border-r border-gray-200 px-3 py-3 text-base font-semibold text-gray-600">+257</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoFocus
                placeholder="61 23 4567" className="min-w-0 flex-1 rounded-r-xl px-3 py-3 text-base outline-none" />
            </div>
          </label>
          <label className="mt-4 block text-sm font-semibold text-gray-700">{tr('sc.name-on-the-account')}<input value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder={tr("sc.your-full-name-or-business-name")} className={field} />
          </label>
          <label className="mt-4 block text-sm font-semibold text-gray-700">{tr('sc.anything-that-helps-us-find-you')}<textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
              placeholder="Optional — your shop name, a recent order, the ID you signed up with."
              className={`${field} resize-none`} />
          </label>
          <p className="mt-2 text-xs text-gray-500">{tr('sc.an-administrator-checks-this-against-the-doc')}</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className={`mt-5 ${primary}`}>
            {busy ? 'Sending…' : 'Send my request'}
          </button>
        </form>
      ) : step === 'requested' ? (
        <div className="mt-6">
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Your request has been sent. An administrator will contact you on {toE164(phone)}.
          </p>
          <p className="mt-3 text-sm text-gray-600">{tr('sc.keep-your-id-or-business-documents-to-hand-y')}</p>
          <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white">
            <MessageSquare size={15} />{tr('sc.follow-up-on-whatsapp')}</a>
          <button onClick={() => setLocation(SIGN_IN_HREF)} className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-800">{tr('sc.back-to-sign-in')}</button>
        </div>
      ) : step === 'phone' ? (
        <form onSubmit={requestCode} className="mt-6">
          <label className="block text-sm font-semibold text-gray-700">{tr('sc.your-phone-number')}<div className="mt-1.5 flex items-center rounded-xl border border-gray-300 focus-within:border-[#ff9900]">
              <span className="border-r border-gray-200 px-3 py-3 text-base font-semibold text-gray-600">+257</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoFocus
                placeholder="61 23 4567" className="min-w-0 flex-1 rounded-r-xl px-3 py-3 text-base outline-none" />
            </div>
          </label>
          <p className="mt-2 text-xs text-gray-500">{tr('sc.the-number-on-your-seller-account-we-will-se')}</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className={`mt-5 ${primary}`}>
            {busy ? 'Sending code…' : 'Send me a code'}
          </button>
        </form>
      ) : step === 'code' ? (
        <form onSubmit={verifyCode} className="mt-6">
          <label className="block text-sm font-semibold text-gray-700">{tr('sc.enter-the-6-digit-code')}<input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoFocus
              maxLength={6} placeholder="123456" className={`${field} tracking-[0.4em] text-center text-lg font-bold`} />
          </label>
          <p className="mt-2 text-xs text-gray-500">Sent to {toE164(phone)}. It can take a minute to arrive.</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className={`mt-5 ${primary}`}>
            {busy ? 'Checking…' : 'Verify code'}
          </button>
          <button type="button" onClick={() => { setStep('phone'); setCode(''); setError(''); }}
            className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-800">{tr('sc.use-a-different-number')}</button>
        </form>
      ) : step === 'password' ? (
        <form onSubmit={savePassword} className="mt-6">
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <ShieldCheck size={15} />{tr('sc.phone-number-verified')}</p>
          <label className="block text-sm font-semibold text-gray-700">{tr('sc.new-password')}<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
              placeholder={tr("sc.at-least-6-characters")} className={field} />
          </label>
          <label className="mt-4 block text-sm font-semibold text-gray-700">{tr('sc.repeat-new-password')}<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={field} />
          </label>
          {confirmPassword && <p className={`mt-2 text-xs font-semibold ${password === confirmPassword ? 'text-emerald-600' : 'text-red-600'}`}>
            {password === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
          </p>}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className={`mt-5 ${primary}`}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      ) : (
        <div className="mt-6 text-center">
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{tr('sc.your-password-has-been-changed')}</p>
          <button onClick={() => setLocation(SIGN_IN_HREF)} className={`mt-5 ${primary}`}>
            <span className="inline-flex items-center justify-center gap-2"><Store size={15} />{tr('sc.sign-in-to-seller-central')}</span>
          </button>
        </div>
      )}

      <p className="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
        {SMS_RECOVERY_ENABLED && step !== 'request' && step !== 'requested' ? <>
          Cannot receive the SMS?{' '}
          <button type="button" onClick={() => { setStep('request'); setError(''); }}
            className="font-semibold text-[#ff9900] hover:underline">{tr('sc.ask-an-administrator-instead')}</button>
          {' · '}
        </> : null}
        <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer" className="font-semibold text-[#ff9900] hover:underline">{tr('sc.message-us-on-whatsapp')}</a>
      </p>
    </div>
  </div>;
}
