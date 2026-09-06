import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Package, Plus, Search, Filter, Download, Upload, AlertTriangle, 
  CheckCircle, XCircle, Edit, Trash2, Eye, TrendingUp, TrendingDown,
  Box, Layers, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { SellerWorkspace } from '@/components/seller-workspace';
import { useAuth } from '@/lib/auth-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-seller-api.nzanilaexpress.workers.dev');

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive' | 'out_of_stock' | 'low_stock';
  lastUpdated: string;
  imageUrl?: string;
}

export function InventoryDashboardPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    let cancelled = false;
    const loadInventory = async () => {
      if (!user?.id) { setInventory([]); setLoading(false); return; }
      setLoading(true);
      try {
        const storesResponse = await fetch(`${API}/api/stores/seller/${user.id}`);
        const storesPayload = storesResponse.ok ? await storesResponse.json() : null;
        const stores = Array.isArray(storesPayload) ? storesPayload : (storesPayload?.stores || (storesPayload?.store ? [storesPayload.store] : []));
        const results = await Promise.all(stores.map(async (store: any) => {
          const response = await fetch(`${API}/api/stores/${store.id}/products`);
          if (!response.ok) return [];
          const payload = await response.json();
          return Array.isArray(payload) ? payload : (payload?.products || []);
        }));
        const products = results.flat();
        const rows: InventoryItem[] = products.map((product: any) => {
          const stock = Number(product.stock_quantity ?? product.stock ?? 0) || 0;
          const threshold = Number(product.low_stock_threshold ?? 10) || 10;
          return {
            id: Number(product.id),
            name: product.name || 'Unnamed product',
            sku: product.sku || product.slug || `SKU-${product.id}`,
            category: product.category_name || product.category || product.unit_type || 'Uncategorized',
            price: Number(product.base_price ?? product.price ?? 0) || 0,
            cost: Number(product.cost_price ?? 0) || 0,
            stock,
            reservedStock: Number(product.reserved_stock ?? 0) || 0,
            availableStock: Number(product.available_stock ?? stock) || 0,
            lowStockThreshold: threshold,
            status: stock <= 0 ? 'out_of_stock' : stock <= threshold ? 'low_stock' : 'active',
            lastUpdated: product.updated_at || product.created_at || new Date().toISOString(),
            imageUrl: product.primary_image || product.image_url || product.image || undefined,
          };
        });
        if (!cancelled) setInventory(rows);
      } catch {
        if (!cancelled) setInventory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadInventory();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const comparison = sortBy === 'name' ? a.name.localeCompare(b.name) :
                      sortBy === 'stock' ? a.stock - b.stock :
                      sortBy === 'price' ? a.price - b.price :
                      sortBy === 'updated' ? new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime() : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const stats = {
    totalProducts: inventory.length,
    activeProducts: inventory.filter(i => i.status === 'active').length,
    lowStockProducts: inventory.filter(i => i.status === 'low_stock').length,
    outOfStockProducts: inventory.filter(i => i.status === 'out_of_stock').length,
    totalValue: inventory.reduce((sum, i) => sum + (i.stock * i.cost), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle size={10} /> Active</span>;
      case 'low_stock': return <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700"><AlertTriangle size={10} /> Low Stock</span>;
      case 'out_of_stock': return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700"><XCircle size={10} /> Out of Stock</span>;
      case 'inactive': return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700"><XCircle size={10} /> Inactive</span>;
      default: return null;
    }
  };

  return (
    <SellerWorkspace title="Inventory Management">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.activeProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-orange-600">{stats.lowStockProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Inventory Value</p>
          <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</p>
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
                placeholder="Search by name, SKU, or category..."
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
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
              <Download size={14} /> Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
              <Upload size={14} /> Import
            </button>
            <Link href="/supplier/products/new" className="flex items-center gap-2 px-4 py-2 bg-[#ff9900] text-white rounded-lg text-sm font-bold hover:bg-[#e68a00]">
              <Plus size={14} /> Add Product
            </Link>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Category</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Price</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Cost</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Stock</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Available</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={9} className="px-4 py-4">
                    <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                  </td>
                </tr>
              ))
            ) : filteredInventory.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <Package size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-semibold text-gray-900">No products found</p>
                  <p className="text-xs text-gray-500">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : (
              filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package size={16} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">Last updated: {new Date(item.lastUpdated).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">${item.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">${item.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-bold ${item.stock < item.lowStockThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.availableStock}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit size={14} />
                      </button>
                      <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SellerWorkspace>
  );
}
