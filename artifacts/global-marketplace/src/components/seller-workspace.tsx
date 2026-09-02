import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Menu, X, Home, Package, ShoppingCart, DollarSign, BarChart3, 
  Store, Settings, HelpCircle, Bell, Search, ChevronDown, ChevronRight,
  Plus, FileText, TrendingUp, Users, Box, Tag, Truck, MessageSquare,
  Shield, CreditCard, Globe, Layers, Star, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

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
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Dashboard']);
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[#232f3e] text-white transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#ff9900] flex items-center justify-center">
                <Store size={18} className="text-white" />
              </div>
              <span className="font-bold text-sm">Seller Central</span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Search */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
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
                        ? 'bg-[#ff9900] text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
                    <div className="bg-gray-800">
                      {item.children.map((child) => (
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
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#ff9900] flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Seller'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.phone}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900">{title || 'Seller Central'}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#ff9900]"></span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <HelpCircle size={20} />
            </button>
            <div className="h-8 w-8 rounded-full bg-[#232f3e] flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0) || 'S'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
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
