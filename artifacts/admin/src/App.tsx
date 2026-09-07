import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Route, Switch, Link, useLocation, useParams } from 'wouter';
import {
  ShieldCheck, Users, LayoutDashboard, LogOut, Search, Check, X, AlertTriangle,
  FileText, ExternalLink, Store, Clock, Ban, ChevronLeft, Package, MapPin, Phone, KeyRound, Copy,
  Bell, Inbox, RefreshCw, ArrowRight, ShoppingCart, Tag, Boxes, TrendingUp, Star, Image,
} from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';
const TOKEN_KEY = 'nz_admin_token';

const token = () => localStorage.getItem(TOKEN_KEY) || '';
const authHeaders = (json = false): Record<string, string> => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${token()}`,
});

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { ...authHeaders(init?.method != null), ...(init?.headers || {}) } });
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error('Session expired');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as any)?.error || 'Request failed');
  return data as T;
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  suspended: 'bg-gray-200 text-gray-700 ring-gray-300',
  not_submitted: 'bg-gray-50 text-gray-500 ring-gray-200',
};
const STATUS_LABELS: Record<string, string> = {
  approved: 'Verified', pending: 'Awaiting review', rejected: 'Needs changes',
  suspended: 'Suspended', not_submitted: 'Not submitted',
};

function StatusBadge({ status }: { status?: string }) {
  const key = String(status || 'not_submitted');
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLES[key] || STATUS_STYLES.not_submitted}`}>
    {STATUS_LABELS[key] || key}
  </span>;
}

const DOC_LABELS: Record<string, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  trade_licence: 'Trade licence',
  bank_statement: 'Bank statement',
  business_registration: 'Business registration',
  tax_certificate: 'Tax certificate',
  proof_of_address: 'Proof of address',
  other: 'Other document',
};

/**
 * Stored numbers are bare (25762090901); show them as +257 62 090 901.
 * Grouping matches seller-central and the buyer app so one number never renders
 * three different ways across the three apps.
 */
function formatPhone(value?: string) {
  const raw = String(value ?? '').trim();
  // Accounts created without a phone carry a "user_..." placeholder, not a number.
  if (!raw || raw.startsWith('user_')) return '—';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '—';
  const local = digits.startsWith('257') ? digits.slice(3) : digits.length === 8 ? digits : '';
  if (local.length === 8) return `+257 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}

const money = (value: unknown) => `${Math.round(Number(value) || 0).toLocaleString()} BIF`;

const ORDER_STATUS_STYLES: Record<string, string> = {
  processing: 'bg-sky-50 text-sky-700 ring-sky-200',
  confirmed: 'bg-sky-50 text-sky-700 ring-sky-200',
  preparing: 'bg-amber-50 text-amber-700 ring-amber-200',
  ready: 'bg-amber-50 text-amber-700 ring-amber-200',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  out_for_delivery: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
};

function OrderStatusBadge({ status }: { status?: string }) {
  const key = String(status || '').toLowerCase();
  const label = key.replace(/_/g, ' ') || 'unknown';
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ${ORDER_STATUS_STYLES[key] || 'bg-gray-50 text-gray-600 ring-gray-200'}`}>
    {label}
  </span>;
}

