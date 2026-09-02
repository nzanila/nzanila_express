import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { ArrowLeft, Save, X, Camera, Plus } from 'lucide-react';
import { SellerWorkspace } from '@/components/seller-workspace';
import { useAuth } from '@/lib/auth-context';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

const CATEGORIES = [
  'Coffee & Tea', 'Spices & Herbs', 'Fruits & Vegetables', 'Grains & Cereals',
  'Legumes & Pulses', 'Dairy & Eggs', 'Meat & Fish', 'Beverages',
  'Handcrafts & Textiles', 'Building Materials', 'Electronics', 'Other',
];

const UNITS = ['piece', 'kg', 'g', 'L', 'mL', 'bag', 'box', 'carton', 'bundle', 'dozen'];

const CONDITIONS = ['New', 'Used'];

const DELIVERY_TIMES = ['Same day', '1–2 days', '3–5 days', '1 week', 'Other'];

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  unit: string;
  minimumOrderQuantity: string;
  availableStock: string;
  condition: string;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  deliveryAreas: string;
  estimatedTime: string;
}

export function SellerProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const isEditing = !!id;
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category: '',
    price: '',
    unit: 'piece',
    minimumOrderQuantity: '1',
    availableStock: '0',
    condition: 'New',
    deliveryAvailable: true,
    pickupAvailable: false,
    deliveryAreas: '',
    estimatedTime: '1–2 days',
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);

  useEffect(() => {
    if (isEditing && id) {
      setLoading(true);
      fetch(`${API}/api/profiles/sellers/products/${id}`, {
        headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
      })
        .then(r => r.json())
        .then(data => {
          setFormData({
            name: data.name || '',
            description: data.description || '',
            category: data.category || '',
            price: data.price?.toString() || '',
            unit: data.unit || 'piece',
            minimumOrderQuantity: data.minimumOrderQuantity?.toString() || '1',
            availableStock: data.availableStock?.toString() || '0',
            condition: data.condition || 'New',
            deliveryAvailable: data.deliveryAvailable ?? true,
            pickupAvailable: data.pickupAvailable ?? false,
            deliveryAreas: data.deliveryAreas || '',
            estimatedTime: data.estimatedTime || '1–2 days',
          });
          if (data.images) {
            setProductImages(Array.isArray(data.images) ? data.images : []);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isEditing, id, session]);

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    if (!formData.name.trim() || !formData.price) {
      setError('Product name and price are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const body = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        minimumOrderQuantity: parseInt(formData.minimumOrderQuantity) || 1,
        availableStock: parseInt(formData.availableStock) || 0,
        is_active: !saveAsDraft,
        images: productImages,
      };

      const url = isEditing && id 
        ? `${API}/api/profiles/sellers/products/${id}`
        : `${API}/api/profiles/sellers/products`;
      
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken || ''}` 
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save product');

      // Redirect to products list
      window.location.href = '/supplier/products';
    } catch (err) {
      setError('Failed to save product. Please try again.');
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <SellerWorkspace title={isEditing ? 'Edit Product' : 'Add Product'}>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </SellerWorkspace>
    );
  }

  return (
    <SellerWorkspace title={isEditing ? 'Edit Product' : 'Add Product'}>
      <div className="max-w-3xl mx-auto">
        <Link href="/supplier/products" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft size={16} /> Back to products
        </Link>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
          {/* 1. PRODUCT INFORMATION */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">1. PRODUCT INFORMATION</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Product name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                  placeholder="Describe your product..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Category: optional
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                >
                  <option value="">Select category (optional)</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 2. PRODUCT PHOTOS */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">2. PRODUCT PHOTOS</h2>
            
            <div className="mb-3 text-xs text-gray-600">
              Use clear pictures of the actual product.
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-700 hover:border-[#ff6a00] hover:bg-orange-50"
              >
                <Camera size={16} />
                Add main photo
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-700 hover:border-[#ff6a00] hover:bg-orange-50"
              >
                <Plus size={16} />
                Add more photos
              </button>
            </div>

            {productImages.length > 0 && (
              <div className="mt-4 flex gap-2">
                {productImages.map((img, idx) => (
                  <div key={idx} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200">
                    <img src={img} alt={`Product ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3. PRICE AND STOCK */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">3. PRICE AND STOCK</h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Price (BIF) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Minimum order quantity
                </label>
                <input
                  type="number"
                  value={formData.minimumOrderQuantity}
                  onChange={(e) => handleInputChange('minimumOrderQuantity', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                  min="1"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Available stock
                </label>
                <input
                  type="number"
                  value={formData.availableStock}
                  onChange={(e) => handleInputChange('availableStock', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                  min="0"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => handleInputChange('condition', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                >
                  {CONDITIONS.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 4. DELIVERY */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">4. DELIVERY</h2>
            
            <div className="space-y-4">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.deliveryAvailable}
                    onChange={(e) => handleInputChange('deliveryAvailable', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Seller delivery
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.pickupAvailable}
                    onChange={(e) => handleInputChange('pickupAvailable', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Buyer pickup
                </label>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Delivery areas
                </label>
                <input
                  type="text"
                  value={formData.deliveryAreas}
                  onChange={(e) => handleInputChange('deliveryAreas', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                  placeholder="e.g., Bujumbura, Gitega, Bubanza"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Estimated time
                </label>
                <select
                  value={formData.estimatedTime}
                  onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]"
                >
                  {DELIVERY_TIMES.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#ff6a00] px-4 py-3 text-xs font-bold text-white hover:bg-[#e55f00] disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update product' : 'Publish product'}
            </button>
          </div>
        </form>
      </div>
    </SellerWorkspace>
  );
}
