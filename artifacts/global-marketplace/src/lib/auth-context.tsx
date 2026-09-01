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
  signIn: (phone: string, password: string) => Promise<{ error?: string }>;
  signUp: (phone: string, name: string, role: 'buyer' | 'seller', password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bd75c998.nzanila-api.pages.dev');

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
        .catch(() => { logout(); });
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
        .catch(() => { logout(); });
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