/** Tab strip shared by every queue page, so filters look and behave the same everywhere. */
function Tabs({ tabs, value, onChange }: {
  tabs: readonly (readonly [string, string])[]; value: string; onChange: (next: string) => void;
}) {
  return <div className="mt-5 flex flex-wrap gap-2">
    {tabs.map(([key, label]) => <button key={key} onClick={() => onChange(key)}
      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${value === key ? 'bg-[#0f172a] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
      {label}
    </button>)}
  </div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
    <Search size={15} className="text-gray-400" />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full text-sm outline-none" />
    {value && <button onClick={() => onChange('')} aria-label="Clear search" className="text-gray-400 hover:text-gray-700"><X size={14} /></button>}
  </label>;
}

function EmptyState({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return <div className="px-5 py-14 text-center">
    <Icon size={34} className="mx-auto text-gray-300" />
    <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
    <p className="mt-1 text-xs text-gray-500">{text}</p>
  </div>;
}

function timeAgo(value?: string) {
  if (!value) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

// ---------------------------------------------------------------- Live queues

const SEEN_KEY = 'nz_admin_seen_at';

/** One incoming item, whichever queue it came from. */
type AlertItem = {
  key: string;
  kind: 'verification' | 'reset' | 'product';
  title: string;
  detail: string;
  at?: string;
  href: string;
};

type Alerts = {
  stats: any;
  verifications: any[];
  resets: any[];
  products: any[];
  items: AlertItem[];
  unseen: number;
  markSeen: () => void;
  refresh: () => void;
  loading: boolean;
  error: string;
};

const AlertsContext = createContext<Alerts | null>(null);
const useAlerts = () => useContext(AlertsContext);

/**
 * Polls the two queues that need a human — seller verifications and password recovery
 * requests — so the sidebar, the bell and the dashboard all read from one fetch instead
 * of three components polling the same endpoints on their own timers.
 */
function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [resets, setResets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seenAt, setSeenAt] = useState(() => localStorage.getItem(SEEN_KEY) || '');

  const refresh = useCallback(() => {
    Promise.all([
      api<any>('/api/admin/stats').catch(() => null),
      api<any>('/api/admin/users?role=seller&status=pending').catch(() => null),
      api<any>('/api/admin/password-resets?status=open').catch(() => null),
      api<any>('/api/admin/products?status=pending_review').catch(() => null),
    ]).then(([statsData, usersData, resetsData, productsData]) => {
      if (statsData) setStats(statsData);
      if (usersData) setVerifications(usersData.users || []);
      if (resetsData) setResets(resetsData.requests || []);
      if (productsData) setProducts(productsData.products || []);
      // Every call failing means the session or the network is gone, not an empty queue.
      setError(!statsData && !usersData && !resetsData && !productsData ? 'Could not reach the server. Retrying…' : '');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 20000);
    // A tab left open overnight is stale the moment it is looked at again.
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const items = useMemo<AlertItem[]>(() => {
    const merged: AlertItem[] = [
      ...resets.map(row => ({
        key: `reset-${row.id}`,
        kind: 'reset' as const,
        title: row.user?.business_name || row.user?.name || row.full_name || 'Unknown person',
        detail: row.user ? 'Locked out — asking for a new password' : 'Locked out — no account for this number',
        at: row.created_at,
        href: '/password-resets',
      })),
      ...verifications.map(user => ({
        key: `verification-${user.id}`,
        kind: 'verification' as const,
        title: user.business_name || user.name || 'Seller',
        detail: 'Submitted documents for verification',
        at: user.verification_submitted_at || user.created_at,
        href: `/verifications/${user.id}`,
      })),
      ...products.map(product => ({
        key: `product-${product.id}`,
        kind: 'product' as const,
        title: product.name || 'Listing',
        detail: `New listing awaiting review${product.store?.name ? ` · ${product.store.name}` : ''}`,
        at: product.created_at,
        href: '/products',
      })),
    ];
    return merged.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  }, [resets, verifications, products]);

  const unseen = useMemo(() => {
    if (!seenAt) return items.length;
    const cutoff = new Date(seenAt).getTime();
    return items.filter(item => new Date(item.at || 0).getTime() > cutoff).length;
  }, [items, seenAt]);

  const markSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY, now);
    setSeenAt(now);
  }, []);

  const value = useMemo<Alerts>(
    () => ({ stats, verifications, resets, products, items, unseen, markSeen, refresh, loading, error }),
    [stats, verifications, resets, products, items, unseen, markSeen, refresh, loading, error],
  );
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

function AlertIcon({ kind }: { kind: AlertItem['kind'] }) {
  if (kind === 'reset') return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><KeyRound size={16} /></span>;
  if (kind === 'product') return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><Tag size={16} /></span>;
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600"><ShieldCheck size={16} /></span>;
}

// ---------------------------------------------------------------- Modal

/**
 * In-app dialog, replacing window.confirm/window.prompt. Native dialogs freeze the whole
 * browser tab, cannot be styled or translated, and are silently suppressed in some
 * embedded webviews — which would let a destructive action fire with no prompt at all.
 */
function Modal({ title, description, onClose, children }: {
  title: string; description?: string; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Stop the page behind scrolling while the dialog owns the screen.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title}
      className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        <button onClick={onClose} aria-label="Close"
          className="-mr-1.5 -mt-1.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X size={17} />
        </button>
      </div>
      {children}
    </div>
  </div>;
}

type ConfirmSpec = {
  title: string;
  description?: string;
  /** Rendered above the note field — the detail the admin has to actually read. */
  body?: React.ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  note?: { label: string; placeholder?: string; required?: boolean };
  onConfirm: (note: string) => Promise<void> | void;
};

/** Renders `spec` as a dialog; pass null to close. Errors are shown inside the dialog. */
function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // A fresh dialog must never inherit the previous one's half-typed note.
  useEffect(() => { setNote(''); setError(''); setBusy(false); }, [spec]);

  if (!spec) return null;
  const tone = spec.tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-[#0f172a] hover:bg-[#1e293b]';

  const confirm = async () => {
    if (spec.note?.required && !note.trim()) { setError('Please write a reason — the person is told this.'); return; }
    setBusy(true); setError('');
    try {
      await spec.onConfirm(note.trim());
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not work. Try again.');
      setBusy(false);
    }
  };

  return <Modal title={spec.title} description={spec.description} onClose={busy ? () => {} : onClose}>
    {spec.body && <div className="mt-4">{spec.body}</div>}
    {spec.note && <label className="mt-4 block text-[13px] font-semibold text-gray-700">
      {spec.note.label}{!spec.note.required && <span className="font-normal text-gray-400"> (optional)</span>}
      <textarea value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={2000} autoFocus
        placeholder={spec.note.placeholder}
        className="mt-1.5 w-full resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f172a]" />
    </label>}
    {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} disabled={busy}
        className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
        Cancel
      </button>
      <button onClick={confirm} disabled={busy}
        className={`rounded-lg px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 ${tone}`}>
        {busy ? 'Working…' : spec.confirmLabel}
      </button>
    </div>
  </Modal>;
}

// ---------------------------------------------------------------- Login

function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not sign in');
      localStorage.setItem(TOKEN_KEY, data.token);
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in');
    } finally { setBusy(false); }
  };

  return <div className="grid min-h-screen place-items-center bg-[#0f172a] p-4">
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f172a] text-white"><ShieldCheck size={20} /></span>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Nzanila Admin</h1>
          <p className="text-xs text-gray-500">Staff access only</p>
        </div>
      </div>
      <label className="block text-[13px] font-semibold text-gray-700">Phone number
        <input value={phone} onChange={e => setPhone(e.target.value)} autoComplete="username" required
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f172a]" />
      </label>
      <label className="mt-4 block text-[13px] font-semibold text-gray-700">Password
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f172a]" />
      </label>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="mt-5 w-full rounded-lg bg-[#0f172a] py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  </div>;
}

// ---------------------------------------------------------------- Shell

