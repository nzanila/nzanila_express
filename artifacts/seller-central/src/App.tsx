import { useState, useEffect, type FormEvent } from 'react';
import { Route, Switch, Link, useLocation, useParams } from 'wouter';
import { 
  Home, Package, ShoppingCart, DollarSign, BarChart3, Store, Settings, 
  HelpCircle, Bell, Search, Menu, X, ChevronDown, ChevronRight, ChevronLeft,
  Plus, FileText, Video, TrendingUp, Users, Box, Tag, Truck, MessageSquare,
  Shield, CreditCard, Globe, Layers, Star, AlertTriangle, CheckCircle,
  Edit, Trash2, Eye, Download, Upload, Filter, RefreshCw, ShoppingBag, Palette,
  ExternalLink, MapPin, MoreVertical
} from 'lucide-react';
import { MessagesPage, NotificationsPage } from './components/seller-communications';
import { StorefrontBuilder } from './components/storefront-builder';
import { SellerLocationMapModal, type SellerLocation } from './components/seller-location-map-modal';
import { DEFAULT_STOREFRONT_CONFIG, STOREFRONT_TEMPLATES, loadStorefrontTemplates, type StorefrontTemplate } from './lib/storefront-types';

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

interface Order {
  id: number;
  status: string;
  buyerName: string;
  itemCount: number;
  total: number;
  date: string;
}

// API Base URL - points to the same backend
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-seller-api.nzanilaexpress.workers.dev';
const STORE_BASE_URL = (import.meta as any).env?.VITE_STORE_URL || 'https://nzanila.pages.dev';

