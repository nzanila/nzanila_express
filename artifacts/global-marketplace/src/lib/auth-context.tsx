import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface User {
  id: number;
  authUserId: string;
  phone: string;
  name: string;
  role: 'buyer' | 'seller';
  location: string;
  verified: boolean;
  avatar: string;
  createdAt: string;
  province?: string | null;
  city?: string | null;
  zone?: string | null;
  landmark?: string | null;
  deliveryPhone?: string | null;
  addressName?: string | null;
  directions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  approximateAddress?: string | null;
  // Set by the API once onboarding is finished; drives the redirect away from /onboarding.
  onboardingCompleted?: boolean | null;
  session?: Session;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Resolves with the signed-in user so callers can enforce which app the role may enter.
  signIn: (phone: string, password: string) => Promise<{ error?: string; user?: User }>;
  signUp: (phone: string, name: string, role: 'buyer' | 'seller', password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nz_auth');
      if (stored) {
        const parsed = JSON.parse(stored) as { user: User; session: Session };
        if (parsed.session.expiresAt * 1000 > Date.now()) {
          const userWithSession = { ...parsed.user, session: parsed.session };
          setUser(userWithSession);
          setSession(parsed.session);
        } else {
          localStorage.removeItem('nz_auth');
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Refresh token if close to expiry
  useEffect(() => {
    if (!session) return;
    const msUntilExpiry = session.expiresAt * 1000 - Date.now();
    if (msUntilExpiry < 60_000) {
      fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
        .then(r => r.json())
        .then((data: any) => {
          if (data.session) {
            setSession(data.session);
            localStorage.setItem('nz_auth', JSON.stringify({ user, session: data.session }));
          }
        })
        .catch(() => { /* A refresh that fails does not mean the session is dead — the current access token may still work. The 401 interceptor ends it only when a real request is actually refused. */ });
    }
    const timeout = setTimeout(() => {
      fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
        .then(r => r.json())
        .then((data: any) => {
          if (data.session) {
            setSession(data.session);
            if (user) localStorage.setItem('nz_auth', JSON.stringify({ user, session: data.session }));
          }
        })
        .catch(() => { /* A refresh that fails does not mean the session is dead — the current access token may still work. The 401 interceptor ends it only when a real request is actually refused. */ });
    }, Math.max(msUntilExpiry - 60_000, 10_000));
    return () => clearTimeout(timeout);
  }, [session, user]);

  const signUp = useCallback(async (phone: string, name: string, role: 'buyer' | 'seller', password: string) => {
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, role, password }),
      });
      const data = await res.json() as any;
      if (!res.ok) return { error: data.error || 'Signup failed' };

      if (data.user && data.session) {
        const userWithSession = { ...data.user, session: data.session };
        setUser(userWithSession);
        setSession(data.session);
        localStorage.setItem('nz_auth', JSON.stringify({ user: userWithSession, session: data.session }));
      }
      return {};
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const signIn = useCallback(async (phone: string, password: string) => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json() as any;
      if (!res.ok) return { error: data.error || 'Login failed' };

      if (data.user && data.session) {
        const userWithSession = { ...data.user, session: data.session };
        setUser(userWithSession);
        setSession(data.session);
        localStorage.setItem('nz_auth', JSON.stringify({ user: userWithSession, session: data.session }));
        // Returned so the caller can check the role before letting them into this app.
        return { user: userWithSession as User };
      }
      return {};
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (session?.accessToken) {
        await fetch(`${API}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
      }
    } catch { /* ignore */ }
    setUser(null);
    setSession(null);
    localStorage.removeItem('nz_auth');
  }, [session]);

  // Drop a session the server has stopped accepting. Without this the app keeps a dead
  // token in local storage and every request fails silently while the UI still looks
  // signed in — which is what happens to everyone the moment session tokens change.
  const endDeadSession = useCallback(() => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('nz_auth');
  }, []);

  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      // Only our own API, and only 401 (a 403 means signed in but not allowed —
      // that must not sign anyone out). The auth endpoints answer 401 for a wrong
      // password, so they are excluded or a failed login would look like a logout.
      const isOurApi = url.startsWith(API) || url.startsWith('/api/');
      // /api/auth/password answers 401 when the *current* password is mistyped —
      // excluded, or changing your password wrong would sign you out.
      const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/signup') || url.includes('/api/auth/password') || url.includes('/api/auth/refresh');
      if (response.status === 401 && isOurApi && !isAuthRoute) endDeadSession();
      // The server hands back a signed replacement for a still-valid legacy token, so
      // users migrate silently instead of being logged out at the cutover. Only the
      // access token changes; the rest of the stored session is left alone.
      const upgraded = isOurApi ? response.headers.get('X-Session-Upgrade') : null;
      if (upgraded) {
        setSession(current => {
          if (!current || current.accessToken === upgraded) return current;
          const next = { ...current, accessToken: upgraded };
          try {
            const stored = JSON.parse(localStorage.getItem('nz_auth') || 'null');
            if (stored?.session) localStorage.setItem('nz_auth', JSON.stringify({ ...stored, session: next }));
          } catch { /* a damaged store shouldn't break the request */ }
          return next;
        });
      }
      return response;
    };
    return () => { window.fetch = original; };
  }, [endDeadSession]);

  const refreshUser = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const data = await res.json() as any;
      if (data.user) {
        const userWithSession = { ...data.user, session };
        setUser(userWithSession);
        localStorage.setItem('nz_auth', JSON.stringify({ user: userWithSession, session }));
      }
    } catch { /* ignore */ }
  }, [session]);

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signIn, signUp, logout, refreshUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function authHeaders(session: Session | null): Record<string, string> {
  return session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export { authHeaders };