function NotificationBell() {
  const alerts = useAlerts();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!alerts) return null;
  const unseen = alerts.unseen;

  const toggle = () => {
    setOpen(value => {
      // Opening the panel is what counts as having looked at the queue.
      if (!value) alerts.markSeen();
      return !value;
    });
  };

  return <div className="relative">
    <button onClick={toggle} aria-label={`Notifications${unseen ? `, ${unseen} new` : ''}`}
      className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900">
      <Bell size={18} />
      {unseen > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
        {unseen > 9 ? '9+' : unseen}
      </span>}
    </button>

    {open && <>
      <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
      <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-bold text-gray-900">Waiting for you</p>
          <button onClick={() => alerts.refresh()} aria-label="Refresh"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><RefreshCw size={14} /></button>
        </div>
        {!alerts.items.length
          ? <div className="px-4 py-10 text-center">
              <Inbox size={28} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-900">All clear</p>
              <p className="mt-0.5 text-xs text-gray-500">No requests waiting.</p>
            </div>
          : <ul className="max-h-[26rem] divide-y divide-gray-100 overflow-y-auto">
              {alerts.items.slice(0, 15).map(item => <li key={item.key}>
                <Link href={item.href} onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-gray-50">
                  <AlertIcon kind={item.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-gray-900">{item.title}</p>
                    <p className="truncate text-xs text-gray-500">{item.detail}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{timeAgo(item.at)}</p>
                  </div>
                </Link>
              </li>)}
            </ul>}
        {alerts.items.length > 15 && <p className="border-t border-gray-100 px-4 py-2 text-center text-[11px] text-gray-400">
          Showing 15 of {alerts.items.length}.
        </p>}
      </div>
    </>}
  </div>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const alerts = useAlerts();
  // Grouped: the review queues an admin works through daily, then the reference sections.
  const navGroups = [
    { title: '', items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard, count: 0 },
    ] },
    { title: 'Needs review', items: [
      { href: '/verifications', label: 'Verifications', icon: ShieldCheck, count: alerts?.verifications.length || 0 },
      { href: '/products', label: 'Listings', icon: Tag, count: alerts?.products.length || 0 },
      { href: '/password-resets', label: 'Password resets', icon: KeyRound, count: alerts?.resets.length || 0 },
    ] },
    { title: 'Marketplace', items: [
      { href: '/orders', label: 'Orders', icon: ShoppingCart, count: 0 },
      { href: '/stores', label: 'Stores', icon: Store, count: 0 },
      { href: '/users', label: 'Users', icon: Users, count: 0 },
    ] },
  ];
  const nav = navGroups.flatMap(group => group.items);
  const signOut = () => { localStorage.removeItem(TOKEN_KEY); window.location.reload(); };

  return <div className="flex min-h-screen bg-[#f6f7f9]">
    <aside className="hidden w-56 shrink-0 flex-col bg-[#0f172a] p-4 text-white md:flex">
      <div className="mb-7 flex items-center gap-2 px-1">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"><ShieldCheck size={17} /></span>
        <span className="text-sm font-bold">Nzanila Admin</span>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto">
        {navGroups.map(group => <div key={group.title || 'main'} className="space-y-1">
          {group.title && <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{group.title}</p>}
          {group.items.map(item => {
          const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${active ? 'bg-white text-[#0f172a]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
            <Icon size={16} /> <span className="flex-1">{item.label}</span>
            {item.count > 0 && <span className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-[#0f172a] text-white' : 'bg-amber-400 text-[#0f172a]'}`}>
              {item.count}
            </span>}
          </Link>;
          })}
        </div>)}
      </nav>
      <button onClick={signOut} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/60 hover:bg-white/10 hover:text-white">
        <LogOut size={16} /> Sign out
      </button>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <span className="text-sm font-bold md:hidden">Nzanila Admin</span>
        <nav className="flex flex-wrap gap-1 md:hidden">
          {nav.map(item => <Link key={item.href} href={item.href}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
            {item.label}
            {item.count > 0 && <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#0f172a]">{item.count}</span>}
          </Link>)}
        </nav>
        <span className="hidden text-sm font-semibold text-gray-500 md:inline">
          {alerts && (alerts.items.length
            ? `${alerts.items.length} request${alerts.items.length === 1 ? '' : 's'} waiting`
            : 'Nothing waiting')}
        </span>
        <NotificationBell />
      </div>
      <main className="min-w-0 flex-1 p-4 md:p-7">{children}</main>
    </div>
  </div>;
}

// ---------------------------------------------------------------- Overview

function QueueCard({ title, subtitle, items, emptyText, href, linkText, render }: {
  title: string; subtitle: string; items: any[]; emptyText: string;
  href: string; linkText: string; render: (item: any) => React.ReactNode;
}) {
  return <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      </div>
      {items.length > 0 && <span className="grid h-6 min-w-[24px] shrink-0 place-items-center rounded-full bg-amber-400 px-2 text-xs font-bold text-[#0f172a]">
        {items.length}
      </span>}
    </div>
    {!items.length
      ? <p className="px-5 py-10 text-center text-sm text-gray-500">{emptyText}</p>
      : <ul className="divide-y divide-gray-100">{items.slice(0, 5).map(render)}</ul>}
    <Link href={href} className="flex items-center justify-center gap-1.5 border-t border-gray-100 px-5 py-3 text-xs font-bold text-[#0f172a] hover:bg-gray-50">
      {linkText} <ArrowRight size={13} />
    </Link>
  </section>;
}

function Overview() {
  const alerts = useAlerts();
  const stats = alerts?.stats;
  const resets = alerts?.resets || [];
  const verifications = alerts?.verifications || [];
  const products = alerts?.products || [];
  const waiting = resets.length + verifications.length + products.length;

  const cards = [
    { label: 'Sellers awaiting review', value: stats?.pendingVerifications, accent: true, href: '/verifications' },
    { label: 'Listings awaiting review', value: stats?.pendingProducts ?? products.length, accent: true, href: '/products' },
    { label: 'Password requests', value: stats?.openPasswordResets ?? resets.length, accent: true, href: '/password-resets' },
    { label: 'Revenue', value: stats ? money(stats.revenue) : undefined, sub: 'excluding cancelled', href: '/orders' },
    { label: 'Orders', value: stats?.orders, sub: `${stats?.activeOrders ?? 0} in progress`, href: '/orders' },
    { label: 'Sellers', value: stats?.sellers, sub: `${stats?.verifiedSellers ?? 0} verified`, href: '/users' },
    { label: 'Buyers', value: stats?.buyers, sub: `${stats?.verifiedBuyers ?? 0} verified`, href: '/users' },
    { label: 'Stores', value: stats?.stores, href: '/stores' },
    { label: 'Products', value: stats?.products, href: '/products' },
  ];

  return <div>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Live marketplace activity. Refreshes every 20 seconds.</p>
      </div>
      <button onClick={() => alerts?.refresh()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
        <RefreshCw size={13} /> Refresh
      </button>
    </div>

    {alerts?.error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{alerts.error}</p>}

    <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${waiting ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${waiting ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
        {waiting ? <Bell size={17} /> : <Check size={17} />}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${waiting ? 'text-amber-900' : 'text-emerald-900'}`}>
          {waiting
            ? `${waiting} request${waiting === 1 ? '' : 's'} waiting for you`
            : 'Nothing is waiting for you'}
        </p>
        <p className={`mt-0.5 text-xs ${waiting ? 'text-amber-800' : 'text-emerald-800'}`}>
          {waiting
            ? `${verifications.length} verification${verifications.length === 1 ? '' : 's'} · ${products.length} listing${products.length === 1 ? '' : 's'} · ${resets.length} password request${resets.length === 1 ? '' : 's'}`
            : 'Every queue is clear.'}
        </p>
      </div>
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(card => {
        const body = <>
          <p className="text-xs font-semibold text-gray-500">{card.label}</p>
          <p className={`mt-2 font-bold ${typeof card.value === 'string' ? 'text-2xl' : 'text-3xl'} ${card.accent && card.value ? 'text-amber-600' : 'text-gray-900'}`}>
            {stats ? card.value ?? 0 : '…'}
          </p>
          {card.sub && <p className="mt-1 text-xs text-gray-400">{card.sub}</p>}
        </>;
        return card.href
          ? <Link key={card.label} href={card.href} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300">{body}</Link>
          : <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">{body}</div>;
      })}
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <QueueCard
        title="Password requests" subtitle="People locked out of their account"
        items={resets} emptyText="No one is locked out." href="/password-resets" linkText="Open password resets"
        render={row => <li key={row.id}>
          <Link href="/password-resets" className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-gray-50">
            <AlertIcon kind="reset" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-gray-900">{row.user?.business_name || row.user?.name || row.full_name || 'Unknown person'}</p>
              <p className="truncate text-xs text-gray-500">{formatPhone(row.phone)} · {row.documentCount} document{row.documentCount === 1 ? '' : 's'} on file</p>
            </div>
            <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(row.created_at)}</span>
          </Link>
        </li>} />

      <QueueCard
        title="Listings awaiting review" subtitle="Products sellers submitted, not yet visible to buyers"
        items={products} emptyText="No listings waiting." href="/products" linkText="Open listings"
        render={product => <li key={product.id}>
          <Link href="/products" className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-gray-50">
            <AlertIcon kind="product" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-gray-900">{product.name}</p>
              <p className="truncate text-xs text-gray-500">{money(product.base_price)}{product.store?.name ? ` · ${product.store.name}` : ''}</p>
            </div>
            <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(product.created_at)}</span>
          </Link>
        </li>} />

      <QueueCard
        title="Seller verifications" subtitle="Documents submitted, awaiting a decision"
        items={verifications} emptyText="No sellers awaiting review." href="/verifications" linkText="Open verifications"
        render={user => <li key={user.id}>
          <Link href={`/verifications/${user.id}`} className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-gray-50">
            <AlertIcon kind="verification" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-gray-900">{user.business_name || user.name || 'Seller'}</p>
              <p className="truncate text-xs text-gray-500">{formatPhone(user.phone)}{user.location ? ` · ${user.location}` : ''}</p>
            </div>
            <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(user.verification_submitted_at)}</span>
          </Link>
        </li>} />
    </div>
  </div>;
}

// ---------------------------------------------------------------- Verifications

function VerificationQueue() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const query = status === 'all' ? '?role=seller' : `?role=seller&status=${status}`;
    api<any>(`/api/admin/users${query}`)
      .then(d => { setRows(d.users || []); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const tabs = [['pending', 'Awaiting review'], ['approved', 'Verified'], ['rejected', 'Needs changes'], ['suspended', 'Suspended'], ['all', 'All sellers']] as const;

  return <div>
    <h1 className="text-2xl font-bold text-gray-900">Seller verifications</h1>
    <p className="mt-1 text-sm text-gray-500">Review submitted documents, then approve or ask for changes.</p>
    <div className="mt-5 flex flex-wrap gap-2">
      {tabs.map(([value, label]) => <button key={value} onClick={() => setStatus(value)}
        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${status === value ? 'bg-[#0f172a] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
        {label}
      </button>)}
    </div>
    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {loading ? <p className="px-5 py-12 text-center text-sm text-gray-500">Loading…</p>
        : !rows.length ? <div className="px-5 py-14 text-center">
            <ShieldCheck size={34} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Nothing here</p>
            <p className="mt-1 text-xs text-gray-500">No sellers with this status.</p>
          </div>
        : <ul className="divide-y divide-gray-100">
            {rows.map(user => <li key={user.id}>
              <Link href={`/verifications/${user.id}`} className="flex flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-gray-50 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{user.business_name || user.name || 'Seller'}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{user.name} · {formatPhone(user.phone)}{user.location ? ` · ${user.location}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  {user.verification_submitted_at && <span className="hidden items-center gap-1 text-xs text-gray-400 sm:flex"><Clock size={12} />{timeAgo(user.verification_submitted_at)}</span>}
                  <StatusBadge status={user.verification_status} />
                </div>
              </Link>
            </li>)}
          </ul>}
    </div>
  </div>;
}

function VerificationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<any>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  const load = useCallback(() => {
    api<any>(`/api/admin/verifications/${id}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  /**
   * `noteOverride` comes from the confirm dialog, whose own note field is the one the
   * admin filled in; without it a suspension would be judged against the empty textarea
   * still sitting on the page behind the dialog.
   */
  const decide = async (decision: 'approved' | 'rejected' | 'suspended', noteOverride?: string) => {
    const text = (noteOverride ?? note).trim();
    if (decision !== 'approved' && !text) {
      setError('Write a note explaining what the seller needs to do.');
      return;
    }
    setBusy(decision); setError('');
    try {
      await api(`/api/admin/verifications/${id}/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: text }),
      });
      setDone(decision); setNote(''); load();
    } catch (cause) {
      // Rethrown so a dialog can show the failure in place and stay open; the page-level
      // buttons rely on the error state set here instead.
      setError(cause instanceof Error ? cause.message : 'Could not save the decision');
      throw cause;
    } finally { setBusy(''); }
  };

  if (error && !data) return <div>
    <Link href="/verifications" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"><ChevronLeft size={15} />Back</Link>
    <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
  </div>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const user = data.user || {};
  const documents: any[] = data.documents || [];
  const history: any[] = data.history || [];
  const stores: any[] = data.stores || [];
  const products: any[] = data.products || [];
  const money = (value: number) => `${Math.round(Number(value) || 0).toLocaleString()} BIF`;

  return <div className="mx-auto max-w-5xl">
    <Link href="/verifications" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"><ChevronLeft size={15} />Back to queue</Link>

    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900">{user.business_name || user.name || 'Seller'}</h1>
        <p className="mt-1 text-sm text-gray-500">{user.name} · {formatPhone(user.phone)}{user.location ? ` · ${user.location}` : ''}</p>
      </div>
      <StatusBadge status={user.verification_status} />
    </div>

    {done && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      Decision saved — the seller has been notified.
    </p>}

    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {user.verification_submission_note && <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">What the seller told us</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{user.verification_submission_note}</p>
        </section>}

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Submitted documents</h2>
            <span className="text-xs text-gray-400">{documents.length} file{documents.length === 1 ? '' : 's'}</span>
          </div>
          {!documents.length
            ? <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle size={15} className="mr-1.5 inline" />
                No documents uploaded yet. Not every business holds the same paperwork — check the note above before refusing.
              </div>
            : <ul className="mt-4 space-y-3">
                {documents.map(doc => <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500"><FileText size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{DOC_LABELS[doc.doc_type] || doc.doc_type}</p>
                    <p className="truncate text-xs text-gray-500">{doc.file_name || 'file'} · {timeAgo(doc.uploaded_at)}</p>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                    View <ExternalLink size={12} />
                  </a>
                </li>)}
              </ul>}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Stores</h2>
            <span className="text-xs text-gray-400">{stores.length}</span>
          </div>
          {!stores.length
            ? <p className="mt-3 text-sm text-gray-500">This seller has no storefront yet.</p>
            : <ul className="mt-3 space-y-3">
                {stores.map(store => <li key={store.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500"><Store size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{store.name}</p>
                    {store.description && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{store.description}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      {(store.commune || store.province) && <span className="inline-flex items-center gap-1"><MapPin size={11} />{[store.commune, store.province].filter(Boolean).join(', ')}</span>}
                      <span className={store.is_verified ? 'text-emerald-600' : 'text-gray-400'}>{store.is_verified ? 'Storefront verified' : 'Storefront not verified'}</span>
                    </p>
                  </div>
                  <a href={store.url} target="_blank" rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                    Visit <ExternalLink size={12} />
                  </a>
                </li>)}
              </ul>}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Products</h2>
            <span className="text-xs text-gray-400">{products.length}{products.length === 60 ? '+' : ''}</span>
          </div>
          {!products.length
            ? <p className="mt-3 text-sm text-gray-500">No products listed yet.</p>
            : <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {products.slice(0, 12).map(product => <li key={product.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2.5">
                  {product.image
                    ? <img src={product.image} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 object-cover" />
                    : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-400"><Package size={16} /></span>}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-gray-900">{product.name}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">{money(product.price)} · {product.stock} in stock</p>
                  </div>
                </li>)}
              </ul>}
          {products.length > 12 && <p className="mt-3 text-xs text-gray-400">Showing 12 of {products.length}.</p>}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Decision</h2>
          <p className="mt-1 text-xs text-gray-500">Your note is sent to the seller. Required when refusing or suspending — tell them exactly what to fix.</p>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} maxLength={2000}
            placeholder="e.g. The national ID photo is blurred at the edges — please re-upload a clear photo showing all four corners."
            className="mt-3 w-full resize-y rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0f172a]" />
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => { void decide('approved').catch(() => {}); }} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              <Check size={14} />{busy === 'approved' ? 'Saving…' : 'Approve & verify'}
            </button>
            <button onClick={() => { void decide('rejected').catch(() => {}); }} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              <X size={14} />{busy === 'rejected' ? 'Saving…' : 'Ask for changes'}
            </button>
            <button onClick={() => setConfirm({
              title: 'Suspend this seller?',
              description: 'They cannot trade until an admin reinstates them.',
              body: <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {user.business_name || user.name || 'This seller'} · {formatPhone(user.phone)}
              </p>,
              confirmLabel: 'Suspend account',
              tone: 'danger',
              note: { label: 'Why are you suspending them?', placeholder: 'The seller is shown this reason.', required: true },
              onConfirm: text => decide('suspended', text),
            })} disabled={!!busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <Ban size={14} />{busy === 'suspended' ? 'Saving…' : 'Suspend'}
            </button>
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Account</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Contact</dt><dd className="text-right text-gray-900">{user.name || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Phone</dt><dd className="text-right"><a href={`tel:+${String(user.phone || '').replace(/\D/g, '')}`} className="font-medium text-gray-900 hover:underline">{formatPhone(user.phone)}</a></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Location</dt><dd className="text-right text-gray-900">{[user.location, user.province].filter(Boolean).join(', ') || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Verified</dt><dd className="font-semibold text-gray-900">{user.verified ? 'Yes' : 'No'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Submitted</dt><dd className="text-gray-900">{timeAgo(user.verification_submitted_at)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Last review</dt><dd className="text-gray-900">{timeAgo(user.verification_reviewed_at)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Joined</dt><dd className="text-gray-900">{timeAgo(user.created_at)}</dd></div>
          </dl>
          {user.business_description && <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">About the business</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-gray-700">{user.business_description}</p>
          </div>}
          {user.verification_note && <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Last note sent</p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-gray-700">{user.verification_note}</p>
          </div>}
        </section>

        {!!history.length && <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Review history</h2>
          <ul className="mt-3 space-y-3">
            {history.map(entry => <li key={entry.id} className="border-l-2 border-gray-200 pl-3">
              <p className="text-xs font-semibold text-gray-900">{STATUS_LABELS[entry.decision] || entry.decision}</p>
              <p className="text-[11px] text-gray-400">{timeAgo(entry.created_at)}</p>
              {entry.note && <p className="mt-1 text-xs text-gray-600">{entry.note}</p>}
            </li>)}
          </ul>
        </section>}
      </aside>
    </div>

    <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
  </div>;
}

// ---------------------------------------------------------------- Catalogue

function ProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('pending_review');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const alerts = useAlerts();

  const load = useCallback(() => {
    setLoading(true);
    api<any>(`/api/admin/products?status=${status}`)
      .then(d => { setRows(d.products || []); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? rows.filter(r => `${r.name || ''} ${r.brand || ''} ${r.seller?.name || ''} ${r.store?.name || ''}`.toLowerCase().includes(search))
      : rows;
  }, [rows, query]);

  const decide = async (row: any, decision: 'approved' | 'rejected', note: string) => {
    setBusy(row.id); setError('');
    try {
      await api(`/api/admin/products/${row.id}/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note }),
      });
      setRows(old => old.filter(r => r.id !== row.id));
      // The dashboard count comes from the same queue, so refresh it too.
      alerts?.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the decision');
      throw cause;
    } finally { setBusy(null); }
  };

  const listingSummary = (row: any) => <div className="space-y-2">
    <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
      {row.name} · {money(row.base_price)}
      {row.store?.name ? <span className="text-gray-500"> · {row.store.name}</span> : null}
    </p>
  </div>;

  const askApprove = (row: any) => setConfirm({
    title: 'Approve this listing?',
    description: 'It becomes visible to buyers straight away.',
    body: listingSummary(row),
    confirmLabel: 'Approve listing',
    tone: 'primary',
    onConfirm: () => decide(row, 'approved', ''),
  });

  const askReject = (row: any) => setConfirm({
    title: 'Ask for changes?',
    description: 'The listing stays hidden and the seller is told why.',
    body: listingSummary(row),
    confirmLabel: 'Refuse listing',
    tone: 'danger',
    note: { label: 'What does the seller need to fix?', placeholder: 'e.g. The photo shows a different product than the title describes.', required: true },
    onConfirm: note => decide(row, 'rejected', note),
  });

  const tabs = [['pending_review', 'Awaiting review'], ['approved', 'Live'], ['rejected', 'Refused'], ['all', 'All listings']] as const;

  return <div>
    <h1 className="text-2xl font-bold text-gray-900">Product listings</h1>
    <p className="mt-1 text-sm text-gray-500">Sellers submit listings here before buyers can see them.</p>

    <Tabs tabs={tabs} value={status} onChange={setStatus} />
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <SearchBox value={query} onChange={setQuery} placeholder="Search listing, brand, seller or store" />
      <span className="text-xs text-gray-500">{visible.length} listing{visible.length === 1 ? '' : 's'}</span>
    </div>

    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {loading ? <p className="px-5 py-12 text-center text-sm text-gray-500">Loading…</p>
        : !visible.length ? <EmptyState icon={Tag} title="Nothing here"
            text={status === 'pending_review' ? 'No listings are waiting for review.' : 'No listings with this status.'} />
        : <ul className="divide-y divide-gray-100">
            {visible.map(row => <li key={row.id} className="flex flex-wrap items-start gap-4 px-4 py-4 sm:px-5">
              {row.primary_image
                ? <img src={row.primary_image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 object-cover" />
                : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-400"><Image size={20} /></span>}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{row.name}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {money(row.base_price)}
                  {row.compare_at_price ? <span className="ml-1.5 text-gray-400 line-through">{money(row.compare_at_price)}</span> : null}
                  {' · '}{row.stock_quantity ?? 0} in stock
                  {row.brand ? ` · ${row.brand}` : ''}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1"><Store size={11} />{row.store?.name || 'No store'}</span>
                  <span className="inline-flex items-center gap-1"><Users size={11} />{row.seller?.business_name || row.seller?.name || 'Unknown seller'}</span>
                  {row.seller?.verified && <span className="text-emerald-600">seller verified</span>}
                  <span className="inline-flex items-center gap-1"><Clock size={11} />{timeAgo(row.created_at)}</span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={row.status === 'pending_review' ? 'pending' : row.status === 'approved' ? 'approved' : 'rejected'} />
                {row.status === 'pending_review' && <div className="flex gap-2">
                  <button onClick={() => askApprove(row)} disabled={busy === row.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Check size={13} />{busy === row.id ? '…' : 'Approve'}
                  </button>
                  <button onClick={() => askReject(row)} disabled={busy === row.id}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Refuse
                  </button>
                </div>}
              </div>
            </li>)}
          </ul>}
    </div>

    <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
  </div>;
}

// ---------------------------------------------------------------- Orders

function OrdersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api<any>(`/api/admin/orders?status=${status}`)
      .then(d => { setRows(d.orders || []); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? rows.filter(r => `${r.id} ${r.buyer_name || ''} ${r.buyer?.name || ''} ${r.destination || ''}`.toLowerCase().includes(search))
      : rows;
  }, [rows, query]);

  // Cancelled orders never took money, so they are excluded from the running total.
  const revenue = useMemo(
    () => visible.filter(r => String(r.status) !== 'cancelled').reduce((sum, r) => sum + Number(r.total || 0), 0),
    [visible],
  );

  const tabs = [['all', 'All'], ['processing', 'Processing'], ['ready', 'Ready'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']] as const;

  return <div>
    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
    <p className="mt-1 text-sm text-gray-500">Every order placed on the marketplace.</p>

    <Tabs tabs={tabs} value={status} onChange={setStatus} />
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <SearchBox value={query} onChange={setQuery} placeholder="Search order number, buyer or destination" />
      <span className="text-xs text-gray-500">{visible.length} order{visible.length === 1 ? '' : 's'} · {money(revenue)} excluding cancelled</span>
    </div>

    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {loading ? <p className="px-5 py-12 text-center text-sm text-gray-500">Loading…</p>
        : !visible.length ? <EmptyState icon={ShoppingCart} title="No orders" text="No orders match this filter." />
        : <ul className="divide-y divide-gray-100">
            {visible.map(row => <li key={row.id}>
              <Link href={`/orders/${row.id}`} className="flex flex-wrap items-center gap-3 px-4 py-4 transition hover:bg-gray-50 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">
                    Order #{row.id}
                    <span className="ml-2 font-normal text-gray-500">{row.buyer?.name || row.buyer_name || 'Guest'}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {row.item_count ?? 0} item{Number(row.item_count) === 1 ? '' : 's'} · {row.destination || 'No destination'}
                    {row.fulfillment_method ? ` · ${String(row.fulfillment_method).replace(/_/g, ' ')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-gray-400 sm:inline">{timeAgo(row.date)}</span>
                  <span className="text-sm font-bold text-gray-900">{money(row.total)}</span>
                  <OrderStatusBadge status={row.status} />
                </div>
              </Link>
            </li>)}
          </ul>}
    </div>
  </div>;
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<any>(`/api/admin/orders/${id}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [id]);

  if (error) return <div>
    <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"><ChevronLeft size={15} />Back to orders</Link>
    <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
  </div>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const order = data.order || {};
  const items: any[] = data.items || [];
  const buyer = data.buyer;
  const shipping = data.shipping;
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);

  return <div className="mx-auto max-w-4xl">
    <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline"><ChevronLeft size={15} />Back to orders</Link>

    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
        <p className="mt-1 text-sm text-gray-500">Placed {timeAgo(order.date)} · {money(order.total)}</p>
      </div>
      <OrderStatusBadge status={order.status} />
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Items</h2>
          <span className="text-xs text-gray-400">{items.length} line{items.length === 1 ? '' : 's'}</span>
        </div>
        {!items.length
          ? <p className="mt-3 text-sm text-gray-500">This order has no recorded line items.</p>
          : <ul className="mt-4 divide-y divide-gray-100">
              {items.map(item => <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.product_name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.quantity} × {money(item.unit_price)}
                    {item.supplier_name ? ` · ${item.supplier_name}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900">
                  {money(Number(item.unit_price || 0) * Number(item.quantity || 0))}
                </span>
              </li>)}
            </ul>}

        <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-gray-500">Items</dt><dd className="text-gray-900">{money(itemsTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Shipping</dt><dd className="text-gray-900">{money(order.shipping_fee)}</dd></div>
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold">
            <dt className="text-gray-900">Total</dt><dd className="text-gray-900">{money(order.total)}</dd>
          </div>
        </dl>
      </section>

      <aside className="space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Buyer</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Name</dt><dd className="text-right text-gray-900">{buyer?.name || order.buyer_name || 'Guest'}</dd></div>
            {buyer?.phone && <div className="flex justify-between gap-3"><dt className="text-gray-500">Phone</dt>
              <dd className="text-right"><a href={`tel:+${String(buyer.phone).replace(/\D/g, '')}`} className="font-medium text-gray-900 hover:underline">{formatPhone(buyer.phone)}</a></dd></div>}
            {buyer?.location && <div className="flex justify-between gap-3"><dt className="text-gray-500">Location</dt><dd className="text-right text-gray-900">{buyer.location}</dd></div>}
            {buyer?.id && <div className="flex justify-between gap-3"><dt className="text-gray-500">Account</dt>
              <dd className="text-right"><Link href={`/users?id=${buyer.id}`} className="font-medium text-[#0f172a] hover:underline">#{buyer.id}</Link></dd></div>}
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Fulfilment</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Method</dt>
              <dd className="text-right capitalize text-gray-900">{String(order.fulfillment_method || 'pending').replace(/_/g, ' ')}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-500">Destination</dt>
              <dd className="text-right text-gray-900">{order.destination || '—'}</dd></div>
            {shipping?.tracking_number && <div className="flex justify-between gap-3"><dt className="text-gray-500">Tracking</dt>
              <dd className="text-right text-gray-900">{shipping.tracking_number}</dd></div>}
            {shipping?.carrier && <div className="flex justify-between gap-3"><dt className="text-gray-500">Carrier</dt>
              <dd className="text-right text-gray-900">{shipping.carrier}</dd></div>}
          </dl>
          {order.delivery_photo && <img src={order.delivery_photo} alt="Delivery proof" loading="lazy"
            className="mt-4 w-full rounded-lg border border-gray-200 object-cover" />}
        </section>
      </aside>
    </div>
  </div>;
}

// ---------------------------------------------------------------- Stores

function StoresPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api<any>('/api/admin/stores')
      .then(d => { setRows(d.stores || []); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .filter(r => filter === 'all' || (filter === 'verified' ? r.is_verified : !r.is_verified))
      .filter(r => !search || `${r.name || ''} ${r.seller?.name || ''} ${r.province || ''} ${r.commune || ''}`.toLowerCase().includes(search));
  }, [rows, query, filter]);

  const setVerified = async (store: any, verified: boolean) => {
    setBusy(store.id); setError('');
    try {
      await api(`/api/admin/stores/${store.id}/verified`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      setRows(old => old.map(r => r.id === store.id ? { ...r, is_verified: verified } : r));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the store');
      throw cause;
    } finally { setBusy(null); }
  };

  const askVerify = (store: any, verified: boolean) => setConfirm({
    title: verified ? 'Verify this storefront?' : 'Remove the verified badge?',
    description: verified
      ? 'Buyers will see the verified badge on this store.'
      : 'The badge disappears from the store immediately.',
    body: <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
      {store.name} · {store.seller?.business_name || store.seller?.name || 'Unknown seller'}
    </p>,
    confirmLabel: verified ? 'Verify storefront' : 'Remove badge',
    tone: verified ? 'primary' : 'danger',
    onConfirm: () => setVerified(store, verified),
  });

  const tabs = [['all', 'All stores'], ['verified', 'Verified'], ['unverified', 'Not verified']] as const;

  return <div>
    <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
    <p className="mt-1 text-sm text-gray-500">Every storefront on the marketplace.</p>

    <Tabs tabs={tabs} value={filter} onChange={setFilter} />
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <SearchBox value={query} onChange={setQuery} placeholder="Search store, seller or location" />
      <span className="text-xs text-gray-500">{visible.length} store{visible.length === 1 ? '' : 's'}</span>
    </div>

    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {loading ? <p className="px-5 py-12 text-center text-sm text-gray-500">Loading…</p>
        : !visible.length ? <EmptyState icon={Store} title="No stores" text="No storefronts match this filter." />
        : <ul className="divide-y divide-gray-100">
            {visible.map(store => <li key={store.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
              {store.logo
                ? <img src={store.logo} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 object-cover" />
                : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-400"><Store size={18} /></span>}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{store.name}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {store.seller?.business_name || store.seller?.name || 'Unknown seller'}
                  {(store.commune || store.province) ? ` · ${[store.commune, store.province].filter(Boolean).join(', ')}` : ''}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1"><Boxes size={11} />{store.productCount} product{store.productCount === 1 ? '' : 's'}</span>
                  {Number(store.rating) > 0 && <span className="inline-flex items-center gap-1"><Star size={11} />{Number(store.rating).toFixed(1)}</span>}
                  {Number(store.total_revenue) > 0 && <span className="inline-flex items-center gap-1"><TrendingUp size={11} />{money(store.total_revenue)}</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${store.is_verified ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-50 text-gray-500 ring-gray-200'}`}>
                  {store.is_verified ? 'Verified' : 'Not verified'}
                </span>
                <button onClick={() => askVerify(store, !store.is_verified)} disabled={busy === store.id}
                  className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${store.is_verified ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  {busy === store.id ? '…' : store.is_verified ? 'Remove badge' : 'Verify'}
                </button>
              </div>
            </li>)}
          </ul>}
    </div>

    <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
  </div>;
}

// ---------------------------------------------------------------- Users

function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [role, setRole] = useState('buyer');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api<any>(`/api/admin/users?role=${role}`)
      .then(d => { setRows(d.users || []); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [role]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search ? rows.filter(u => `${u.name || ''} ${u.phone || ''} ${u.business_name || ''}`.toLowerCase().includes(search)) : rows;
  }, [rows, query]);

  const setSuspended = async (user: any, suspended: boolean, note: string) => {
    setBusy(user.id); setError('');
    try {
      await api(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended, note: note.trim() || (suspended ? '' : 'Your account is active again.') }),
      });
      setRows(old => old.map(u => u.id === user.id
        ? { ...u, verification_status: suspended ? 'suspended' : 'not_submitted', verified: suspended ? false : u.verified }
        : u));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update');
      throw cause;
    } finally { setBusy(null); }
  };

  const who = (user: any) => <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
    {user.business_name || user.name || 'This account'} · {formatPhone(user.phone)}
  </p>;

  const askSuspend = (user: any) => setConfirm({
    title: 'Suspend this account?',
    description: 'They cannot trade until an admin reinstates them.',
    body: who(user),
    confirmLabel: 'Suspend account',
    tone: 'danger',
    note: { label: 'Why is this account being suspended?', placeholder: 'The user is shown this reason.', required: true },
    onConfirm: note => setSuspended(user, true, note),
  });

  const askReinstate = (user: any) => setConfirm({
    title: 'Reinstate this account?',
    description: 'They can trade again straight away.',
    body: who(user),
    confirmLabel: 'Reinstate account',
    note: { label: 'Note for the user', placeholder: 'Your account is active again.' },
    onConfirm: note => setSuspended(user, false, note),
  });

  const setVerified = async (user: any, verified: boolean) => {
    setBusy(user.id); setError('');
    try {
      await api(`/api/admin/users/${user.id}/verified`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      setRows(old => old.map(u => u.id === user.id ? { ...u, verified, verification_status: verified ? 'approved' : 'not_submitted' } : u));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update');
    } finally { setBusy(null); }
  };

  return <div>
    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
    <p className="mt-1 text-sm text-gray-500">Grant or remove verified status.</p>

    <div className="mt-5 flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        {(['buyer', 'seller', 'admin'] as const).map(value => <button key={value} onClick={() => setRole(value)}
          className={`rounded-full px-3.5 py-2 text-xs font-semibold capitalize transition ${role === value ? 'bg-[#0f172a] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
          {value}s
        </button>)}
      </div>
      <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <Search size={15} className="text-gray-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or phone"
          className="w-full text-sm outline-none" />
      </label>
    </div>

    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {loading ? <p className="px-5 py-12 text-center text-sm text-gray-500">Loading…</p>
        : !visible.length ? <p className="px-5 py-12 text-center text-sm text-gray-500">No users found.</p>
        : <ul className="divide-y divide-gray-100">
            {visible.map(user => <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{user.business_name || user.name || 'User'}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{formatPhone(user.phone)}{user.role === 'seller' && user.name ? ` · ${user.name}` : ''}</p>
              </div>
              <StatusBadge status={user.verification_status} />
              <div className="flex flex-wrap items-center gap-2">
                {user.role === 'seller'
                  ? <Link href={`/verifications/${user.id}`} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Review</Link>
                  : <button onClick={() => setVerified(user, !user.verified)} disabled={busy === user.id}
                      className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${user.verified ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                      {busy === user.id ? '…' : user.verified ? 'Remove verified' : 'Verify'}
                    </button>}
                {user.role !== 'admin' && (user.verification_status === 'suspended'
                  ? <button onClick={() => askReinstate(user)} disabled={busy === user.id}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                      {busy === user.id ? '…' : 'Reinstate'}
                    </button>
                  : <button onClick={() => askSuspend(user)} disabled={busy === user.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
                      <Ban size={13} />{busy === user.id ? '…' : 'Suspend'}
                    </button>)}
              </div>
            </li>)}
          </ul>}
    </div>

    <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
  </div>;
}


// ---------------------------------------------------------------- Password resets

function PasswordResetsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  // Issued passwords are shown once and never stored, so keep them in memory only.
  const [issued, setIssued] = useState<Record<number, string>>({});
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api<any>(`/api/admin/password-resets?status=${status}`)
      .then(d => { setRows(d.requests || []); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const issue = async (row: any) => {
    setBusy(row.id); setError('');
    try {
      const result = await api<any>(`/api/admin/password-resets/${row.id}/issue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      setIssued(prev => ({ ...prev, [row.id]: result.temporaryPassword }));
      setRows(old => old.map(r => r.id === row.id ? { ...r, status: 'resolved' } : r));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not issue a password');
      throw cause;
    } finally { setBusy(null); }
  };

  const reject = async (row: any, note: string) => {
    setBusy(row.id); setError('');
    try {
      await api(`/api/admin/password-resets/${row.id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: note.trim() }) });
      setRows(old => old.map(r => r.id === row.id ? { ...r, status: 'rejected', admin_note: note.trim() } : r));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not decline');
      throw cause;
    } finally { setBusy(null); }
  };

  const askIssue = (row: any) => setConfirm({
    title: 'Issue a new password?',
    description: 'Only once you are satisfied they are who they say they are.',
    body: <div className="space-y-2">
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {row.user?.business_name || row.user?.name || row.full_name || 'Unknown person'} · {formatPhone(row.phone)}
      </p>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle size={12} className="mr-1 inline" />
        Check the {row.documentCount} document{row.documentCount === 1 ? '' : 's'} on file first. The old password stops working immediately.
      </p>
    </div>,
    confirmLabel: 'Issue password',
    onConfirm: () => issue(row),
  });

  const askReject = (row: any) => setConfirm({
    title: 'Decline this request?',
    description: 'Their password is left unchanged.',
    body: <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
      {row.user?.business_name || row.user?.name || row.full_name || 'Unknown person'} · {formatPhone(row.phone)}
    </p>,
    confirmLabel: 'Decline request',
    tone: 'danger',
    note: { label: 'Why are you declining?', placeholder: 'The person is shown this reason.', required: true },
    onConfirm: note => reject(row, note),
  });

  const tabs = [['open', 'Open'], ['resolved', 'Resolved'], ['rejected', 'Declined'], ['all', 'All']] as const;

  return <div>
    <h1 className="text-2xl font-bold text-gray-900">Password resets</h1>
    <p className="mt-1 text-sm text-gray-500">People who cannot sign in. Confirm who they are against their documents before issuing a password.</p>

    <div className="mt-5 flex flex-wrap gap-2">
      {tabs.map(([value, label]) => <button key={value} onClick={() => setStatus(value)}
        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${status === value ? 'bg-[#0f172a] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}>
        {label}
      </button>)}
    </div>

    {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

    <div className="mt-5 space-y-3">
      {loading ? <p className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">Loading…</p>
        : !rows.length ? <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
            <KeyRound size={32} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-semibold text-gray-900">Nothing here</p>
            <p className="mt-1 text-xs text-gray-500">No requests with this status.</p>
          </div>
        : rows.map(row => <article key={row.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{row.user?.business_name || row.user?.name || row.full_name || 'Unknown person'}</p>
                <p className="mt-0.5 text-xs text-gray-500">{formatPhone(row.phone)} · {timeAgo(row.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                {row.user
                  ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${row.user.verified ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-50 text-gray-500 ring-gray-200'}`}>
                      {row.user.role}{row.user.verified ? ' · verified' : ''}
                    </span>
                  : <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">No account for this number</span>}
                <StatusBadge status={row.status === 'open' ? 'pending' : row.status === 'resolved' ? 'approved' : 'rejected'} />
              </div>
            </div>

            {row.full_name && row.user && row.full_name !== row.user.name &&
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={12} className="mr-1 inline" />
                They gave the name "{row.full_name}" but the account is "{row.user.name}". Check carefully.
              </p>}

            {row.details && <div className="mt-3 rounded-lg bg-gray-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">What they told us</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{row.details}</p>
            </div>}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5"><FileText size={13} />{row.documentCount} document{row.documentCount === 1 ? '' : 's'} on file</span>
              {row.user && <Link href={`/verifications/${row.user.id}`} className="font-semibold text-[#0f172a] hover:underline">Open their profile to check →</Link>}
            </div>

            {issued[row.id] && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">New password — shown once</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="rounded bg-white px-3 py-2 font-mono text-base font-bold tracking-wider text-gray-900">{issued[row.id]}</code>
                <button onClick={() => navigator.clipboard?.writeText(issued[row.id])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                  <Copy size={13} /> Copy
                </button>
              </div>
              <p className="mt-2 text-xs text-emerald-800">Give this to them on the number above. It is not stored anywhere — once you leave this page it cannot be shown again.</p>
            </div>}

            {row.admin_note && row.status === 'rejected' && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"><strong>Declined:</strong> {row.admin_note}</p>}

            {row.status === 'open' && <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => askIssue(row)} disabled={busy === row.id || !row.user}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                <KeyRound size={14} />{busy === row.id ? 'Issuing…' : 'Issue new password'}
              </button>
              <button onClick={() => askReject(row)} disabled={busy === row.id}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Decline
              </button>
              {!row.user && <p className="self-center text-xs text-gray-400">No account exists for this number.</p>}
            </div>}
          </article>)}
    </div>

    <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
  </div>;
}

// ---------------------------------------------------------------- Root

export function App() {
  const [signedIn, setSignedIn] = useState(Boolean(token()));
  const [checking, setChecking] = useState(Boolean(token()));

  useEffect(() => {
    if (!token()) { setChecking(false); return; }
    // Confirm the stored token is still valid and still maps to an admin.
    fetch(`${API}/api/admin/me`, { headers: authHeaders() })
      .then(response => { if (!response.ok) { localStorage.removeItem(TOKEN_KEY); setSignedIn(false); } })
      .catch(() => { /* offline: keep the session and let the next call decide */ })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="grid min-h-screen place-items-center bg-[#f6f7f9] text-sm text-gray-500">Loading…</div>;
  if (!signedIn) return <LoginPage onSignedIn={() => setSignedIn(true)} />;

  return <AlertsProvider><Shell>
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/verifications" component={VerificationQueue} />
      <Route path="/verifications/:id" component={VerificationDetail} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/orders/:id" component={OrderDetail} />
      <Route path="/stores" component={StoresPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/password-resets" component={PasswordResetsPage} />
      <Route><p className="text-sm text-gray-500">Page not found.</p></Route>
    </Switch>
  </Shell></AlertsProvider>;
}
