/**
 * Firebase phone verification, loaded from Google's CDN at runtime.
 *
 * The SDK is imported dynamically rather than bundled: this repo is a pnpm workspace whose
 * node_modules cannot currently be modified without a full reinstall, and a dynamic import
 * keeps ~200KB of Firebase out of the main bundle for the 99% of visits that never touch
 * password recovery.
 *
 * Config values below are the public Firebase web config, which is designed to ship inside
 * client apps. The security boundary is NOT this config — it is the server verifying the
 * signed ID token before it will change any password.
 */
const SDK_VERSION = '10.14.1';
const APP_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`;

const env = (import.meta as any).env || {};
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

/** False until the Firebase web config is provided at build time. */
export const phoneVerificationConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

let authPromise: Promise<any> | null = null;

async function getAuth() {
  if (!phoneVerificationConfigured) throw new Error('Phone verification is not configured yet.');
  if (!authPromise) {
    authPromise = (async () => {
      const [{ initializeApp, getApps }, authModule] = await Promise.all([
        import(/* @vite-ignore */ APP_URL),
        import(/* @vite-ignore */ AUTH_URL),
      ]);
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);
      // Send SMS and UI in the user's own language where Firebase supports it.
      auth.useDeviceLanguage?.();
      return { auth, authModule };
    })().catch(error => { authPromise = null; throw error; });
  }
  return authPromise;
}

export type PhoneConfirmation = { confirm: (code: string) => Promise<string> };

/**
 * Sends an SMS code. `containerId` must be an element in the DOM for the invisible
 * reCAPTCHA that Firebase requires before it will send anything.
 */
export async function sendPhoneCode(e164Phone: string, containerId: string): Promise<PhoneConfirmation> {
  const { auth, authModule } = await getAuth();
  const { RecaptchaVerifier, signInWithPhoneNumber } = authModule;
  // A fresh verifier per attempt; a reused one throws after the first solve.
  const verifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  try {
    const confirmation = await signInWithPhoneNumber(auth, e164Phone, verifier);
    return {
      confirm: async (code: string) => {
        const credential = await confirmation.confirm(code);
        // The ID token is what the server verifies; the phone is read from inside it.
        return await credential.user.getIdToken();
      },
    };
  } catch (error) {
    try { verifier.clear(); } catch { /* already torn down */ }
    throw error;
  }
}

/** Firebase error codes are not readable; translate the ones users actually hit. */
export function phoneErrorMessage(error: unknown): string {
  const code = String((error as any)?.code || '');
  if (code.includes('invalid-phone-number')) return 'That phone number does not look right. Check it and try again.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait a few minutes before trying again.';
  if (code.includes('invalid-verification-code')) return 'That code is not correct. Check the SMS and try again.';
  if (code.includes('code-expired')) return 'That code has expired. Request a new one.';
  if (code.includes('quota-exceeded')) return 'SMS verification is temporarily unavailable. Please contact support.';
  if (code.includes('captcha-check-failed')) return 'Verification failed. Reload the page and try again.';
  if (code.includes('operation-not-allowed')) return 'Phone sign-in is not enabled for this site yet.';
  return (error as any)?.message || 'Could not send the code. Please try again.';
}
