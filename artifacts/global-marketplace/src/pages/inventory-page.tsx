import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Package, Plus, Search, Filter, Download, Upload, AlertTriangle, 
  CheckCircle, XCircle, Edit, Trash2, Eye, TrendingUp, TrendingDown,
  Box, Layers, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { SellerWorkspace } from '@/components/seller-workspace';
import { useAuth } from '@/lib/auth-context';

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
    // Mock inventory data
    const mockInventory: InventoryItem[] = [
      { id: 1, name: 'Premium Cassava Flour (50kg)', sku: 'GRN-001', category: 'Grains & Flour', price: 45.00, cost: 32.00, stock: 120, reservedStock: 15, availableStock: 105, lowStockThreshold: 20, status: 'active', lastUpdated: new Date(Date.now() - 86400000).toISOString() },
      { id: 2, name: 'Fresh Beans (25kg)', sku: 'LEG-002', category: 'Legumes', price: 32.00, cost: 22.00, stock: 8, reservedStock: 3, availableStock: 5, lowStockThreshold: 10, status: 'low_stock', lastUpdated: new Date(Date.now() - 172800000).toISOString() },
      { id: 3, name: 'Vegetable Oil (20L)', sku: 'OIL-003', category: 'Oils & Fats', price: 58.50, cost: 42.00, stock: 34, reservedStock: 5, availableStock: 29, lowStockThreshold: 10, status: 'active', lastUpdated: new Date(Date.now() - 259200000).toISOString() },
      { id: 4, name: 'Maize Grain (100kg)', sku: 'GRN-004', category: 'Grains & Flour', price: 67.00, cost: 48.00, stock: 5, reservedStock: 2, availableStock: 3, lowStockThreshold: 15, status: 'low_stock', lastUpdated: new Date(Date.now() - 345600000).toISOString() },
      { id: 5, name: 'Sugar (50kg)', sku: 'SWT-005', category: 'Sweeteners', price: 42.00, cost: 35.00, stock: 89, reservedStock: 10, availableStock: 79, lowStockThreshold: 20, status: 'active', lastUpdated: new Date(Date.now() - 432000000).toISOString() },
      { id: 6, name: 'Rice (25kg)', sku: 'GRN-006', category: 'Grains & Flour', price: 38.00, cost: 28.00, stock: 0, reservedStock: 0, availableStock: 0, lowStockThreshold: 15, status: 'out_of_stock', lastUpdated: new Date(Date.now() - 518400000).toISOString() },
      { id: 7, name: 'Salt (20kg)', sku: 'SEZ-007', category: 'Seasonings', price: 12.00, cost: 8.00, stock: 150, reservedStock: 20, availableStock: 130, lowStockThreshold: 30, status: 'active', lastUpdated: new Date(Date.now() - 604800000).toISOString() },
      { id: 8, name: 'Onions (10kg)', sku: 'VEG-008', category: 'Vegetables', price: 15.00, cost: 10.00, stock: 0, reservedStock: 0, availableStock: 0, lowStockThreshold: 25, status: 'out_of_stock', lastUpdated: new Date(Date.now() - 691200000).toISOString() },
      { id: 9, name: 'Tomatoes (5kg)', sku: 'VEG-009', category: 'Vegetables', price: 8.00, cost: 5.00, stock: 25, reservedStock: 5, availableStock: 20, lowStockThreshold: 15, status: 'active', lastUpdated: new Date(Date.now() - 777600000).toISOString() },
      { id: 10, name: 'Cooking Gas (12kg)', sku: 'FUL-010', category: 'Fuel', price: 35.00, cost: 28.00, stock: 15, reservedStock: 2, availableStock: 13, lowStockThreshold: 5, status: 'active', lastUpdated: new Date(Date.now() - 864000000).toISOString() },
    ];
    setTimeout(() => { setInventory(mockInventory); setLoading(false); }, 400);
  }, []);

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
