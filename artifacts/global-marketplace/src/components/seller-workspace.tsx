import { useState } from 'react';
import { formatPhone } from '@/lib/phone';
import { Link, useLocation } from 'wouter';
import {
  Menu, X, Home, Package, ShoppingCart, DollarSign, BarChart3,
  Store, Settings, HelpCircle, Bell, Search, ChevronDown, ChevronRight,
  Plus, FileText, TrendingUp, Users, Box, Tag, Truck, MessageSquare,
  Shield, CreditCard, Globe, Layers, Star, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from '@/lib/i18n/locale-context';

interface SellerWorkspaceProps {
  children: React.ReactNode;
  title?: string;
}

interface MenuItem {
  label: string;
  icon: any;
  href?: string;
  children?: { label: string; href: string }[];
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', icon: Home, href: '/supplier/dashboard' },
  { 
    label: 'Catalog', 
    icon: Package,
    children: [
      { label: 'Add Products', href: '/supplier/products/new' },
      { label: 'Manage Products', href: '/supplier/products' },
      { label: 'Bulk Upload', href: '/supplier/products/bulk' },
      { label: 'Product Categories', href: '/supplier/categories' },
    ]
  },
  { 
    label: 'Inventory', 
    icon: Box,
    children: [
      { label: 'Inventory Dashboard', href: '/supplier/inventory' },
      { label: 'Stock Levels', href: '/supplier/inventory/stock' },
      { label: 'Low Stock Alerts', href: '/supplier/inventory/alerts' },
      { label: 'Inventory Adjustments', href: '/supplier/inventory/adjustments' },
    ]
  },
  { 
    label: 'Orders', 
    icon: ShoppingCart,
    children: [
      { label: 'All Orders', href: '/supplier/orders' },
      { label: 'Pending Orders', href: '/supplier/orders?status=new' },
      { label: 'Processing', href: '/supplier/orders?status=processing' },
      { label: 'Shipped', href: '/supplier/orders?status=out_for_delivery' },
      { label: 'Returns', href: '/supplier/orders/returns' },
    ]
  },
  { 
    label: 'Pricing', 
    icon: DollarSign,
    children: [
      { label: 'Price Management', href: '/supplier/pricing' },
      { label: 'Bulk Pricing', href: '/supplier/pricing/bulk' },
      { label: 'Price Rules', href: '/supplier/pricing/rules' },
    ]
  },
  {
    label: 'Stores',
    icon: Store,
    children: [
      { label: 'My Stores', href: '/supplier/stores' },
      { label: 'Create Store', href: '/supplier/stores/new' },
      // A seller can own several stores and each has its own storefront, so this goes to
      // the store list to pick one. It used to be hardcoded to seller 1.
      { label: 'Storefront Builder', href: '/supplier/stores' },
      { label: 'Store Settings', href: '/supplier/stores/settings' },
    ]
  },
  { 
    label: 'Reports', 
    icon: BarChart3,
    children: [
      { label: 'Sales Reports', href: '/supplier/reports/sales' },
      { label: 'Inventory Reports', href: '/supplier/reports/inventory' },
      { label: 'Traffic Reports', href: '/supplier/reports/traffic' },
      { label: 'Tax Reports', href: '/supplier/reports/tax' },
    ]
  },
  { 
    label: 'Payments', 
    icon: CreditCard,
    children: [
      { label: 'Payment Dashboard', href: '/supplier/payments' },
      { label: 'Transactions', href: '/supplier/payments/transactions' },
      { label: 'Payouts', href: '/supplier/payments/payouts' },
      { label: 'Payment Settings', href: '/supplier/payments/settings' },
    ]
  },
  { 
    label: 'Performance', 
    icon: TrendingUp,
    children: [
      { label: 'Account Health', href: '/supplier/performance' },
      { label: 'Customer Metrics', href: '/supplier/performance/metrics' },
      { label: 'Reviews', href: '/supplier/performance/reviews' },
    ]
  },
  { 
    label: 'Messages', 
    icon: MessageSquare,
    href: '/messages'
  },
  { 
    label: 'Settings', 
    icon: Settings,
    children: [
      { label: 'Account Settings', href: '/seller/profile/edit' },
      { label: 'Shipping Settings', href: '/supplier/settings/shipping' },
      { label: 'Notification Settings', href: '/supplier/settings/notifications' },
      { label: 'API Keys', href: '/supplier/settings/api' },
    ]
  },
];

export function SellerWorkspace({ children, title }: SellerWorkspaceProps) {
  const { tr } = useLocale();
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Stores']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => location === href;
  const isParentActive = (item: MenuItem) => {
    if (item.href) return isActive(item.href);
    return item.children?.some(child => isActive(child.href)) || false;
  };

  return (
    <div className="flex h-screen bg-[#f5f5f7]">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[68px]'} shrink-0 bg-white text-[#333] border-r border-[#e8e8e8] transition-all duration-300 flex flex-col shadow-[2px_0_12px_rgba(0,0,0,0.03)]`}>
        {/* Sidebar Header */}
        <div className="flex h-[68px] items-center justify-between px-4 border-b border-[#eeeeee]">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#ff6a00] flex items-center justify-center">
                <Store size={18} className="text-white" />
              </div>
              <div className="leading-tight"><span className="block font-bold text-[#ff6a00]">{tr('ui.nzanilacom')}</span><span className="text-[10px] text-gray-500">{tr('ui.sellerCenter')}</span></div>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Search */}
        {sidebarOpen && (
          <div className="px-3 py-3 border-b border-[#eeeeee]">
            <div className="flex items-center gap-2 bg-[#f5f5f5] border border-[#e8e8e8] rounded px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder={tr('ui.searchSellerTools')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-gray-700 outline-none w-full placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {MENU_ITEMS.map((item) => {
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
                        ? 'bg-[#fff3eb] text-[#ff6a00] border-r-2 border-[#ff6a00]'
                        : 'text-gray-700 hover:bg-[#f7f7f7] hover:text-[#ff6a00]'
                    }`}
                  >
                    <Icon size={18} />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </>
                    )}
                  </button>
                  {sidebarOpen && isExpanded && (
                    <div className="bg-[#fafafa] border-y border-[#f0f0f0]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-12 py-2 text-sm transition-colors ${
                            isActive(child.href)
                              ? 'bg-[#fff3eb] text-[#ff6a00] border-r-2 border-[#ff6a00]'
                              : 'text-gray-500 hover:bg-[#f1f1f1] hover:text-[#ff6a00]'
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
                    ? 'bg-[#fff3eb] text-[#ff6a00] border-r-2 border-[#ff6a00]'
                    : 'text-gray-700 hover:bg-[#f7f7f7] hover:text-[#ff6a00]'
                }`}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="border-t border-[#eeeeee] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#ff6a00] flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Seller'}</p>
                <p className="text-xs text-gray-400 truncate">{formatPhone(user?.phone) || 'Seller account'}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-[68px] bg-white border-b border-gray-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400">{tr('ui.myNzanila')}</p><h1 className="text-lg font-bold text-gray-900">{title || 'Seller Center'}</h1></div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#ff6a00]"></span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <HelpCircle size={20} />
            </button>
            <Link href="/supplier/stores" className="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-4 text-xs font-semibold text-gray-700 hover:text-[#ff6a00]"><Store size={16} /> {tr('ui.myStores')}</Link>
            <div className="h-8 w-8 rounded-full bg-[#ff6a00] flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0) || 'S'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#f5f5f7]">
          <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function SellerWorkspacePage({ children, title }: SellerWorkspaceProps) {
  return (
    <SellerWorkspace title={title}>
      <div className="p-6">
        {children}
      </div>
    </SellerWorkspace>
  );
}
