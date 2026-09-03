import { useState, useEffect, type FormEvent } from 'react';
import { Route, Switch, Link, useLocation, useParams } from 'wouter';
import { 
  Home, Package, ShoppingCart, DollarSign, BarChart3, Store, Settings, 
  HelpCircle, Bell, Search, Menu, X, ChevronDown, ChevronRight,
  Plus, FileText, TrendingUp, Users, Box, Tag, Truck, MessageSquare,
  Shield, CreditCard, Globe, Layers, Star, AlertTriangle, CheckCircle,
  Edit, Trash2, Eye, Download, Upload, Filter, RefreshCw, ShoppingBag, Palette,
  ExternalLink
} from 'lucide-react';
import { StorefrontBuilder } from './components/storefront-builder';

// Types
interface User {
  id: number;
  name: string;
  phone: string;
  role: 'buyer' | 'seller';
  profileCompleted?: boolean;
  storeCreated?: boolean;
  businessName?: string;
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
  stock: number;
  category: string;
  image?: string;
  verified?: boolean;
  unit?: string;
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
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://nzanila-api.pages.dev';
const STORE_BASE_URL = (import.meta as any).env?.VITE_STORE_URL || 'https://nzanila-express.pages.dev';

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
      name: 'Jean Fresh Traders',
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

