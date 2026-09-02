import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Store, Plus, Search, MapPin, Package, ShoppingCart, DollarSign, 
  Settings, Edit, Trash2, Eye, CheckCircle, XCircle, Star, TrendingUp,
  Globe, Clock, Users, BarChart3
} from 'lucide-react';
import { SellerWorkspace } from '@/components/seller-workspace';
import { useAuth } from '@/lib/auth-context';

interface Store {
  id: number;
  name: string;
  description: string;
  location: string;
  status: 'active' | 'inactive' | 'pending';
  products: number;
  orders: number;
  revenue: number;
  rating: number;
  createdAt: string;
  logo?: string;
}

export function StoresPage() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Mock stores data
    const mockStores: Store[] = [
      {
        id: 1,
        name: 'Kigali Fresh Traders',
        description: 'Premium agricultural products and fresh produce from local farmers',
        location: 'Nyarugenge, Kigali City',
        status: 'active',
        products: 23,
        orders: 156,
        revenue: 12450.80,
        rating: 4.8,
        createdAt: new Date(Date.now() - 7776000000).toISOString(),
      },
      {
        id: 2,
        name: 'Nyamirambo Wholesalers',
        description: 'Bulk grains, flours, and staple foods for businesses',
        location: 'Nyamirambo, Kigali City',
        status: 'active',
        products: 15,
        orders: 89,
        revenue: 8920.50,
        rating: 4.6,
        createdAt: new Date(Date.now() - 5184000000).toISOString(),
      },
      {
        id: 3,
        name: 'Southern Province Supplies',
        description: 'Regional products from Huye and surrounding areas',
        location: 'Huye Town, Southern Province',
        status: 'inactive',
        products: 8,
        orders: 23,
        revenue: 2150.00,
        rating: 4.2,
        createdAt: new Date(Date.now() - 2592000000).toISOString(),
      },
    ];
    setTimeout(() => { setStores(mockStores); setLoading(false); }, 400);
  }, []);

  const filteredStores = stores.filter(store => {
    const matchesSearch = 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle size={10} /> Active</span>;
      case 'inactive': return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700"><XCircle size={10} /> Inactive</span>;
      case 'pending': return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700"><Clock size={10} /> Pending</span>;
      default: return null;
    }
  };

  const stats = {
    totalStores: stores.length,
    activeStores: stores.filter(s => s.status === 'active').length,
    totalProducts: stores.reduce((sum, s) => sum + s.products, 0),
    totalRevenue: stores.reduce((sum, s) => sum + s.revenue, 0),
  };

  return (
    <SellerWorkspace title="My Stores">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Stores</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalStores}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Active Stores</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.activeStores}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 max-w-md">
              <Search size={16} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search stores by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm outline-none w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <Link href="/supplier/stores/new" className="flex items-center gap-2 px-4 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00]">
            <Plus size={14} /> Create Store
          </Link>
        </div>
      </div>

      {/* Stores Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-8 bg-gray-100 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Store size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-bold text-gray-900 mb-2">No stores found</p>
          <p className="text-sm text-gray-500 mb-4">Create your first store to start selling</p>
          <Link href="/supplier/stores/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00]">
            <Plus size={14} /> Create Store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map((store) => (
            <div key={store.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 bg-gradient-to-br from-[#232f3e] to-[#37475a] relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Store size={40} className="text-white/30" />
                </div>
                <div className="absolute top-3 right-3">
                  {getStatusBadge(store.status)}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{store.name}</h3>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-current" />
                    <span className="text-xs font-semibold text-gray-600">{store.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{store.description}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                  <MapPin size={12} />
                  <span>{store.location}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{store.products}</p>
                    <p className="text-[10px] text-gray-500">Products</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{store.orders}</p>
                    <p className="text-[10px] text-gray-500">Orders</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">${store.revenue.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">Revenue</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/supplier/stores/${store.id}`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    <Eye size={12} /> View
                  </Link>
                  <Link href={`/supplier/stores/${store.id}/edit`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    <Edit size={12} /> Edit
                  </Link>
                  <Link href={`/supplier/stores/${store.id}/settings`} className="flex items-center justify-center px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50">
                    <Settings size={12} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SellerWorkspace>
  );
}
