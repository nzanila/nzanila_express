import { useState } from 'react';
import { Upload, X, Plus, Minus } from 'lucide-react';

interface ProductListingFormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  categories: string[];
}

export function ProductListingForm({ onSubmit, onCancel, categories }: ProductListingFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    unit: 'piece',
    minimumOrderQuantity: 1,
    availableStock: 0,
    condition: 'new',
    deliveryAvailable: true,
    pickupAvailable: false,
  });

  const [productPictures, setProductPictures] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddPicture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (productPictures.length + files.length > 8) {
      setError('Maximum 8 pictures allowed');
      return;
    }
    setProductPictures([...productPictures, ...files]);
  };

  const handleRemovePicture = (index: number) => {
    setProductPictures(productPictures.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        price: parseFloat(formData.price),
        minimumOrderQuantity: parseInt(formData.minimumOrderQuantity.toString()),
        availableStock: parseInt(formData.availableStock.toString()),
        // In a real app, you would upload pictures first and get URLs
        pictureUrls: productPictures.map(file => URL.createObjectURL(file)),
      };

      await onSubmit(submitData);
    } catch (err) {
      setError('Failed to create product listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const units = ['piece', 'kg', 'liter', 'box', 'pack', 'dozen', 'meter', 'set'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Pictures */}
      <div>
        <label className="mb-2 block text-sm font-semibold">Product Pictures (Max 8)</label>
        <div className="grid grid-cols-4 gap-3">
          {productPictures.map((picture, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={URL.createObjectURL(picture)}
                alt={`Product ${index + 1}`}
                className="h-full w-full rounded-xl object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePicture(index)}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X size={16} />
              </button>
              {index === 0 && (
                <div className="absolute bottom-2 left-2 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                  Primary
                </div>
              )}
            </div>
          ))}
          {productPictures.length < 8 && (
            <label className="aspect-square flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-primary/5">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddPicture}
                className="hidden"
              />
              <div className="text-center">
                <Upload size={24} className="mx-auto text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Add Pictures</p>
              </div>
            </label>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          First picture will be the primary image. Use clear, well-lit photos showing the product from multiple angles.
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Product Information</h3>
        
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Product Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Premium Burundi Coffee Beans (1kg)"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Category *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your product in detail. Include specifications, features, materials, dimensions, etc."
            rows={4}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>
      </div>

      {/* Pricing and Inventory */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pricing & Inventory</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Price (BIF) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Unit *</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Min. Order Qty *</label>
            <div className="flex items-center rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, minimumOrderQuantity: Math.max(1, formData.minimumOrderQuantity - 1) })}
                className="border-r border-border px-3 py-3 hover:bg-muted"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={formData.minimumOrderQuantity}
                onChange={(e) => setFormData({ ...formData, minimumOrderQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
                min="1"
                className="h-12 flex-1 bg-transparent px-4 text-center text-sm outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, minimumOrderQuantity: formData.minimumOrderQuantity + 1 })}
                className="border-l border-border px-3 py-3 hover:bg-muted"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Available Stock *</label>
            <input
              type="number"
              value={formData.availableStock}
              onChange={(e) => setFormData({ ...formData, availableStock: parseInt(e.target.value) || 0 })}
              min="0"
              placeholder="0"
              className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Condition *</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${
              formData.condition === 'new' ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}>
              <input
                type="radio"
                value="new"
                checked={formData.condition === 'new'}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="sr-only"
              />
              <div className="flex-1">
                <p className="font-semibold">New</p>
                <p className="text-xs text-muted-foreground">Brand new, never used</p>
              </div>
              {formData.condition === 'new' && <div className="h-5 w-5 rounded-full bg-primary" />}
            </label>

            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 ${
              formData.condition === 'used' ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}>
              <input
                type="radio"
                value="used"
                checked={formData.condition === 'used'}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="sr-only"
              />
              <div className="flex-1">
                <p className="font-semibold">Used</p>
                <p className="text-xs text-muted-foreground">Pre-owned, good condition</p>
              </div>
              {formData.condition === 'used' && <div className="h-5 w-5 rounded-full bg-primary" />}
            </label>
          </div>
        </div>
      </div>

      {/* Delivery Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Delivery Options</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/50">
            <input
              type="checkbox"
              checked={formData.deliveryAvailable}
              onChange={(e) => setFormData({ ...formData, deliveryAvailable: e.target.checked })}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="font-semibold">Available for Delivery</p>
              <p className="text-sm text-muted-foreground">Customers can choose delivery for this product</p>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/50">
            <input
              type="checkbox"
              checked={formData.pickupAvailable}
              onChange={(e) => setFormData({ ...formData, pickupAvailable: e.target.checked })}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="font-semibold">Available for Pickup</p>
              <p className="text-sm text-muted-foreground">Customers can pick up this product from your location</p>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <X size={16} className="flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-12 flex-1 rounded-xl border-2 border-border bg-card text-sm font-bold text-foreground hover:border-primary/50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="h-12 flex-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {loading ? 'Creating Listing...' : 'Create Product Listing'}
        </button>
      </div>
    </form>
  );
}