  const completeProfile = async (data: { businessName: string; location: string; phone: string }) => {
    if (!user) return { success: false };
    const updatedUser = {
      ...user,
      profileCompleted: true,
      businessName: data.businessName,
      location: data.location,
    };
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
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#ff9900]"></span>
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <HelpCircle size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{user.name || 'Seller'}</p>
            <p className="text-xs text-gray-500">{user.phone}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-[#232f3e] flex items-center justify-center text-white font-bold text-sm">
            {user.name?.charAt(0) || 'S'}
          </div>
          <button 
            onClick={onLogout}
            className="text-xs text-gray-500 hover:text-red-600 font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

// Dashboard Page
function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockData = {
      revenue: 12450.80,
      revenueChange: 12,
      ordersThisWeek: 47,
      ordersChange: -3,
      activeProducts: 23,
      lowStockProducts: 4,
      statusCounts: {
        new: 8,
        confirmed: 5,
        processing: 3,
        ready: 2,
        out_for_delivery: 12,
        delivered: 156,
        cancelled: 7,
      },
      actionableOrders: [
        { id: 1847, status: 'new', buyerName: 'Kigali Fresh Market', itemCount: 12, total: 485.00, date: new Date(Date.now() - 1800000).toISOString() },
        { id: 1846, status: 'new', buyerName: 'Nyamirambo Wholesalers', itemCount: 8, total: 320.50, date: new Date(Date.now() - 3600000).toISOString() },
        { id: 1845, status: 'confirmed', buyerName: 'Huye Distributors', itemCount: 5, total: 195.00, date: new Date(Date.now() - 7200000).toISOString() },
      ],
      topProducts: [
        { id: 1, name: 'Premium Cassava Flour (50kg)', price: 45.00, stock: 120, category: 'Grains & Flour' },
        { id: 2, name: 'Fresh Beans (25kg)', price: 32.00, stock: 8, category: 'Legumes' },
        { id: 3, name: 'Vegetable Oil (20L)', price: 58.50, stock: 34, category: 'Oils & Fats' },
      ],
    };
    setTimeout(() => { setStats(mockData); setLoading(false); }, 400);
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Account Health */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-bold text-gray-700">Account Health:</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Healthy
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Revenue (week)</p>
          <p className="text-2xl font-bold text-gray-900">{money(stats.revenue)}</p>
          <p className="text-xs text-emerald-600 mt-1">+{stats.revenueChange}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Orders (week)</p>
          <p className="text-2xl font-bold text-gray-900">{stats.ordersThisWeek}</p>
          <p className="text-xs text-red-500 mt-1">{stats.ordersChange}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Products</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeProducts}</p>
          <p className="text-xs text-orange-500 mt-1">{stats.lowStockProducts} low stock</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">New Orders</p>
          <p className="text-2xl font-bold text-orange-600">{stats.statusCounts.new}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">In Transit</p>
          <p className="text-2xl font-bold text-blue-600">{stats.statusCounts.out_for_delivery}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/seller-central/orders" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#ff9900] hover:text-[#ff9900] transition-colors">
          <ShoppingBag size={12} /> Manage Orders
        </Link>
        <Link href="/seller-central/products" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#ff9900] hover:text-[#ff9900] transition-colors">
          <Package size={12} /> Manage Products
        </Link>
        <Link href="/seller-central/inventory" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#ff9900] hover:text-[#ff9900] transition-colors">
          <Box size={12} /> Inventory
        </Link>
        <Link href="/seller-central/stores" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#ff9900] hover:text-[#ff9900] transition-colors">
          <Store size={12} /> My Stores
        </Link>
      </div>

      {/* Widget Grid */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Orders Widget */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-bold text-gray-900">Orders Needing Action</h3>
            <Link href="/seller-central/orders" className="text-xs font-semibold text-[#ff9900] hover:underline">View all</Link>
          </div>
          <div className="p-5">
            {stats.actionableOrders.length > 0 ? (
              <div className="space-y-3">
                {stats.actionableOrders.map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/seller-central/orders/${order.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:border-orange-200 hover:bg-orange-50/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">#{order.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          order.status === 'new' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status === 'new' ? 'New' : 'Confirmed'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{order.buyerName} · {order.itemCount} items · {money(order.total)}</p>
                    </div>
                    <span className="text-xs text-gray-400">{timeAgo(order.date)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No pending orders</p>
            )}
          </div>
        </div>

        {/* Top Products Widget */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-bold text-gray-900">Top Products</h3>
            <Link href="/seller-central/products" className="text-xs font-semibold text-[#ff9900] hover:underline">View all</Link>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {stats.topProducts.map((p: any, i: number) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                    {i + 1}
                  </span>
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package size={20} className="text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{money(p.price)}</p>
                    <p className={`text-xs ${p.stock < 10 ? 'text-red-500' : 'text-gray-500'}`}>{p.stock} units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const userData = localStorage.getItem('sc_user');
        const user = userData ? JSON.parse(userData) : null;
        if (!user) { setLoading(false); return; }
        // find seller's store
        const sRes = await fetch(`${API_BASE}/api/stores/seller/${user.id}`);
        let storeId: number | null = null;
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.store) storeId = sData.store.id;
        }
        if (!storeId) { setProducts([]); setLoading(false); return; }
        const pRes = await fetch(`${API_BASE}/api/stores/${storeId}/products`);
        if (pRes.ok) {
          const rows = await pRes.json();
          const mapped: Product[] = rows.map((r:any)=>({
            id: r.id,
            name: r.name,
            price: Number(r.base_price),
            stock: Number(r.stock_quantity ?? 0),
            category: r.category_id ? String(r.category_id) : (r.unit_type || 'General'),
            image: r.primary_image,
            unit: r.unit_type || 'piece',
            verified: r.status === 'approved',
          }));
          setProducts(mapped);
        } else {
          setProducts([]);
        }
      } catch { setProducts([]); }
      setLoading(false);
    };
    load();
  }, []);

  const money = (value: number) => `${value.toLocaleString()} BIF`;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Link href="/seller-central/products/new" className="flex items-center gap-2 px-4 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00]">
          <Plus size={14} /> Add Product
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center overflow-hidden">
                {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <Package size={40} className="text-orange-300" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</h3>
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
                <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-900">{money(product.price)}/{product.unit}</p>
                  <p className={`text-sm ${product.stock < 10 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                    Stock: {product.stock}
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/seller-central/products/${product.id}/edit`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    <Edit size={12} /> Edit
                  </Link>
                  <Link href={`/products/${product.id}`} className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    <Eye size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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
  const demoStore: StoreInfo = {
    id: 0,
    name: 'Kigali Fresh Traders',
    description: 'Premium agricultural products',
    location: 'Nyarugenge, Kigali',
    status: 'active',
    products: 23,
    orders: 156,
    revenue: 12450,
    rating: 4.8,
    slug: 'kigali-fresh-traders',
    isVerified: true,
  };

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const userData = localStorage.getItem('sc_user');
        const user = userData ? JSON.parse(userData) : null;
        if (user) {
          const res = await fetch(`${API_BASE}/api/stores/seller/${user.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.store) {
              setStores([{
                id: data.store.id,
                name: data.store.name,
                description: data.store.description || '',
                location: `${data.store.commune || ''}, ${data.store.province || ''}`.replace(/^, |, $/g, ''),
                status: data.store.status,
                products: data.store.productCount || 0,
                orders: data.store.totalSales || 0,
                revenue: parseFloat(data.store.totalRevenue) || 0,
                rating: data.store.rating || 0,
                slug: data.store.slug,
                logo: data.store.logo,
                isVerified: data.store.isVerified,
              }]);
            } else {
              setStores([demoStore]);
            }
          } else {
            setStores([demoStore]);
          }
        } else {
          setStores([demoStore]);
        }
      } catch {
        setStores([demoStore]);
      }
      setLoading(false);
    };
    fetchStores();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-600">Manage your storefronts</p>
        </div>
        <Link href="/seller-central/stores/new" className="flex items-center gap-2 px-4 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00]">
          <Plus size={14} /> Create Store
        </Link>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div key={store.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-24 bg-gradient-to-br from-[#232f3e] to-[#37475a] relative">
                {store.logo ? (
                  <img src={store.logo} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Store size={32} className="text-white/30" />
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
              <div className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  <Star size={12} className="text-yellow-400 fill-current" />
                  <span className="text-xs font-semibold text-gray-600">{store.rating}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">{store.name}</h3>
                  {store.id === 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Demo</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3 line-clamp-1">{store.description || store.location}</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-sm font-bold text-gray-900">{store.products}</p>
                    <p className="text-[10px] text-gray-500">Products</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-sm font-bold text-gray-900">{store.orders}</p>
                    <p className="text-[10px] text-gray-500">Orders</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-sm font-bold text-orange-600">{store.rating}</p>
                    <p className="text-[10px] text-gray-500">Rating</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/seller-central/stores/${store.id}/storefront`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ff9900] text-white rounded-lg text-xs font-semibold hover:bg-[#e68a00]">
                    <Palette size={12} /> {store.id === 0 ? 'Design Storefront' : 'Edit Design'}
                  </Link>
                  <a href={`${STORE_BASE_URL}/store/${store.slug}`} target="_blank" rel="noopener noreferrer" title="View store page" className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <ExternalLink size={14} className="text-gray-600" />
                  </a>
                  <Link href={`/seller-central/stores/${store.id}`} title="Edit store details" className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Edit size={14} className="text-gray-600" />
                  </Link>
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCategorySuggestion, setShowCategorySuggestion] = useState(false);

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
    stockQuantity: '',
    minimumOrderQuantity: '1',
    // Step 7: Delivery
    deliveryAvailable: true,
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

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPriceLabel = () => {
    const unit = units.find(u => u.value === formData.unitType);
    if (formData.unitType === 'other') return `per ${formData.customUnit || 'unit'}`;
    return unit?.priceLabel || 'per piece';
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
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
      if (!storeId) throw new Error('No store found — create a store first');
      const res = await fetch(`${API_BASE}/api/stores/${storeId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          base_price: formData.basePrice || 0,
          unit_type: formData.unitType || 'piece',
          stock_quantity: formData.stockQuantity ? Number(formData.stockQuantity) : 0,
          minimum_order_quantity: formData.minimumOrderQuantity ? Number(formData.minimumOrderQuantity) : 1,
          category_id: formData.categoryId || null,
          primary_image: formData.primaryImage || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      alert('Product saved to your store — visible in Manage Products and storefront Featured Products.');
      window.location.href = '/seller-central/products';
    } catch (e:any) {
      alert('Failed to save product: ' + (e.message || 'error'));
    }
    setSubmitting(false);
  };

  const totalSteps = formData.unitType === 'service' ? 6 : 7;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
          <span className="text-sm text-gray-500">Step {step} of {totalSteps}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#ff9900] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span className={step >= 1 ? 'text-[#ff9900] font-semibold' : ''}>Category</span>
          <span className={step >= 2 ? 'text-[#ff9900] font-semibold' : ''}>Details</span>
          <span className={step >= 3 ? 'text-[#ff9900] font-semibold' : ''}>Unit</span>
          {formData.unitType !== 'service' && (
            <span className={step >= 4 ? 'text-[#ff9900] font-semibold' : ''}>Package</span>
          )}
          <span className={step >= (formData.unitType === 'service' ? 4 : 5) ? 'text-[#ff9900] font-semibold' : ''}>Variations</span>
          <span className={step >= (formData.unitType === 'service' ? 5 : 6) ? 'text-[#ff9900] font-semibold' : ''}>Price</span>
          <span className={step >= (formData.unitType === 'service' ? 6 : 7) ? 'text-[#ff9900] font-semibold' : ''}>Delivery</span>
        </div>
      </div>

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">What are you selling?</h3>
          <p className="text-sm text-gray-500 mb-6">Choose the category that best fits your product</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  updateForm('categoryId', cat.id);
                  updateForm('categoryName', cat.name);
                  if (cat.children) {
                    // Has subcategories - show them
                  }
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.categoryId === cat.id
                    ? 'border-[#ff9900] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
                {cat.children && (
                  <p className="text-xs text-gray-500 mt-1">{cat.children.length} subcategories</p>
                )}
              </button>
            ))}
          </div>

          {/* Subcategories */}
          {formData.categoryId && categories.find(c => c.id === formData.categoryId)?.children && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-semibold text-gray-700 mb-3">Choose a subcategory:</p>
              <div className="flex flex-wrap gap-2">
                {categories.find(c => c.id === formData.categoryId)?.children?.map((sub: any) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      updateForm('categoryId', sub.id);
                      updateForm('categoryName', sub.name);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.categoryName === sub.name
                        ? 'bg-[#ff9900] text-white'
                        : 'bg-white border border-gray-200 hover:border-[#ff9900]'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!formData.categoryId}
              className="px-6 py-3 bg-[#ff9900] text-white rounded-xl font-bold hover:bg-[#e68a00] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product pictures</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#ff9900] transition-colors cursor-pointer">
                <Upload size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              </div>
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

// Create Store Page - Template Selection
function CreateStorePage({ onComplete }: { onComplete: (data: any) => Promise<any> }) {
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const templates = [
    {
      id: 'electronics',
      name: 'Alibaba US Warehouse',
      description: 'Professional template with blue accents, hero banner, category cards, stats, and company profile',
      category: 'Professional',
      previewImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&h=300&q=80',
      features: ['Hero banner', 'Category cards', 'Statistics', 'Company profile', 'Warehouse info'],
    },
    {
      id: 'blank',
      name: 'Modern Minimal',
      description: 'Clean and minimalist design with focus on products',
      category: 'Minimal',
      previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&h=300&q=80',
      features: ['Clean design', 'Product-focused', 'Minimal distractions', 'Fast loading'],
    },
    {
      id: 'general-showcase',
      name: 'Industrial',
      description: 'Bold industrial design for manufacturing and B2B suppliers',
      category: 'Industrial',
      previewImage: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=400&h=300&q=80',
      features: ['Bold typography', 'Manufacturing focus', 'B2B optimized', 'Capacity showcase'],
    },
  ];

  const handleSelectTemplate = async (templateId: string) => {
    setLoading(true);
    setSelectedTemplate(templateId);
    try {
      const userData = localStorage.getItem('sc_user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) throw new Error('Not logged in');

      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const storeData = {
        sellerId: user.id,
        name: `${template.name} Store`,
        description: template.description,
        category: 'Multiple categories',
        phone: user.phone || '+257 79 000 000',
        storeTemplate: templateId,
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

  return (
    <div className="min-h-screen bg-[#232f3e] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-[#ff9900] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#ff9900]/30">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Choose Your Store Template</h1>
          <p className="text-gray-400 mt-2">Select a professional template to get started. You can customize it later.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template.id)}
              className={`relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                selectedTemplate === template.id
                  ? 'border-[#ff9900] ring-2 ring-[#ff9900]/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={template.previewImage}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-semibold text-gray-700">
                  {template.category}
                </div>
                {selectedTemplate === template.id && (
                  <div className="absolute top-2 left-2 bg-[#ff9900] text-white p-1.5 rounded-full">
                    <CheckCircle size={14} />
                  </div>
                )}
              </div>

              <div className="p-4 bg-white">
                <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                <div className="flex flex-wrap gap-1">
                  {template.features.slice(0, 3).map((feature, index) => (
                    <span
                      key={index}
                      className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelectTemplate(template.id); }}
                  disabled={loading}
                  className="w-full mt-3 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00] disabled:opacity-50"
                >
                  {loading && selectedTemplate === template.id ? 'Creating...' : 'Use Template'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href="/seller-central/stores" className="text-sm text-gray-400 hover:text-white">
            Cancel and go back
          </Link>
        </div>
      </div>
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
      setLocation(`/seller-central/stores/${res.store.id}/storefront`);
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
        setLocation('/seller-central');
      }
    }} />;
  }

  if (user.role !== 'seller') {
    logout();
    return null;
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
        <Route path="/seller-central/products/:id/edit" component={ProductsPage} />
        <Route path="/seller-central/inventory" component={InventoryPage} />
        <Route path="/seller-central/stores/new" component={CreateStoreWrapper} />
        <Route path="/seller-central/stores/:id/storefront" component={StorefrontBuilderPage} />
        <Route path="/seller-central/stores/:id" component={EditStorePage} />
        <Route path="/seller-central/stores" component={StoresPage} />
        <Route path="/seller-central/pricing" component={DashboardPage} />
        <Route path="/seller-central/reports" component={DashboardPage} />
        <Route path="/seller-central/payments" component={DashboardPage} />
        <Route path="/seller-central/messages" component={DashboardPage} />
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
