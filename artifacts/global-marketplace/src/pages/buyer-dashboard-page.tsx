import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ShoppingBag, Package, MapPin, ArrowRight, Clock, CheckCircle2, Truck, RotateCcw, PackageCheck } from 'lucide-react';
import { AppShell } from '@/components/marketplace-shell';
import { useAuth } from '@/lib/auth-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

function money(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BIF', maximumFractionDigits: 0 }).format(amount);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  new: { label: 'New', color: 'bg-orange-100 text-orange-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Package },
  ready: { label: 'Ready', color: 'bg-purple-100 text-purple-700', icon: Package },
  out_for_delivery: { label: 'In Transit', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: Package },
};

export function BuyerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hardcoded mock data for preview
    const mockData = {
      orderCount: 18,
      activeOrderCount: 3,
      totalSpent: 8450.00,
      activeOrders: [
        { id: 1847, status: 'processing', sellerName: 'Kigali Fresh Traders', itemCount: 12, total: 485.00, date: new Date(Date.now() - 3600000).toISOString() },
        { id: 1845, status: 'confirmed', sellerName: 'Nyamirambo Wholesalers', itemCount: 8, total: 320.50, date: new Date(Date.now() - 7200000).toISOString() },
        { id: 1842, status: 'out_for_delivery', sellerName: 'Huye Distributors', itemCount: 5, total: 195.00, date: new Date(Date.now() - 14400000).toISOString() },
      ],
      recentOrders: [
        { id: 1838, status: 'delivered', sellerName: 'Musanze Traders', itemCount: 6, total: 275.00, date: new Date(Date.now() - 172800000).toISOString() },
        { id: 1835, status: 'delivered', sellerName: 'Gisenyi Markets', itemCount: 15, total: 892.50, date: new Date(Date.now() - 259200000).toISOString() },
        { id: 1831, status: 'delivered', sellerName: 'Kigali Fresh Traders', itemCount: 4, total: 156.00, date: new Date(Date.now() - 345600000).toISOString() },
      ],
      reorderableProducts: [
        { productName: 'Premium Cassava Flour (50kg)', unitPrice: 45.00, quantity: 20, sellerName: 'Kigali Fresh Traders' },
        { productName: 'Fresh Beans (25kg)', unitPrice: 32.00, quantity: 50, sellerName: 'Nyamirambo Wholesalers' },
        { productName: 'Vegetable Oil (20L)', unitPrice: 58.50, quantity: 15, sellerName: 'Huye Distributors' },
      ],
      defaultAddress: {
        addressName: 'Main Warehouse',
        province: 'Kigali City',
        commune: 'Nyarugenge',
        zone: 'Nyamirambo',
        landmark: 'Near the main market',
      },
    };

    setTimeout(() => { setData(mockData); setLoading(false); }, 400);
  }, []);

  if (loading) {
    return (
      <AppShell hideSearch>
        <div className="px-4 py-8 sm:px-6 lg:px-10">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const activeOrders = data?.activeOrders || [];
  const recentOrders = data?.recentOrders || [];
  const reorderable = data?.reorderableProducts || [];
  const defaultAddress = data?.defaultAddress;

  return (
    <AppShell hideSearch>
      <div className="px-4 py-6 sm:px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">Welcome back,</p>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Buyer'}</h1>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data?.orderCount || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total orders</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data?.activeOrderCount || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{money(data?.totalSpent || 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Total spent</p>
          </div>
        </div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">ACTIVE ORDERS</h2>
              <Link href="/orders" className="text-xs font-bold text-[#ff6a00] hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {activeOrders.map((order: any) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;
                const Icon = cfg.icon;
                return (
                  <Link
                    key={order.id}
                    href={`/orders`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:border-[#ff6a00]/30 hover:bg-orange-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">Order #{order.id}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.itemCount} items · {money(order.total)} · {timeAgo(order.date)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Quick Reorder */}
        {reorderable.length > 0 && (
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">REORDER</h2>
              <Link href="/products" className="text-xs font-bold text-[#ff6a00] hover:underline">Browse products</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {reorderable.map((item: any, i: number) => (
                <div key={i} className="rounded-lg border border-gray-100 p-3 hover:border-orange-200 hover:bg-orange-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-orange-50 to-gray-100 grid place-items-center flex-shrink-0">
                      <PackageCheck size={20} className="text-orange-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.sellerName}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.unitPrice.toLocaleString()} BIF</p>
                      <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <button className="flex items-center gap-1.5 rounded-lg bg-[#ff6a00]/10 px-3 py-1.5 text-xs font-bold text-[#ff6a00] hover:bg-[#ff6a00]/20 transition-colors">
                      <RotateCcw size={12} /> Reorder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Delivered Orders */}
        {recentOrders.length > 0 && (
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">RECENT ORDERS</h2>
              <Link href="/orders" className="text-xs font-bold text-[#ff6a00] hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">#{order.id}</p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Delivered</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.itemCount} items · {money(order.total)} · {timeAgo(order.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Default Address */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">DEFAULT ADDRESS</h2>
            <Link href="/buyer/profile" className="text-xs font-bold text-[#ff6a00] hover:underline">Manage</Link>
          </div>
          {defaultAddress ? (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{defaultAddress.addressName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[defaultAddress.province, defaultAddress.commune, defaultAddress.zone].filter(Boolean).join(', ')}
                </p>
                {defaultAddress.landmark && (
                  <p className="text-xs text-gray-400 mt-0.5">Near {defaultAddress.landmark}</p>
                )}
              </div>
            </div>
          ) : (
            <Link href="/buyer/profile" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#ff6a00]">
              <MapPin size={16} /> Add a delivery address
            </Link>
          )}
        </section>

        {/* Empty State */}
        {activeOrders.length === 0 && recentOrders.length === 0 && (
          <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-900 mb-1">No orders yet</p>
            <p className="text-xs text-gray-500 mb-4">Start shopping to see your orders here</p>
            <Link href="/products" className="inline-flex items-center gap-2 rounded-xl bg-[#ff6a00] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#e55f00]">
              Browse products <ArrowRight size={14} />
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