// Auth Context
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token
    const token = localStorage.getItem('sc_token');
    const userData = localStorage.getItem('sc_user');
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.role !== 'seller') {
          localStorage.removeItem('sc_token');
          localStorage.removeItem('sc_user');
          setLoading(false);
          return;
        }
        setUser(parsed);
        // Supabase is the source of truth for the personal seller profile.
        fetch(`${API_BASE}/api/sellers/${parsed.id}/profile`).then(async response => {
          if (!response.ok) return;
          const data = await response.json();
          if (!data.profile) return;
          setUser(previous => {
            if (!previous) return previous;
            const merged = { ...previous, name: data.profile.name || previous.name, businessName: data.profile.business_name || previous.businessName, phone: data.profile.phone || previous.phone, businessDescription: data.profile.business_description || previous.businessDescription, location: data.profile.location || previous.location, avatar: data.profile.profile_picture || previous.avatar };
            localStorage.setItem('sc_user', JSON.stringify(merged));
            return merged;
          });
        }).catch(() => {});
        // Check if store exists in database
        checkStoreStatus(parsed.id);
      } catch {
        localStorage.removeItem('sc_token');
        localStorage.removeItem('sc_user');
      }
    }
    setLoading(false);
  }, []);

  const checkStoreStatus = async (userId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/stores/seller/${userId}`);
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
    // Mock login - in production, call API
    const mockUser: User = {
      id: 22, // jean's id
      name: 'Jean Chretien',
      phone: phone,
      role: 'seller',
      profileCompleted: true,
      storeCreated: false,
    };
    
    // Check if profile exists
    try {
      const res = await fetch(`${API_BASE}/api/stores/seller/${mockUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.store) mockUser.storeCreated = true;
      }
    } catch {
      // Use default values
    }
    
    setUser(mockUser);
    localStorage.setItem('sc_token', 'mock_token_' + Date.now());
    localStorage.setItem('sc_user', JSON.stringify(mockUser));
    return { success: true };
  };

  const signup = async (data: { name: string; businessName: string; phone: string; password: string; location: string }) => {
    // Mock signup - in production, call API
    const mockUser: User = {
      id: 1,
      name: data.businessName || data.name,
      phone: data.phone,
      role: 'seller',
      profileCompleted: false,
      storeCreated: false,
    };
    setUser(mockUser);
    localStorage.setItem('sc_token', 'mock_token_' + Date.now());
    localStorage.setItem('sc_user', JSON.stringify(mockUser));
    return { success: true };
  };

  const completeProfile = async (data: { businessName: string; location: string; phone: string; businessDescription?: string; name?: string; avatar?: string }) => {
    if (!user) return { success: false };
    const updatedUser = {
      ...user,
      profileCompleted: true,
      businessName: data.businessName,
      location: data.location,
      businessDescription: data.businessDescription || user.businessDescription || '',
      name: data.name || data.businessName || user.name,
      avatar: data.avatar || user.avatar,
      phone: data.phone || user.phone,
    };
    try {
      const response = await fetch(`${API_BASE}/api/sellers/${user.id}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: updatedUser.name, business_name: updatedUser.businessName, phone: updatedUser.phone, location: updatedUser.location, business_description: updatedUser.businessDescription, profile_picture: updatedUser.avatar }) });
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
        headers: { 'Content-Type': 'application/json' },
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
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Dashboard']);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const menuItems = [
    { label: 'Dashboard', icon: Home, href: '/seller-central' },
    { 
      label: 'Catalog', 
      icon: Package,
      children: [
        { label: 'Add Products', href: '/seller-central/products/new' },
        { label: 'Manage Products', href: '/seller-central/products' },
        { label: 'Bulk Upload', href: '/seller-central/products/bulk' },
      ]
    },
    { 
      label: 'Inventory', 
      icon: Box,
      children: [
        { label: 'Inventory Dashboard', href: '/seller-central/inventory' },
        { label: 'Stock Levels', href: '/seller-central/inventory/stock' },
        { label: 'Low Stock Alerts', href: '/seller-central/inventory/alerts' },
      ]
    },
    { 
      label: 'Orders', 
      icon: ShoppingCart,
      children: [
        { label: 'All Orders', href: '/seller-central/orders' },
        { label: 'Pending Orders', href: '/seller-central/orders?status=new' },
        { label: 'Processing', href: '/seller-central/orders?status=processing' },
      ]
    },
    { 
      label: 'Pricing', 
      icon: DollarSign,
      children: [
        { label: 'Price Management', href: '/seller-central/pricing' },
        { label: 'Bulk Pricing', href: '/seller-central/pricing/bulk' },
      ]
    },
    { 
      label: 'Stores', 
      icon: Store,
      children: [
        { label: 'My Stores', href: '/seller-central/stores' },
        { label: 'Create Store', href: '/seller-central/stores/new' },
      ]
    },
    { 
      label: 'Reports', 
      icon: BarChart3,
      children: [
        { label: 'Sales Reports', href: '/seller-central/reports/sales' },
        { label: 'Inventory Reports', href: '/seller-central/reports/inventory' },
      ]
    },
    { 
      label: 'Payments', 
      icon: CreditCard,
      children: [
        { label: 'Payment Dashboard', href: '/seller-central/payments' },
        { label: 'Transactions', href: '/seller-central/payments/transactions' },
      ]
    },
    { label: 'Messages', icon: MessageSquare, href: '/seller-central/messages' },
    { label: 'Notifications', icon: Bell, href: '/seller-central/notifications' },
    { label: 'Company Profile', icon: Users, href: '/seller-central/profile' },
    { label: 'Settings', icon: Settings, href: '/seller-central/settings' },
  ];

  const isActive = (href: string) => location === href;
  const isParentActive = (item: any) => {
    if (item.href) return isActive(item.href);
    return item.children?.some((child: any) => isActive(child.href)) || false;
  };

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-16'} bg-[#232f3e] text-white transition-all duration-300 flex flex-col`}>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#ff9900] flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-bold text-sm">Seller Central</span>
          </div>
        )}
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Search */}
      {isOpen && (
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
            />
          </div>
        </div>
      )}

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedItems.includes(item.label);
          const active = isParentActive(item);

          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleExpanded(item.label)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    active 
                      ? 'bg-[#ff9900] text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {isOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  )}
                </button>
                {isOpen && isExpanded && (
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
              <Icon size={18} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// Top Bar Component
function TopBar({ title, onLogout }: { title: string; onLogout: () => void }) {
  const user = JSON.parse(localStorage.getItem('sc_user') || '{}');
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/seller-central/notifications" aria-label="Open notifications" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
        </Link>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <HelpCircle size={20} />
        </button>
        <div className="flex items-center gap-3">
          <Link href="/seller-central/profile" className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-gray-50" title="Open profile">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user.name || 'Seller'}</p>
              {user.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
            </div>
            {user.avatar ? <img src={user.avatar} alt={`${user.name || 'Seller'} profile`} className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#232f3e] text-sm font-bold text-white">{(user.name || 'S').charAt(0).toUpperCase()}</div>}
          </Link>
          <button onClick={onLogout} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">Log out</button>
        </div>
      </div>
    </header>
  );
}

// Dashboard Page
function DashboardPage() {
  const [stats, setStats] = useState({ products: 0, stores: 0, inquiries: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => { try { const user = JSON.parse(localStorage.getItem('sc_user') || '{}'); const storesResponse = await fetch(`${API_BASE}/api/stores/seller/${user.id}`); const storeData = storesResponse.ok ? await storesResponse.json() : {}; const stores = storeData.stores || (storeData.store ? [storeData.store] : []); let products = 0; for (const store of stores) { const response = await fetch(`${API_BASE}/api/stores/${store.id}/products`); if (response.ok) products += (await response.json()).length; } setStats({ products, stores: stores.length, inquiries: 0, orders: 0 }); } catch {} finally { setLoading(false); } }; void load();
  }, []);
  return <div className="min-h-full bg-[#f5f5f7] p-4 md:p-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs text-gray-500">Analytics / Overview</p><h2 className="mt-1 text-3xl font-bold text-[#202124]">Performances</h2></div><div className="flex gap-2"><select className="rounded border border-gray-200 bg-white px-3 py-2 text-sm"><option>Last 7 days</option><option>Last 30 days</option><option>Last 12 months</option></select><select className="rounded border border-gray-200 bg-white px-3 py-2 text-sm"><option>All industries</option><option>Agriculture</option><option>Manufacturing</option></select></div></div><div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 p-5"><div><h3 className="font-bold text-gray-900">Prices & discounts</h3><p className="mt-1 text-sm text-gray-600">Choose a product and update its price in a quick popup.</p></div><Link href="/seller-central/pricing" className="rounded-lg bg-orange-500 px-4 py-3 text-sm font-bold text-white">Manage discounts</Link></div><div className="mb-5 flex gap-6 border-b border-gray-200 text-sm"><span className="border-b-2 border-[#ff9900] px-1 pb-3 font-bold text-[#202124]">Data overview</span><Link href="/seller-central/products" className="pb-3 text-gray-500 hover:text-gray-900">Product performance</Link><Link href="/seller-central/messages" className="pb-3 text-gray-500 hover:text-gray-900">Inquiries</Link></div><div className="grid gap-5 xl:grid-cols-[1fr_260px]"><div className="space-y-5"><div className="rounded-xl border border-gray-200 bg-white p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-gray-500">Store performance</p><p className="mt-1 text-xs text-gray-400">Live data from your Supabase storefronts</p></div><span className="text-xs text-gray-400">Updated just now</span></div><div className="grid grid-cols-2 gap-5 md:grid-cols-4"><div><p className="text-xs text-gray-500">Unique visitors</p><p className="mt-2 text-3xl font-bold text-gray-900">—</p><p className="text-xs text-gray-400">Tracking soon</p></div><div><p className="text-xs text-gray-500">Page views</p><p className="mt-2 text-3xl font-bold text-gray-900">{loading ? '…' : stats.stores}</p><p className="text-xs text-gray-400">Active stores</p></div><div><p className="text-xs text-gray-500">Inquiries</p><p className="mt-2 text-3xl font-bold text-gray-900">{stats.inquiries}</p><p className="text-xs text-gray-400">No inquiries yet</p></div><div><p className="text-xs text-gray-500">Shop conversion</p><p className="mt-2 text-3xl font-bold text-gray-900">—</p><p className="text-xs text-gray-400">Needs visitor data</p></div></div><div className="mt-7 h-48 rounded-lg bg-gradient-to-b from-blue-50 to-white p-3"><svg viewBox="0 0 760 150" className="h-full w-full"><path d="M0 125 C80 125 90 110 150 112 S230 80 300 91 S380 60 450 72 S540 45 610 58 S700 24 760 34" fill="none" stroke="#2f8ce8" strokeWidth="4" /><path d="M0 125 C80 125 90 110 150 112 S230 80 300 91 S380 60 450 72 S540 45 610 58 S700 24 760 34 V150 H0Z" fill="#dceeff" opacity=".7" /></svg></div></div><div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-gray-200 bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-bold">Product performance</h3><Link href="/seller-central/products" className="text-xs font-semibold text-[#ff9900]">View products</Link></div><p className="mt-6 text-4xl font-bold">{loading ? '…' : stats.products}</p><p className="text-sm text-gray-500">Products in your catalogs</p><div className="mt-5 flex gap-2"><Link href="/seller-central/products/new" className="rounded bg-[#ff9900] px-3 py-2 text-xs font-bold text-white">Add product</Link><Link href="/seller-central/stores" className="rounded border px-3 py-2 text-xs font-semibold">Manage stores</Link></div></div><div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="font-bold">Buyer inquiries</h3><p className="mt-6 text-4xl font-bold">{stats.inquiries}</p><p className="text-sm text-gray-500">Respond quickly to win follow-ups</p><Link href="/seller-central/messages" className="mt-5 inline-block text-xs font-semibold text-[#ff9900]">Open message center →</Link></div></div></div><aside className="rounded-xl border border-gray-200 bg-[#232f3e] p-5 text-white"><h3 className="font-bold">Seller health</h3><div className="mt-5 rounded-lg bg-white/10 p-4"><p className="text-xs text-white/70">Storefronts</p><p className="mt-1 text-3xl font-bold">{stats.stores}</p><p className="mt-1 text-xs text-emerald-300">Active and connected</p></div><div className="mt-3 rounded-lg bg-white/10 p-4"><p className="text-xs text-white/70">Catalog quality</p><p className="mt-1 text-3xl font-bold">{stats.products ? 'Ready' : 'Start'}</p><p className="mt-1 text-xs text-white/70">Add products to improve visibility</p></div><div className="mt-6 border-t border-white/15 pt-5"><p className="text-sm font-semibold">Quick links</p><div className="mt-3 space-y-2 text-xs"><Link href="/seller-central/stores/new" className="block text-white/80 hover:text-white">Create storefront →</Link><Link href="/seller-central/profile" className="block text-white/80 hover:text-white">Edit company profile →</Link><Link href="/seller-central/reports" className="block text-white/80 hover:text-white">Open reports →</Link></div></div></aside></div></div>;
}

// Orders Page
function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const mockOrders: Order[] = [
      { id: 1847, status: 'new', buyerName: 'Kigali Fresh Market', itemCount: 12, total: 485.00, date: new Date(Date.now() - 1800000).toISOString() },
      { id: 1846, status: 'new', buyerName: 'Nyamirambo Wholesalers', itemCount: 8, total: 320.50, date: new Date(Date.now() - 3600000).toISOString() },
      { id: 1845, status: 'confirmed', buyerName: 'Huye Distributors', itemCount: 5, total: 195.00, date: new Date(Date.now() - 7200000).toISOString() },
      { id: 1842, status: 'delivered', buyerName: 'Rubavu Markets Ltd', itemCount: 15, total: 782.00, date: new Date(Date.now() - 86400000).toISOString() },
      { id: 1838, status: 'delivered', buyerName: 'Kigali Fresh Market', itemCount: 6, total: 275.00, date: new Date(Date.now() - 172800000).toISOString() },
      { id: 1835, status: 'out_for_delivery', buyerName: 'Gisenyi Wholesalers', itemCount: 10, total: 456.00, date: new Date(Date.now() - 259200000).toISOString() },
    ];
    setTimeout(() => { setOrders(mockOrders); setLoading(false); }, 400);
  }, []);

  const money = (value: number) => `${value.toLocaleString()} BIF`;
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'out_for_delivery', label: 'In Transit' },
    { value: 'delivered', label: 'Completed' },
  ];

  return (
    <div className="p-6">
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

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Buyer</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Total</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Date</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-6 py-4">
                    <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-900">No orders found</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[#ff9900]">#{order.id}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{order.buyerName}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'new' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{money(order.total)}</td>
                  <td className="px-6 py-4 text-xs text-gray-500 text-right">{timeAgo(order.date)}</td>
                  <td className="px-6 py-4 text-center">
                    <Link href={`/seller-central/orders/${order.id}`} className="text-xs font-bold text-[#ff9900] hover:underline">
                      Review
                    </Link>
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

// Products Page — per-account/store, no hardcoded mocks
function ProductsPage() {
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
      setProducts((items) => items.map((item) => item.id === pricing.id ? { ...item, price: Number(saved.base_price), compareAtPrice: saved.compare_at_price == null ? null : Number(saved.compare_at_price) } : item));
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

  useEffect(() => {
    const load = async () => {
      try {
        const userData = localStorage.getItem('sc_user');
        const user = userData ? JSON.parse(userData) : null;
        if (!user) { setLoading(false); return; }
        // Load every store so products published to a selected subset/all stores are visible.
        const sRes = await fetch(`${API_BASE}/api/stores/seller/${user.id}`);
        const sData = sRes.ok ? await sRes.json() : {};
        const stores = Array.isArray(sData.stores) ? sData.stores : (sData.store ? [sData.store] : []);
        if (!stores.length) { setProducts([]); setLoading(false); return; }
        const storeRows = await Promise.all(stores.map(async (store: any) => {
          const response = await fetch(`${API_BASE}/api/stores/${store.id}/products`);
          const payload = response.ok ? await response.json() : {};
          const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.products) ? payload.products : []);
          return rows.map((r: any) => ({ ...r, storeName: store.name, storeId: store.id }));
        }));
        const mapped: Product[] = storeRows.flat().map((r:any)=>({
            id: r.id,
            name: `${r.name}`,
            price: Number(r.base_price),
            compareAtPrice: r.compare_at_price == null ? null : Number(r.compare_at_price),
            stock: Number(r.stock_quantity ?? 0),
            category: r.category_id ? String(r.category_id) : (r.unit_type || 'General'),
            image: r.primary_image,
            images: Array.isArray(r.product_images) && r.product_images.length ? r.product_images.map((picture: any) => picture.picture_url).filter(Boolean) : (r.primary_image ? [r.primary_image] : []),
            unit: r.unit_type || 'piece',
            verified: r.status === 'approved',
            storeName: r.storeName,
            storeId: Number(r.storeId),
            description: r.description || '',
            model: r.model || '',
            condition: r.condition || 'New',
            minimumOrderQuantity: Number(r.minimum_order_quantity ?? 1),
            deliveryAvailable: r.delivery_available === true,
            pickupAvailable: r.pickup_available === true,
            preparationTime: r.preparation_time || '',
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
    } catch (error) { window.alert(error instanceof Error ? error.message : 'Could not delete this product.'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="p-6">
      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 max-w-md">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Filter products by store" value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            <option value="all">All stores</option>
            {storeNames.map((store) => <option key={store.id} value={String(store.id)}>{store.name}</option>)}
          </select>
          <Link href="/seller-central/products/new" className="flex items-center gap-2 px-4 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00]">
            <Plus size={14} /> Add Product
          </Link>
        </div>
      </div>

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
            <p className="text-sm font-semibold text-gray-900">No products found</p>
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
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      Out of stock
                    </span>
                  )}
                  {product.stock > 0 && product.stock < 10 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                      Low stock
                    </span>
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
                  <button onClick={() => openPricing(product)} className="flex items-center justify-center px-2 py-2 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold hover:bg-orange-100">Price & discount</button>
                  <div className="relative ml-auto"><button type="button" onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)} className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50" aria-label="Product actions" aria-expanded={openMenu === product.id}><MoreVertical size={15} /></button>{openMenu === product.id && <div className="absolute bottom-full right-0 z-[60] mb-1 w-36 rounded-lg border border-gray-200 bg-white p-1 shadow-xl"><Link href={`/seller-central/products/${product.id}/edit`} onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded px-3 py-2 text-xs hover:bg-gray-50"><Edit size={12} /> Edit</Link><button type="button" onClick={() => { setOpenMenu(null); setPendingDelete(product); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><Trash2 size={12} /> Delete</button></div>}</div>
                  <button type="button" onClick={() => { setPreviewProduct(product); setPreviewImage(product.images?.[0] || product.image || ''); }} className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    <Eye size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {pricing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Price and discount">
        <form onSubmit={(event) => { event.preventDefault(); savePrice(); }} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Price & discount</h2><button type="button" disabled={savingPrice} onClick={() => setPricing(null)} aria-label="Close"><X size={20} /></button></div>
          <p className="mt-2 text-sm text-gray-600">{pricing.name}</p><p className="mt-1 text-sm">Current price: {money(pricing.price)}</p>
          <label className="mt-4 block text-sm font-semibold">Change type<select value={priceMode} onChange={(event) => setPriceMode(event.target.value as 'regular' | 'discount')} className="mt-1 w-full rounded-lg border p-2"><option value="discount">Run a discount</option><option value="regular">Change regular price</option></select></label>
          <label className="mt-4 block text-sm font-semibold">New price (BIF)<input type="number" min="1" step="1" required value={newPrice} onChange={(event) => setNewPrice(event.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          {priceMode === 'discount' && <div className="mt-3 rounded-lg bg-orange-50 p-3 text-sm"><p>Original price: {money(pricing.compareAtPrice || pricing.price)}</p><label className="mt-2 block">Discount (%)<input type="number" min="1" max="99" placeholder="e.g. 20" onChange={(event) => { const percent = Number(event.target.value); if (percent > 0 && percent < 100) setNewPrice(String(Math.round((pricing.compareAtPrice || pricing.price) * (1 - percent / 100)))); }} className="mt-1 w-full rounded border p-2" /></label><p className="mt-2">Buyer pays: {Number(newPrice) > 0 ? money(Number(newPrice)) : '—'}</p></div>}
          <p className="mt-3 text-xs text-gray-500">Regular price changes remove the discount label. Changes apply to this product wherever it is listed.</p>
          {priceError && <p role="alert" className="mt-3 text-sm text-red-600">{priceError}</p>}
          <button disabled={savingPrice} className="mt-5 w-full rounded-lg bg-orange-500 p-3 font-bold text-white disabled:opacity-50">{savingPrice ? 'Saving…' : 'Save price'}</button>
        </form>
      </div>}
      {previewProduct && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => setPreviewProduct(null)}>
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h2 className="text-base font-bold text-gray-900">Product preview</h2><button type="button" onClick={() => setPreviewProduct(null)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={18} /></button></div>
          <div className="p-5"><div className="relative h-56 overflow-hidden rounded-xl bg-gray-100">{previewImage ? <img src={previewImage} alt={previewProduct.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package size={48} className="text-gray-300" /></div>}{(previewProduct.images?.length || 0) > 1 && <><button type="button" aria-label="Previous product photo" onClick={() => { const images = previewProduct.images || []; const index = Math.max(0, images.indexOf(previewImage)); setPreviewImage(images[(index - 1 + images.length) % images.length]); }} className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"><ChevronLeft size={18} /></button><button type="button" aria-label="Next product photo" onClick={() => { const images = previewProduct.images || []; const index = Math.max(0, images.indexOf(previewImage)); setPreviewImage(images[(index + 1) % images.length]); }} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"><ChevronRight size={18} /></button></>}</div>{(previewProduct.images?.length || 0) > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{previewProduct.images?.map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setPreviewImage(image)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${previewImage === image ? 'border-[#ff6a00]' : 'border-transparent'}`}><img src={image} alt={`${previewProduct.name} photo ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}<h3 className="mt-4 text-lg font-bold text-gray-900">{previewProduct.name}</h3><p className="mt-1 text-xl font-bold text-[#ff6a00]">{money(previewProduct.price)} / {previewProduct.unit}</p><p className="mt-3 text-sm leading-5 text-gray-600">{previewProduct.description || 'No product description added yet.'}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">Stock</span><strong className="mt-1 block text-gray-900">{previewProduct.stock} units</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">Minimum order</span><strong className="mt-1 block text-gray-900">{previewProduct.minimumOrderQuantity || 1} {previewProduct.unit}</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">Model / condition</span><strong className="mt-1 block truncate text-gray-900">{previewProduct.model || 'Not specified'} · {previewProduct.condition || 'New'}</strong></div><div className="rounded-lg bg-gray-50 p-3"><span className="text-gray-500">Fulfilment</span><strong className="mt-1 block text-gray-900">{previewProduct.deliveryAvailable ? 'Delivery' : ''}{previewProduct.deliveryAvailable && previewProduct.pickupAvailable ? ' + ' : ''}{previewProduct.pickupAvailable ? 'Pickup' : !previewProduct.deliveryAvailable ? 'Not specified' : ''}</strong></div></div>{previewProduct.preparationTime && <p className="mt-3 text-xs text-gray-500">Preparation: {previewProduct.preparationTime}</p>}<p className="mt-2 text-xs font-semibold text-orange-600">Store: {previewProduct.storeName || 'Storefront'}</p></div>
        </div>
      </div>}
      {pendingDelete && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-product-title">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600"><AlertTriangle size={20} /></div><div><h2 id="delete-product-title" className="text-base font-bold text-gray-900">Delete product?</h2><p className="mt-1 text-sm leading-5 text-gray-600">This will permanently remove <strong>{pendingDelete.name}</strong> and its product photos. This action cannot be undone.</p></div></div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={deleting} onClick={() => setPendingDelete(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button><button type="button" disabled={deleting} onClick={() => void deleteProduct()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete product'}</button></div>
        </div>
      </div>}
    </div>
  );
}

// Inventory Page
function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockInventory = [
      { id: 1, name: 'Premium Cassava Flour (50kg)', sku: 'GRN-001', stock: 120, reserved: 15, available: 105, threshold: 20, status: 'active' },
      { id: 2, name: 'Fresh Beans (25kg)', sku: 'LEG-002', stock: 8, reserved: 3, available: 5, threshold: 10, status: 'low_stock' },
      { id: 3, name: 'Vegetable Oil (20L)', sku: 'OIL-003', stock: 34, reserved: 5, available: 29, threshold: 10, status: 'active' },
      { id: 4, name: 'Maize Grain (100kg)', sku: 'GRN-004', stock: 5, reserved: 2, available: 3, threshold: 15, status: 'low_stock' },
      { id: 5, name: 'Sugar (50kg)', sku: 'SWT-005', stock: 89, reserved: 10, available: 79, threshold: 20, status: 'active' },
    ];
    setTimeout(() => { setInventory(mockInventory); setLoading(false); }, 400);
  }, []);

  return (
    <div className="p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-orange-600">{inventory.filter(i => i.status === 'low_stock').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{inventory.filter(i => i.stock === 0).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-gray-900">$12,450</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">SKU</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Stock</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Reserved</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase">Available</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Actions</th>
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
                      {item.status === 'active' ? 'Active' : 'Low Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-xs font-bold text-[#ff9900] hover:underline">Adjust</button>
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

// Stores Page
function StoresPage() {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const userData = localStorage.getItem('sc_user');
        const user = userData ? JSON.parse(userData) : null;
        if (user) {
          const res = await fetch(`${API_BASE}/api/stores/seller/${user.id}`);
          if (res.ok) {
            const data = await res.json();
            const storeRows = Array.isArray(data.stores) ? data.stores : (data.store ? [data.store] : []);
            if (storeRows.length) {
              const productCounts = await Promise.all(storeRows.map(async (storeRow: any) => {
                try { const response = await fetch(`${API_BASE}/api/stores/${storeRow.id}/products`); const payload = response.ok ? await response.json() : {}; const rows = Array.isArray(payload) ? payload : (Array.isArray(payload.products) ? payload.products : []); return rows.length; } catch { return 0; }
              }));
              setStores(storeRows.map((storeRow: any, index: number) => ({
                id: storeRow.id, name: storeRow.name, description: storeRow.description || '',
                location: `${storeRow.commune || ''}, ${storeRow.province || ''}`.replace(/^, |, $/g, ''),
                status: storeRow.status, products: productCounts[index], orders: storeRow.totalSales || 0,
                revenue: parseFloat(storeRow.totalRevenue) || 0, rating: storeRow.rating || 0, slug: storeRow.slug,
                logo: storeRow.logo || storeRow.storefront_config?.header?.profileImage || '', banner: storeRow.banner || storeRow.storefront_config?.shopSign?.imageUrl || '', isVerified: storeRow.isVerified,
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
    if (!window.confirm(`Delete “${store.name}”? This removes the store and its storefront configuration.`)) return;
    try {
      const response = await fetch(`${API_BASE}/api/stores/${store.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('sc_token') || ''}` } });
      if (!response.ok) throw new Error('Delete failed');
      setStores(previous => previous.filter(item => item.id !== store.id));
    } catch { alert('Could not delete this store. Please try again.'); }
  };

  return (
    <div className="min-h-full bg-[#f6f7f8] p-5 md:p-7">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-[#1f2937]">My Stores</h2>
          <p className="mt-1 text-xs text-gray-500">Manage storefront design, catalog visibility, and store details.</p>
        </div>
        <Link href="/seller-central/stores/new" className="flex items-center gap-2 rounded bg-[#ff6a00] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#e85f00]">
          <Plus size={14} /> Create Store
        </Link>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-8 bg-gray-100 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
            </div>
          ))
        ) : stores.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Store size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-bold text-gray-900 mb-2">No stores yet</p>
            <p className="text-sm text-gray-500 mb-4">Create your first store to start selling</p>
            <Link href="/seller-central/stores/new" className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff9900] text-white rounded-lg font-bold hover:bg-[#e68a00]">
              <Plus size={16} /> Create Store
            </Link>
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative m-2 h-36 overflow-hidden rounded-xl bg-gradient-to-r from-[#edf6ff] to-[#f8fbff]">
                {store.banner ? (
                  <><img src={store.banner} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-white/65 to-transparent" /></>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {store.logo ? <img src={store.logo} alt={`${store.name} logo`} className="h-20 w-40 object-contain" /> : <div className="flex flex-col items-center justify-center text-[#718096]"><div className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#cbd8e5] bg-white shadow-sm"><Store size={32} strokeWidth={1.6} className="text-[#1677d2]" /></div><span className="mt-2 text-[10px] font-medium text-gray-400">Store image</span></div>}
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {store.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700">
                      <Shield size={10} /> Verified
                    </span>
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
                  {store.id === 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Demo</span>
                  )}
                </div>
                <p className="mb-1 line-clamp-2 min-h-8 text-xs leading-4 text-gray-500">{store.description || 'No store description added yet.'}</p>
                {store.location && <p className="mb-4 text-[10px] font-medium text-gray-400">{store.location}</p>}
                <div className="mb-4 grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold text-gray-900">{store.products}</p>
                    <p className="text-[10px] text-gray-500">Products</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold text-gray-900">{store.orders}</p>
                    <p className="text-[10px] text-gray-500">Orders</p>
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-bold text-orange-600">{store.rating}</p>
                    <p className="text-[10px] text-gray-500">Rating</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/seller-central/stores/${store.id}/storefront`} className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[#ff6a00] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#e85f00]">
                    <Palette size={12} /> {store.id === 0 ? 'Design Storefront' : 'Edit Design'}
                  </Link>
                  <a href={`${STORE_BASE_URL}/store/${store.slug}`} target="_blank" rel="noopener noreferrer" title="View store page" className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <ExternalLink size={14} className="text-gray-600" />
                  </a>
                  <Link href={`/seller-central/stores/${store.id}`} title="Edit store details" className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Edit size={14} className="text-gray-600" />
                  </Link>
                  <button onClick={() => void deleteStore(store)} title="Delete store" className="px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-600" /></button>
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
  const [isSignup, setIsSignup] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [countryCode, setCountryCode] = useState('+257');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isSignup) {
        await onSignup({ name, businessName, phone: countryCode + phone, password, location });
      } else {
        await onLogin(countryCode + phone, password);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#232f3e] flex items-center justify-center p-4 relative overflow-hidden">
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
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-[#ff9900] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#ff9900]/30">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Seller Central</h1>
          <p className="text-gray-400 mt-2">Manage your stores and inventory</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {isSignup ? 'Create Seller Account' : 'Sign In'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Kigali Fresh Traders"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Nyarugenge, Kigali"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <div className="flex items-center gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]"
                >
                  <option value="+257">🇧🇮 +257</option>
                  <option value="+250">🇷🇼 +250</option>
                </select>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="61 23 4567"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => setIsSignup(!isSignup)} 
                className="text-[#ff9900] font-semibold hover:underline"
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {!isSignup && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                Forgot your password? <a href="#" className="text-[#ff9900] hover:underline">Reset it</a>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          <a href="https://nzanila.com" className="text-white hover:underline">← Back to Nzanila Marketplace</a>
        </p>
      </div>
    </div>
  );
}

// App Layout
function AppLayout({ children, title, onLogout }: { children: React.ReactNode; title: string; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={title} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Add Product Page - Step by Step Wizard
function AddProductPage() {
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
        alert('Product updated successfully.');
        window.location.href = '/seller-central/products';
        return;
      }
      const responses = await Promise.all(targetStoreIds.map((targetId) => fetch(`${API_BASE}/api/stores/${targetId}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify(productBody),
      })));
      const failed = responses.find((response) => !response.ok);
      if (failed) { const err = await failed.json().catch(() => ({ error: 'Unknown error' })); throw new Error(err.error || `HTTP ${failed.status}`); }
      alert(targetStoreIds.length === stores.length ? 'Product added to all your stores.' : `Product added to ${targetStoreIds.length} store${targetStoreIds.length === 1 ? '' : 's'}.`);
      window.location.href = '/seller-central/products';
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
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-orange-50"><input type="checkbox" checked={selectedStoreIds.length === stores.length} onChange={() => setSelectedStoreIds(selectedStoreIds.length === stores.length ? [] : stores.map(store => store.id))} className="h-4 w-4 accent-[#ff6a00]" />All stores <span className="ml-auto text-xs text-gray-400">{stores.length}</span></label>
        <div className="my-1 border-t border-gray-100" />
        {stores.map(store => <label key={store.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50"><input type="checkbox" checked={selectedStoreIds.includes(store.id)} onChange={() => setSelectedStoreIds(current => current.includes(store.id) ? current.filter(id => id !== store.id) : [...current, store.id])} className="h-4 w-4 accent-[#ff6a00]" /><span className="min-w-0 flex-1 truncate">{store.name}</span><span className="text-xs text-gray-400">{formData.stockQuantity || '0'} units</span></label>)}
        <button type="button" onClick={() => setStoresMenuOpen(false)} className="mt-1 w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-700">Done</button>
      </div>}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
          <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#1677ff] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className={step >= 1 ? 'text-[#ff9900] font-semibold' : ''}>Category</span>
          <span className={step >= 2 ? 'text-[#ff9900] font-semibold' : ''}>Basic info</span>
          <span className={step >= 3 ? 'text-[#ff9900] font-semibold' : ''}>Unit</span>
          {formData.unitType !== 'service' && (
            <span className={step >= 4 ? 'text-[#ff9900] font-semibold' : ''}>Package</span>
          )}
          <span className={step >= (formData.unitType === 'service' ? 4 : 5) ? 'text-[#ff9900] font-semibold' : ''}>Variations</span>
          <span className={step >= (formData.unitType === 'service' ? 5 : 6) ? 'text-[#ff9900] font-semibold' : ''}>Trade info</span>
          <span className={step >= (formData.unitType === 'service' ? 6 : 7) ? 'text-[#ff9900] font-semibold' : ''}>Logistics</span>
        </div>
      </div>

      <div className="sticky top-4 z-20 mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 shadow-sm">
        <label className="block text-sm font-bold text-gray-900">Publish this product to a store</label>
        <p className="mt-1 text-xs text-gray-600">Select one, several, or all stores. Your product will be copied only to the stores you select.</p>
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
            <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-wider text-[#1677ff]">Select category</p><h3 className="mt-1 text-xl font-bold text-gray-900">What are you selling?</h3><p className="mt-2 text-sm text-gray-500">Choose the most specific category so buyers can find your product.</p></div><span className="hidden h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff] sm:flex"><Tag size={22} /></span></div>
            <div className="relative mt-5"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input value={categorySearch} onChange={e => setCategorySearch(e.target.value)} placeholder="Search categories…" className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#1677ff] focus:ring-2 focus:ring-blue-100" /></div>
          </div>
          <div className="px-6 py-6 sm:px-8">
          <div className="mb-3 flex items-center gap-5 border-b border-gray-200 text-xs"><button type="button" className="border-b-2 border-[#1677ff] pb-2 font-bold text-[#1677ff]">Search categories</button><button type="button" onClick={() => setCategorySearch('')} className="pb-2 text-gray-500 hover:text-gray-800">Recently used</button></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">Category list</p><p className="text-xs text-gray-400">{categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length} available</p></div>
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
          <div className="min-h-[290px] rounded border border-gray-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">Selected category</p>{formData.categoryName ? <><p className="mt-4 text-sm font-bold text-gray-900">{formData.categoryName}</p><p className="mt-2 text-xs leading-5 text-gray-500">This category will be shown on your product listing and used to match buyers with your store.</p>{categories.find(c => c.id === formData.categoryId)?.children && <div className="mt-5 border-t border-gray-100 pt-4"><p className="text-xs font-bold text-gray-700">Choose a subcategory</p><div className="mt-2 flex flex-wrap gap-2">{categories.find(c => c.id === formData.categoryId)?.children?.map((sub: any) => <button type="button" key={sub.id} onClick={() => { updateForm('categoryId', sub.id); updateForm('categoryName', sub.name); }} className={`rounded border px-2.5 py-1.5 text-[11px] font-medium ${formData.categoryName === sub.name ? 'border-[#1677ff] bg-blue-50 text-[#1677ff]' : 'border-gray-200 text-gray-600 hover:border-[#1677ff]'}`}>{sub.name}</button>)}</div></div>}</> : <div className="flex h-[220px] flex-col items-center justify-center text-center"><Package size={34} className="text-gray-300" /><p className="mt-3 text-xs font-semibold text-gray-500">Select a category from the list</p><p className="mt-1 max-w-[220px] text-[10px] leading-4 text-gray-400">Choose the most specific category so your product reaches the right buyers.</p></div>}</div>
          </div>
          {categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && <div className="rounded-xl border border-dashed border-gray-300 px-5 py-8 text-center"><p className="text-sm font-semibold text-gray-700">No matching category</p><p className="mt-1 text-xs text-gray-500">Try another search or suggest a new category below.</p></div>}

          {/* Other / Suggest */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">
              Can't find the right category?{' '}
              <button 
                onClick={() => setShowCategorySuggestion(true)}
                className="text-[#ff9900] font-semibold hover:underline"
              >
                Choose Other or suggest a category
              </button>
            </p>
          </div>

          {showCategorySuggestion && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm font-semibold text-gray-900 mb-2">Suggest a new category</p>
              <input
                type="text"
                placeholder="Category name"
                value={formData.customCategorySuggestion}
                onChange={(e) => updateForm('customCategorySuggestion', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm mb-2"
              />
              <textarea
                placeholder="Why should this be a category? (optional)"
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
                >
                  Submit Suggestion
                </button>
                <button
                  onClick={() => setShowCategorySuggestion(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-400">You can change this before publishing.</p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Product Details</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g. Premium Rice (25kg bag)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Describe your product..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Condition *</label>
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => updateForm('brand', e.target.value)}
                      placeholder="e.g. Samsung"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Storage/Capacity</label>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => updateForm('size', e.target.value)}
                    placeholder="e.g. M, L, XL"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => updateForm('color', e.target.value)}
                    placeholder="e.g. Black, White"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Material</label>
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
              <div className="flex flex-wrap items-start justify-between gap-3"><div><label className="block text-sm font-bold text-gray-800">Product photos <span className="text-red-500">*</span></label><p className="mt-1 text-xs text-gray-500">Upload clear photos from different angles. Select several files at once, or use Add photos again. The first image becomes your main photo.</p></div><span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-[#e87500]">Recommended: 6 photos</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {(formData.productImages.length ? formData.productImages : formData.primaryImage ? [formData.primaryImage] : []).map((image, index) => <div key={`${image.slice(0, 20)}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white"><img src={image} alt={`Product ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setFormData(previous => { const nextImages = previous.productImages.filter((_, imageIndex) => imageIndex !== index); return { ...previous, productImages: nextImages, primaryImage: nextImages[0] || '' }; })} className="absolute right-1 top-1 hidden rounded-full bg-white/90 p-1 text-red-500 shadow group-hover:block" aria-label="Remove photo"><X size={12} /></button>{index === 0 ? <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">Main</span> : <button type="button" onClick={() => setFormData(previous => { const chosen = previous.productImages[index]; return { ...previous, productImages: [chosen, ...previous.productImages.filter((_, imageIndex) => imageIndex !== index)], primaryImage: chosen }; })} className="absolute bottom-1 left-1 rounded bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-gray-700 shadow hover:bg-orange-50">Set main</button>}</div>)}
                {formData.productImages.length < 6 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-gray-400 transition hover:border-[#ff9900] hover:bg-orange-50"><Plus size={20} /><span className="mt-1 text-[10px] font-semibold">Add photos</span><span className="text-[9px]">up to {6 - formData.productImages.length} more</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={event => { addProductImages(event.currentTarget.files); event.currentTarget.value = ''; }} /></label>}
              </div>
              <div className="mt-4 border-t border-gray-200 pt-4"><div className="flex items-center gap-2"><Video size={16} className="text-[#1677ff]" /><p className="text-xs font-bold text-gray-700">Product video <span className="font-normal text-gray-400">(optional)</span></p></div><div className="mt-2 flex flex-col gap-2 sm:flex-row"><input value={formData.productVideo} onChange={e => updateForm('productVideo', e.target.value)} placeholder="Paste a product video URL" className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none focus:border-[#ff9900]" /><label className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-[#ff9900]"><Upload size={14} /> Upload video<input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => updateForm('productVideo', String(reader.result || '')); reader.readAsDataURL(file); event.target.value = ''; }} /></label></div><p className="mt-1 text-[10px] text-gray-400">Show the product in use, its packaging, or quality details.</p></div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!formData.name || !formData.description}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Selling Unit */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">How do you sell this product?</h3>
          <p className="text-sm text-gray-500 mb-6">Choose the unit that matches how buyers will purchase</p>
          
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Custom unit name</label>
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
            >
              Back
            </button>
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 5 : 4)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Package Size (skip for services) */}
      {step === 4 && formData.unitType !== 'service' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Package size (optional)</h3>
          <p className="text-sm text-gray-500 mb-6">Help buyers understand exactly what they're receiving</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={formData.unitQuantity}
                onChange={(e) => updateForm('unitQuantity', e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Measurement</label>
              <select
                value={formData.unitMeasurement}
                onChange={(e) => updateForm('unitMeasurement', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              >
                <option value="">Select...</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="L">Litres (L)</option>
                <option value="ml">Millilitres (ml)</option>
                <option value="items">Items</option>
                <option value="pieces">Pieces</option>
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
            >
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Variations */}
      {step === 5 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Product variations</h3>
          <p className="text-sm text-gray-500 mb-6">Does this product have different options?</p>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => updateForm('hasVariations', false)}
              className={`flex-1 p-4 rounded-xl border-2 text-center ${
                !formData.hasVariations ? 'border-[#ff9900] bg-orange-50' : 'border-gray-200'
              }`}
            >
              <p className="text-sm font-semibold">No, one version</p>
            </button>
            <button
              onClick={() => updateForm('hasVariations', true)}
              className={`flex-1 p-4 rounded-xl border-2 text-center ${
                formData.hasVariations ? 'border-[#ff9900] bg-orange-50' : 'border-gray-200'
              }`}
            >
              <p className="text-sm font-semibold">Yes, add options</p>
            </button>
          </div>

          {formData.hasVariations && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">What is different?</p>
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
            >
              Back
            </button>
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 5 : 6)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Price and Stock */}
      {step === 6 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Price & Stock</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price (BIF) *</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Original price (optional)</label>
              <input
                type="number"
                min="0"
                value={formData.compareAtPrice}
                onChange={(e) => updateForm('compareAtPrice', e.target.value)}
                placeholder="Add only when offering a discount"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Enter the original price above and the reduced selling price in Price. Buyers will see the savings automatically.</p>
              {Number(formData.compareAtPrice) > Number(formData.basePrice) && Number(formData.basePrice) > 0 && <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-700">{Math.round((1 - Number(formData.basePrice) / Number(formData.compareAtPrice)) * 100)}% off · Buyers pay {Number(formData.basePrice).toLocaleString()} BIF</p>}
              {formData.compareAtPrice && <button type="button" onClick={() => updateForm('compareAtPrice', '')} className="mt-2 text-xs font-semibold text-orange-700 underline">Remove discount label</button>}
            </div>

            {formData.unitType !== 'service' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock quantity *</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => updateForm('stockQuantity', e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum order quantity</label>
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
            >
              Back
            </button>
            <button
              onClick={() => setStep(formData.unitType === 'service' ? 6 : 7)}
              disabled={!formData.basePrice || (formData.unitType !== 'service' && !formData.stockQuantity)}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 7: Delivery (or Step 6 for services) */}
      {((step === 7 && formData.unitType !== 'service') || (step === 6 && formData.unitType === 'service')) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Delivery options</h3>
          <p className="text-sm text-gray-500 mb-6">How can buyers receive this product?</p>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={formData.deliveryAvailable}
                onChange={(e) => updateForm('deliveryAvailable', e.target.checked)}
                className="w-5 h-5 text-[#ff9900] rounded"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">Seller delivery</p>
                <p className="text-xs text-gray-500">You deliver to the buyer's location</p>
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
                <p className="text-sm font-semibold text-gray-900">Buyer pickup</p>
                <p className="text-xs text-gray-500">Buyer comes to your location</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated preparation time</label>
              <select
                value={formData.preparationTime}
                onChange={(e) => updateForm('preparationTime', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              >
                <option value="same_day">Same day</option>
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
            >
              Back
            </button>
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
          <p className="text-sm font-semibold text-blue-900 mb-2">Preview</p>
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
          <p className="text-xs text-blue-600 mt-2">Product will appear on marketplace after admin review</p>
        </div>
      )}
      </div>
      <aside className="sticky top-6 hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:block">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900">Product information</h3><span className="text-xs font-bold text-[#ff6a00]">{Math.round(([Boolean(formData.categoryId), Boolean(formData.name.trim()), Boolean(formData.description.trim()), Boolean(formData.primaryImage), Boolean(formData.basePrice), Boolean(formData.stockQuantity), Boolean(formData.deliveryAvailable || formData.pickupAvailable)].filter(Boolean).length / 7) * 100)}%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#ff9900] transition-all" style={{ width: `${([Boolean(formData.categoryId), Boolean(formData.name.trim()), Boolean(formData.description.trim()), Boolean(formData.primaryImage), Boolean(formData.basePrice), Boolean(formData.stockQuantity), Boolean(formData.deliveryAvailable || formData.pickupAvailable)].filter(Boolean).length / 7) * 100}%` }} /></div>
        <p className="mt-3 text-xs leading-5 text-gray-500">Complete more details to help buyers discover and trust your listing.</p>
        <div className="mt-5 space-y-3 border-t border-gray-100 pt-4 text-xs">
          {[['Category', Boolean(formData.categoryId)], ['Product name', Boolean(formData.name.trim())], ['Description', Boolean(formData.description.trim())], ['Product photos', Boolean(formData.primaryImage)], ['Price and MOQ', Boolean(formData.basePrice)], ['Stock quantity', Boolean(formData.stockQuantity)], ['Delivery options', Boolean(formData.deliveryAvailable || formData.pickupAvailable)]].map(([label, complete]) => <div key={String(label)} className="flex items-center gap-2"><span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${complete ? 'bg-emerald-500 text-white' : 'border border-gray-300 text-transparent'}`}>✓</span><span className={complete ? 'font-semibold text-gray-700' : 'text-gray-500'}>{label}</span></div>)}
        </div>
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Live product preview</p>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex h-20 items-center justify-center bg-gray-100">{formData.primaryImage ? <img src={formData.primaryImage} alt="" className="h-full w-full object-cover" /> : <Package size={24} className="text-gray-300" />}</div>
            <div className="p-2"><p className="truncate text-xs font-bold text-gray-900">{formData.name || 'Product name'}</p><p className="mt-1 text-xs font-bold text-[#ff6a00]">{formData.basePrice ? `${Number(formData.basePrice).toLocaleString()} BIF` : 'Price not set'}</p><p className="mt-1 text-[10px] text-gray-500">Stock: {formData.stockQuantity || '0'} · {formData.categoryName || 'Category not set'}</p></div>
          </div>
        </div>
        <div className="mt-5 rounded-lg bg-blue-50 p-3"><p className="text-[11px] font-bold text-blue-900">Listing tip</p><p className="mt-1 text-[11px] leading-4 text-blue-700">Use clear product photos, specific keywords, price, MOQ, and delivery details. Six photos are recommended for buyer confidence.</p></div>
      </aside>
      </div>
    </div>
  );
}

// Profile Completion Page
function ProfileCompletionPage({ onComplete }: { onComplete: (data: any) => Promise<any> }) {
  const [formData, setFormData] = useState({
    businessName: '',
    location: 'Bujumbura',
    phone: '+257',
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
          <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
          <p className="text-gray-400 mt-2">Tell us about your business</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name *</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Business Location *</label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Business Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+257 79 123 456"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Business Description (optional)</label>
              <textarea
                value={formData.businessDescription}
                onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                placeholder="What does your business do?"
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
  const [form, setForm] = useState({
    name: user.name || '', businessName: user.businessName || user.name || '',
    location: user.location || 'Bujumbura', phone: user.phone || '',
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
  return <div className="p-6 max-w-3xl mx-auto">
    <div className="mb-6"><h2 className="text-xl font-bold text-gray-900">Company profile</h2><p className="text-sm text-gray-500 mt-1">Edit every detail shown in your supplier header and storefront.</p></div>
    <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center gap-4">
        {form.avatar ? <img src={form.avatar} alt="Profile" className="h-16 w-16 rounded-xl object-cover border" /> : <div className="h-16 w-16 rounded-xl bg-[#232f3e] text-white flex items-center justify-center text-xl font-bold">{(form.businessName || 'YC').slice(0, 2).toUpperCase()}</div>}
        <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"><Upload size={14} className="inline mr-2" />Change profile image<input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm(prev => ({ ...prev, avatar: String(reader.result || '') })); reader.readAsDataURL(file); }} /></label>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-gray-700">Your name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-2 w-full px-3 py-2.5 border rounded-lg font-normal" required /></label>
        <label className="text-sm font-semibold text-gray-700">Company name<input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} className="mt-2 w-full px-3 py-2.5 border rounded-lg font-normal" required /></label>
        <label className="text-sm font-semibold text-gray-700">Phone<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-2 w-full px-3 py-2.5 border rounded-lg font-normal" required /></label>
        <label className="text-sm font-semibold text-gray-700">Business location<select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="mt-2 w-full px-3 py-2.5 border rounded-lg font-normal">{locations.map(location => <option key={location}>{location}</option>)}</select></label>
      </div>
      <label className="block text-sm font-semibold text-gray-700">About your company<textarea value={form.businessDescription} onChange={e => setForm({ ...form, businessDescription: e.target.value })} rows={4} className="mt-2 w-full px-3 py-2.5 border rounded-lg font-normal" placeholder="Wholesale supplier and trusted business partner" /></label>
      {message && <p className="text-sm rounded-lg bg-gray-50 px-3 py-2">{message}</p>}
      <button disabled={saving} className="w-full py-3 rounded-lg bg-[#ff9900] text-white font-bold disabled:opacity-50">{saving ? 'Saving...' : 'Save profile'}</button>
    </form>
  </div>;
}

// Create Store Page - Template Selection
function CreateStorePage({ onComplete }: { onComplete: (data: any) => Promise<any> }) {
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
      storefrontConfig.sections = storefrontConfig.sections.map(section => section.id !== 'contacts' ? section : ({ ...section, modules: section.modules.map(module => module.id !== 'default-contact' ? module : ({ ...module, props: { ...module.props, description: `Phone: ${details.phone || user.phone || 'Add your phone number'}\nEmail: ${details.email || 'Add your email'}\nLocation: ${details.address || details.location || 'Add your warehouse or showroom address'}` } })) }));

      const storeData = {
        sellerId: user.id,
        name: details.name.trim(),
        description: details.description.trim() || template.description,
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
        alert('Failed to create store: ' + (res.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Failed to create store: ' + (e.message || 'error'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'details') return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f4f6f8] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3 text-xs"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ff6a00] font-bold text-white">1</span><span className="font-bold text-gray-900">Store details</span><span className="h-px w-14 bg-gray-300" /><span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white font-bold text-gray-400">2</span><span className="text-gray-400">Choose design</span></div>
        <div className="grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[290px_1fr]">
          <aside className="bg-gradient-to-b from-[#233548] to-[#172535] p-7 text-white"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#ff6a00]"><Store size={25} /></div><h1 className="mt-6 text-2xl font-bold">Create a storefront</h1><p className="mt-3 text-sm leading-6 text-white/65">Set up a focused storefront for a product line, location, or business category.</p><div className="mt-8 space-y-5 border-t border-white/10 pt-6 text-xs"><div className="flex gap-3"><span className="font-bold text-[#ff9b54]">01</span><div><p className="font-semibold">Business identity</p><p className="mt-1 text-white/50">Name, image, and contacts.</p></div></div><div className="flex gap-3"><span className="font-bold text-[#ff9b54]">02</span><div><p className="font-semibold">Map location</p><p className="mt-1 text-white/50">Pin any place buyers can find.</p></div></div><div className="flex gap-3"><span className="font-bold text-[#ff9b54]">03</span><div><p className="font-semibold">Choose a design</p><p className="mt-1 text-white/50">Customize it after creation.</p></div></div></div></aside>
          <div className="p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-wider text-[#ff6a00]">Store information</p><h2 className="mt-2 text-2xl font-bold text-gray-900">Tell buyers about this store</h2><p className="mt-2 text-sm text-gray-500">Fields can be updated later from store settings.</p>
        <form className="mt-7 space-y-5" onSubmit={e => { e.preventDefault(); if (!details.name.trim() || !details.phone.trim() || !details.email.trim() || !details.storeImage) { alert('Please provide the store name, company phone, company email, and store/place image.'); return; } setStep('template'); }}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-xs font-semibold text-gray-700">Store name <span className="text-red-500">*</span><input required value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} placeholder="Example: Kigali Fresh Traders" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" /></label>
            <label className="text-xs font-semibold text-gray-700">Business category<input value={details.category} onChange={e => setDetails({ ...details, category: e.target.value })} placeholder="Agriculture, electronics…" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
            <label className="text-xs font-semibold text-gray-700">Store phone <span className="text-red-500">*</span><input required value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} placeholder="Company contact number" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
            <label className="text-xs font-semibold text-gray-700">Business email <span className="text-red-500">*</span><input required type="email" value={details.email} onChange={e => setDetails({ ...details, email: e.target.value })} placeholder="sales@company.com" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
            <div className="md:col-span-2"><p className="text-xs font-semibold text-gray-700">Store or place image <span className="text-red-500">*</span></p><label className={`mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 hover:border-[#ff6a00] ${details.storeImage ? 'border-emerald-300 bg-emerald-50' : 'border-[#ffb27c] bg-orange-50'}`}>{details.storeImage ? <img src={details.storeImage} alt="Store preview" className="h-12 w-16 rounded object-cover" /> : <span className="flex h-12 w-16 items-center justify-center rounded bg-white text-gray-400"><Store size={22} /></span>}<span><span className="block text-sm font-semibold text-gray-700">{details.storeImage ? 'Change store image' : 'Upload a store, office, or place photo'}</span><span className="block text-[11px] text-gray-400">Required · JPG, PNG, or WebP</span></span><input required={!details.storeImage} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setDetails(prev => ({ ...prev, storeImage: String(reader.result || '') })); reader.readAsDataURL(file); event.target.value = ''; }} /></label></div>
            <div className="md:col-span-2"><p className="text-xs font-semibold text-gray-700">Store location</p><button type="button" onClick={() => setShowLocationMap(true)} className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#ffb27c] bg-orange-50 px-4 py-3 text-left text-sm text-gray-700 hover:bg-orange-100"><span className="flex min-w-0 items-center gap-2"><MapPin size={18} className="shrink-0 text-[#ff6a00]" /><span className="truncate">{details.address || (details.latitude ? `${details.latitude.toFixed(5)}, ${details.longitude.toFixed(5)}` : 'Pin any store or business location on the map')}</span></span><span className="shrink-0 text-xs font-bold text-[#e85f00]">Choose map →</span></button></div>
            <label className="text-xs font-semibold text-gray-700 md:col-span-2">Editable address<input value={details.address} onChange={e => setDetails({ ...details, address: e.target.value })} placeholder="You can edit the detected address here" className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
          </div>
          <label className="block text-xs font-semibold text-gray-700">Store description<textarea rows={4} value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} placeholder="Describe the products buyers will find and what makes this store useful." className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 font-normal outline-none focus:border-[#ff6a00]" /></label>
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end"><Link href="/seller-central/stores" className="rounded-lg border border-gray-300 px-6 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</Link><button className="rounded-lg bg-[#ff6a00] px-7 py-3 text-sm font-bold text-white hover:bg-[#e85f00]">Continue to design →</button></div>
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
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff9900] text-white shadow-sm"><Store size={21} /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Store setup</p><h1 className="text-lg font-bold">Choose a storefront design</h1></div></div>
          <Link href="/seller-central/stores" className="text-sm font-semibold text-gray-500 hover:text-[#e87500]">Cancel</Link>
        </div>
      </div>
      <main className="mx-auto max-w-[1180px] px-5 py-8">
        <div className="mb-7 flex flex-col justify-between gap-5 rounded-2xl bg-[#233548] px-6 py-6 text-white shadow-sm sm:flex-row sm:items-center sm:px-8">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffb36f]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ff9900] text-white">2</span> Choose design</div><h2 className="text-2xl font-bold">Design {details.name ? `for ${details.name}` : 'your storefront'}</h2><p className="mt-2 max-w-xl text-sm text-white/65">Pick a starting layout. You can edit every section, product, image, and color later in Storefront Builder.</p></div>
          <button type="button" onClick={() => handleSelectTemplate('default-ready')} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#233548] shadow-sm hover:bg-orange-50 disabled:opacity-50"><Store size={16} /> Use recommended default</button>
        </div>
        <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-bold">Storefront templates</h3><p className="mt-1 text-sm text-gray-500">Choose the structure that best fits your business.</p></div><button type="button" onClick={() => setStep('details')} className="text-sm font-semibold text-[#e87500] hover:underline">← Back to store details</button></div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article key={template.id} onClick={() => handleSelectTemplate(template.id)} className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selectedTemplate === template.id ? 'border-[#ff9900] ring-2 ring-[#ff9900]/25' : 'border-gray-200'}`}>
              <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#233548] via-[#31506c] to-[#ff9900]">
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/45 via-transparent to-transparent p-4"><span className="text-sm font-bold text-white">{template.name}</span></div>
                <img src={template.preview} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" onError={event => { event.currentTarget.style.display = 'none'; }} />
                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600 shadow-sm">{template.category}</span>
                {selectedTemplate === template.id && <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#ff9900] text-white shadow"><CheckCircle size={16} /></span>}
              </div>
              <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-gray-900">{template.name}</h3>{template.id === 'default-ready' && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Recommended</span>}</div><p className="mt-2 min-h-[40px] text-sm leading-5 text-gray-500">{template.description}</p><div className="mt-4 flex min-h-[24px] flex-wrap gap-1.5">{template.config.sections[0]?.modules.slice(0, 3).map((module, index) => <span key={index} className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-semibold capitalize text-gray-600">{module.type.replace(/-/g, ' ')}</span>)}</div><button onClick={event => { event.stopPropagation(); handleSelectTemplate(template.id); }} disabled={loading} className="mt-5 w-full rounded-lg bg-[#ff9900] py-2.5 text-sm font-bold text-white transition hover:bg-[#e87500] disabled:opacity-50">{loading && selectedTemplate === template.id ? 'Creating storefront…' : 'Use this template'}</button></div>
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

function EditStorePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', phone: '', email: '' });
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stores/${id}`);
        if (res.ok) { const data = await res.json(); const s = data.store || data; setStore(s); setForm({ name: s.name || '', description: s.description || '', phone: s.phone || '', email: s.email || '' }); }
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);
  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const token = localStorage.getItem('sc_token');
      const res = await fetch(`${API_BASE}/api/stores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { setMsg('Saved successfully'); setStore((p:any)=>({...p, ...form})); }
      else { const t=await res.text(); setMsg('Save failed: '+t); }
    } catch (e:any) { setMsg('Save failed'); }
    setSaving(false);
  };
  if (loading) return <div className="p-12 text-center text-sm text-gray-500">Loading store...</div>;
  if (!store) return <div className="p-12 text-center"><p className="text-sm text-gray-500">Store not found</p><Link href="/seller-central/stores" className="text-sm text-[#ff9900] underline">Back to stores</Link></div>;
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/seller-central/stores" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"><ChevronRight className="rotate-180" size={14}/> Back to Stores</Link>
        <h2 className="text-lg font-bold">Edit Store</h2>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Store Name *</label>
          <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff9900]" />
          </div>
        </div>
        {msg && <p className="text-sm text-center py-2 rounded-lg bg-gray-50 text-gray-700">{msg}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 py-2.5 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00] disabled:opacity-50">{saving?'Saving...':'Save Changes'}</button>
          <Link href={`/seller-central/stores/${id}/storefront`} className="flex-1 py-2.5 bg-[#232f3e] text-white rounded-lg text-sm font-bold text-center hover:bg-black flex items-center justify-center gap-1.5"><Palette size={14}/> Design Storefront</Link>
          {store?.slug && <a href={`${STORE_BASE_URL}/store/${store.slug}`} target="_blank" rel="noopener noreferrer" className="py-2.5 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center"><ExternalLink size={14} className="text-gray-600"/></a>}
        </div>
        <Link href="/seller-central/stores" className="block text-center text-sm text-gray-500 hover:text-gray-700">Back to stores</Link>
      </div>
    </div>
  );
}

// Router
function Router() {
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
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/signup
  if (!user) {
    return <LoginPage onLogin={async (phone, password) => {
      const result = await login(phone, password);
      if (result.success) {
        setLocation('/seller-central');
      }
    }} onSignup={async (data) => {
      const result = await signup(data);
      if (result.success) {
        setLocation('/seller-central/profile/complete');
      }
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
  let title = 'Seller Central';
  if (location === '/seller-central') title = 'Dashboard';
  else if (location.includes('/orders')) title = 'Orders';
  else if (location.includes('/products')) title = 'Products';
  else if (location.includes('/inventory')) title = 'Inventory';
  else if (location.includes('/stores')) title = 'Stores';
  else if (location.includes('/pricing')) title = 'Pricing';
  else if (location.includes('/reports')) title = 'Reports';
  else if (location.includes('/payments')) title = 'Payments';
  else if (location.includes('/settings')) title = 'Settings';
  else if (location.includes('/messages')) title = 'Messages';
  else if (location.includes('/notifications')) title = 'Notifications';

  const handleLogout = () => {
    logout();
    setLocation('/seller-central/login');
  };

  return (
    <AppLayout title={title} onLogout={handleLogout}>
      <Switch>
        <Route path="/seller-central" component={DashboardPage} />
        <Route path="/seller-central/orders" component={OrdersPage} />
        <Route path="/seller-central/orders/:id" component={OrdersPage} />
        <Route path="/seller-central/products" component={ProductsPage} />
        <Route path="/seller-central/products/new" component={AddProductPage} />
        <Route path="/seller-central/products/:id/edit" component={AddProductPage} />
        <Route path="/seller-central/inventory" component={InventoryPage} />
        <Route path="/seller-central/stores/new" component={CreateStoreWrapper} />
        <Route path="/seller-central/profile/complete" component={() => <ProfileCompletionPage onComplete={async (data) => { const result = await completeProfile(data); if (result.success) setLocation('/seller-central/stores/new'); return result; }} />} />
        <Route path="/seller-central/profile" component={() => <SellerProfilePage user={user} onSave={completeProfile} />} />
        <Route path="/seller-central/stores/:id/storefront" component={StorefrontBuilderPage} />
        <Route path="/seller-central/stores/:id" component={EditStorePage} />
        <Route path="/seller-central/stores" component={StoresPage} />
        <Route path="/seller-central/pricing" component={ProductsPage} />
        <Route path="/seller-central/reports" component={DashboardPage} />
        <Route path="/seller-central/payments" component={DashboardPage} />
        <Route path="/seller-central/messages" component={MessagesPage} />
        <Route path="/seller-central/notifications" component={NotificationsPage} />
        <Route path="/seller-central/settings" component={DashboardPage} />
        <Route component={DashboardPage} />
      </Switch>
    </AppLayout>
  );
}

// Main App
export default function App() {
  return <Router />;
}
