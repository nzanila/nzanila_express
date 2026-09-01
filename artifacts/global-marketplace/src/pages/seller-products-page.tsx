import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Plus, Edit, Trash2, Package, X, Camera, Check, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { AppShell } from '@/components/marketplace-shell';
import { useAuth } from '@/lib/auth-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

interface SellerProduct {
  id: number;
  name: string;
  category: string;
  description: string;
  price: string;
  unit: string;
  minimumOrderQuantity: number;
  availableStock: number;
  condition: string;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  is_active: boolean;
  is_verified: boolean;
  views: number;
  createdAt: string;
}

const CATEGORIES = [
  'Coffee & Tea', 'Spices & Herbs', 'Fruits & Vegetables', 'Grains & Cereals',
  'Legumes & Pulses', 'Dairy & Eggs', 'Meat & Fish', 'Beverages',
  'Handcrafts & Textiles', 'Building Materials', 'Electronics', 'Other',
];

const UNITS = ['piece', 'kg', 'g', 'L', 'mL', 'bag', 'box', 'carton', 'bundle', 'dozen'];

export function SellerProductsPage() {
  const { user, session } = useAuth();
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);

  const fetchProducts = () => {
    if (!user) return;
    fetch(`${API}/api/profiles/sellers/products`, {
      headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
    })
      .then(r => r.json())
      .then(data => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [user]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    await fetch(`${API}/api/profiles/sellers/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
    });
    setProducts(products.filter(p => p.id !== id));
  };

  const handleToggleActive = async (product: SellerProduct) => {
    await fetch(`${API}/api/profiles/sellers/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken || ''}` },
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    fetchProducts();
  };

  return (
    <AppShell mode="supplier" activeTab="products">
      <div className="bg-background px-3 py-4 sm:px-5 sm:py-8 lg:px-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/supplier" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1">
              <ArrowLeft size={12} /> Dashboard
            </Link>
            <h1 className="text-xl font-bold">My Products</h1>
          </div>
          <button onClick={() => { setEditingProduct(null); setShowForm(true); }} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
            <Plus size={14} /> Add Product
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Package size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No products yet. Add your first product to start selling.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(product => (
              <div key={product.id} className={`rounded-xl border ${product.is_active ? 'border-border bg-card' : 'border-border bg-gray-50 opacity-60'} p-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{product.name}</h3>
                      {!product.is_active && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600">INACTIVE</span>}
                      {product.is_verified && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">VERIFIED</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.category} · {product.condition}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-bold text-primary">{product.price} BIF/{product.unit}</span>
                      <span>MOQ: {product.minimumOrderQuantity}</span>
                      <span>Stock: {product.availableStock}</span>
                      <span>{product.views} views</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => { setEditingProduct(product); setShowForm(true); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100"><Edit size={14} /></button>
                    <button onClick={() => handleToggleActive(product)} className={`rounded-lg p-1.5 ${product.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}>
                      {product.is_active ? <X size={14} /> : <Check size={14} />}
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
          onSaved={() => { setShowForm(false); setEditingProduct(null); fetchProducts(); }}
        />
      )}
    </AppShell>
  );
}

function ProductFormModal({ product, onClose, onSaved }: { product: SellerProduct | null; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price || '');
  const [unit, setUnit] = useState(product?.unit || 'piece');
  const [moq, setMoq] = useState(product?.minimumOrderQuantity || 1);
  const [stock, setStock] = useState(product?.availableStock || 0);
  const [condition, setCondition] = useState(product?.condition || 'new');
  const [deliveryAvailable, setDeliveryAvailable] = useState(product?.deliveryAvailable ?? true);
  const [pickupAvailable, setPickupAvailable] = useState(product?.pickupAvailable ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const body = { name, category, description, price: parseFloat(price) || 0, unit, minimumOrderQuantity: moq, availableStock: stock, condition, deliveryAvailable, pickupAvailable };
    const url = product ? `${API}/api/profiles/sellers/products/${product.id}` : `${API}/api/profiles/sellers/products`;
    const method = product ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken || ''}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
    } catch { setError('Failed to save product'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold">{product ? 'Edit Product' : 'Add Product'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Product Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none bg-white">
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Price (BIF) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none bg-white">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none bg-white">
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Min Order Qty</label>
              <input type="number" value={moq} onChange={e => setMoq(parseInt(e.target.value) || 1)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Available Stock</label>
              <input type="number" value={stock} onChange={e => setStock(parseInt(e.target.value) || 0)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none" />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={deliveryAvailable} onChange={e => setDeliveryAvailable(e.target.checked)} className="rounded" />
              Delivery Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pickupAvailable} onChange={e => setPickupAvailable(e.target.checked)} className="rounded" />
              Pickup Available
            </label>
          </div>

          <button onClick={handleSave} disabled={!name.trim() || !category || !description.trim() || !price || saving} className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
            {saving ? 'Saving…' : product ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
