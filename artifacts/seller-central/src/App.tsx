import { useState, useEffect, type FormEvent } from 'react';
import { Route, Switch, Link, useLocation, useParams, useSearch } from 'wouter';
import { 
  Home, Package, ShoppingCart, DollarSign, BarChart3, Store, Settings, 
  HelpCircle, Bell, Search, Menu, X, ChevronDown, ChevronRight, ChevronLeft,
  Plus, FileText, Video, TrendingUp, Users, Box, Tag, Truck, MessageSquare,
  Shield, CreditCard, Globe, Layers, Star, AlertTriangle, CheckCircle,
  Edit, Trash2, Eye, Download, Upload, Filter, RefreshCw, ShoppingBag, Palette,
  ExternalLink, MapPin, MoreVertical, Phone, LogOut
} from 'lucide-react';
import { MessagesPage, NotificationsPage } from './components/seller-communications';
import { StorefrontBuilder } from './components/storefront-builder';
import { CommerceBackground } from './components/commerce-background';
import { VerificationPage } from './components/verification-page';
import { VerificationPrompt } from './components/verification-prompt';
import { ForgotPasswordPage } from './components/forgot-password-page';
import { LegalPage } from './components/legal-page';
import { useVerificationStatus, needsVerificationAction, clearVerificationStatusCache, type VerificationStatus } from './lib/verification-status';
import { useOrdersNeedingAction, clearOrdersBadgeCache } from './lib/orders-badge';
import { SellerLocationMapModal, type SellerLocation } from './components/seller-location-map-modal';
import { DEFAULT_STOREFRONT_CONFIG, STOREFRONT_TEMPLATES, loadStorefrontTemplates, type StorefrontTemplate } from './lib/storefront-types';
import { setNotice } from './components/confirm-dialog';
import { useLocale } from './lib/i18n/locale-context';
import { LanguageSwitcher } from './components/language-switcher';

// Types
interface User {
  id: number;
  name: string;
  phone: string;
  role: 'buyer' | 'seller';
  profileCompleted?: boolean;
  storeCreated?: boolean;
  businessName?: string;
  businessDescription?: string;
  location?: string;
  avatar?: string;
  isVerified?: boolean;
}

function toSellerUser(value: any): User {
  return {
    id: Number(value.id),
    name: value.name || value.businessName || 'Seller',
    phone: value.phone || '',
    role: value.role,
    // A seller who never finished the profile-completion form has no business name on
    // file — this used to hardcode `true` for every seller, so an account abandoned
    // mid-onboarding (closed the tab before submitting) was never asked again and its
    // company name/description stayed blank forever, looking like the data had been lost.
    profileCompleted: value.profileCompleted ?? (value.role === 'seller' ? Boolean(value.businessName && String(value.businessName).trim()) : value.onboardingCompleted ?? true),
    storeCreated: value.storeCreated ?? false,
    businessName: value.businessName,
    businessDescription: value.businessDescription,
    location: value.location,
    avatar: value.avatar || value.profilePicture || '',
    isVerified: value.verified,
  };
}

interface StoreInfo {
  id: number;
  name: string;
  description: string;
  location: string;
  status: string;
  products: number;
  orders: number;
  revenue: number;
  rating: number;
  logo?: string;
  banner?: string;
  category?: string;
  phone?: string;
  email?: string;
  operatingHours?: string;
  isVerified?: boolean;
  slug?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  children?: Category[];
}

interface Product {
  id: number;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  category: string;
  image?: string;
  images?: string[];
  verified?: boolean;
  unit?: string;
  storeName?: string;
  storeId?: number;
  description?: string;
  model?: string;
  condition?: string;
  minimumOrderQuantity?: number;
  deliveryAvailable?: boolean;
  pickupAvailable?: boolean;
  preparationTime?: string;
}

interface OrderLineItem {
  id: number;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: number;
  status: string;
  buyerName: string;
  itemCount: number;
  total: number;
  date: string;
  items?: OrderLineItem[];
}

/** Thumbnail for an order row — first item's product image, falling back to an icon. */
function OrderThumb({ order, size = 'h-11 w-11' }: { order: Order; size?: string }) {
  const image = order.items?.find(item => item.productImage)?.productImage;
  return image
    ? <img src={image} alt="" loading="lazy" className={`${size} shrink-0 rounded-lg border border-gray-200 object-cover`} />
    : <div className={`${size} grid shrink-0 place-items-center rounded-lg bg-gray-100`}><Package size={18} className="text-gray-400" /></div>;
}

// API Base URL - points to the same backend
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev';
const STORE_BASE_URL = (import.meta as any).env?.VITE_STORE_URL || 'https://nzanila.pages.dev';

function useUnreadCounts() {
  const [unread, setUnread] = useState({ notifications: 0, messages: 0 });
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [nRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/notifications`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/conversations`, { headers: authHeaders() }),
        ]);
        const nData = nRes.ok ? await nRes.json() : { notifications: [] };
        const cData = cRes.ok ? await cRes.json() : [];
        const notifications = Array.isArray(nData?.notifications) ? nData.notifications.filter((item: any) => !item.readAt).length : 0;
        const messages = Array.isArray(cData) ? cData.reduce((sum: number, item: any) => sum + Number(item.unreadCount || 0), 0) : 0;
        if (!cancelled) setUnread({ notifications, messages });
      } catch {}
    };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return unread;
}

function authHeaders(extra: Record<string, string> = {}) {
  const token = localStorage.getItem('sc_token');
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

// Phones are stored normalised as 257XXXXXXXX. Always show them as +257 XX XXX XXX
// so the country code is visible and the number is readable.
function formatPhone(value?: string | null) {
  const raw = String(value ?? '').trim();
  // Accounts created without a phone carry a "user_..." placeholder, not a number.
  if (!raw || raw.startsWith('user_')) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const local = digits.startsWith('257') ? digits.slice(3) : digits.length === 8 ? digits : '';
  if (local.length === 8) return `+257 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  return raw.startsWith('+') ? raw : `+${digits}`;
}

// The digits after the 257 country code. Burundi has no trunk 0, so nothing is stripped.
function localPhoneDigits(value?: string | null) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.startsWith('257') ? digits.slice(3) : digits;
}

// A Burundi number is exactly 8 digits after the country code, and never starts with 0.
// Only the length is enforced: operator prefix ranges change, so hard-coding them
// would lock out real customers on newer ranges.
function isValidPhone(value?: string | null) {
  return /^[1-9]\d{7}$/.test(localPhoneDigits(value));
}

const PHONE_HINT = 'Enter your 8-digit number, for example 61 23 4567.';

function normalizeAuthPhone(phone: string) {
  let normalized = phone.replace(/\s/g, '');
  if (normalized.startsWith('+')) normalized = normalized.slice(1);
  if (normalized.startsWith('0')) normalized = `257${normalized.slice(1)}`;
  if (!normalized.startsWith('257')) normalized = `257${normalized}`;
  if (normalized.startsWith('2570')) normalized = `257${normalized.slice(4)}`;
  return normalized;
}

// Auth Context
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sc_token');
    if (!token || token.startsWith('mock_token_')) {
      localStorage.removeItem('sc_token');
      localStorage.removeItem('sc_user');
      setLoading(false);
      return;
    }

    // Never trust the cached user object. The API session is the source of truth.
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async response => {
      if (!response.ok) throw new Error('Session expired');
      const data = await response.json();
      const authenticatedUser = toSellerUser(data.user);
      if (!authenticatedUser.id || authenticatedUser.role !== 'seller') throw new Error('Invalid seller session');
      setUser(authenticatedUser);
      localStorage.setItem('sc_user', JSON.stringify(authenticatedUser));
      await checkStoreStatus(authenticatedUser.id);
    }).catch(() => {
      setUser(null);
      localStorage.removeItem('sc_token');
      localStorage.removeItem('sc_user');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  // The check above only runs at startup, so a session the server stops accepting
  // mid-visit would leave the seller on a page where every request quietly fails.
  // Watch for a 401 from our API and end the session properly instead.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      // 403 means signed in but not allowed, which must not sign anyone out, and the
      // login route answers 401 for a wrong password — excluded so a failed sign-in
      // isn't mistaken for an expired session.
      const isOurApi = url.startsWith(API_BASE) || url.startsWith('/api/');
      // /api/auth/password answers 401 when the *current* password is mistyped —
      // excluded, or changing your password wrong would sign you out.
      const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/signup') || url.includes('/api/auth/password');
      if (response.status === 401 && isOurApi && !isAuthRoute) {
        setUser(null);
        localStorage.removeItem('sc_token');
        localStorage.removeItem('sc_user');
      }
      // The server returns a signed replacement for a still-valid legacy token, so
      // sellers migrate silently rather than being logged out at the cutover.
      const upgraded = isOurApi ? response.headers.get('X-Session-Upgrade') : null;
      if (upgraded && localStorage.getItem('sc_token') && localStorage.getItem('sc_token') !== upgraded) {
        localStorage.setItem('sc_token', upgraded);
      }
      return response;
    };
    return () => { window.fetch = original; };
  }, []);

  const checkStoreStatus = async (userId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/stores/seller/${userId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.store) {
          setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, storeCreated: true };
            localStorage.setItem('sc_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch {
      // API not available, use localStorage status
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizeAuthPhone(phone), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user || !data.session?.accessToken) {
        return { success: false, error: data.error || 'Could not sign in' };
      }

      const authenticatedUser = toSellerUser(data.user);
      if (authenticatedUser.role !== 'seller') {
        return { success: false, error: 'This account is not a seller account' };
      }

      setUser(authenticatedUser);
      localStorage.setItem('sc_token', data.session.accessToken);
      localStorage.setItem('sc_user', JSON.stringify(authenticatedUser));
      await checkStoreStatus(authenticatedUser.id);
      return { success: true };
    } catch {
      return { success: false, error: 'Could not reach the account service' };
    }
  };

  const signup = async (data: { name: string; businessName: string; phone: string; password: string; location: string }) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: data.phone,
          name: data.name || data.businessName,
          role: 'seller',
          password: data.password,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.user || !result.session?.accessToken) {
        return { success: false, error: result.error || 'Could not create account' };
      }

      const authenticatedUser = toSellerUser(result.user);
      setUser(authenticatedUser);
      localStorage.setItem('sc_token', result.session.accessToken);
      localStorage.setItem('sc_user', JSON.stringify(authenticatedUser));
      return { success: true };
    } catch {
      return { success: false, error: 'Could not reach the account service' };
    }
  };

  const completeProfile = async (data: { businessName: string; location: string; businessDescription?: string; name?: string; avatar?: string }) => {
    if (!user) return { success: false };
    const updatedUser = {
      ...user,
      profileCompleted: true,
      businessName: data.businessName,
      location: data.location,
      businessDescription: data.businessDescription || user.businessDescription || '',
      name: data.name || data.businessName || user.name,
      avatar: data.avatar || user.avatar,
      phone: user.phone,
    };
    try {
      const response = await fetch(`${API_BASE}/api/sellers/${user.id}/profile`, { method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ name: updatedUser.name, business_name: updatedUser.businessName, location: updatedUser.location, business_description: updatedUser.businessDescription, profile_picture: updatedUser.avatar }) });
      if (!response.ok) return { success: false, error: 'Could not save profile to Supabase' };
    } catch { return { success: false, error: 'Could not reach profile service' }; }
    setUser(updatedUser);
    localStorage.setItem('sc_user', JSON.stringify(updatedUser));
    return { success: true };
  };

  const createStore = async (data: { name: string; description: string; category: string; phone: string; email?: string }) => {
    if (!user) return { success: false, error: 'Not logged in' };
    try {
      const res = await fetch(`${API_BASE}/api/stores`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...data, sellerId: user.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || `Server error ${res.status}` };
      }

      const responseData = await res.json().catch(() => ({}));
      const createdStore = responseData.store || responseData;

      const updatedUser = { ...user, storeCreated: true };
      setUser(updatedUser);
      localStorage.setItem('sc_user', JSON.stringify(updatedUser));
      return { success: true, store: createdStore };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
  };

  return { user, loading, login, signup, logout, completeProfile, createStore };
}

// Sidebar Component
function Sidebar({ isOpen, mobileOpen = false, onClose, onCloseMobile, onOpenNotifications, verificationStatus = null, ordersNeedingAction = 0 }: { isOpen: boolean; mobileOpen?: boolean; onClose: () => void; onCloseMobile?: () => void; onOpenNotifications: () => void; verificationStatus?: VerificationStatus | null; ordersNeedingAction?: number }) {
  const [location] = useLocation();
  const { tr } = useLocale();
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const menuItems = [
    { key: 'dashboard', label: tr('nav.dashboard'), icon: Home, href: '/seller-central' },
    { 
      key: 'catalog',
      label: tr('nav.catalog'), 
      icon: Package,
      children: [
        { label: tr('nav.addProducts'), href: '/seller-central/products/new' },
        { label: tr('nav.manageProducts'), href: '/seller-central/products' },
      ]
    },
    { 
      key: 'inventory',
      label: tr('nav.inventory'), 
      icon: Box,
      children: [
        { label: tr('nav.inventoryDashboard'), href: '/seller-central/inventory' },
        { label: tr('nav.lowStockAlerts'), href: '/seller-central/inventory/alerts' },
      ]
    },
    {
      key: 'orders',
      label: tr('nav.orders'),
      icon: ShoppingCart,
      count: ordersNeedingAction,
      children: [
        { label: tr('nav.allOrders'), href: '/seller-central/orders' },
        { label: tr('nav.pendingOrders'), href: '/seller-central/orders?status=new' },
        { label: tr('nav.processing'), href: '/seller-central/orders?status=processing' },
      ]
    },
    { 
      key: 'pricing',
      label: tr('nav.pricing'), 
      icon: DollarSign,
      children: [
        { label: tr('nav.priceManagement'), href: '/seller-central/pricing' },
        { label: tr('nav.bulkPricing'), href: '/seller-central/pricing/bulk' },
      ]
    },
    { 
      key: 'stores',
      label: tr('nav.stores'), 
      icon: Store,
      children: [
        { label: tr('nav.myStores'), href: '/seller-central/stores' },
        { label: tr('nav.createStore'), href: '/seller-central/stores/new' },
      ]
    },
    { 
      key: 'reports',
      label: tr('nav.reports'), 
      icon: BarChart3,
      children: [
        { label: tr('nav.salesReports'), href: '/seller-central/reports/sales' },
        { label: tr('nav.inventoryReports'), href: '/seller-central/reports/inventory' },
      ]
    },
    { 
      key: 'payments',
      label: tr('nav.payments'), 
      icon: CreditCard,
      children: [
        { label: tr('nav.paymentDashboard'), href: '/seller-central/payments' },
        { label: tr('nav.transactions'), href: '/seller-central/payments/transactions' },
      ]
    },
    { label: tr('nav.messages'), icon: MessageSquare, href: '/seller-central/messages' },
    { label: tr('nav.notifications'), icon: Bell, href: '/seller-central/notifications', onClick: onOpenNotifications },
    { label: tr('nav.companyProfile'), icon: Users, href: '/seller-central/profile' },
    // Kept top-level rather than nested under Company Profile: an unverified seller has to
    // be able to find this without opening anything first.
    { label: tr('nav.verificationDocuments'), icon: Shield, href: '/seller-central/verification', alert: needsVerificationAction(verificationStatus) },
    { label: tr('nav.settings'), icon: Settings, href: '/seller-central/settings' },
  ];

  const currentPath = location.split('?')[0];
  const isActive = (href: string) => currentPath === href.split('?')[0];
  const isParentActive = (item: any) => {
    if (item.href) return isActive(item.href);
    return item.children?.some((child: any) => isActive(child.href)) || false;
  };
  // The mobile drawer always shows full labels; only the desktop icon-rail toggle can collapse them.
  const expanded = isOpen || mobileOpen;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} bg-[#232f3e] text-white transition-transform duration-300 lg:static lg:translate-x-0 lg:transition-[width] lg:duration-300 ${isOpen ? 'lg:w-64' : 'lg:w-16'} flex flex-col`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {expanded && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#ff9900] flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-bold text-sm">{tr('app.name')}</span>
          </div>
        )}
        <button
          onClick={mobileOpen ? onCloseMobile : onClose}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {expanded ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Search */}
      {expanded && (
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder={tr("sc.search")}
              className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
            />
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Keyed by the stable id, not the label, so the menu survives a language change.
          const itemKey = (item as { key?: string }).key ?? item.label;
          const isExpanded = expandedItems.includes(itemKey);
          const active = isParentActive(item);

          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpanded(itemKey)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-[#ff9900] text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="relative shrink-0">
                    <Icon size={18} />
                    {!!(item as any).count && !expanded && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#ff9900] px-1 text-[9px] font-bold text-white ring-2 ring-[#232f3e]">{(item as any).count}</span>}
                  </span>
                  {expanded && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {!!(item as any).count && <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-[#ff9900] px-1.5 text-[11px] font-bold text-white">{(item as any).count}</span>}
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                </button>
                {expanded && isExpanded && (
                  <div className="bg-gray-800">
                    {item.children.map((child: any) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-12 py-2 text-sm transition-colors ${
                          isActive(child.href)
                            ? 'bg-[#ff9900]/20 text-[#ff9900] border-l-2 border-[#ff9900]'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if ((item as any).onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={(item as any).onClick}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-[#ff9900] text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {expanded && <span>{item.label}</span>}
              </button>
            );
          }

          // `alert` marks an entry that needs the seller's attention. On the collapsed
          // icon rail there is no label to attach it to, so it becomes a dot on the icon.
          const alert = Boolean((item as any).alert);
          return (
            <Link
              key={item.label}
              href={item.href || '#'}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-[#ff9900] text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="relative shrink-0">
                <Icon size={18} />
                {alert && !expanded && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#232f3e]" />}
              </span>
              {expanded && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {alert && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{tr('sc.action-needed')}</span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
      </aside>
    </>
  );
}

// Top Bar Component
function IconBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{count > 9 ? '9+' : count}</span>;
}

function TopBar({ title, onLogout, onOpenNotifications }: { title: string; onLogout: () => void; onOpenNotifications: () => void }) {
  const { tr } = useLocale();
  const user = JSON.parse(localStorage.getItem('sc_user') || '{}');
  const unread = useUnreadCounts();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5 sm:px-6 sm:py-3">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-4">
        <h1 className="truncate text-base font-bold text-gray-900 sm:text-lg">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-4">
        <LanguageSwitcher />
        <Link href="/seller-central/messages" aria-label={tr("sc.messages")} className="relative p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors sm:p-2">
          <MessageSquare size={20} />
          <IconBadge count={unread.messages} />
        </Link>
        <button type="button" onClick={onOpenNotifications} aria-label={tr("sc.open-notifications")} className="relative p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors sm:p-2">
          <Bell size={20} />
          <IconBadge count={unread.notifications} />
        </button>
        <button className="hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors sm:block">
          <HelpCircle size={20} />
        </button>
        {/* Profile menu — settings and log out live in here, like other apps. */}
        <div className="relative flex items-center">
          <button type="button" onClick={() => setMenuOpen(open => !open)} aria-label={tr("sc.open-account-menu")} aria-expanded={menuOpen} className="flex items-center gap-2 rounded-xl px-1 py-1.5 transition hover:bg-gray-50 sm:gap-3 sm:px-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user.name || 'Seller'}</p>
              {formatPhone(user.phone) && <p className="text-xs text-gray-500">{formatPhone(user.phone)}</p>}
            </div>
            {user.avatar ? <img src={user.avatar} alt={`${user.name || 'Seller'} profile`} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-gray-100 sm:h-9 sm:w-9" /> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#232f3e] text-sm font-bold text-white sm:h-9 sm:w-9">{(user.name || 'S').charAt(0).toUpperCase()}</div>}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl" role="menu">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-bold text-gray-900">{user.name || 'Seller'}</p>
                  {formatPhone(user.phone) && <p className="truncate text-xs text-gray-500">{formatPhone(user.phone)}</p>}
                </div>
                <Link href="/seller-central/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" role="menuitem">
                  <Users size={16} className="text-gray-400" />{tr('sc.company-profile')}</Link>
                <Link href="/seller-central/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" role="menuitem">
                  <Settings size={16} className="text-gray-400" />{tr('sc.settings')}</Link>
                <Link href="/seller-central/stores" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" role="menuitem">
                  <Store size={16} className="text-gray-400" />{tr('sc.my-stores-2')}</Link>
                <button type="button" onClick={() => { setMenuOpen(false); onLogout(); }} className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50" role="menuitem">
                  <LogOut size={16} />{tr('sc.log-out')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Dashboard Page
type SalesPoint = { date: string; label: string; value: number; orders: number };

// Sales line chart drawn from the real daily series.
function SalesChart({ points }: { points: SalesPoint[] }) {
  const { tr } = useLocale();
  if (!points.length) return <div className="grid h-48 place-items-center rounded-lg border border-dashed border-gray-200 text-sm text-gray-400">{tr('sc.no-sales-data-yet')}</div>;
  const width = 760;
  const height = 150;
  const peak = Math.max(...points.map(p => p.value), 1);
  const x = (i: number) => points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
  const y = (value: number) => height - (value / peak) * (height - 12) - 6;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const best = points.reduce((top, p) => (p.value > top.value ? p : top), points[0]);
  return (
    <div>
      <div className="h-48 rounded-lg bg-gradient-to-b from-orange-50 to-white p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label={tr("sc.sales-over-the-last-30-days")}>
          <path d={area} fill="#ffe7cc" opacity=".7" />
          <path d={line} fill="none" stroke="#ff9900" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-gray-400">
        <span>{points[0]?.label}</span>
        <span>{total > 0 ? `Best day ${best.label} · ${best.value.toLocaleString()} BIF` : 'No sales in this period'}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

type SellerAnalytics = {
  revenue: number; revenue30d: number; revenueChange: number;
  shippingCollected: number; shippingCollected30d: number; totalCollected: number;
  orders: number; orders30d: number; ordersChange: number;
  unitsSold: number; averageOrderValue: number;
  products: number; lowStock: number; outOfStock: number; stores: number;
  topProducts: { productId: unknown; name: string; units: number; revenue: number }[];
  daily: SalesPoint[];
};

const EMPTY_ANALYTICS: SellerAnalytics = {
  revenue: 0, revenue30d: 0, revenueChange: 0, shippingCollected: 0, shippingCollected30d: 0, totalCollected: 0,
  orders: 0, orders30d: 0, ordersChange: 0,
  unitsSold: 0, averageOrderValue: 0, products: 0, lowStock: 0, outOfStock: 0, stores: 0,
  topProducts: [], daily: [],
};

function useSellerAnalytics() {
  const [data, setData] = useState<SellerAnalytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/supplier/dashboard`, { headers: authHeaders() });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not load sales data');
        if (!cancelled) { setData({ ...EMPTY_ANALYTICS, ...payload }); setError(''); }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load sales data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return { data, loading, error };
}

const bif = (value: number) => `${Math.round(Number(value) || 0).toLocaleString()} BIF`;
const changeLabel = (value: number) => `${value > 0 ? '+' : ''}${value}% vs previous 30 days`;

function DashboardPage() {
  const { tr } = useLocale();
  const { data, loading, error } = useSellerAnalytics();
  const [inquiries, setInquiries] = useState(0);
  const stats = { products: data.products, stores: data.stores, inquiries, orders: data.orders };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/conversations`, { headers: authHeaders() });
        const rows = response.ok ? await response.json() : [];
        setInquiries(Array.isArray(rows) ? rows.length : 0);
      } catch { /* Inquiries are secondary to the sales numbers. */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs text-gray-500">{tr('sc.analytics-overview')}</p><h2 className="mt-1 text-2xl font-bold text-[#202124] sm:text-3xl">{tr('sc.performances')}</h2></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><select className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-3 py-2 text-sm sm:flex-none"><option>{tr('sc.last-7-days')}</option><option>{tr('sc.last-30-days')}</option><option>{tr('sc.last-12-months')}</option></select><select className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-3 py-2 text-sm sm:flex-none"><option>{tr('sc.all-industries')}</option><option>{tr('sc.agriculture')}</option><option>{tr('sc.manufacturing')}</option></select></div></div><div className="mb-5 flex flex-col items-stretch gap-3 rounded-xl border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><div><h3 className="font-bold text-gray-900">{tr('sc.prices-discounts')}</h3><p className="mt-1 text-sm text-gray-600">{tr('sc.choose-a-product-and-update-its-price-in-a-q')}</p></div><Link href="/seller-central/pricing" className="shrink-0 rounded-lg bg-orange-500 px-4 py-3 text-center text-sm font-bold text-white sm:w-auto">{tr('sc.manage-discounts')}</Link></div><div className="mb-5 -mx-4 flex gap-6 overflow-x-auto border-b border-gray-200 px-4 text-sm [scrollbar-width:none] md:mx-0 md:px-0"><span className="shrink-0 whitespace-nowrap border-b-2 border-[#ff9900] px-1 pb-3 font-bold text-[#202124]">{tr('sc.data-overview')}</span><Link href="/seller-central/products" className="shrink-0 whitespace-nowrap pb-3 text-gray-500 hover:text-gray-900">{tr('sc.product-performance')}</Link><Link href="/seller-central/messages" className="shrink-0 whitespace-nowrap pb-3 text-gray-500 hover:text-gray-900">{tr('sc.inquiries')}</Link></div><div className="grid gap-5 xl:grid-cols-[1fr_260px]"><div className="space-y-5"><div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div className="min-w-0"><p className="text-sm font-semibold text-gray-500">{tr('sc.sales-performance')}</p><p className="mt-1 text-xs text-gray-400">{tr('sc.active-orders-cancelled-ones-are-excluded')}</p></div><span className="text-xs text-gray-400">{loading ? 'Loading…' : 'Updated just now'}</span></div>{error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">{error}</p>}<div className="grid grid-cols-2 gap-5 md:grid-cols-4"><div><p className="min-h-[2.5em] text-xs leading-tight text-gray-500">{tr('sc.revenue-30-days')}</p><p className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">{loading ? '…' : bif(data.revenue30d)}</p><p className={`text-xs ${data.revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{changeLabel(data.revenueChange)}</p></div><div><p className="min-h-[2.5em] text-xs leading-tight text-gray-500">{tr('sc.orders-30-days')}</p><p className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">{loading ? '…' : data.orders30d}</p><p className={`text-xs ${data.ordersChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{changeLabel(data.ordersChange)}</p></div><div><p className="min-h-[2.5em] text-xs leading-tight text-gray-500">{tr('sc.shipping-collected')}</p><p className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">{loading ? '…' : bif(data.shippingCollected30d)}</p><p className="text-xs text-gray-400">{tr('sc.billed-separately-from-goods')}</p></div><div><p className="min-h-[2.5em] text-xs leading-tight text-gray-500">{tr('sc.average-order')}</p><p className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">{loading ? '…' : bif(data.averageOrderValue)}</p><p className="text-xs text-gray-400">{data.unitsSold} unit{data.unitsSold === 1 ? '' : 's'} · {data.orders} order{data.orders === 1 ? '' : 's'}</p></div></div><div className="mt-7"><SalesChart points={data.daily} /></div></div><div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><div className="flex items-center justify-between"><h3 className="font-bold">{tr('sc.product-performance')}</h3><Link href="/seller-central/products" className="text-xs font-semibold text-[#ff9900]">{tr('sc.view-products')}</Link></div><p className="mt-6 text-3xl font-bold sm:text-4xl">{loading ? '…' : stats.products}</p><p className="text-sm text-gray-500">{tr('sc.products-in-your-catalogs')}</p><div className="mt-5 flex gap-2"><Link href="/seller-central/products/new" className="rounded bg-[#ff9900] px-3 py-2 text-xs font-bold text-white">{tr('sc.add-product-2')}</Link><Link href="/seller-central/stores" className="rounded border px-3 py-2 text-xs font-semibold">{tr('sc.manage-stores')}</Link></div></div><div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><h3 className="font-bold">{tr('sc.buyer-inquiries')}</h3><p className="mt-6 text-3xl font-bold sm:text-4xl">{stats.inquiries}</p><p className="text-sm text-gray-500">{tr('sc.respond-quickly-to-win-follow-ups')}</p><Link href="/seller-central/messages" className="mt-5 inline-block text-xs font-semibold text-[#ff9900]">{tr('sc.open-message-center')}</Link></div></div></div><aside className="rounded-xl border border-gray-200 bg-[#232f3e] p-5 text-white"><h3 className="font-bold">{tr('sc.seller-health')}</h3><div className="mt-5 rounded-lg bg-white/10 p-4"><p className="text-xs text-white/70">{tr('sc.storefronts')}</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{stats.stores}</p><p className="mt-1 text-xs text-emerald-300">{tr('sc.active-and-connected')}</p></div><div className="mt-3 rounded-lg bg-white/10 p-4"><p className="text-xs text-white/70">{tr('sc.catalog-quality')}</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{stats.products ? 'Ready' : 'Start'}</p><p className="mt-1 text-xs text-white/70">{tr('sc.add-products-to-improve-visibility')}</p></div><div className="mt-6 border-t border-white/15 pt-5"><p className="text-sm font-semibold">{tr('sc.quick-links')}</p><div className="mt-3 space-y-2 text-xs"><Link href="/seller-central/stores/new" className="block text-white/80 hover:text-white">{tr('sc.create-storefront')}</Link><Link href="/seller-central/profile" className="block text-white/80 hover:text-white">{tr('sc.edit-company-profile')}</Link><Link href="/seller-central/reports" className="block text-white/80 hover:text-white">{tr('sc.open-reports')}</Link></div></div></aside></div></div>;
}

// Orders Page
function OrdersPage() {
  const { tr } = useLocale();
  const urlSearch = useSearch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(urlSearch).get('status') || 'all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setStatusFilter(new URLSearchParams(urlSearch).get('status') || 'all');
  }, [urlSearch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => { try { const response = await fetch(`${API_BASE}/api/supplier/orders`, { headers: authHeaders() }); if (!response.ok) throw new Error('Could not load orders'); const data = await response.json(); if (!cancelled) setOrders(Array.isArray(data) ? data : []); } catch { if (!cancelled) setOrders([]); } finally { if (!cancelled) setLoading(false); } };
    void load(); const timer = window.setInterval(() => void load(), 10000); return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const money = (value: number) => `${value.toLocaleString()} BIF`;
  const statusLabel = (status: string) => status === 'new' ? 'New order' : status === 'out_for_delivery' ? 'In transit' : status === 'delivered' ? 'Completed' : status.replace(/_/g, ' ');
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const query = search.trim().toLowerCase();
    return matchesStatus && (!query || String(order.id).toLowerCase().includes(query) || String(order.buyerName || '').toLowerCase().includes(query));
  });

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'out_for_delivery', label: 'In Transit' },
    { value: 'delivered', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.orders')}</p><h2 className="mt-1 text-2xl font-bold text-gray-900">{tr('sc.order-management')}</h2><p className="mt-1 text-sm text-gray-500">{tr('sc.track-fulfillment-delivery-pickup-and-buyer-')}</p></div><div className="relative w-full max-w-xs"><Search size={16} className="absolute left-3 top-3 text-gray-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={tr("sc.search-order-or-buyer")} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500" /></div></div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">{[{ label: 'All orders', value: orders.length, filter: 'all' }, { label: 'Needs action', value: orders.filter(order => ['new', 'confirmed', 'processing', 'preparing', 'ready'].includes(order.status)).length, filter: 'new' }, { label: 'In transit', value: orders.filter(order => ['out_for_delivery', 'shipped'].includes(order.status)).length, filter: 'out_for_delivery' }, { label: 'Completed', value: orders.filter(order => order.status === 'delivered').length, filter: 'delivered' }].map(card => <button type="button" key={card.label} onClick={() => setStatusFilter(card.filter)} className={`rounded-xl border p-4 text-left transition ${statusFilter === card.filter ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-200'}`}><p className="text-xs text-gray-500">{card.label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '…' : card.value}</p></button>)}</div>
      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusFilters.map(filter => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              statusFilter === filter.value
                ? 'bg-[#ff9900] text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders — cards on phones so nothing scrolls sideways */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-3 w-40 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-900">{tr('sc.no-orders-found')}</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Link key={order.id} href={`/seller-central/orders/${order.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <OrderThumb order={order} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#ff9900]">#{order.id}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-800">{order.items?.[0]?.productName || order.buyerName || 'Buyer'}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">{order.buyerName || 'Buyer'} · {order.itemCount || 0} item{order.itemCount === 1 ? '' : 's'} · {timeAgo(order.date)}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                  order.status === 'new' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{statusLabel(order.status)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-xs font-semibold capitalize text-gray-500">{String((order as any).fulfillment_method || (order as any).deliveryMethod || 'seller delivery').replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-gray-900">{money(order.total)}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Orders Table (desktop) */}
      <div className="hidden rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">{tr('sc.order')}</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">{tr('sc.buyer')}</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">{tr('sc.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">{tr('sc.fulfillment')}</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">{tr('sc.total')}</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">{tr('sc.date')}</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">{tr('sc.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-6 py-4">
                    <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-900">{tr('sc.no-orders-found')}</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <OrderThumb order={order} />
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-[#ff9900]">#{order.id}</span>
                        <p className="mt-0.5 max-w-[200px] truncate text-xs text-gray-500">{order.items?.[0]?.productName || '—'}{(order.items?.length || 0) > 1 ? ` +${(order.items!.length - 1)}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><p className="text-sm font-semibold text-gray-700">{order.buyerName || 'Buyer'}</p><p className="mt-1 text-xs text-gray-400">{order.itemCount || 0} item{order.itemCount === 1 ? '' : 's'}</p></td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'new' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold capitalize text-gray-600">{String((order as any).fulfillment_method || (order as any).deliveryMethod || 'seller delivery').replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{money(order.total)}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 text-right">{timeAgo(order.date)}</td>
                  <td className="px-6 py-4 text-center">
                    <Link href={`/seller-central/orders/${order.id}`} className="text-xs font-bold text-[#ff9900] hover:underline">{tr('sc.open-order')}</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderDetailPage() {
  const { tr } = useLocale();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [shippingFeeInput, setShippingFeeInput] = useState('');
  const [feeTouched, setFeeTouched] = useState(false);

  const load = async (opts?: { silent?: boolean }) => {
    if (!id) return;
    if (!opts?.silent) setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/${id}`, { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load this order');
      setOrder({ ...data, items: (data.items || []).map((item: any) => ({ ...item, price: Number(item.price ?? item.unitPrice ?? 0) })) });
      setError('');
    } catch (cause) {
      if (!opts?.silent) setError(cause instanceof Error ? cause.message : 'Could not load this order');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  // Poll so the order status and shipping fee stay live without a manual refresh.
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({ silent: true }), 10000);
    return () => window.clearInterval(timer);
  }, [id]);

  // Keep the fee field showing the saved amount until the seller starts editing it.
  useEffect(() => {
    if (feeTouched) return;
    const fee = Number(order?.sellerShippingFee ?? order?.shipping_fee ?? order?.shippingFee ?? 0);
    setShippingFeeInput(fee ? String(fee) : '');
  }, [order?.sellerShippingFee, order?.shipping_fee, order?.shippingFee, feeTouched]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/supplier/orders/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update order');
      setOrder((current: any) => ({ ...current, ...data, status }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update order');
    } finally {
      setSaving(false);
    }
  };

  const issueShippingFee = async () => {
    if (!id || shippingFeeInput.trim() === '') return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/supplier/orders/${id}/status`, { method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ shippingFee: Number(shippingFeeInput) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not issue shipping fee');
      setOrder((current: any) => ({ ...current, ...data }));
      setFeeTouched(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not issue shipping fee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 md:p-6"><div className="h-8 w-48 animate-pulse rounded bg-gray-200" /><div className="mt-6 h-72 animate-pulse rounded-xl bg-gray-100" /></div>;
  if (error || !order) return <div className="p-4 md:p-6"><Link href="/seller-central/orders" className="text-sm text-gray-600 hover:underline">← Back to orders</Link><div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 md:p-6 text-center text-sm text-red-700">{error || 'Order not found'}</div></div>;

  const items = order.items || [];
  // sellerShippingFee is this seller's own charge; shipping_fee is the order-wide sum
  // (which includes other sellers on a multi-seller order).
  const shippingFee = Number(order.sellerShippingFee ?? order.shipping_fee ?? order.shippingFee ?? 0);
  // Derive the subtotal from the rows actually rendered. order.total covers the whole
  // order (every seller on it), so subtracting shipping from it can disagree with the
  // items shown here. Summing the visible lines keeps the arithmetic on screen correct.
  const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const total = subtotal + shippingFee;
  const method = order.fulfillment_method || order.deliveryMethod || 'seller_delivery';
  const locationText = String(order.destination || order.deliveryAddress || '').trim();
  const mapQuery = order.delivery_latitude && order.delivery_longitude ? `${order.delivery_latitude},${order.delivery_longitude}` : order.latitude && order.longitude ? `${order.latitude},${order.longitude}` : locationText;
  const googleMapsUrl = mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : '';
  const status = String(order.status || 'processing');
  const isPickup = method === 'buyer_pickup';
  // Three stages, three clicks: Accept -> Dispatch/Ready -> Delivered/Collected.
  // The old flow needed five (confirm, prepare, ready, dispatch, deliver) while the rail
  // only ever drew three, so the first two clicks moved nothing on screen.
  const statusSteps = isPickup ? ['Accepted', 'Ready for pickup', 'Collected'] : ['Accepted', 'Dispatched', 'Delivered'];
  const currentStep = status === 'delivered' ? 2
    : ['out_for_delivery', 'shipped', 'ready'].includes(status) ? 1
    : ['confirmed', 'preparing'].includes(status) ? 0
    : -1;
  const statusLabel = status.replace(/_/g, ' ');
  const nextAction: [string, string] | null =
    status === 'cancelled' || status === 'delivered' ? null
    : currentStep === -1 ? ['confirmed', 'Accept order']
    : currentStep === 0 ? (isPickup ? ['ready', 'Mark ready for pickup'] : ['out_for_delivery', 'Dispatch order'])
    : currentStep === 1 ? (isPickup ? ['delivered', 'Confirm pickup'] : ['delivered', 'Mark delivered'])
    : null;

  return <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/seller-central/orders" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">← Back to orders</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs uppercase tracking-wide text-gray-500">Order #{order.id}</p><h2 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{tr('sc.order-details')}</h2><p className="mt-1 text-sm text-gray-500">Placed {new Date(order.date || order.createdAt).toLocaleString()}</p></div>
        <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold capitalize text-blue-700">{statusLabel}</span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-gray-900">{tr('sc.order-progress')}</h3><p className="mt-1 text-xs text-gray-500">{tr('sc.keep-the-buyer-updated-at-every-step')}</p></div><span className="text-xs text-gray-500">{method === 'buyer_pickup' ? 'Buyer pickup' : 'Seller delivery'}</span></div>
            <div className="mt-7 flex items-start">{statusSteps.map((step: string, index: number) => <div key={step} className="flex flex-1 items-start last:flex-none"><div className="flex flex-col items-center"><span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${currentStep >= index ? 'bg-[#ff9900] text-white' : 'bg-gray-100 text-gray-400'}`}>{currentStep >= index ? '✓' : index + 1}</span><span className={`mt-2 max-w-24 text-center text-[11px] font-semibold ${currentStep >= index ? 'text-gray-900' : 'text-gray-500'}`}>{step}</span></div>{index < statusSteps.length - 1 && <div className={`mt-4 h-1 flex-1 ${currentStep > index ? 'bg-[#ff9900]' : 'bg-gray-100'}`} />}</div>)}</div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold text-gray-900">{tr('sc.items-in-this-order')}</h3><p className="mt-1 text-xs text-gray-500">{items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)} units · {items.length} product{items.length === 1 ? '' : 's'}</p></div><span className="text-xs text-gray-500">Order #{order.id}</span></div><div className="mt-5 divide-y divide-gray-100">{items.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="flex min-w-0 items-center gap-3">{item.productImage ? <img src={item.productImage} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gray-100"><Package size={20} className="text-gray-500" /></div>}<div className="min-w-0"><p className="font-semibold text-gray-900">{item.productName}</p><p className="mt-1 text-xs text-gray-500">Quantity: {item.quantity} · Unit price: {Number(item.price).toLocaleString()} BIF</p></div></div><p className="font-bold text-gray-900">{(Number(item.price) * Number(item.quantity)).toLocaleString()} BIF</p></div>)}</div><div className="mt-5 border-t border-gray-200 pt-4"><div className="flex justify-between text-sm text-gray-600"><span>{tr('sc.subtotal')}</span><span>{subtotal.toLocaleString()} BIF</span></div><div className="mt-2 flex justify-between text-sm text-gray-600"><span>{tr('sc.shipping-fee')}</span><span>{shippingFee.toLocaleString()} BIF</span></div><div className="mt-3 flex justify-between text-lg font-bold text-gray-900"><span>{tr('sc.total')}</span><span>{total.toLocaleString()} BIF</span></div></div></section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-gray-900">{tr('sc.fulfillment-details')}</h3><p className="mt-1 text-xs text-gray-500">{tr('sc.use-the-saved-destination-to-plan-delivery-o')}</p></div><span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-bold capitalize text-orange-700">{method.replace(/_/g, ' ')}</span></div><div className="mt-5 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-100 text-[#ff6a00]"><MapPin size={19} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tr('sc.delivery-destination')}</p><p className="mt-1 break-words text-sm font-semibold text-gray-900">{locationText || 'Location not provided'}</p>{googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#ff9900] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-orange-600"><MapPin size={14} />{tr('sc.open-in-google-maps')}<ExternalLink size={13} /></a>}</div></div></div>{order.buyerDirections && <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{tr('sc.buyer-instructions')}</p><p className="mt-1 text-sm text-blue-900">{order.buyerDirections}</p></div>}{order.delivery_photo && <div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{tr('sc.buyer-location-photo')}</p><img src={order.delivery_photo} alt="Buyer delivery location" className="max-h-64 w-full rounded-lg object-cover" /></div>}<p className="mt-4 text-xs text-gray-500">{tr('sc.confirm-the-address-with-the-buyer-before-di')}</p></section>
        </div>

        <aside className="space-y-5"><section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><h3 className="font-bold text-gray-900">{tr('sc.buyer')}</h3><p className="mt-4 text-lg font-bold text-gray-900">{order.buyerName || 'Buyer'}</p><p className="mt-1 text-xs text-gray-500">{tr('sc.customer-for-this-order')}</p><div className="mt-5 flex flex-col gap-2"><Link href={`/seller-central/messages?buyerId=${order.buyerId || ''}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff9900] px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-600"><MessageSquare size={15} />{tr('sc.message-buyer')}</Link>{order.buyerPhone && <a href={`tel:${order.buyerPhone}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"><Phone size={15} />{tr('sc.call-buyer')}</a>}</div></section><section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><h3 className="font-bold text-gray-900">{tr('sc.shipping-fee')}</h3><p className="mt-1 text-xs text-gray-500">{shippingFee > 0 ? 'Change the delivery charge; the buyer will get a notification with the new total.' : 'Issue a delivery charge; the buyer will receive a notification with the updated total.'}</p><div className="mt-4 flex gap-2"><input type="number" min="0" step="1" value={shippingFeeInput} onChange={event => { setFeeTouched(true); setShippingFeeInput(event.target.value); }} placeholder="0" className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff9900]" aria-label={tr("sc.shipping-fee-in-bif")} /><button disabled={saving || shippingFeeInput.trim() === ''} onClick={() => void issueShippingFee()} className="shrink-0 rounded-lg bg-[#ff9900] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : shippingFee > 0 ? 'Update fee' : 'Issue fee'}</button></div><p className="mt-2 text-[11px] text-gray-500">Current fee: {shippingFee.toLocaleString()} BIF</p></section><section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><h3 className="font-bold text-gray-900">{tr('sc.actions')}</h3><div className="mt-4 space-y-2">{nextAction && <button disabled={saving} onClick={() => void updateStatus(nextAction[0])} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ff9900] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"><CheckCircle size={15} />{saving ? 'Saving…' : nextAction[1]}</button>}{status !== 'delivered' && status !== 'cancelled' && <button disabled={saving} onClick={() => void updateStatus('cancelled')} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 disabled:opacity-50"><X size={15} />{tr('sc.cancel-order')}</button>}{!nextAction && status !== 'cancelled' && <p className="text-center text-xs text-gray-500">{tr('sc.no-further-seller-action-is-needed')}</p>}</div></section><section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6"><h3 className="font-bold text-gray-900">{tr('sc.order-information')}</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-gray-500">{tr('sc.order-number')}</dt><dd className="font-semibold text-gray-900">#{order.id}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">{tr('sc.placed')}</dt><dd className="text-right text-gray-900">{new Date(order.date || order.createdAt).toLocaleDateString()}</dd></div><div className="flex justify-between gap-3"><dt className="text-gray-500">{tr('sc.payment-total')}</dt><dd className="font-semibold text-gray-900">{total.toLocaleString()} BIF</dd></div></dl></section></aside>
      </div>
    </div>
  </div>;
}

// Products Page — per-account/store, no hardcoded mocks
function ProductsPage() {
  const { tr } = useLocale();
  const [location] = useLocation();
  const pricingPage = location.includes('/seller-central/pricing');
  const [pricingGuideOpen, setPricingGuideOpen] = useState(false);
  const [pricing, setPricing] = useState<Product | null>(null);
  const [priceMode, setPriceMode] = useState<'regular' | 'discount'>('discount');
  const [newPrice, setNewPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState('');
  const openPricing = (product: Product) => {
    setPricing(product); setNewPrice(String(product.price));
    setPriceMode('discount');
    setPriceError('');
  };
  const savePrice = async () => {
    if (!pricing || savingPrice) return;
    const value = Number(newPrice);
    const original = pricing.compareAtPrice || pricing.price;
    if (!Number.isFinite(value) || value <= 0 || (priceMode === 'discount' && value >= original)) {
      setPriceError('Enter a positive price. A discount must be below the original price.'); return;
    }
    const token = localStorage.getItem('sc_token') || '';
    if (!token) { setPriceError('Sign in as a seller to change prices.'); return; }
    setSavingPrice(true); setPriceError('');
    try {
      const seller = JSON.parse(localStorage.getItem('sc_user') || '{}');
      const response = await fetch(`${API_BASE}/api/new-products/${pricing.id}/pricing`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Seller-Id': String(seller.id || '') },
        body: JSON.stringify({ price: value, mode: priceMode, expectedPrice: pricing.price }),
      });
      if (!response.ok) throw new Error('Could not save the price. Please try again.');
      const saved = await response.json();
      setProducts((items) => items.map((item) => item.id === pricing.id ? { ...item, price: Number(saved.base_price ?? saved.price ?? value), compareAtPrice: saved.compare_at_price == null ? null : Number(saved.compare_at_price) } : item));
      setPricing(null);
    } catch (error) { setPriceError(error instanceof Error ? error.message : 'Could not save price.'); }
    finally { setSavingPrice(false); }
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [savingStock, setSavingStock] = useState(false);
  const [stockError, setStockError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const userData = localStorage.getItem('sc_user');
        const user = userData ? JSON.parse(userData) : null;
        if (!user) { setLoading(false); return; }
        // Load every store so products published to a selected subset/all stores are visible.
        const sRes = await fetch(`${API_BASE}/api/stores/seller/${user.id}`, { headers: authHeaders() });
        const sData = sRes.ok ? await sRes.json() : {};
        const stores = Array.isArray(sData.stores) ? sData.stores : (sData.store ? [sData.store] : []);
        if (!stores.length) { setProducts([]); setLoading(false); return; }
        const storeRows = await Promise.all(stores.map(async (store: any) => {
          const response = await fetch(`${API_BASE}/api/stores/${store.id}/products`, { headers: authHeaders() });
          const payload = response.ok ? await response.json() : {};
          const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.products) ? payload.products : []);
          return rows.map((r: any) => ({ ...r, storeName: store.name, storeId: store.id }));
        }));
        const mapped: Product[] = storeRows.flat().map((r:any)=>({
            id: r.id,
            name: `${r.name}`,
            price: Number(r.base_price ?? r.price ?? 0),
            compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : r.compareAtPrice != null ? Number(r.compareAtPrice) : null,
            stock: Number(r.stock_quantity ?? r.stock ?? 0),
            category: r.category_id ? String(r.category_id) : (r.category || r.unit_type || r.unit || 'General'),
            image: r.primary_image || r.image || '',
            images: Array.isArray(r.product_images) && r.product_images.length ? r.product_images.map((picture: any) => picture.picture_url).filter(Boolean) : ((r.primary_image || r.image) ? [r.primary_image || r.image] : []),
            unit: r.unit_type || r.unit || 'piece',
            verified: r.status === 'approved',
            storeName: r.storeName,
            storeId: Number(r.storeId),
            description: r.description || '',
            model: r.model || '',
            condition: r.condition || 'New',
            minimumOrderQuantity: Number(r.minimum_order_quantity ?? r.moq ?? 1),
            deliveryAvailable: r.delivery_available ?? r.deliveryAvailable ?? true,
            pickupAvailable: r.pickup_available ?? r.pickupAvailable ?? false,
            preparationTime: r.preparation_time || r.preparationTime || '',
          }));
        setProducts(mapped);
      } catch { setProducts([]); }
      setLoading(false);
    };
    load();
  }, []);

  const money = (value: number) => `${value.toLocaleString()} BIF`;

  const storeNames = Array.from(new Map(products.map((product) => [String(product.storeId), { id: product.storeId, name: product.storeName || 'Store' }])).values());
  const filteredProducts = products.filter(p => (storeFilter === 'all' || String(p.storeId) === storeFilter) && (
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const deleteProduct = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const product = pendingDelete;
    try {
      const response = await fetch(`${API_BASE}/api/new-products/${product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('sc_token') || ''}`, 'X-Seller-Id': String(JSON.parse(localStorage.getItem('sc_user') || '{}').id || '') } });
      if (!response.ok) throw new Error('Could not delete this product.');
      setProducts((items) => items.filter((item) => item.id !== product.id));
      setPendingDelete(null);
    } catch (error) {
      setNotice({
        title: 'Could not delete this product',
        description: error instanceof Error ? error.message : 'Could not delete this product.',
        confirmLabel: 'OK', variant: 'alert',
      });
    }
    finally { setDeleting(false); }
  };

  const saveStock = async () => {
    if (!stockProduct || savingStock) return;
    const stock = Number(stockValue);
    if (!Number.isInteger(stock) || stock < 0) { setStockError('Enter a whole number of units, 0 or more.'); return; }
    setSavingStock(true); setStockError('');
    try {
      const response = await fetch(`${API_BASE}/api/supplier/products/${stockProduct.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('sc_token') || ''}` }, body: JSON.stringify({ stock }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update stock.');
      setProducts(items => items.map(item => item.id === stockProduct.id ? { ...item, stock: Number(payload.stock ?? stock) } : item));
      setStockProduct(null);
    } catch (error) { setStockError(error instanceof Error ? error.message : 'Could not update stock.'); }
    finally { setSavingStock(false); }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Search and Actions */}
      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div className="flex w-full min-w-0 flex-1 items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 md:max-w-md">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder={tr("sc.search-products")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm outline-none w-full"
          />
        </div>
        <div className="flex w-full items-stretch gap-2 md:w-auto">
          <select aria-label={tr("sc.filter-products-by-store")} value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm md:flex-none">
            <option value="all">{tr('sc.all-stores')}</option>
            {storeNames.map((store) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
          </select>
          <Link href="/seller-central/products/new" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#ff9900] px-4 py-2 text-center text-sm font-bold leading-tight text-white hover:bg-[#e68a00] md:flex-none">
            <Plus size={14} className="shrink-0" />{tr('sc.add-product')}</Link>
        </div>
      </div>

      {!pricingPage && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
        <div><p className="text-sm font-bold text-gray-900">{tr('sc.manage-pricing')}</p><p className="mt-1 text-xs text-gray-600">{tr('sc.set-regular-prices-and-discounts-from-the-pr')}</p></div>
        <button type="button" onClick={() => setPricingGuideOpen(true)} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600">{tr('sc.open-pricing-guide')}</button>
      </div>}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-32 bg-gray-100 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-900">{tr('sc.no-products-found')}</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="group relative overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative m-2 aspect-square overflow-hidden rounded-xl bg-gray-100">
                {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center"><Package size={40} className="text-orange-300" /></div>}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-10">{product.name}</h3>
                  {product.stock === 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">{tr('sc.out-of-stock-2')}</span>
                  )}
                  {product.stock > 0 && product.stock < 10 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">{tr('sc.low-stock-2')}</span>
                  )}
                </div>
                {product.storeName && <p className="mb-2 text-[11px] font-semibold text-orange-600">Store: {product.storeName}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">{money(product.price)}/{product.unit}</p>
                  <p className={`text-xs ${product.stock < 10 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                    Stock: {product.stock}
                  </p>
                </div>
                <div className="mt-2 flex gap-2">
                  <div className="relative"><button type="button" onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50" aria-label={tr("sc.product-actions")} aria-expanded={openMenu === product.id}><MoreVertical size={15} /></button>{openMenu === product.id && <div className="absolute bottom-full right-0 z-[60] mb-1 w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-xl"><Link href={`/seller-central/products/${product.id}/edit`} onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded px-3 py-2 text-xs hover:bg-gray-50"><Edit size={12} />{tr('sc.edit')}</Link><button type="button" onClick={() => { setOpenMenu(null); setPendingDelete(product); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><Trash2 size={12} />{tr('sc.delete')}</button></div>}</div>
                  <button type="button" onClick={() => { setPreviewProduct(product); setPreviewImage(product.images?.[0] || product.image || ''); }} className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    <Eye size={12} />
                  </button>
                  {pricingPage && <button type="button" onClick={() => openPricing(product)} className="flex-1 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">{tr('sc.change-price-discount')}</button>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {previewProduct && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => setPreviewProduct(null)}>
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="text-base font-bold text-gray-900">{tr('sc.product-preview')}</h2><button type="button" onClick={() => setPreviewProduct(null)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={18} /></button></div>
          <div className="p-5"><div className="relative h-56 overflow-hidden rounded-xl bg-gray-100">{previewImage ? <img src={previewImage} alt={previewProduct.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package size={48} className="text-gray-300" /></div>}{(previewProduct.images?.length || 0) > 1 && <><button type="button" aria-label={tr("sc.previous-product-photo")} onClick={() => { const images = previewProduct.images || []; const index = Math.max(0, images.indexOf(previewImage)); setPreviewImage(images[(index - 1 + images.length) % images.length]); }} className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"><ChevronLeft size={18} /></button><button type="button" aria-label={tr("sc.next-product-photo")} onClick={() => { const images = previewProduct.images || []; const index = Math.max(0, images.indexOf(previewImage)); setPreviewImage(images[(index + 1) % images.length]); }} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"><ChevronRight size={18} /></button></>}</div>{(previewProduct.images?.length || 0) > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{previewProduct.images?.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setPreviewImage(image)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${previewImage === image ? 'border-[#ff6a00]' : 'border-transparent'}`}><img src={image} alt={`${previewProduct.name} photo ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}<h3 className="mt-4 text-lg font-bold text-gray-900">{previewProduct.name}</h3><p className="mt-1 text-xl font-bold text-[#ff6a00]">{money(previewProduct.price)} / {previewProduct.unit}</p><p className="mt-3 text-sm leading-5 text-gray-600">{previewProduct.description || 'No product description added yet.'}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.stock')}</span><strong className="mt-1 block text-gray-900">{previewProduct.stock} units</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.minimum-order')}</span><strong className="mt-1 block text-gray-900">{previewProduct.minimumOrderQuantity || 1} {previewProduct.unit}</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.model-condition')}</span><strong className="mt-1 block truncate text-gray-900">{previewProduct.model || 'Not specified'} · {previewProduct.condition || 'New'}</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.fulfilment')}</span><strong className="mt-1 block text-gray-900">{previewProduct.deliveryAvailable ? 'Delivery' : ''}{previewProduct.deliveryAvailable && previewProduct.pickupAvailable ? ' + ' : ''}{previewProduct.pickupAvailable ? 'Pickup' : !previewProduct.deliveryAvailable ? 'Not specified' : ''}</strong></div></div>{previewProduct.preparationTime && <p className="mt-3 text-xs text-gray-500">Preparation: {previewProduct.preparationTime}</p>}<p className="mt-2 text-xs font-semibold text-orange-600">Store: {previewProduct.storeName || 'Storefront'}</p></div>
        </div>
      </div>}
      {!pricingPage && pricingGuideOpen && <div className="fixed inset-0 z-[65] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pricing-guide-title" onClick={() => setPricingGuideOpen(false)}><div className="w-full max-w-md rounded-2xl bg-white p-4 md:p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600"><DollarSign size={20} /></div><div><h2 id="pricing-guide-title" className="text-lg font-bold text-gray-900">{tr('sc.manage-prices-and-discounts')}</h2><p className="mt-2 text-sm leading-5 text-gray-600">{tr('sc.pricing-tools-are-now-kept-together-in-prici')}</p></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPricingGuideOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">{tr('sc.close')}</button><Link href="/seller-central/pricing" onClick={() => setPricingGuideOpen(false)} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">{tr('sc.go-to-pricing')}</Link></div></div></div>}
      {pricing && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="discount-title"><div className="w-full max-w-md rounded-2xl bg-white p-4 md:p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.pricing')}</p><h2 id="discount-title" className="mt-1 text-lg font-bold text-gray-900">{tr('sc.change-price-or-discount')}</h2><p className="mt-1 text-sm text-gray-500">{pricing.name}</p></div><button type="button" onClick={() => setPricing(null)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={18} /></button></div><label className="mt-5 block text-sm font-semibold text-gray-700">{tr('sc.pricing-type')}<select value={priceMode} onChange={(event) => setPriceMode(event.target.value as 'regular' | 'discount')} className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value="regular">{tr('sc.regular-price')}</option><option value="discount">{tr('sc.discount-price')}</option></select></label><label className="mt-4 block text-sm font-semibold text-gray-700">{tr('sc.price-in-bif')}<input type="number" min="1" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500" /></label><p className="mt-2 text-xs text-gray-500">{tr('sc.discount-price-must-be-lower-than-the-origin')}</p>{priceError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{priceError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPricing(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">{tr('sc.cancel')}</button><button type="button" disabled={savingPrice} onClick={() => void savePrice()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingPrice ? 'Saving…' : 'Save price'}</button></div></div></div>}
      {pendingDelete && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-product-title">
        <div className="w-full max-w-sm rounded-2xl bg-white p-4 md:p-6 shadow-2xl">
          <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600"><AlertTriangle size={20} /></div><div><h2 id="delete-product-title" className="text-base font-bold text-gray-900">{tr('sc.delete-product')}</h2><p className="mt-1 text-sm leading-5 text-gray-600">{tr('sc.this-will-permanently-remove')}<strong>{pendingDelete.name}</strong> and its product photos. This action cannot be undone.</p></div></div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={deleting} onClick={() => setPendingDelete(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">{tr('sc.cancel')}</button><button type="button" disabled={deleting} onClick={() => void deleteProduct()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete product'}</button></div>
        </div>
      </div>}
    </div>
  );
}

// Inventory Page
function InventoryPage({ lowStockOnly = false }: { lowStockOnly?: boolean }) {
  const { tr } = useLocale();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});
  const [savingStock, setSavingStock] = useState<number | null>(null);
  const [stockMessage, setStockMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/supplier/products`, { headers: authHeaders() });
        const rows = response.ok ? await response.json() : [];
        const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({
          id: Number(row.id), name: row.name || 'Product', sku: row.sku || `NZ-${row.id}`, stock: Number(row.stock ?? 0),
          reserved: Number(row.reserved ?? 0), available: Math.max(0, Number(row.stock ?? 0) - Number(row.reserved ?? 0)),
          threshold: Number(row.lowStockThreshold ?? 10), status: Number(row.stock ?? 0) === 0 ? 'out_of_stock' : Number(row.stock ?? 0) <= Number(row.lowStockThreshold ?? 10) ? 'low_stock' : 'active',
          price: Number(row.price ?? 0), storeName: row.supplier_name || 'Store', image: row.image || '',
        }));
        setInventory(lowStockOnly ? mapped.filter((item: any) => item.status !== 'active') : mapped);
        setStockDrafts(Object.fromEntries(mapped.map((item: any) => [item.id, String(item.stock)])));
      } catch { setInventory([]); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const saveStock = async (item: any) => {
    const stock = Number(stockDrafts[item.id]);
    if (!Number.isInteger(stock) || stock < 0) { setStockMessage('Stock must be a whole number of 0 or more.'); return; }
    setSavingStock(item.id); setStockMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/supplier/products/${item.id}`, { method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ stock }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update stock.');
      setInventory(items => items.map(current => current.id === item.id ? { ...current, stock, available: Math.max(0, stock - current.reserved), status: stock === 0 ? 'out_of_stock' : stock <= current.threshold ? 'low_stock' : 'active' } : current));
      setStockMessage(`${item.name} stock updated.`);
    } catch (error) { setStockMessage(error instanceof Error ? error.message : 'Could not update stock.'); }
    finally { setSavingStock(null); }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.inventory')}</p><h2 className="mt-1 text-2xl font-bold text-gray-900">{lowStockOnly ? 'Low stock alerts' : 'Stock management'}</h2><p className="mt-1 text-sm text-gray-500">{tr('sc.change-stock-quantities-here-prices-and-disc')}</p></div><Link href="/seller-central/pricing" className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100">{tr('sc.go-to-pricing')}</Link></div>
      {stockMessage && <p className="mb-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800" role="status">{stockMessage}</p>}
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">{tr('sc.total-products')}</p>
          <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">{tr('sc.low-stock')}</p>
          <p className="text-2xl font-bold text-orange-600">{inventory.filter(i => i.status === 'low_stock').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">{tr('sc.out-of-stock')}</p>
          <p className="text-2xl font-bold text-red-600">{inventory.filter(i => i.stock === 0).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">{tr('sc.total-value')}</p>
          <p className="text-2xl font-bold text-gray-900">{inventory.reduce((sum, item) => sum + item.stock * item.price, 0).toLocaleString()} BIF</p>
        </div>
      </div>

      {/* Inventory — cards on phones so nothing scrolls sideways */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-3 w-24 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        ) : !inventory.length ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">{tr('sc.no-products-found-2')}</div>
        ) : (
          inventory.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-gray-400">{item.sku}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}>{item.status === 'active' ? 'Active' : item.status === 'out_of_stock' ? 'Out of stock' : 'Low Stock'}</span>
              </div>
              <div className="mt-3 flex gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                <span>{tr('sc.stock')}<strong className={`ml-1 ${item.stock < item.threshold ? 'text-red-600' : 'text-gray-900'}`}>{item.stock}</strong></span>
                <span>{tr('sc.reserved')}<strong className="ml-1 text-gray-900">{item.reserved}</strong></span>
                <span>{tr('sc.available')}<strong className="ml-1 text-gray-900">{item.available}</strong></span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input type="number" min="0" step="1" value={stockDrafts[item.id] ?? item.stock} onChange={(event) => setStockDrafts(old => ({ ...old, [item.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500" aria-label={`Stock for ${item.name}`} />
                <button type="button" disabled={savingStock !== null} onClick={() => void saveStock(item)} className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50">{savingStock === item.id ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inventory Table (desktop) */}
      <div className="hidden rounded-xl border border-gray-200 bg-white md:block">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">{tr('sc.product')}</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">SKU</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">{tr('sc.stock')}</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">{tr('sc.reserved')}</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">{tr('sc.available')}</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">{tr('sc.status')}</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">{tr('sc.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-6 py-4">
                    <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.sku}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-bold ${item.stock < item.threshold ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.reserved}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.available}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {item.status === 'active' ? 'Active' : item.status === 'out_of_stock' ? 'Out of stock' : 'Low Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2"><input type="number" min="0" step="1" value={stockDrafts[item.id] ?? item.stock} onChange={(event) => setStockDrafts(old => ({ ...old, [item.id]: event.target.value }))} className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-xs outline-none focus:border-orange-500" aria-label={`Stock for ${item.name}`} /><button type="button" disabled={savingStock !== null} onClick={() => void saveStock(item)} className="rounded-lg bg-orange-500 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-orange-600 disabled:opacity-50">{savingStock === item.id ? 'Saving…' : 'Save'}</button></div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockManagementPage() {
  const { tr } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [values, setValues] = useState<Record<number, { stock: string; price: string; mode: 'regular' | 'discount' }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<Product | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/supplier/products`, { headers: authHeaders() });
        const rows = response.ok ? await response.json() : [];
        const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({ id: Number(row.id), name: row.name || 'Product', price: Number(row.price ?? 0), compareAtPrice: row.compareAtPrice == null ? null : Number(row.compareAtPrice), stock: Number(row.stock ?? 0), category: row.category || 'Other', image: row.image || '', images: row.image ? [row.image] : [], unit: row.unit || 'piece', storeName: row.supplier_name || 'Store', description: row.description || '', condition: row.condition || 'New', deliveryAvailable: row.deliveryAvailable !== false, pickupAvailable: row.pickupAvailable === true, preparationTime: row.preparationTime || '', minimumOrderQuantity: Number(row.moq ?? 1) }));
        setProducts(mapped);
        setValues(Object.fromEntries(mapped.map(product => [product.id, { stock: String(product.stock), price: String(product.price), mode: 'discount' as const }])));
      } finally { setLoading(false); }
    };
    void load();
  }, []);
  const saveRow = async (product: Product) => {
    const value = values[product.id];
    if (!value || saving !== null) return;
    const stock = Number(value.stock); const price = Number(value.price);
    if (!Number.isInteger(stock) || stock < 0 || !Number.isFinite(price) || price <= 0) { setMessage('Enter valid stock and price values.'); return; }
    const original = product.compareAtPrice || product.price;
    if (value.mode === 'discount' && price >= original) { setMessage('A discount price must be below the original price.'); return; }
    setSaving(product.id); setMessage('');
    try {
      const token = localStorage.getItem('sc_token') || ''; const seller = JSON.parse(localStorage.getItem('sc_user') || '{}');
      const priceResponse = await fetch(`${API_BASE}/api/new-products/${product.id}/pricing`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Seller-Id': String(seller.id || '') }, body: JSON.stringify({ price, mode: value.mode, expectedPrice: product.price }) });
      if (!priceResponse.ok) throw new Error('Could not update price.');
      const stockResponse = await fetch(`${API_BASE}/api/supplier/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ stock }) });
      const stockPayload = await stockResponse.json(); if (!stockResponse.ok) throw new Error(stockPayload.error || 'Could not update stock.');
      setProducts(items => items.map(item => item.id === product.id ? { ...item, price, stock: Number(stockPayload.stock ?? stock) } : item)); setMessage(`${product.name} updated.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update product.'); }
    finally { setSaving(null); }
  };
  return <div className="p-4 md:p-6"><div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wider text-orange-600">{tr('sc.inventory')}</p><h2 className="mt-1 text-2xl font-bold text-gray-900">{tr('sc.update-stock-discount')}</h2><p className="mt-1 text-sm text-gray-500">{tr('sc.edit-stock-and-pricing-for-every-product-dir')}</p></div>{message && <p className="mb-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800" role="status">{message}</p>}<div className="space-y-3 md:hidden">{loading ? <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">{tr('sc.loading-products')}</div> : !products.length ? <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">{tr('sc.no-products-found-2')}</div> : products.map(product => { const value = values[product.id] || { stock: String(product.stock), price: String(product.price), mode: 'discount' as const }; return <div key={product.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="truncate text-sm font-bold text-gray-900">{product.name}</p><p className="mt-0.5 text-xs text-gray-500">{product.storeName || 'Store'} · {product.unit} · MOQ {product.minimumOrderQuantity || 1}</p><p className="mt-1 text-sm font-semibold text-gray-700">{product.price.toLocaleString()} BIF</p><div className="mt-3 space-y-2 border-t border-gray-100 pt-3"><div><label className="text-[11px] font-semibold text-gray-500">{tr('sc.stock')}</label><input type="number" min="0" step="1" value={value.stock} onChange={event => setValues(old => ({ ...old, [product.id]: { ...value, stock: event.target.value } }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500" aria-label={`Stock for ${product.name}`} /></div><div><label className="text-[11px] font-semibold text-gray-500">{tr('sc.new-price-discount')}</label><div className="mt-1 flex gap-2"><select value={value.mode} onChange={event => setValues(old => ({ ...old, [product.id]: { ...value, mode: event.target.value as 'regular' | 'discount' } }))} className="rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs"><option value="discount">{tr('sc.discount')}</option><option value="regular">{tr('sc.regular')}</option></select><input type="number" min="1" value={value.price} onChange={event => setValues(old => ({ ...old, [product.id]: { ...value, price: event.target.value } }))} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500" aria-label={`New price for ${product.name}`} /></div></div><button type="button" onClick={() => void saveRow(product)} disabled={saving !== null} className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving === product.id ? 'Saving…' : 'Save changes'}</button></div></div>; })}</div><div className="hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block"><table className="w-full text-left"><thead className="border-b border-gray-200 bg-gray-50"><tr><th className="px-5 py-4 text-xs font-bold uppercase text-gray-500">{tr('sc.product')}</th><th className="px-5 py-4 text-xs font-bold uppercase text-gray-500">{tr('sc.store')}</th><th className="px-5 py-4 text-xs font-bold uppercase text-gray-500">{tr('sc.current-price')}</th><th className="px-5 py-4 text-xs font-bold uppercase text-gray-500">{tr('sc.new-price-discount')}</th><th className="px-5 py-4 text-xs font-bold uppercase text-gray-500">{tr('sc.stock')}</th><th className="px-5 py-4 text-right text-xs font-bold uppercase text-gray-500">{tr('sc.action')}</th></tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">{tr('sc.loading-products')}</td></tr> : !products.length ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">{tr('sc.no-products-found-2')}</td></tr> : products.map(product => { const value = values[product.id] || { stock: String(product.stock), price: String(product.price), mode: 'discount' as const }; const isPreviewing = preview?.id === product.id; return <><tr key={product.id} className="hover:bg-gray-50"><td className="px-5 py-4"><p className="max-w-[240px] truncate text-sm font-bold text-gray-900">{product.name}</p><p className="mt-1 text-xs text-gray-500">{product.unit} · MOQ {product.minimumOrderQuantity || 1}</p></td><td className="px-5 py-4 text-sm text-gray-600">{product.storeName || 'Store'}</td><td className="px-5 py-4 text-sm font-semibold text-gray-700">{product.price.toLocaleString()} BIF</td><td className="px-5 py-4"><div className="flex items-center gap-2"><select value={value.mode} onChange={event => setValues(old => ({ ...old, [product.id]: { ...value, mode: event.target.value as 'regular' | 'discount' } }))} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"><option value="discount">{tr('sc.discount')}</option><option value="regular">{tr('sc.regular')}</option></select><input type="number" min="1" value={value.price} onChange={event => setValues(old => ({ ...old, [product.id]: { ...value, price: event.target.value } }))} className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500" aria-label={`New price for ${product.name}`} /></div><p className="mt-1 text-[11px] text-gray-500">{tr('sc.discount-price-must-be-below-current-price')}</p></td><td className="px-5 py-4"><input type="number" min="0" step="1" value={value.stock} onChange={event => setValues(old => ({ ...old, [product.id]: { ...value, stock: event.target.value } }))} className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500" aria-label={`Stock for ${product.name}`} /></td><td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => setPreview(isPreviewing ? null : product)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100">{isPreviewing ? 'Hide preview' : 'Preview'}</button><button type="button" onClick={() => void saveRow(product)} disabled={saving !== null} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50">{saving === product.id ? 'Saving…' : 'Save changes'}</button></div></td></tr>{isPreviewing && <tr key={`${product.id}-preview`}><td colSpan={6} className="bg-gray-50 px-5 py-5"><div className="flex gap-5 rounded-xl border border-gray-200 bg-white p-4"><div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-gray-400">{tr('sc.no-image')}</div>}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.product-preview')}</p><h3 className="mt-1 text-lg font-bold text-gray-900">{product.name}</h3><p className="mt-1 text-sm text-gray-600">{product.description || 'No description has been added for this product.'}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500"><span>{product.category}</span><span>{product.condition || 'New'}</span><span>{product.price.toLocaleString()} BIF</span><span>{product.stock} in stock</span><span>MOQ {product.minimumOrderQuantity || 1}</span><span>{product.deliveryAvailable ? 'Delivery available' : 'Pickup only'}</span></div></div></div></td></tr>}</>; })}</tbody></table></div></div>;
}

function PaymentsComingSoonPage() {
  const { tr } = useLocale();
  return <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8"><div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 md:p-8 text-center shadow-sm"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-orange-600"><CreditCard size={26} /></div><h2 className="mt-5 text-2xl font-bold text-gray-900">{tr('sc.payments-are-coming-soon')}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{tr('sc.payment-collection-and-transaction-tools-are-2')}</p></div></div>;
}

function SectionComingSoonPage({ title }: { title: string }) {
  const { tr } = useLocale();
  return <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8"><div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 md:p-8 text-center shadow-sm"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600"><BarChart3 size={26} /></div><h2 className="mt-5 text-2xl font-bold text-gray-900">{title}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{tr('sc.this-workspace-is-being-prepared-your-live-p')}</p></div></div>;
}

function SalesReportPage() {
  const { tr } = useLocale();
  const { data, loading, error } = useSellerAnalytics();
  const best = data.topProducts[0];
  const cards = [
    { label: 'Goods revenue', value: bif(data.revenue), note: `${data.orders} order${data.orders === 1 ? '' : 's'} · ${data.unitsSold} unit${data.unitsSold === 1 ? '' : 's'}` },
    { label: 'Shipping collected', value: bif(data.shippingCollected), note: 'Delivery fees you charged' },
    { label: 'Total billed', value: bif(data.totalCollected), note: 'Goods + shipping' },
    { label: 'Average order', value: bif(data.averageOrderValue), note: best ? `Best seller: ${best.name}` : 'No sales yet' },
  ];

  return (
    <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.reports')}</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">{tr('sc.sales-reports')}</h2>
        <p className="mt-1 text-sm text-gray-500">{tr('sc.goods-revenue-counts-only-your-own-line-item')}</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {/* Say why the numbers are empty instead of just showing zeros. */}
      {!loading && !error && data.orders === 0 && (
        <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {data.stores === 0
            ? 'No store is linked to your account yet, so no sales can be matched to you. Create a store to start tracking.'
            : 'No orders have reached your store yet. Sales appear here as soon as a buyer orders your products.'}
        </p>
      )}
      {!loading && !error && data.orders > 0 && data.revenue === 0 && (
        <p className="mb-4 rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          You have {data.orders} order{data.orders === 1 ? '' : 's'}, but they are all cancelled or disputed, so they are not counted as revenue.
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900 md:text-2xl">{loading ? '…' : card.value}</p>
            <p className="mt-1 truncate text-[11px] text-gray-400">{card.note}</p>
          </div>
        ))}
      </div>

      <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <h3 className="font-bold text-gray-900">{tr('sc.sales-over-the-last-30-days')}</h3>
        <p className="mt-1 text-xs text-gray-500">{tr('sc.daily-revenue-from-your-active-orders')}</p>
        <div className="mt-5"><SalesChart points={data.daily} /></div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <h3 className="font-bold text-gray-900">{tr('sc.best-selling-products')}</h3>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">{tr('sc.loading-2')}</p>
        ) : !data.topProducts.length ? (
          <p className="mt-4 text-sm text-gray-500">{tr('sc.no-sales-recorded-yet-once-buyers-order-your')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topProducts.map((product, index) => {
              const share = data.revenue > 0 ? Math.round((product.revenue / data.revenue) * 100) : 0;
              return (
                <div key={`${product.productId}-${index}`} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{index + 1}. {product.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{product.units} unit{product.units === 1 ? '' : 's'} sold</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gray-900">{bif(product.revenue)}</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-[#ff9900]" style={{ width: `${Math.max(share, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InventoryReportPage() {
  const { tr } = useLocale();
  const { data, loading, error } = useSellerAnalytics();
  const cards = [
    { label: 'Products', value: String(data.products), note: `${data.stores} store${data.stores === 1 ? '' : 's'}` },
    { label: 'Low stock', value: String(data.lowStock), note: '10 units or fewer', tone: 'text-orange-600' },
    { label: 'Out of stock', value: String(data.outOfStock), note: 'Needs restocking', tone: 'text-red-600' },
    { label: 'Units sold', value: String(data.unitsSold), note: 'All active orders' },
  ];

  return (
    <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.reports')}</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">{tr('sc.inventory-reports')}</h2>
        <p className="mt-1 text-sm text-gray-500">{tr('sc.stock-health-across-every-store-you-own')}</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`mt-1 text-xl font-bold md:text-2xl ${card.tone || 'text-gray-900'}`}>{loading ? '…' : card.value}</p>
            <p className="mt-1 text-[11px] text-gray-400">{card.note}</p>
          </div>
        ))}
      </div>
      <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900">{tr('sc.fastest-moving-products')}</h3>
          <Link href="/seller-central/inventory" className="text-xs font-bold text-[#ff9900]">{tr('sc.manage-stock')}</Link>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">{tr('sc.loading-2')}</p>
        ) : !data.topProducts.length ? (
          <p className="mt-4 text-sm text-gray-500">{tr('sc.no-sales-recorded-yet')}</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {data.topProducts.map((product, index) => (
              <div key={`${product.productId}-${index}`} className="flex items-center justify-between gap-3 py-3">
                <p className="min-w-0 truncate text-sm font-semibold text-gray-800">{product.name}</p>
                <p className="shrink-0 text-xs text-gray-500">{product.units} sold</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PricingManagementPage() {
  const { tr } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { price: string; mode: 'regular' | 'discount' }>>({});
  const [preview, setPreview] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/supplier/products`, { headers: authHeaders() });
        const rows = response.ok ? await response.json() : [];
        const mapped = (Array.isArray(rows) ? rows : []).map((row: any) => ({
          id: Number(row.id), name: row.name || 'Product', price: Number(row.price ?? 0),
          compareAtPrice: row.compareAtPrice == null ? null : Number(row.compareAtPrice), stock: Number(row.stock ?? 0),
          category: row.category || 'Other', image: row.image || '', description: row.description || '',
          storeName: row.supplier_name || 'Store', unit: row.unit || 'piece', minimumOrderQuantity: Number(row.moq ?? 1),
        }));
        setProducts(mapped);
        setDrafts(Object.fromEntries(mapped.map((product: Product) => [product.id, { price: String(product.price), mode: product.compareAtPrice ? 'discount' : 'regular' }])));
      } catch { setProducts([]); }
      finally { setLoading(false); }
    };
    void load();
  }, []);

  const savePrice = async (product: Product) => {
    const draft = drafts[product.id];
    const price = Number(draft?.price);
    const original = product.compareAtPrice || product.price;
    if (!draft || !Number.isFinite(price) || price <= 0 || (draft.mode === 'discount' && price >= original)) {
      setMessage('Enter a positive price. A discount must be below the original price.'); return;
    }
    setSaving(product.id); setMessage('');
    try {
      const response = await fetch(`${API_BASE}/api/new-products/${product.id}/pricing`, { method: 'PATCH', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ price, mode: draft.mode, expectedPrice: product.price }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not save price.');
      setProducts(items => items.map(item => item.id === product.id ? { ...item, price, compareAtPrice: payload.compareAtPrice == null ? null : Number(payload.compareAtPrice) } : item));
      setMessage(`${product.name} price updated.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save price.'); }
    finally { setSaving(null); }
  };

  return <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.pricing')}</p><h2 className="mt-1 text-2xl font-bold text-gray-900">{tr('sc.price-management')}</h2><p className="mt-1 text-sm text-gray-500">{tr('sc.update-regular-prices-and-discounts-for-your')}</p></div><Link href="/seller-central/inventory" className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50">{tr('sc.manage-stock')}</Link></div>{message && <p className="mb-4 rounded-lg bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800" role="status">{message}</p>}<div className="space-y-3 md:hidden">{loading ? <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">{tr('sc.loading-prices')}</div> : !products.length ? <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">{tr('sc.no-products-found-2')}</div> : products.map(product => { const draft = drafts[product.id] || { price: String(product.price), mode: product.compareAtPrice ? 'discount' as const : 'regular' as const }; return <div key={product.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package size={18} className="m-3 text-gray-400" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-gray-900">{product.name}</p><p className="mt-0.5 truncate text-xs text-gray-500">{product.storeName} · {product.unit}</p><p className="mt-1 text-sm font-bold text-gray-900">{product.price.toLocaleString()} BIF</p>{product.compareAtPrice && <p className="text-xs text-emerald-600">Discount active · was {product.compareAtPrice.toLocaleString()} BIF</p>}</div></div><div className="mt-3 space-y-2 border-t border-gray-100 pt-3"><select value={draft.mode} onChange={event => setDrafts(old => ({ ...old, [product.id]: { ...draft, mode: event.target.value as 'regular' | 'discount' } }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="regular">{tr('sc.regular-price')}</option><option value="discount">{tr('sc.discount-price')}</option></select><input type="number" min="1" value={draft.price} onChange={event => setDrafts(old => ({ ...old, [product.id]: { ...draft, price: event.target.value } }))} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500" aria-label={`New price for ${product.name}`} placeholder={tr("sc.new-price")} /><div className="flex gap-2"><button type="button" onClick={() => setPreview(product)} className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-700"><Eye size={13} className="mr-1 inline" />{tr('sc.view')}</button><button type="button" disabled={saving !== null} onClick={() => void savePrice(product)} className="flex-1 rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving === product.id ? 'Saving…' : 'Save'}</button></div></div></div>; })}</div><div className="hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block"><table className="w-full text-left"><thead className="border-b border-gray-200 bg-gray-50"><tr><th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">{tr('sc.product')}</th><th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">{tr('sc.store')}</th><th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">{tr('sc.current-price')}</th><th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">{tr('sc.price-type')}</th><th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-500">{tr('sc.new-price')}</th><th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-gray-500">{tr('sc.actions')}</th></tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-gray-500">{tr('sc.loading-prices')}</td></tr> : !products.length ? <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-gray-500">{tr('sc.no-products-found-2')}</td></tr> : products.map(product => { const draft = drafts[product.id] || { price: String(product.price), mode: product.compareAtPrice ? 'discount' as const : 'regular' as const }; return <tr key={product.id} className="hover:bg-gray-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package size={18} className="m-3 text-gray-400" />}</div><div><p className="max-w-[240px] truncate text-sm font-bold text-gray-900">{product.name}</p><p className="mt-1 text-xs text-gray-500">{product.category} · {product.unit}</p></div></div></td><td className="px-5 py-4 text-sm text-gray-600">{product.storeName}</td><td className="px-5 py-4"><p className="text-sm font-bold text-gray-900">{product.price.toLocaleString()} BIF</p>{product.compareAtPrice && <p className="mt-1 text-xs text-emerald-600">Discount active · original {product.compareAtPrice.toLocaleString()} BIF</p>}</td><td className="px-5 py-4"><select value={draft.mode} onChange={event => setDrafts(old => ({ ...old, [product.id]: { ...draft, mode: event.target.value as 'regular' | 'discount' } }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold"><option value="regular">{tr('sc.regular-price')}</option><option value="discount">{tr('sc.discount-price')}</option></select></td><td className="px-5 py-4"><input type="number" min="1" value={draft.price} onChange={event => setDrafts(old => ({ ...old, [product.id]: { ...draft, price: event.target.value } }))} className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500" aria-label={`New price for ${product.name}`} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setPreview(product)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"><Eye size={13} className="mr-1 inline" />{tr('sc.view')}</button><button type="button" disabled={saving !== null} onClick={() => void savePrice(product)} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50">{saving === product.id ? 'Saving…' : 'Save'}</button></div></td></tr>; })}</tbody></table></div>{preview && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pricing-preview-title" onClick={() => setPreview(null)}><div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-orange-600">{tr('sc.product-preview')}</p><h2 id="pricing-preview-title" className="mt-1 text-lg font-bold text-gray-900">{preview.name}</h2></div><button type="button" onClick={() => setPreview(null)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={18} /></button></div><div className="p-5"><div className="h-52 overflow-hidden rounded-xl bg-gray-100">{preview.image ? <img src={preview.image} alt={preview.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package size={42} className="text-gray-300" /></div>}</div><p className="mt-4 text-sm leading-6 text-gray-600">{preview.description || 'No description has been added for this product.'}</p><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.store')}</span><strong className="mt-1 block text-gray-900">{preview.storeName}</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.category')}</span><strong className="mt-1 block text-gray-900">{preview.category}</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.current-price')}</span><strong className="mt-1 block text-gray-900">{preview.price.toLocaleString()} BIF</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">{tr('sc.stock')}</span><strong className="mt-1 block text-gray-900">{preview.stock} {preview.unit}</strong></div></div></div></div></div>}</div>;
}

// Stores Page
function StoresPage() {
  const { tr } = useLocale();
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const userData = localStorage.getItem('sc_user');
        const user = userData ? JSON.parse(userData) : null;
        if (user) {
          const res = await fetch(`${API_BASE}/api/stores/seller/${user.id}`, { headers: authHeaders() });
          if (res.ok) {
            const data = await res.json();
            const storeRows = Array.isArray(data.stores) ? data.stores : (data.store ? [data.store] : []);
            if (storeRows.length) {
              const productCounts = await Promise.all(storeRows.map(async (storeRow: any) => {
                try { const response = await fetch(`${API_BASE}/api/stores/${storeRow.id}/products`, { headers: authHeaders() }); const payload = response.ok ? await response.json() : {}; const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.products) ? payload.products : []); return rows.length; } catch { return 0; }
              }));
              setStores(storeRows.map((storeRow: any, index: number) => ({
                id: storeRow.id, name: storeRow.name, description: storeRow.description || '',
                location: `${storeRow.commune || ''}, ${storeRow.province || ''}`.replace(/^, |, $/g, ''),
                status: storeRow.status, products: productCounts[index], orders: storeRow.totalSales || 0,
                revenue: parseFloat(storeRow.totalRevenue) || 0, rating: storeRow.rating || 0, slug: storeRow.slug,
                logo: storeRow.logo || storeRow.storefront_config?.header?.profileImage || '', banner: storeRow.banner || storeRow.storefront_config?.shopSign?.imageUrl || '', isVerified: storeRow.isVerified ?? storeRow.is_verified,
              })));
            } else {
              setStores([]);
            }
          } else {
            setStores([]);
          }
        } else {
          setStores([]);
        }
      } catch {
        setStores([]);
      }
    setLoading(false);
  };
  fetchStores();
  }, []);

  const deleteStore = async (store: StoreInfo) => {
    const response = await fetch(`${API_BASE}/api/stores/${store.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('sc_token') || ''}` } });
    // Thrown rather than swallowed: the dialog stays open and shows why it failed.
    if (!response.ok) throw new Error('Could not delete this store. Please try again.');
    setStores(previous => previous.filter(item => item.id !== store.id));
  };

  const askDeleteStore = (store: StoreInfo) => setNotice({
    title: `Delete “${store.name}”?`,
    description: 'This removes the store and its storefront configuration. It cannot be undone.',
    confirmLabel: 'Delete store',
    tone: 'danger',
    onConfirm: () => deleteStore(store),
  });

  return (
    <div className="min-h-full bg-[#f6f7f8] p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-[#1f2937]">{tr('sc.my-stores')}</h2>
          <p className="mt-1 text-xs text-gray-500">{tr('sc.manage-storefront-design-public-pages-produc')}</p>
        </div>
        <Link href="/seller-central/stores/new" className="flex items-center gap-2 rounded bg-[#ff6a00] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#e85f00]">
          <Plus size={14} />{tr('sc.create-store')}</Link>
      </div>

      {!loading && stores.length > 0 && <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{tr('sc.stores')}</p><p className="mt-1 text-2xl font-bold text-gray-900">{stores.length}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{tr('sc.products')}</p><p className="mt-1 text-2xl font-bold text-gray-900">{stores.reduce((sum, store) => sum + store.products, 0)}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{tr('sc.active-stores')}</p><p className="mt-1 text-2xl font-bold text-emerald-600">{stores.filter(store => store.status === 'active').length}</p></div><div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{tr('sc.orders')}</p><p className="mt-1 text-2xl font-bold text-gray-900">{stores.reduce((sum, store) => sum + store.orders, 0)}</p></div></div>}

      {/* Stores Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 animate-pulse">
              <div className="h-8 bg-gray-100 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
            </div>
          ))
        ) : stores.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Store size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-bold text-gray-900 mb-2">{tr('sc.no-stores-yet')}</p>
            <p className="text-sm text-gray-500 mb-4">{tr('sc.create-your-first-store-to-start-selling')}</p>
            <Link href="/seller-central/stores/new" className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff9900] text-white rounded-lg font-bold hover:bg-[#e68a00]">
              <Plus size={16} />{tr('sc.create-store')}</Link>
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative m-2 h-36 overflow-hidden rounded-xl bg-gradient-to-r from-[#edf6ff] to-[#f8fbff]">
                {store.banner ? (
                  <><img src={store.banner} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/15 to-transparent" />{store.logo && <div className="absolute bottom-3 left-3 h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-white p-1 shadow-md"><img src={store.logo} alt={`${store.name} logo`} className="h-full w-full object-contain" /></div>}</>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {store.logo ? <img src={store.logo} alt={`${store.name} logo`} className="h-20 w-40 object-contain" /> : <div className="flex flex-col items-center justify-center text-[#718096]"><div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#cbd8e5] bg-white shadow-sm"><Store size={32} strokeWidth={1.6} className="text-[#1677d2]" /></div><span className="mt-2 text-[10px] font-medium text-gray-400">{tr('sc.store-image')}</span></div>}
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {store.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700">
                      <Shield size={10} />{tr('sc.verified')}</span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      store.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {store.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3">
                <div className="mb-1 flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-current" />
                  <span className="text-xs font-semibold text-gray-600">{store.rating}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="truncate text-lg font-bold text-gray-900">{store.name}</h3>
                </div>
                <p className="mb-1 line-clamp-2 min-h-8 text-xs leading-4 text-gray-500">{store.description || 'No store description added yet.'}</p>
                {store.location && <p className="mb-4 text-[10px] font-medium text-gray-400">{store.location}</p>}
                <div className="mb-4 grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold text-gray-900">{store.products}</p>
                    <p className="text-[10px] text-gray-500">{tr('sc.products')}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold text-gray-900">{store.orders}</p>
                    <p className="text-[10px] text-gray-500">{tr('sc.orders')}</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold text-orange-600">{store.rating}</p>
                    <p className="text-[10px] text-gray-500">{tr('sc.rating')}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/seller-central/stores/${store.id}/storefront`} className="flex min-w-[140px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#ff6a00] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#e85f00]">
                    <Palette size={12} />{tr('sc.customize-storefront')}</Link>
                  {store.slug && <a href={`${STORE_BASE_URL}/store/${store.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><ExternalLink size={13} />{tr('sc.view-store-2')}</a>}
                  <button onClick={() => askDeleteStore(store)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={13} />{tr('sc.delete')}</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Login Page
function LoginPage({ onLogin, onSignup }: { onLogin: (phone: string, password: string) => Promise<any>; onSignup: (data: any) => Promise<any> }) {
  const { tr } = useLocale();
  const [isSignup, setIsSignup] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [countryCode, setCountryCode] = useState('+257');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidPhone(phone)) { setError(PHONE_HINT); return; }
    if (isSignup && password.length < 6) { setError(tr('auth.passwordTooShort')); return; }
    if (isSignup && password !== confirmPassword) { setError(tr('auth.passwordsDoNotMatch')); return; }
    if (isSignup && !agreedToTerms) { setError(tr('auth.mustAgreeToTerms')); return; }
    setLoading(true);

    try {
      const result = isSignup
        ? await onSignup({ name, businessName, phone: countryCode + phone, password, location })
        : await onLogin(countryCode + phone, password);
      if (result && result.success === false) setError(result.error || 'An error occurred. Please try again.');
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#232f3e] flex items-center justify-center overflow-y-auto p-3 py-4 relative sm:p-4">
      <CommerceBackground tone="dark" />
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-[#ff9900]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-[#ff9900]/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
      
      <div className="w-full max-w-md relative z-10 my-auto">
        {/* Logo */}
        {!isSignup && (
        <div className="text-center mb-4 sm:mb-8">
          <div className="h-12 w-12 rounded-2xl bg-[#ff9900] flex items-center justify-center mx-auto mb-2 shadow-lg shadow-[#ff9900]/30 sm:mb-4 sm:h-16 sm:w-16">
            <Store size={24} className="text-white sm:hidden" /><Store size={32} className="hidden text-white sm:block" />
          </div>
          <h1 className="text-xl font-bold text-white sm:text-3xl">{tr('app.name')}</h1>
          <p className="text-gray-400 mt-1 text-sm sm:mt-2 sm:text-base">{tr('app.tagline')}</p>
        </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-5 md:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 sm:text-xl sm:mb-6">
            {isSignup ? tr('auth.signUpTitle') : tr('auth.signIn')}
          </h2>
          
          <form onSubmit={handleSubmit} className={`space-y-2.5 sm:space-y-3.5 ${isSignup ? "" : ""}`}>
            {isSignup && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('sc.full-name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('sc.business-name')}</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Kigali Fresh Traders"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('sc.location')}</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Nyarugenge, Kigali"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('auth.phone')}</label>
              <div className="flex items-center gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]"
                >
                  <option value="+257">🇧🇮 +257</option>
                  <option value="+250">🇷🇼 +250</option>
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="61 23 4567"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
              />
            </div>

            {isSignup && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{tr('auth.confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                />
                {confirmPassword && (
                  <p className={`mt-1.5 text-xs font-semibold ${password === confirmPassword ? 'text-emerald-600' : 'text-red-600'}`}>
                    {password === confirmPassword ? `✓ ${tr('auth.passwordsMatch')}` : `✕ ${tr('auth.passwordsDoNotMatch')}`}
                  </p>
                )}
              </div>
            )}

            {isSignup && (
              <label className="flex items-start gap-2.5 text-xs text-gray-600">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#ff9900] focus:ring-[#ff9900]" />
                <span>{tr('auth.agreeToTermsPrefix')} <a href="/seller-central/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#ff9900] underline hover:text-[#e68a00]">{tr('auth.agreeToTermsLink')}</a></span>
              </label>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignup && (!confirmPassword || password !== confirmPassword || !agreedToTerms))}
              className="w-full py-2.5 bg-[#ff9900] text-white rounded-xl font-bold sm:py-3 hover:bg-[#e68a00] transition-colors disabled:opacity-50"
            >
              {loading ? tr('common.loading') : (isSignup ? tr('auth.createAccount') : tr('auth.signIn'))}
            </button>
          </form>

          <div className="mt-3 text-center sm:mt-6">
            <p className="text-sm text-gray-500">
              {isSignup ? tr('auth.hasAccount') : tr('auth.noAccount')}{' '}
              <button 
                onClick={() => setIsSignup(!isSignup)} 
                className="text-[#ff9900] font-semibold hover:underline"
              >
                {isSignup ? tr('auth.signIn') : tr('auth.signUp')}
              </button>
            </p>
          </div>

          {!isSignup && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-center sm:mt-4 sm:pt-4">
              <p className="text-xs text-gray-500">
                {tr('auth.forgot')} <Link href="/seller-central/forgot-password" className="text-[#ff9900] hover:underline">{tr('auth.reset')}</Link>
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-center sm:mt-6"><LanguageSwitcher /></div>

        <p className="text-center text-xs text-gray-500 mt-2">
          <a href="https://nzanila.com" className="text-white hover:underline">← {tr('nav.backToMarketplace')}</a>
        </p>
      </div>
    </div>
  );
}

// Side Panel - slides in from the right, used for Notifications and Messages
function SidePanel({ open, onClose, widthClass, title, scroll = true, full = false, children }: { open: boolean; onClose: () => void; widthClass?: string; title: string; scroll?: boolean; full?: boolean; children: React.ReactNode }) {
  const { tr } = useLocale();
  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${open ? '' : 'pointer-events-none invisible'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-3 flex ${full ? '' : 'left-auto'} w-[calc(100%-1.5rem)] ${widthClass || ''} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr("sc.close-panel")}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className={`panel-embedded min-h-0 flex-1 ${scroll ? 'overflow-y-auto' : 'overflow-hidden'}`}>{children}</div>
      </div>
    </div>
  );
}

// App Layout
// Phone-only bottom navigation: the four screens sellers use most, plus the full menu.
function MobileBottomNav({ onOpenMenu, ordersNeedingAction = 0 }: { onOpenMenu: () => void; ordersNeedingAction?: number }) {
  const { tr } = useLocale();
  const [location] = useLocation();
  const currentPath = location.split('?')[0];
  const items = [
    { label: 'Home', icon: Home, href: '/seller-central' },
    { label: 'Orders', icon: ShoppingCart, href: '/seller-central/orders', count: ordersNeedingAction },
    { label: 'Products', icon: Package, href: '/seller-central/products' },
    { label: 'Stores', icon: Store, href: '/seller-central/stores' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgba(0,0,0,0.06)] lg:hidden" aria-label={tr("sc.main")}>
      {items.map(({ label, icon: Icon, href, count }) => {
        const active = currentPath === href;
        return (
          <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${active ? 'text-[#ff9900]' : 'text-gray-500'}`}>
            <span className="relative">
              <Icon size={20} />
              {!!count && <span className="absolute -right-2 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#ff9900] px-1 text-[9px] font-bold text-white ring-2 ring-white">{count}</span>}
            </span>
            {label}
          </Link>
        );
      })}
      <button type="button" onClick={onOpenMenu} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-gray-500">
        <Menu size={20} />{tr('sc.menu')}</button>
    </nav>
  );
}

function AppLayout({ children, title, onLogout, chromeless = false }: { children: React.ReactNode; title: string; onLogout: () => void; chromeless?: boolean }) {
  const { tr } = useLocale();

  // Publish the *visual* viewport height. On iOS the keyboard overlays the page without
  // shrinking 100dvh, so a chat sized off 100dvh ends up with its composer hidden behind
  // the keyboard; sized off --sc-vv it shrinks with the keyboard instead.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      document.documentElement.style.setProperty('--sc-vv', `${Math.round(viewport.height)}px`);
      const keyboardOpen = Math.max(0, window.innerHeight - viewport.height) > 150;
      document.documentElement.classList.toggle('sc-keyboard-open', keyboardOpen);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--sc-vv');
      document.documentElement.classList.remove('sc-keyboard-open');
    };
  }, []);

  // Chromeless (the messenger): no bottom nav, no page scroll — the chat owns the
  // viewport and its message history is the only scroller.
  useEffect(() => {
    if (!chromeless) return;
    document.documentElement.classList.add('sc-chromeless');
    return () => document.documentElement.classList.remove('sc-chromeless');
  }, [chromeless]);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [panel, setPanel] = useState<'notifications' | null>(null);
  const openNotifications = () => setPanel('notifications');
  const closePanel = () => setPanel(null);
  // One fetch, shared by the prompt and the sidebar badge.
  const verificationStatus = useVerificationStatus();
  const ordersNeedingAction = useOrdersNeedingAction();

  // h-dvh, not h-screen, so a phone's collapsing address bar doesn't cut off the bottom;
  // in chromeless mode the shell follows the visual viewport so it shrinks with the keyboard.
  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50" style={chromeless ? { height: 'var(--sc-vv, 100dvh)' } : undefined}>
      <VerificationPrompt status={verificationStatus} />
      <Sidebar isOpen={sidebarOpen} mobileOpen={mobileNavOpen} onClose={() => setSidebarOpen(!sidebarOpen)} onCloseMobile={() => setMobileNavOpen(false)} onOpenNotifications={openNotifications} verificationStatus={verificationStatus} ordersNeedingAction={ordersNeedingAction} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title={title} onLogout={onLogout} onOpenNotifications={openNotifications} />
        <main className={chromeless ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'flex-1 overflow-y-auto overflow-x-hidden'}>
          {/* Room for the fixed bottom nav on phones — except in chromeless mode, where there is none. */}
          <div className={chromeless ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-[1440px] pb-16 lg:pb-0'}>{children}</div>
        </main>
      </div>
      {!chromeless && <MobileBottomNav onOpenMenu={() => setMobileNavOpen(true)} ordersNeedingAction={ordersNeedingAction} />}
      <SidePanel open={panel === 'notifications'} onClose={closePanel} widthClass="max-w-[440px]" title={tr("sc.notifications")}>
        <NotificationsPage onNavigate={closePanel} />
      </SidePanel>
    </div>
  );
}

// Add Product Page - Step by Step Wizard
function AddProductPage() {
  const { tr } = useLocale();
  const { id: editId } = useParams<{ id?: string }>();
  const [step, setStep] = useState(() => new URLSearchParams(window.location.search).get('section') === 'discount' ? 6 : 1);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesMenuOpen, setStoresMenuOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showCategorySuggestion, setShowCategorySuggestion] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Category
    categoryId: null as number | null,
    categoryName: '',
    customCategorySuggestion: '',
    // Step 2: Basic info
    name: '',
    description: '',
    condition: 'new',
    // Step 3: Unit
    unitType: 'piece',
    customUnit: '',
    // Step 4: Package size
    unitQuantity: '',
    unitMeasurement: '',
    // Step 5: Variations
    hasVariations: false,
    variationType: [] as string[],
    variants: [] as any[],
    // Step 6: Pricing & Stock
    basePrice: '',
    compareAtPrice: '',
    stockQuantity: '',
    minimumOrderQuantity: '1',
    // Step 7: Delivery
    deliveryAvailable: false,
    pickupAvailable: false,
    deliveryAreas: [] as string[],
    preparationTime: '1-2 days',
    // Category-specific
    brand: '',
    model: '',
    storageCapacity: '',
    material: '',
    color: '',
    size: '',
    // Media
    primaryImage: '',
    productImages: [] as string[],
    productVideo: '',
  });

  const units = [
    { value: 'piece', label: 'Piece', priceLabel: 'per piece' },
    { value: 'pair', label: 'Pair', priceLabel: 'per pair' },
    { value: 'set', label: 'Set', priceLabel: 'per set' },
    { value: 'pack', label: 'Pack', priceLabel: 'per pack' },
    { value: 'box', label: 'Box', priceLabel: 'per box' },
    { value: 'bag', label: 'Bag', priceLabel: 'per bag' },
    { value: 'bottle', label: 'Bottle', priceLabel: 'per bottle' },
    { value: 'carton', label: 'Carton', priceLabel: 'per carton' },
    { value: 'kilogram', label: 'Kilogram', priceLabel: 'per kg' },
    { value: 'gram', label: 'Gram', priceLabel: 'per gram' },
    { value: 'litre', label: 'Litre', priceLabel: 'per litre' },
    { value: 'millilitre', label: 'Millilitre', priceLabel: 'per ml' },
    { value: 'metre', label: 'Metre', priceLabel: 'per metre' },
    { value: 'square_metre', label: 'Square metre', priceLabel: 'per m²' },
    { value: 'dozen', label: 'Dozen', priceLabel: 'per dozen' },
    { value: 'service', label: 'Service', priceLabel: 'per service' },
    { value: 'other', label: 'Other', priceLabel: 'per unit' },
  ];

  const variationTypes = [
    { value: 'size', label: 'Size' },
    { value: 'color', label: 'Color' },
    { value: 'weight', label: 'Weight' },
    { value: 'flavor', label: 'Flavor' },
    { value: 'capacity', label: 'Storage capacity' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    // Mock categories
    setCategories([
      { id: 1, name: 'Food and groceries', slug: 'food-and-groceries', children: [
        { id: 12, name: 'Rice and grains', slug: 'rice-and-grains' },
        { id: 13, name: 'Fruits and vegetables', slug: 'fruits-and-vegetables' },
        { id: 14, name: 'Drinks', slug: 'drinks' },
        { id: 15, name: 'Cooking ingredients', slug: 'cooking-ingredients' },
      ]},
      { id: 2, name: 'Clothing and shoes', slug: 'clothing-and-shoes', children: [
        { id: 16, name: 'Men clothing', slug: 'mens-clothing' },
        { id: 17, name: 'Women clothing', slug: 'womens-clothing' },
        { id: 18, name: 'Children clothing', slug: 'childrens-clothing' },
        { id: 19, name: 'Shoes', slug: 'shoes' },
        { id: 20, name: 'Accessories', slug: 'accessories' },
      ]},
      { id: 3, name: 'Phones and electronics', slug: 'phones-and-electronics' },
      { id: 4, name: 'Beauty and personal care', slug: 'beauty-and-personal-care' },
      { id: 5, name: 'Home and furniture', slug: 'home-and-furniture' },
      { id: 6, name: 'Building materials', slug: 'building-materials' },
      { id: 7, name: 'Agriculture and farming', slug: 'agriculture-and-farming' },
      { id: 8, name: 'Vehicles and spare parts', slug: 'vehicles-and-spare-parts' },
      { id: 9, name: 'Books and school supplies', slug: 'books-and-school-supplies' },
      { id: 10, name: 'Services', slug: 'services' },
      { id: 11, name: 'Other', slug: 'other' },
    ]);
  }, []);

  useEffect(() => {
    if (!editId || storesLoading || !stores.length) return;
    Promise.all(stores.map(async (store) => {
      const response = await fetch(`${API_BASE}/api/stores/${store.id}/products`);
      return response.ok ? (await response.json()).map((product: any) => ({ ...product, storeId: store.id })) : [];
    })).then((groups) => {
      const product = groups.flat().find((item: any) => String(item.id) === String(editId));
      if (!product) return;
      setSelectedStoreIds([product.storeId]);
      const savedImages = Array.isArray(product.product_images) ? product.product_images.map((picture: any) => picture.picture_url).filter(Boolean) : [];
      const existingImages = savedImages.length ? savedImages : (product.primary_image ? [product.primary_image] : []);
      setFormData((current) => ({ ...current, categoryId: product.category_id ?? null, categoryName: product.category_id ? `Category ${product.category_id}` : '', name: product.name || '', description: product.description || '', basePrice: String(product.base_price ?? ''), compareAtPrice: String(product.compare_at_price ?? ''), unitType: product.unit_type || 'piece', stockQuantity: String(product.stock_quantity ?? ''), minimumOrderQuantity: String(product.minimum_order_quantity ?? 1), primaryImage: existingImages[0] || '', productImages: existingImages, deliveryAvailable: product.delivery_available === true, pickupAvailable: product.pickup_available === true, preparationTime: product.preparation_time || '1-2 days' }));
    }).catch(() => undefined);
  }, [editId, storesLoading, stores]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('sc_user') || '{}');
    if (!user.id) return;
    fetch(`${API_BASE}/api/stores/seller/${user.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('sc_token') || ''}` } })
      .then((response) => response.json())
      .then((data) => {
        const ownedStores = Array.isArray(data.stores) ? data.stores : (data.store ? [data.store] : []);
        setStores(ownedStores);
        if (ownedStores.length === 1) setSelectedStoreIds([ownedStores[0].id]);
      })
      .catch(() => setStores([]))
      .finally(() => setStoresLoading(false));
  }, []);

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addProductImages = (fileList: FileList | null) => {
    const files = Array.from(fileList || []).filter(file => file.type.startsWith('image/')).slice(0, 6 - formData.productImages.length);
    if (!files.length) return;
    Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }))).then(images => setFormData(previous => {
      const nextImages = [...previous.productImages, ...images].slice(0, 6);
      return { ...previous, productImages: nextImages, primaryImage: nextImages[0] || previous.primaryImage };
    })).catch(() => setFormError('One or more photos could not be read. Please choose JPG, PNG, or WebP images.'));
  };

  const getPriceLabel = () => {
    const unit = units.find(u => u.value === formData.unitType);
    if (formData.unitType === 'other') return `per ${formData.customUnit || 'unit'}`;
    return unit?.priceLabel || 'per piece';
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormError('');
    try {
      if (!formData.deliveryAvailable && !formData.pickupAvailable) {
        throw new Error('Choose seller delivery, buyer pickup, or both before saving this product.');
      }
      if (formData.compareAtPrice && Number(formData.compareAtPrice) <= Number(formData.basePrice || 0)) {
        throw new Error('Original price must be higher than the sale price.');
      }
      const userData = localStorage.getItem('sc_user');
      const token = localStorage.getItem('sc_token');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) throw new Error('Not logged in');
      const sRes = await fetch(`${API_BASE}/api/stores/seller/${user.id}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      let storeId: number | null = null;
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.store) storeId = sData.store.id;
      }
      if (!selectedStoreIds.length && stores.length > 1) throw new Error('Choose at least one store for this product.');
      const targetStoreIds = selectedStoreIds.length ? selectedStoreIds : [storeId];
      if (!targetStoreIds.length || !targetStoreIds[0]) throw new Error('No store found — create a store first');
      const deliveryAreas = Array.isArray(formData.deliveryAreas)
        ? formData.deliveryAreas.map((area) => String(area).trim()).filter(Boolean)
        : String(formData.deliveryAreas || '').split(',').map((area) => area.trim()).filter(Boolean);
      const productBody = {
          name: formData.name,
          description: formData.description,
          base_price: formData.basePrice || 0,
          compare_at_price: formData.compareAtPrice ? Number(formData.compareAtPrice) : null,
          unit_type: formData.unitType || 'piece',
          stock_quantity: formData.stockQuantity ? Number(formData.stockQuantity) : 0,
          minimum_order_quantity: formData.minimumOrderQuantity ? Number(formData.minimumOrderQuantity) : 1,
          category_id: formData.categoryId || null,
          primary_image: formData.primaryImage || null,
          product_images: formData.productImages.length ? formData.productImages : (formData.primaryImage ? [formData.primaryImage] : []),
          seller_id: user.id,
          delivery_available: formData.deliveryAvailable,
          pickup_available: formData.pickupAvailable,
          delivery_areas: deliveryAreas,
          preparation_time: formData.preparationTime,
      };
      if (editId) {
        const response = await fetch(`${API_BASE}/api/new-products/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify(productBody) });
        if (!response.ok) throw new Error('Unable to update this product.');
        setNotice({
          title: 'Product updated', description: 'Your changes are live.',
          confirmLabel: 'Back to products', variant: 'alert', tone: 'primary',
          onConfirm: () => { window.location.href = '/seller-central/products'; },
        });
        return;
      }
      const responses = await Promise.all(targetStoreIds.map((targetId) => fetch(`${API_BASE}/api/stores/${targetId}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify(productBody),
      })));
      const failed = responses.find((response) => !response.ok);
      if (failed) { const err = await failed.json().catch(() => ({ error: 'Unknown error' })); throw new Error(err.error || `HTTP ${failed.status}`); }
      setNotice({
        title: 'Product added',
        description: targetStoreIds.length === stores.length
          ? 'Product added to all your stores.'
          : `Product added to ${targetStoreIds.length} store${targetStoreIds.length === 1 ? '' : 's'}.`,
        confirmLabel: 'Back to products', variant: 'alert', tone: 'primary',
        onConfirm: () => { window.location.href = '/seller-central/products'; },
      });
    } catch (e:any) {
      const message = e.message || 'Unable to save this product.';
      setFormError(message);
    }
    setSubmitting(false);
  };

  const totalSteps = formData.unitType === 'service' ? 6 : 7;
  const storeSelectionReady = !storesLoading && stores.length > 0 && selectedStoreIds.length > 0;
  const storePicker = storesLoading ? (
    <div className="mt-3 h-12 max-w-3xl animate-pulse rounded-xl bg-orange-100" />
  ) : (
    <div className="relative mt-3 max-w-3xl">
      <button type="button" onClick={() => setStoresMenuOpen(open => !open)} className="flex h-12 w-full items-center justify-between rounded-xl border border-orange-300 bg-white px-4 text-left text-sm font-semibold text-gray-800 shadow-sm transition hover:border-[#ff6a00] focus:outline-none focus:ring-4 focus:ring-orange-100">
        <span>{selectedStoreIds.length === stores.length ? `All stores (${stores.length})` : selectedStoreIds.length ? `${selectedStoreIds.length} store${selectedStoreIds.length === 1 ? '' : 's'} selected` : 'Choose stores…'}</span><ChevronDown size={17} className={`text-gray-500 transition-transform ${storesMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      {storesMenuOpen && <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-orange-50"><input type="checkbox" checked={selectedStoreIds.length === stores.length} onChange={() => setSelectedStoreIds(selectedStoreIds.length === stores.length ? [] : stores.map(store => store.id))} className="h-4 w-4 accent-[#ff6a00]" />{tr('sc.all-stores')}<span className="ml-auto text-xs text-gray-400">{stores.length}</span></label>
        <div className="my-1 border-t border-gray-100" />
        {stores.map(store => <label key={store.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50"><input type="checkbox" checked={selectedStoreIds.includes(store.id)} onChange={() => setSelectedStoreIds(current => current.includes(store.id) ? current.filter(id => id !== store.id) : [...current, store.id])} className="h-4 w-4 accent-[#ff6a00]" /><span className="min-w-0 flex-1 truncate">{store.name}</span><span className="text-xs text-gray-400">{formData.stockQuantity || '0'} units</span></label>)}
        <button type="button" onClick={() => setStoresMenuOpen(false)} className="mt-1 w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-700">{tr('sc.done')}</button>
      </div>}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{tr('sc.add-new-product')}</h2>
          <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1677ff] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className={step >= 1 ? 'text-[#ff9900] font-semibold' : ''}>{tr('sc.category')}</span>
          <span className={step >= 2 ? 'text-[#ff9900] font-semibold' : ''}>{tr('sc.basic-info')}</span>
          <span className={step >= 3 ? 'text-[#ff9900] font-semibold' : ''}>{tr('sc.unit')}</span>
          {formData.unitType !== 'service' && (
            <span className={step >= 4 ? 'text-[#ff9900] font-semibold' : ''}>{tr('sc.package')}</span>
          )}
          <span className={step >= (formData.unitType === 'service' ? 4 : 5) ? 'text-[#ff9900] font-semibold' : ''}>{tr('sc.variations')}</span>
          <span className={step >= (formData.unitType === 'service' ? 5 : 6) ? 'text-[#ff9900] font-semibold' : ''}>{tr('sc.trade-info')}</span>
          <span className={step >= (formData.unitType === 'service' ? 6 : 7) ? 'text-[#ff9900] font-semibold' : ''}>{tr('sc.logistics')}</span>
        </div>
      </div>

      <div className="sticky top-4 z-20 mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 shadow-sm">
        <label className="block text-sm font-bold text-gray-900">{tr('sc.publish-this-product-to-a-store')}</label>
        <p className="mt-1 text-xs text-gray-600">{tr('sc.select-one-several-or-all-stores-your-produc')}</p>
        {formError && <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{formError}</div>}
        {!storesLoading && stores.length > 1 && <p className={`mt-2 text-xs font-bold ${selectedStoreIds.length ? 'text-emerald-700' : 'text-orange-700'}`}>{selectedStoreIds.length ? `${selectedStoreIds.length} store${selectedStoreIds.length === 1 ? '' : 's'} selected · stock will be published per selected store` : 'Select at least one store before continuing.'}</p>}
        {storePicker}

      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
      {/* Step 1: Category */}
      {step === 1 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-white px-6 py-6 sm:px-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-wider text-[#1677ff]">{tr('sc.select-category')}</p><h3 className="mt-1 text-xl font-bold text-gray-900">{tr('sc.what-are-you-selling')}</h3><p className="mt-2 text-sm text-gray-500">{tr('sc.choose-the-most-specific-category-so-buyers-')}</p></div><span className="hidden h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff] sm:flex"><Tag size={22} /></span></div>
            <div className="relative mt-5"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={categorySearch} onChange={e => setCategorySearch(e.target.value)} placeholder={tr("sc.search-categories-2")} className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-blue-100" /></div>
          </div>
          <div className="px-6 py-6 sm:px-8">
          <div className="mb-3 flex items-center gap-5 border-b border-gray-200 text-xs"><button type="button" className="border-b-2 border-[#1677ff] pb-2 font-bold text-[#1677ff]">{tr('sc.search-categories')}</button><button type="button" onClick={() => setCategorySearch('')} className="pb-2 text-gray-500 hover:text-gray-800">{tr('sc.recently-used')}</button></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">{tr('sc.category-list')}</p><p className="text-xs text-gray-400">{categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length} available</p></div>
          <div className="max-h-[290px] overflow-y-auto rounded border border-gray-200 bg-[#f7f9fc] p-2">
          <div className="grid grid-cols-1 gap-1">
            {categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).map((cat, categoryIndex) => (
              <button
                key={cat.id}
                onClick={() => {
                  updateForm('categoryId', cat.id);
                  updateForm('categoryName', cat.name);
                  if (cat.children) {
                    // Has subcategories - show them
                  }
                }}
                className={`group relative flex min-h-[54px] items-center gap-3 rounded border px-3 py-2 text-left transition-all ${
                  formData.categoryId === cat.id || (cat.children && cat.children.some((child: any) => child.id === formData.categoryId))
                    ? 'border-[#1677ff] bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${formData.categoryId === cat.id || (cat.children && cat.children.some((child: any) => child.id === formData.categoryId)) ? 'bg-[#1677ff] text-white' : 'bg-white text-gray-400 group-hover:text-[#1677ff]'}`}><Package size={14} /></span><span className="min-w-0"><p className="text-xs font-semibold text-gray-900">{cat.name}</p>{cat.children && <p className="mt-0.5 text-[10px] text-gray-500">{cat.children.length} subcategories</p>}</span>{(formData.categoryId === cat.id || (cat.children && cat.children.some((child: any) => child.id === formData.categoryId))) && <CheckCircle size={15} className="absolute right-3 text-[#1677ff]" />}
              </button>
            ))}
          </div>
          </div></div>
          <div className="min-h-[290px] rounded border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">{tr('sc.selected-category')}</p>{formData.categoryName ? <><p className="mt-4 text-sm font-bold text-gray-900">{formData.categoryName}</p><p className="mt-2 text-xs leading-5 text-gray-500">{tr('sc.this-category-will-be-shown-on-your-product-')}</p>{categories.find(c => c.id === formData.categoryId)?.children && <div className="mt-5 border-t border-gray-100 pt-4"><p className="text-xs font-bold text-gray-700">{tr('sc.choose-a-subcategory')}</p><div className="mt-2 flex flex-wrap gap-2">{categories.find(c => c.id === formData.categoryId)?.children?.map((sub: any) => <button type="button" key={sub.id} onClick={() => { updateForm('categoryId', sub.id); updateForm('categoryName', sub.name); }} className={`rounded border px-2.5 py-1.5 text-[11px] font-medium ${formData.categoryName === sub.name ? 'border-[#1677ff] bg-blue-50 text-[#1677ff]' : 'border-gray-200 text-gray-600 hover:border-[#1677ff]'}`}>{sub.name}</button>)}</div></div>}</> : <div className="flex h-[220px] flex-col items-center justify-center text-center"><Package size={34} className="text-gray-300" /><p className="mt-3 text-xs font-semibold text-gray-500">{tr('sc.select-a-category-from-the-list')}</p><p className="mt-1 max-w-[220px] text-[10px] leading-4 text-gray-400">{tr('sc.choose-the-most-specific-category-so-your-pr')}</p></div>}</div>
          </div>
          {categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && <div className="rounded-xl border border-dashed border-gray-300 px-5 py-8 text-center"><p className="text-sm font-semibold text-gray-700">{tr('sc.no-matching-category')}</p><p className="mt-1 text-xs text-gray-500">{tr('sc.try-another-search-or-suggest-a-new-category')}</p></div>}

          {/* Other / Suggest */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">
              Can't find the right category?{' '}
              <button 
                onClick={() => setShowCategorySuggestion(true)}
                className="text-[#ff9900] font-semibold hover:underline"
              >{tr('sc.choose-other-or-suggest-a-category')}</button>
            </p>
          </div>

          {showCategorySuggestion && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm font-semibold text-gray-900 mb-2">{tr('sc.suggest-a-new-category')}</p>
              <input
                type="text"
                placeholder={tr("sc.category-name")}
                value={formData.customCategorySuggestion}
                onChange={(e) => updateForm('customCategorySuggestion', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm mb-2"
              />
              <textarea
                placeholder={tr("sc.why-should-this-be-a-category-optional")}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm mb-2"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    updateForm('categoryId', 11); // Other
                    updateForm('categoryName', 'Other');
                    setShowCategorySuggestion(false);
                  }}
                  className="px-4 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold"
                >{tr('sc.submit-suggestion')}</button>
                <button
                  onClick={() => setShowCategorySuggestion(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
                >{tr('sc.cancel')}</button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-400">{tr('sc.you-can-change-this-before-publishing')}</p>
            <button
              onClick={() => setStep(2)}
              disabled={!formData.categoryId || !storeSelectionReady}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {storeSelectionReady ? 'Continue' : 'Choose a store to continue'}
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Step 2: Basic Product Information */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">{tr('sc.product-details')}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.product-name')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g. Premium Rice (25kg bag)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.description-2')}</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder={tr("sc.describe-your-product")}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.condition')}</label>
              <div className="flex gap-4">
                {['new', 'used', 'refurbished'].map(cond => (
                  <button
                    key={cond}
                    onClick={() => updateForm('condition', cond)}
                    className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                      formData.condition === cond
                        ? 'bg-[#ff9900] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cond.charAt(0).toUpperCase() + cond.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category-specific fields */}
            {(formData.categoryId === 3 || formData.categoryName.includes('Phone') || formData.categoryName.includes('Electronic')) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.brand')}</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => updateForm('brand', e.target.value)}
                      placeholder="e.g. Samsung"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.model')}</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => updateForm('model', e.target.value)}
                      placeholder="e.g. Galaxy A14"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.storage-capacity')}</label>
                  <input
                    type="text"
                    value={formData.storageCapacity}
                    onChange={(e) => updateForm('storageCapacity', e.target.value)}
                    placeholder="e.g. 128 GB"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </>
            )}

            {(formData.categoryId === 2 || formData.categoryName.includes('Clothing') || formData.categoryName.includes('Shoe')) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.size')}</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => updateForm('size', e.target.value)}
                    placeholder="e.g. M, L, XL"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.color')}</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => updateForm('color', e.target.value)}
                    placeholder="e.g. Black, White"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.material')}</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => updateForm('material', e.target.value)}
                    placeholder="e.g. Cotton"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><label className="block text-sm font-bold text-gray-800">{tr('sc.product-photos')}<span className="text-red-500">*</span></label><p className="mt-1 text-xs text-gray-500">{tr('sc.upload-clear-photos-from-different-angles-se')}</p></div><span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-[#e87500]">{tr('sc.recommended-6-photos')}</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {(formData.productImages.length ? formData.productImages : formData.primaryImage ? [formData.primaryImage] : []).map((image, index) => <div key={`${image.slice(0, 20)}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white"><img src={image} alt={`Product ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setFormData(previous => { const nextImages = previous.productImages.filter((_, imageIndex) => imageIndex !== index); return { ...previous, productImages: nextImages, primaryImage: nextImages[0] || '' }; })} className="absolute right-1 top-1 hidden rounded-full bg-white/90 p-1 text-red-500 shadow group-hover:block" aria-label={tr("sc.remove-photo")}><X size={12} /></button>{index === 0 ? <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">{tr('sc.main')}</span> : <button type="button" onClick={() => setFormData(previous => { const chosen = previous.productImages[index]; return { ...previous, productImages: [chosen, ...previous.productImages.filter((_, imageIndex) => imageIndex !== index)], primaryImage: chosen }; })} className="absolute bottom-1 left-1 rounded bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-gray-700 shadow hover:bg-orange-50">{tr('sc.set-main')}</button>}</div>)}
                {formData.productImages.length < 6 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-gray-400 transition hover:border-[#ff9900] hover:bg-orange-50"><Plus size={20} /><span className="mt-1 text-[10px] font-semibold">{tr('sc.add-photos')}</span><span className="text-[9px]">up to {6 - formData.productImages.length} more</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event => { addProductImages(event.currentTarget.files); event.currentTarget.value = ''; }} /></label>}
              </div>
              <div className="mt-4 border-t border-gray-200 pt-4"><div className="flex items-center gap-2"><Video size={16} className="text-[#1677ff]" /><p className="text-xs font-bold text-gray-700">{tr('sc.product-video')}<span className="font-normal text-gray-400">(optional)</span></p></div><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={formData.productVideo} onChange={e => updateForm('productVideo', e.target.value)} placeholder={tr("sc.paste-a-product-video-url")} className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none focus:border-[#ff9900]" /><label className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-[#ff9900]"><Upload size={14} />{tr('sc.upload-video')}<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => updateForm('productVideo', String(reader.result || '')); reader.readAsDataURL(file); event.target.value = ''; }} /></label></div><p className="mt-1 text-[10px] text-gray-400">{tr('sc.show-the-product-in-use-its-packaging-or-qua')}</p></div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
            >{tr('sc.back')}</button>
            <button
              onClick={() => setStep(3)}
              disabled={!formData.name || !formData.description}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] disabled:opacity-50"
            >{tr('sc.continue')}</button>
          </div>
        </div>
      )}

      {/* Step 3: Selling Unit */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{tr('sc.how-do-you-sell-this-product')}</h3>
          <p className="text-sm text-gray-500 mb-6">{tr('sc.choose-the-unit-that-matches-how-buyers-will')}</p>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {units.map(unit => (
              <button
                key={unit.value}
                onClick={() => updateForm('unitType', unit.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  formData.unitType === unit.value
                    ? 'border-[#ff9900] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{unit.label}</p>
              </button>
            ))}
          </div>

          {formData.unitType === 'other' && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.custom-unit-name')}</label>
              <input
                type="text"
                value={formData.customUnit}
                onChange={(e) => updateForm('customUnit', e.target.value)}
                placeholder="e.g. crate, bundle, load"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">
              Price will be shown as: <span className="font-semibold text-gray-900">{formData.basePrice || '___'} BIF {getPriceLabel()}</span>
            </p>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
            >{tr('sc.back')}</button>
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 5 : 4)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00]"
            >{tr('sc.continue')}</button>
          </div>
        </div>
      )}

      {/* Step 4: Package Size (skip for services) */}
      {step === 4 && formData.unitType !== 'service' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{tr('sc.package-size-optional')}</h3>
          <p className="text-sm text-gray-500 mb-6">{tr('sc.help-buyers-understand-exactly-what-they-re-')}</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.quantity')}</label>
              <input
                type="number"
                value={formData.unitQuantity}
                onChange={(e) => updateForm('unitQuantity', e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.measurement')}</label>
              <select
                value={formData.unitMeasurement}
                onChange={(e) => updateForm('unitMeasurement', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              >
                <option value="">{tr('sc.select')}</option>
                <option value="kg">{tr('sc.kilograms-kg')}</option>
                <option value="g">{tr('sc.grams-g')}</option>
                <option value="L">{tr('sc.litres-l')}</option>
                <option value="ml">{tr('sc.millilitres-ml')}</option>
                <option value="items">{tr('sc.items')}</option>
                <option value="pieces">{tr('sc.pieces')}</option>
              </select>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">
              Buyers will see: <span className="font-semibold text-gray-900">
                {formData.unitQuantity && formData.unitMeasurement 
                  ? `Package: ${formData.unitQuantity} ${formData.unitMeasurement}`
                  : 'No package size specified'}
              </span>
            </p>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
            >{tr('sc.back')}</button>
            <button
              onClick={() => setStep(5)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00]"
            >{tr('sc.continue')}</button>
          </div>
        </div>
      )}

      {/* Step 5: Variations */}
      {step === 5 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{tr('sc.product-variations')}</h3>
          <p className="text-sm text-gray-500 mb-6">{tr('sc.does-this-product-have-different-options')}</p>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => updateForm('hasVariations', false)}
              className={`flex-1 p-4 rounded-xl border-2 text-center ${
                !formData.hasVariations ? 'border-[#ff9900] bg-orange-50' : 'border-gray-200'
              }`}
            >
              <p className="text-sm font-semibold">{tr('sc.no-one-version')}</p>
            </button>
            <button
              onClick={() => updateForm('hasVariations', true)}
              className={`flex-1 p-4 rounded-xl border-2 text-center ${
                formData.hasVariations ? 'border-[#ff9900] bg-orange-50' : 'border-gray-200'
              }`}
            >
              <p className="text-sm font-semibold">{tr('sc.yes-add-options')}</p>
            </button>
          </div>

          {formData.hasVariations && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">{tr('sc.what-is-different')}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {variationTypes.map(vt => (
                  <button
                    key={vt.value}
                    onClick={() => {
                      const types = formData.variationType.includes(vt.value)
                        ? formData.variationType.filter(t => t !== vt.value)
                        : [...formData.variationType, vt.value];
                      updateForm('variationType', types);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      formData.variationType.includes(vt.value)
                        ? 'bg-[#ff9900] text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">
                  Each variation will have its own price and stock quantity.
                  For example: "25 kg bag - 40,000 BIF - 50 in stock"
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 3 : 4)}
              className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
            >{tr('sc.back')}</button>
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 5 : 6)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00]"
            >{tr('sc.continue')}</button>
          </div>
        </div>
      )}

      {/* Step 6: Price and Stock */}
      {step === 6 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">{tr('sc.price-stock')}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.price-bif')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => updateForm('basePrice', e.target.value)}
                  placeholder="e.g. 40000"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm"
                />
                <span className="text-sm text-gray-500">{getPriceLabel()}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.original-price-optional')}</label>
              <input
                type="number"
                min="0"
                value={formData.compareAtPrice}
                onChange={(e) => updateForm('compareAtPrice', e.target.value)}
                placeholder={tr("sc.add-only-when-offering-a-discount")}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">{tr('sc.enter-the-original-price-above-and-the-reduc')}</p>
              {Number(formData.compareAtPrice) > Number(formData.basePrice) && Number(formData.basePrice) > 0 && <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">{Math.round((1 - Number(formData.basePrice) / Number(formData.compareAtPrice)) * 100)}% off · Buyers pay {Number(formData.basePrice).toLocaleString()} BIF</p>}
              {formData.compareAtPrice && <button type="button" onClick={() => updateForm('compareAtPrice', '')} className="mt-2 text-xs font-semibold text-orange-700 underline">{tr('sc.remove-discount-label')}</button>}
            </div>

            {formData.unitType !== 'service' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.stock-quantity')}</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => updateForm('stockQuantity', e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.minimum-order-quantity')}</label>
                  <input
                    type="number"
                    value={formData.minimumOrderQuantity}
                    onChange={(e) => updateForm('minimumOrderQuantity', e.target.value)}
                    placeholder="1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">
              Buyers will see: <span className="font-bold text-gray-900">
                {formData.basePrice ? `${parseInt(formData.basePrice).toLocaleString()} BIF` : '___'} {getPriceLabel()}
              </span>
            </p>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(formData.hasVariations ? 5 : (formData.unitType === 'service' ? 3 : 4))}
              className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
            >{tr('sc.back')}</button>
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 6 : 7)}
              disabled={!formData.basePrice || (formData.unitType !== 'service' && !formData.stockQuantity)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] disabled:opacity-50"
            >{tr('sc.continue')}</button>
          </div>
        </div>
      )}

      {/* Step 7: Delivery (or Step 6 for services) */}
      {((step === 7 && formData.unitType !== 'service') || (step === 6 && formData.unitType === 'service')) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{tr('sc.delivery-options')}</h3>
          <p className="text-sm text-gray-500 mb-6">{tr('sc.how-can-buyers-receive-this-product')}</p>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={formData.deliveryAvailable}
                onChange={(e) => updateForm('deliveryAvailable', e.target.checked)}
                className="w-5 h-5 text-[#ff9900] rounded"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{tr('sc.seller-delivery')}</p>
                <p className="text-xs text-gray-500">{tr('sc.you-deliver-to-the-buyer-s-location')}</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={formData.pickupAvailable}
                onChange={(e) => updateForm('pickupAvailable', e.target.checked)}
                className="w-5 h-5 text-[#ff9900] rounded"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">{tr('sc.buyer-pickup')}</p>
                <p className="text-xs text-gray-500">{tr('sc.buyer-comes-to-your-location')}</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.estimated-preparation-time')}</label>
              <select
                value={formData.preparationTime}
                onChange={(e) => updateForm('preparationTime', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              >
                <option value="same_day">{tr('sc.same-day')}</option>
                <option value="1-2 days">1-2 days</option>
                <option value="3-5 days">3-5 days</option>
                <option value="1 week">1 week</option>
                <option value="2+ weeks">2+ weeks</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 5 : 6)}
              className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
            >{tr('sc.back')}</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Submit for review'}
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {step > 2 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-900 mb-2">{tr('sc.preview')}</p>
          <div className="text-sm text-blue-800">
            <p className="font-bold">{formData.name || 'Product name'}</p>
            <p>{formData.basePrice ? `${parseInt(formData.basePrice).toLocaleString()} BIF` : '___'} {getPriceLabel()}</p>
            {formData.unitQuantity && formData.unitMeasurement && (
              <p>Package: {formData.unitQuantity} {formData.unitMeasurement}</p>
            )}
            {formData.stockQuantity && <p>Stock: {formData.stockQuantity}</p>}
            {formData.minimumOrderQuantity !== '1' && <p>Minimum order: {formData.minimumOrderQuantity}</p>}
            <p>Condition: {formData.condition}</p>
            <p>Category: {formData.categoryName}</p>
            {formData.deliveryAvailable && <p>✓ Seller delivery available</p>}
            {formData.pickupAvailable && <p>✓ Buyer pickup available</p>}
          </div>
          <p className="text-xs text-blue-600 mt-2">{tr('sc.product-will-appear-on-marketplace-after-adm')}</p>
        </div>
      )}
      </div>
      <aside className="sticky top-6 hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:block">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900">{tr('sc.product-information')}</h3><span className="text-xs font-bold text-[#ff6a00]">{Math.round(([Boolean(formData.categoryId), Boolean(formData.name.trim()), Boolean(formData.description.trim()), Boolean(formData.primaryImage), Boolean(formData.basePrice), Boolean(formData.stockQuantity), Boolean(formData.deliveryAvailable || formData.pickupAvailable)].filter(Boolean).length / 7) * 100)}%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#ff9900] transition-all" style={{ width: `${([Boolean(formData.categoryId), Boolean(formData.name.trim()), Boolean(formData.description.trim()), Boolean(formData.primaryImage), Boolean(formData.basePrice), Boolean(formData.stockQuantity), Boolean(formData.deliveryAvailable || formData.pickupAvailable)].filter(Boolean).length / 7) * 100}%` }} /></div>
        <p className="mt-3 text-xs leading-5 text-gray-500">{tr('sc.complete-more-details-to-help-buyers-discove')}</p>
        <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-xs">
          {[['Category', Boolean(formData.categoryId)], ['Product name', Boolean(formData.name.trim())], ['Description', Boolean(formData.description.trim())], ['Product photos', Boolean(formData.primaryImage)], ['Price and MOQ', Boolean(formData.basePrice)], ['Stock quantity', Boolean(formData.stockQuantity)], ['Delivery options', Boolean(formData.deliveryAvailable || formData.pickupAvailable)]].map(([label, complete]) => <div key={String(label)} className="flex items-center gap-2"><span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${complete ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-transparent'}`}>✓</span><span className={complete ? 'font-semibold text-gray-700' : 'text-gray-500'}>{label}</span></div>)}
        </div>
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{tr('sc.live-product-preview')}</p>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex h-20 items-center justify-center bg-gray-100">{formData.primaryImage ? <img src={formData.primaryImage} alt="" className="h-full w-full object-cover" /> : <Package size={24} className="text-gray-300" />}</div>
            <div className="p-2"><p className="truncate text-xs font-bold text-gray-900">{formData.name || 'Product name'}</p><p className="mt-1 text-xs font-bold text-[#ff6a00]">{formData.basePrice ? `${Number(formData.basePrice).toLocaleString()} BIF` : 'Price not set'}</p><p className="mt-1 text-[10px] text-gray-500">Stock: {formData.stockQuantity || '0'} · {formData.categoryName || 'Category not set'}</p></div>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-blue-50 p-3"><p className="text-[11px] font-bold text-blue-900">{tr('sc.listing-tip')}</p><p className="mt-1 text-[11px] leading-4 text-blue-700">{tr('sc.use-clear-product-photos-specific-keywords-p')}</p></div>
      </aside>
      </div>
    </div>
  );
}

// Profile Completion Page
function ProfileCompletionPage({ onComplete }: { onComplete: (data: any) => Promise<any> }) {
  const { tr } = useLocale();
  const [formData, setFormData] = useState({
    businessName: '',
    location: 'Bujumbura',
    businessDescription: '',
  });
  const [loading, setLoading] = useState(false);

  const locations = [
    'Bujumbura', 'Gitega', 'Muyinga', 'Rumonge', 'Ngozi', 'Kayanza',
    'Bubanza', 'Cibitoke', 'Bururi', 'Makamba', 'Rutana', 'Mwaro',
    'Muramvya', 'Bujumbura Mairie', 'Bujumbura Rural',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onComplete(formData);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#232f3e] flex items-center justify-center p-4 relative overflow-hidden">
      <CommerceBackground tone="dark" />
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-[#ff9900] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#ff9900]/30">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{tr('sc.complete-your-profile')}</h1>
          <p className="text-gray-400 mt-2">{tr('sc.tell-us-about-your-business')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-5 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.business-name-2')}</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Kigali Fresh Traders"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.business-location-2')}</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                required
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{tr('sc.business-description-optional')}</label>
              <textarea
                value={formData.businessDescription}
                onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                placeholder={tr("sc.what-does-your-business-do")}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.businessName}
              className="w-full py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Continue to Store Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Editable seller profile. Profile data is kept with the seller session until the profile API is connected.
function SellerProfilePage({ user, onSave }: { user: User; onSave: (data: any) => Promise<any> }) {
  const { tr } = useLocale();
  const [form, setForm] = useState({
    name: user.name || '', businessName: user.businessName || user.name || '',
    location: user.location || 'Bujumbura',
    businessDescription: user.businessDescription || '', avatar: user.avatar || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const locations = ['Bujumbura', 'Gitega', 'Muyinga', 'Rumonge', 'Ngozi', 'Kayanza', 'Bubanza', 'Cibitoke', 'Bururi', 'Makamba', 'Rutana', 'Mwaro', 'Muramvya', 'Bujumbura Mairie', 'Bujumbura Rural'];
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage('');
    const result = await onSave(form);
    setMessage(result?.success === false ? (result.error || 'Could not save profile') : 'Profile saved');
    setSaving(false);
  };
  // Profile strength — mirrors the "company profile completeness" meter Alibaba shows suppliers.
  const checks = [
    { label: 'Company name', done: Boolean(form.businessName.trim()) },
    { label: 'Contact name', done: Boolean(form.name.trim()) },
    { label: 'Business location', done: Boolean(form.location) },
    { label: 'Company logo', done: Boolean(form.avatar) },
    { label: 'Company introduction', done: form.businessDescription.trim().length >= 40 },
  ];
  const completed = checks.filter(check => check.done).length;
  const strength = Math.round((completed / checks.length) * 100);

  const field = 'mt-2 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-normal text-gray-900 outline-none transition focus:border-[#ff9900] focus:ring-2 focus:ring-orange-100';
  const label = 'block text-[13px] font-semibold text-gray-700';

  return <div className="min-h-full bg-[#f5f5f7] pb-28">
    {/* Hero banner — company identity at a glance */}
    <div className="bg-gradient-to-r from-[#232f3e] to-[#33455c] px-4 pb-16 pt-8 sm:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{tr('sc.company-profile')}</p>
      <h2 className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">{form.businessName || 'Your company'}</h2>
      <p className="mt-1.5 max-w-2xl text-sm text-white/60">{tr('sc.this-is-what-buyers-see-in-your-supplier-hea')}</p>
    </div>

    <div className="mx-auto -mt-10 max-w-6xl px-4 sm:px-8">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={save} className="space-y-5">
          {/* Identity card */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {form.avatar
                ? <img src={form.avatar} alt="Company logo" className="h-20 w-20 shrink-0 rounded-xl border border-gray-200 object-cover" />
                : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#232f3e] text-2xl font-bold text-white">{(form.businessName || 'YC').slice(0, 2).toUpperCase()}</div>}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-bold text-gray-900">{form.businessName || 'Your company'}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><Shield size={12} />{tr('sc.verified-seller')}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600"><MapPin size={12} /> {form.location}</span>
                </div>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-[13px] font-semibold text-gray-700 transition hover:border-[#ff9900] hover:text-[#b15a00]">
                  <Upload size={14} />{form.avatar ? 'Replace logo' : 'Upload logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm(prev => ({ ...prev, avatar: String(reader.result || '') })); reader.readAsDataURL(file); }} />
                </label>
                <p className="mt-2 text-[11px] text-gray-400">{tr('sc.square-image-at-least-200-200px-shown-on-you')}</p>
              </div>
            </div>
          </section>

          {/* Basic information */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6"><h3 className="text-[15px] font-bold text-gray-900">{tr('sc.basic-information')}</h3><p className="mt-0.5 text-xs text-gray-500">{tr('sc.legal-and-contact-details-buyers-use-to-iden')}</p></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <label className={label}>{tr('sc.company-name')}<span className="text-red-500">*</span>
                <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} className={field} placeholder="e.g. Autohire Technologies" required />
              </label>
              <label className={label}>{tr('sc.contact-person')}<span className="text-red-500">*</span>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={field} placeholder={tr("sc.full-name-2")} required />
              </label>
              <label className={label}>{tr('sc.business-location')}<select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={field}>{locations.map(location => <option key={location}>{location}</option>)}</select>
              </label>
              <div className={label}>Phone number
                {/* Read-only, so show it the way it is shown everywhere else rather than
                    the raw stored digits. */}
                <input value={formatPhone(user.phone)} readOnly disabled className={`${field} cursor-not-allowed bg-gray-50 text-gray-500`} />
                <p className="mt-1.5 text-[11px] text-gray-400">{tr('sc.your-sign-in-number-change-it-in-settings')}</p>
              </div>
            </div>
          </section>

          {/* Company introduction */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6"><h3 className="text-[15px] font-bold text-gray-900">{tr('sc.company-introduction')}</h3><p className="mt-0.5 text-xs text-gray-500">{tr('sc.buyers-read-this-before-sending-an-inquiry-d')}</p></div>
            <div className="p-5 sm:p-6">
              <textarea value={form.businessDescription} onChange={e => setForm({ ...form, businessDescription: e.target.value })} rows={6} maxLength={1200} className={`${field} mt-0 resize-y leading-relaxed`} placeholder="Tell buyers what you supply, your minimum order quantities, delivery areas, and what makes your business a reliable partner." />
              <div className="mt-2 flex items-center justify-between text-[11px]"><span className={form.businessDescription.trim().length >= 40 ? 'text-emerald-600' : 'text-gray-400'}>{form.businessDescription.trim().length >= 40 ? 'Good length' : 'Write at least 40 characters'}</span><span className="text-gray-400">{form.businessDescription.length}/1200</span></div>
            </div>
          </section>

          {message && <p className={`rounded-lg px-4 py-3 text-sm font-medium ${message === 'Profile saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message}</p>}

          {/* Sticky action bar so Save is always reachable on a long form */}
          <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:rounded-xl sm:border sm:px-6 sm:shadow-sm">
            <p className="hidden text-xs text-gray-500 sm:block">{tr('sc.changes-go-live-on-your-storefront-immediate')}</p>
            <button disabled={saving} className="w-full rounded-lg bg-[#ff9900] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#ed8e00] disabled:opacity-50 sm:w-auto">{saving ? 'Saving…' : 'Save profile'}</button>
          </div>
        </form>

        {/* Sidebar: completeness meter + storefront shortcut */}
        <aside className="space-y-4 lg:sticky lg:top-5">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between"><h3 className="text-sm font-bold text-gray-900">{tr('sc.profile-strength')}</h3><span className="text-2xl font-bold text-[#ff9900]">{strength}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#ff9900] transition-all duration-500" style={{ width: `${strength}%` }} /></div>
            <p className="mt-2 text-xs text-gray-500">{strength === 100 ? 'Your profile is complete — buyers see everything.' : `${checks.length - completed} item${checks.length - completed === 1 ? '' : 's'} left. Complete profiles get more inquiries.`}</p>
            <ul className="mt-4 space-y-2.5">
              {checks.map(check => <li key={check.label} className="flex items-center gap-2.5 text-[13px]">
                {check.done
                  ? <CheckCircle size={16} className="shrink-0 text-emerald-500" />
                  : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />}
                <span className={check.done ? 'text-gray-500 line-through' : 'font-medium text-gray-800'}>{check.label}</span>
              </li>)}
            </ul>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">{tr('sc.your-storefront')}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{tr('sc.your-profile-fills-the-header-of-your-public')}</p>
            <Link href="/seller-central/stores" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#ff9900] hover:underline">{tr('sc.manage-storefronts')}<ChevronRight size={14} /></Link>
          </section>
        </aside>
      </div>
    </div>
  </div>;
}

// Create Store Page - Template Selection
function CreateStorePage({ onComplete }: { onComplete: (data: any) => Promise<any> }) {
  const { tr } = useLocale();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'details' | 'template'>('details');
  const [details, setDetails] = useState({ name: '', description: '', category: '', phone: '', email: '', location: '', address: '', latitude: 0, longitude: 0, storeImage: '' });
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [templates, setTemplates] = useState<StorefrontTemplate[]>(STOREFRONT_TEMPLATES);
  useEffect(() => { void loadStorefrontTemplates(API_BASE).then(setTemplates); }, []);

  const handleSelectTemplate = async (templateId: string) => {
    setLoading(true);
    setSelectedTemplate(templateId);
    try {
      const userData = localStorage.getItem('sc_user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) throw new Error('Not logged in');

      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const storefrontConfig = { ...DEFAULT_STOREFRONT_CONFIG, ...template.config, storeId: 0, updatedAt: new Date().toISOString(), header: { ...DEFAULT_STOREFRONT_CONFIG.header, ...template.config.header, companyName: details.name.trim(), profileImage: details.storeImage || template.config.header?.profileImage || null } };
      // Templates are authored with {{tokens}} so the storefront a seller lands on is
      // about THEIR business — their name, words, category, contacts and location —
      // instead of placeholder copy. Anything they have not filled in yet resolves to
      // neutral wording rather than an empty gap or a visible {{token}}.
      const tokens: Record<string, string> = {
        companyName: details.name.trim(),
        description: details.description.trim() || `${details.name.trim()} supplies ${(details.category || 'wholesale goods').toLowerCase()} to buyers across Burundi.`,
        category: details.category || 'Wholesale supply',
        phone: formatPhone(details.phone) || formatPhone(user.phone) || 'Add your phone number',
        email: details.email || 'Add your email',
        address: details.address || details.location || 'Add your warehouse or showroom address',
        location: details.address || details.location || 'Burundi',
        yearsActive: 'New supplier',
      };
      const fillTokens = (value: unknown): unknown => {
        if (typeof value === 'string') return value.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => tokens[key] ?? whole);
        if (Array.isArray(value)) return value.map(fillTokens);
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, fillTokens(v)]));
        return value;
      };
      storefrontConfig.sections = storefrontConfig.sections.map(section => ({ ...section, modules: section.modules.map(module => ({ ...module, props: fillTokens(module.props) as Record<string, unknown> })) }));
      if (storefrontConfig.shopSign) storefrontConfig.shopSign = fillTokens(storefrontConfig.shopSign) as typeof storefrontConfig.shopSign;

      const storeData = {
        sellerId: user.id,
        name: details.name.trim(),
        // Never the template's picker blurb — that is marketing copy for the design,
        // not a description of this business, and it was ending up on the public page.
        description: details.description.trim() || `${details.name.trim()} — ${details.category || 'wholesale'} supplier${details.address ? ` in ${details.address}` : ''}.`,
        category: details.category || 'Multiple categories',
        phone: details.phone || user.phone || '+257 79 000 000',
        email: details.email || undefined,
        logo: details.storeImage || undefined,
        address: details.address || undefined,
        province: details.location || undefined,
        latitude: details.latitude || undefined,
        longitude: details.longitude || undefined,
        storeTemplate: templateId,
        storefrontConfig,
      };

      const res = await onComplete(storeData);
      if (res.success) {
      } else {
        setNotice({ title: 'Could not create the store', description: res.error || 'Unknown error', confirmLabel: 'OK', variant: 'alert' });
      }
    } catch (e: any) {
      setNotice({ title: 'Could not create the store', description: e.message || 'Something went wrong. Please try again.', confirmLabel: 'OK', variant: 'alert' });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'details') return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f4f6f8] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3 text-xs"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff6a00] font-bold text-white">1</span><span className="font-bold text-gray-900">{tr('sc.store-details')}</span><span className="h-px w-14 bg-gray-300" /><span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white font-bold text-gray-400">2</span><span className="text-gray-400">{tr('sc.choose-design')}</span></div>
        <div className="grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[290px_1fr]">
          <aside className="bg-gradient-to-b from-[#233548] to-[#172535] p-4 md:p-7 text-white"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#ff6a00]"><Store size={25} /></div><h1 className="mt-6 text-2xl font-bold">{tr('sc.create-a-storefront')}</h1><p className="mt-3 text-sm leading-6 text-white/65">{tr('sc.set-up-a-focused-storefront-for-a-product-li')}</p><div className="mt-8 space-y-5 border-t border-white/10 pt-6 text-xs"><div className="flex gap-3"><span className="font-bold text-[#ff9b54]">01</span><div><p className="font-semibold">{tr('sc.business-identity')}</p><p className="mt-1 text-white/50">{tr('sc.name-image-and-contacts')}</p></div></div><div className="flex gap-3"><span className="font-bold text-[#ff9b54]">02</span><div><p className="font-semibold">{tr('sc.map-location')}</p><p className="mt-1 text-white/50">{tr('sc.pin-any-place-buyers-can-find')}</p></div></div><div className="flex gap-3"><span className="font-bold text-[#ff9b54]">03</span><div><p className="font-semibold">{tr('sc.choose-a-design')}</p><p className="mt-1 text-white/50">{tr('sc.customize-it-after-creation')}</p></div></div></div></aside>
          <div className="p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-wider text-[#ff6a00]">{tr('sc.store-information')}</p><h2 className="mt-2 text-2xl font-bold text-gray-900">{tr('sc.tell-buyers-about-this-store')}</h2><p className="mt-2 text-sm text-gray-500">{tr('sc.fields-can-be-updated-later-from-store-setti')}</p>
        <form className="mt-7 space-y-5" onSubmit={e => { e.preventDefault(); if (!details.name.trim() || !details.phone.trim() || !details.email.trim() || !details.storeImage) { setNotice({ title: 'Some details are missing', description: 'Please provide the store name, company phone, company email, and store/place image.', confirmLabel: 'OK', variant: 'alert' }); return; } setStep('template'); }}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-xs font-semibold text-gray-700">{tr('sc.store-name')}<span className="text-red-500">*</span><input required value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} placeholder="Example: Kigali Fresh Traders" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" /></label>
            <label className="text-xs font-semibold text-gray-700">{tr('sc.business-category')}<input value={details.category} onChange={e => setDetails({ ...details, category: e.target.value })} placeholder="Agriculture, electronics…" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
            <label className="text-xs font-semibold text-gray-700">{tr('sc.store-phone')}<span className="text-red-500">*</span><span className="mt-1 flex items-center rounded-lg border border-gray-200 focus-within:border-[#ff9900]"><span className="border-r border-gray-200 px-2.5 py-2.5 text-sm font-semibold text-gray-600">+257</span><input required value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} placeholder={tr("sc.company-contact-number")} className="border-0 flex-1 min-w-0 mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></span></label>
            <label className="text-xs font-semibold text-gray-700">{tr('sc.business-email')}<span className="text-red-500">*</span><input required type="email" value={details.email} onChange={e => setDetails({ ...details, email: e.target.value })} placeholder="sales@company.com" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
            <div className="md:col-span-2"><p className="text-xs font-semibold text-gray-700">{tr('sc.store-or-place-image')}<span className="text-red-500">*</span></p><label className={`mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 hover:border-[#ff6a00] ${details.storeImage ? 'border-emerald-300 bg-emerald-50' : 'border-[#ffb27c] bg-orange-50'}`}>{details.storeImage ? <img src={details.storeImage} alt="Store preview" className="h-12 w-16 rounded object-cover" /> : <span className="flex h-12 w-16 items-center justify-center rounded bg-white text-gray-400"><Store size={22} /></span>}<span><span className="block text-sm font-semibold text-gray-700">{details.storeImage ? 'Change store image' : 'Upload a store, office, or place photo'}</span><span className="block text-[11px] text-gray-400">{tr('sc.required-jpg-png-or-webp')}</span></span><input required={!details.storeImage} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setDetails(prev => ({ ...prev, storeImage: String(reader.result || '') })); reader.readAsDataURL(file); event.target.value = ''; }} /></label></div>
            <div className="md:col-span-2"><p className="text-xs font-semibold text-gray-700">{tr('sc.store-location')}</p><button type="button" onClick={() => setShowLocationMap(true)} className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#ffb27c] bg-orange-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-orange-100"><span className="flex min-w-0 items-center gap-2"><MapPin size={18} className="shrink-0 text-[#ff6a00]" /><span className="truncate">{details.address || (details.latitude ? `${details.latitude.toFixed(5)}, ${details.longitude.toFixed(5)}` : 'Pin any store or business location on the map')}</span></span><span className="shrink-0 text-xs font-bold text-[#e85f00]">{tr('sc.choose-map')}</span></button></div>
            <label className="text-xs font-semibold text-gray-700 md:col-span-2">{tr('sc.editable-address')}<input value={details.address} onChange={e => setDetails({ ...details, address: e.target.value })} placeholder={tr("sc.you-can-edit-the-detected-address-here")} className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
          </div>
          <label className="block text-xs font-semibold text-gray-700">{tr('sc.store-description')}<textarea rows={4} value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} placeholder="Describe the products buyers will find and what makes this store useful." className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end"><Link href="/seller-central/stores" className="rounded-lg border border-gray-300 px-6 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">{tr('sc.cancel')}</Link><button className="rounded-lg bg-[#ff6a00] px-7 py-3 text-sm font-bold text-white hover:bg-[#e85f00]">{tr('sc.continue-to-design')}</button></div>
        </form></div></div>
        <SellerLocationMapModal
          isOpen={showLocationMap}
          onClose={() => setShowLocationMap(false)}
          initial={{ latitude: details.latitude || undefined, longitude: details.longitude || undefined, address: details.address }}
          onConfirm={(location: SellerLocation) => { setDetails(prev => ({ ...prev, latitude: location.latitude, longitude: location.longitude, address: location.address || prev.address })); setShowLocationMap(false); }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#182334]">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff9900] text-white shadow-sm"><Store size={21} /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{tr('sc.store-setup')}</p><h1 className="text-lg font-bold">{tr('sc.choose-a-storefront-design')}</h1></div></div>
          <Link href="/seller-central/stores" className="text-sm font-semibold text-gray-500 hover:text-[#e87500]">{tr('sc.cancel')}</Link>
        </div>
      </div>
      <main className="mx-auto max-w-[1180px] px-5 py-8">
        <div className="mb-7 flex flex-col justify-between gap-5 rounded-2xl bg-[#233548] px-6 py-6 text-white shadow-sm sm:flex-row sm:items-center sm:px-8">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffb36f]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff9900] text-white">2</span>{tr('sc.choose-design')}</div><h2 className="text-2xl font-bold">Design {details.name ? `for ${details.name}` : 'your storefront'}</h2><p className="mt-2 max-w-xl text-sm text-white/65">{tr('sc.pick-a-starting-layout-you-can-edit-every-se')}</p></div>
          <button type="button" onClick={() => handleSelectTemplate('default-ready')} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#233548] shadow-sm hover:bg-orange-50 disabled:opacity-50"><Store size={16} />{tr('sc.use-recommended-default')}</button>
        </div>
        <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold">{tr('sc.storefront-templates')}</h3><p className="mt-1 text-sm text-gray-500">{tr('sc.choose-the-structure-that-best-fits-your-bus')}</p></div><button type="button" onClick={() => setStep('details')} className="text-sm font-semibold text-[#e87500] hover:underline">← Back to store details</button></div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} onClick={() => handleSelectTemplate(template.id)} className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selectedTemplate === template.id ? 'border-[#ff9900] ring-2 ring-[#ff9900]/25' : 'border-gray-200'}`}>
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#233548] via-[#31506c] to-[#ff9900]">
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/45 via-transparent to-transparent p-4"><span className="text-sm font-bold text-white">{template.name}</span></div>
                <img src={template.preview} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" onError={event => { event.currentTarget.style.display = 'none'; }} />
                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 shadow-sm">{template.category}</span>
                {selectedTemplate === template.id && <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#ff9900] text-white shadow"><CheckCircle size={16} /></span>}
              </div>
              <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-gray-900">{template.name}</h3>{template.id === 'default-ready' && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">{tr('sc.recommended')}</span>}</div><p className="mt-2 min-h-[40px] text-sm leading-5 text-gray-500">{template.description}</p><div className="mt-4 flex min-h-[24px] flex-wrap gap-1.5">{template.config.sections[0]?.modules.slice(0, 3).map((module, index) => <span key={index} className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold capitalize text-gray-600">{module.type.replace(/-/g, ' ')}</span>)}</div><button onClick={event => { event.stopPropagation(); handleSelectTemplate(template.id); }} disabled={loading} className="mt-5 w-full rounded-lg bg-[#ff9900] py-2.5 text-sm font-bold text-white transition hover:bg-[#e87500] disabled:opacity-50">{loading && selectedTemplate === template.id ? 'Creating storefront…' : 'Use this template'}</button></div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

// Storefront Builder Page Wrapper
function StorefrontBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const storeId = id ? parseInt(id) : 0;

  return (
    <StorefrontBuilder
      storeId={storeId}
      onBack={() => setLocation('/seller-central/stores')}
    />
  );
}

function CreateStoreWrapper() {
  const [, setLocation] = useLocation();
  const { createStore } = useAuth();
  return <CreateStorePage onComplete={async (data) => {
    const res = await createStore(data);
    if (res.success && res.store?.id) {
      // The recommended default is a complete, ready-to-use storefront.
      // Save it and return to My Stores instead of opening the builder.
      if (data.storeTemplate === 'default-ready') setLocation('/seller-central/stores');
      else setLocation(`/seller-central/stores/${res.store.id}/storefront`);
    } else if (res.success) {
      setLocation('/seller-central/stores');
    }
    return res;
  }} />;
}

function Router() {
  const { tr } = useLocale();
  const [location, setLocation] = useLocation();
  const { user, loading, login, signup, logout, completeProfile, createStore } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#232f3e] flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-[#ff9900] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Store size={32} className="text-white" />
          </div>
          <p className="text-white text-sm">{tr('sc.loading')}</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/signup
  if (!user) {
    // Password reset has to be reachable while signed out, and this branch renders the
    // login page for every path, so the route is checked here rather than in the Switch
    // below (which only runs once a seller is authenticated).
    if (location.split('?')[0] === '/seller-central/forgot-password') return <ForgotPasswordPage />;
    if (location.split('?')[0] === '/seller-central/terms') return <LegalPage />;
    return <LoginPage onLogin={async (phone, password) => {
      const result = await login(phone, password);
      if (result.success) {
        setLocation('/seller-central');
      }
      return result;
    }} onSignup={async (data) => {
      const result = await signup(data);
      if (result.success) {
        setLocation('/seller-central/profile/complete');
      }
      return result;
    }} />;
  }

  if (user.role !== 'seller') {
    logout();
    return null;
  }

  // Sellers must complete the short company form before dashboard/store pages are served.
  if (!user.profileCompleted && location !== '/seller-central/profile/complete') {
    return <ProfileCompletionPage onComplete={async (data) => {
      const result = await completeProfile(data);
      if (result.success) setLocation('/seller-central/stores/new');
      return result;
    }} />;
  }

  // Authenticated - show dashboard
  let title = tr('app.name');
  if (location === '/seller-central') title = tr('nav.dashboard');
  else if (location.includes('/orders')) title = tr('nav.orders');
  else if (location.includes('/products')) title = tr('product.title');
  else if (location.includes('/inventory')) title = tr('nav.inventory');
  else if (location.includes('/stores')) title = tr('nav.stores');
  else if (location.includes('/pricing')) title = tr('nav.pricing');
  else if (location.includes('/reports')) title = tr('nav.reports');
  else if (location.includes('/verification')) title = tr('verify.title');
  else if (location.includes('/payments')) title = tr('nav.payments');
  else if (location.includes('/settings')) title = tr('nav.settings');
  else if (location.includes('/messages')) title = tr('msg.title');
  else if (location.includes('/notifications')) title = tr('nav.notifications');

  const handleLogout = () => {
    // Otherwise the next seller to sign in on this device inherits the previous one's
    // verification badge until the page is reloaded.
    clearVerificationStatusCache();
    clearOrdersBadgeCache();
    logout();
    setLocation('/seller-central/login');
  };

  return (
    <AppLayout title={title} onLogout={handleLogout} chromeless={location.split('?')[0] === '/seller-central/messages'}>
      <Switch>
        <Route path="/seller-central" component={DashboardPage} />
        <Route path="/seller-central/orders" component={OrdersPage} />
        <Route path="/seller-central/orders/:id" component={OrderDetailPage} />
        <Route path="/seller-central/products" component={ProductsPage} />
        <Route path="/seller-central/products/new" component={AddProductPage} />
        <Route path="/seller-central/products/:id/edit" component={AddProductPage} />
        <Route path="/seller-central/inventory" component={() => <InventoryPage />} />
        <Route path="/seller-central/inventory/alerts" component={() => <InventoryPage lowStockOnly />} />
        <Route path="/seller-central/stores/new" component={CreateStoreWrapper} />
        <Route path="/seller-central/profile/complete" component={() => <ProfileCompletionPage onComplete={async (data) => { const result = await completeProfile(data); if (result.success) setLocation('/seller-central/stores/new'); return result; }} />} />
        <Route path="/seller-central/verification" component={VerificationPage} />
        <Route path="/seller-central/terms" component={LegalPage} />
        <Route path="/seller-central/profile" component={() => <SellerProfilePage user={user} onSave={completeProfile} />} />
        <Route path="/seller-central/stores/:id/storefront" component={StorefrontBuilderPage} />
        <Route path="/seller-central/stores" component={StoresPage} />
        <Route path="/seller-central/pricing/bulk" component={PricingManagementPage} />
        <Route path="/seller-central/pricing" component={PricingManagementPage} />
        <Route path="/seller-central/reports" component={DashboardPage} />
        <Route path="/seller-central/reports/sales" component={SalesReportPage} />
        <Route path="/seller-central/reports/inventory" component={InventoryReportPage} />
        <Route path="/seller-central/payments" component={PaymentsComingSoonPage} />
        <Route path="/seller-central/payments/transactions" component={PaymentsComingSoonPage} />
        <Route path="/seller-central/messages" component={MessagesPage} />
        <Route path="/seller-central/notifications" component={() => <NotificationsPage />} />
        <Route path="/seller-central/settings" component={() => <SectionComingSoonPage title={tr("sc.settings")} />} />
        <Route component={DashboardPage} />
      </Switch>
    </AppLayout>
  );
}

// Main App
export default function App() {
  return <Router />;
}
