import { useState, useEffect } from 'react';
import { LocationMapPickerModal } from './location-map-picker';
import { MapPin, Upload, Building2, Phone, Clock, CheckCircle, X } from 'lucide-react';

interface BurundiProvince {
  id: number;
  name: string;
  nameEn: string;
  nameFr: string;
  nameRn: string;
  nameSw: string;
}

interface BurundiCommune {
  id: number;
  provinceId: number;
  name: string;
  nameEn: string;
  nameFr: string;
  nameRn: string;
  nameSw: string;
}

interface BurundiZone {
  id: number;
  communeId: number;
  name: string;
  nameEn: string;
  nameFr: string;
  nameRn: string;
  nameSw: string;
}

interface SellerProfileFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function SellerProfileForm({ onSubmit, initialData }: SellerProfileFormProps) {
  const [formData, setFormData] = useState({
    fullName: initialData?.sellerFullName || '',
    businessName: initialData?.businessName || '',
    phoneNumber: initialData?.phone || '',
    provinceId: initialData?.provinceId || '',
    communeId: initialData?.communeId || '',
    zoneId: initialData?.zoneId || '',
    landmark: initialData?.landmark || '',
    businessDescription: initialData?.businessDescription || '',
    shopLatitude: initialData?.shopLatitude || null,
    shopLongitude: initialData?.shopLongitude || null,
    offersDelivery: initialData?.offersDelivery ?? true,
    offersPickup: initialData?.offersPickup ?? false,
    openingHours: initialData?.openingHours || {
      monday: { open: '08:00', close: '18:00', closed: false },
      tuesday: { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday: { open: '08:00', close: '18:00', closed: false },
      friday: { open: '08:00', close: '18:00', closed: false },
      saturday: { open: '08:00', close: '14:00', closed: false },
      sunday: { open: null, close: null, closed: true },
    },
  });

  const [provinces, setProvinces] = useState<BurundiProvince[]>([]);
  const [communes, setCommunes] = useState<BurundiCommune[]>([]);
  const [zones, setZones] = useState<BurundiZone[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [shopPictures, setShopPictures] = useState<File[]>([]);

  const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bd75c998.nzanila-api.pages.dev');

  // Fetch provinces on mount
  useEffect(() => {
    fetchProvinces();
  }, []);

  // Fetch communes when province changes
  useEffect(() => {
    if (formData.provinceId) {
      fetchCommunes(formData.provinceId);
    } else {
      setCommunes([]);
      setZones([]);
      setFormData(prev => ({ ...prev, communeId: '', zoneId: '' }));
    }
  }, [formData.provinceId]);

  // Fetch zones when commune changes
  useEffect(() => {
    if (formData.communeId) {
      fetchZones(formData.communeId);
    } else {
      setZones([]);
      setFormData(prev => ({ ...prev, zoneId: '' }));
    }
  }, [formData.communeId]);

  const fetchProvinces = async () => {
    try {
      const res = await fetch(`${API}/api/profiles/locations/provinces`);
      const data = await res.json();
      setProvinces(data);
    } catch (err) {
      console.error('Failed to fetch provinces:', err);
    }
  };

  const fetchCommunes = async (provinceId: string) => {
    try {
      const res = await fetch(`${API}/api/profiles/locations/provinces/${provinceId}/communes`);
      const data = await res.json();
      setCommunes(data);
    } catch (err) {
      console.error('Failed to fetch communes:', err);
    }
  };

  const fetchZones = async (communeId: string) => {
    try {
      const res = await fetch(`${API}/api/profiles/locations/communes/${communeId}/zones`);
      const data = await res.json();
      setZones(data);
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      shopLatitude: lat,
      shopLongitude: lng,
    }));
    setShowMapPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In a real app, you would upload images first and get URLs
      const submitData = {
        ...formData,
        province: provinces.find(p => p.id === parseInt(formData.provinceId))?.name,
        commune: communes.find(c => c.id === parseInt(formData.communeId))?.name,
        zone: zones.find(z => z.id === parseInt(formData.zoneId))?.name,
      };

      await onSubmit(submitData);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture Upload */}
      <div>
        <label className="mb-2 block text-sm font-semibold">Profile Picture / Logo</label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {profilePicture ? (
              <img src={URL.createObjectURL(profilePicture)} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <Building2 size={32} className="text-gray-400" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
              className="hidden"
              id="profile-picture"
            />
            <label
              htmlFor="profile-picture"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              <Upload size={16} />
              Upload Logo
            </label>
            <p className="mt-1 text-xs text-muted-foreground">Recommended: Square image, max 2MB</p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Business Information</h3>
        
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Full Name *</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="e.g. Jean Ndayisaba"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Business/Shop Name *</label>
          <input
            type="text"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            placeholder="e.g. Nzanila Electronics Shop"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Phone Number *</label>
          <div className="flex items-center rounded-xl border border-border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="border-r border-border px-3 text-sm font-semibold text-muted-foreground">+257</span>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="61 23 4567"
              className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Business Description</label>
          <textarea
            value={formData.businessDescription}
            onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
            placeholder="Describe your business, products, and services..."
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Location Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Business Location</h3>
        
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Province *</label>
          <select
            value={formData.provinceId}
            onChange={(e) => setFormData({ ...formData, provinceId: e.target.value })}
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          >
            <option value="">Select Province</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Commune/City *</label>
          <select
            value={formData.communeId}
            onChange={(e) => setFormData({ ...formData, communeId: e.target.value })}
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
            disabled={!formData.provinceId}
          >
            <option value="">Select Commune</option>
            {communes.map((commune) => (
              <option key={commune.id} value={commune.id}>
                {commune.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Zone/Quartier *</label>
          <select
            value={formData.zoneId}
            onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
            disabled={!formData.communeId}
          >
            <option value="">Select Zone</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Nearest Landmark *</label>
          <input
            type="text"
            value={formData.landmark}
            onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
            placeholder="e.g. Near Hotel Club du Lac, Next to Total Station"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        {/* Map Location Picker */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Shop Location on Map (Optional)</label>
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card py-8 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
          >
            <MapPin size={20} />
            {formData.shopLatitude && formData.shopLongitude ? (
              <span>Update Location ({formData.shopLatitude.toFixed(4)}, {formData.shopLongitude.toFixed(4)})</span>
            ) : (
              <span>Select Location on Map</span>
            )}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            Pin your exact shop location for easier delivery. This will be shown approximately to buyers for privacy.
          </p>
        </div>
      </div>

      {/* Shop Pictures Upload */}
      <div>
        <label className="mb-2 block text-sm font-semibold">Shop/Business Pictures</label>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="aspect-square rounded-xl border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden hover:border-primary/50 cursor-pointer"
            >
              {shopPictures[index] ? (
                <img src={URL.createObjectURL(shopPictures[index])} alt={`Shop ${index + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                  <Upload size={24} className="mx-auto text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">Upload</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload pictures of your shop, warehouse, or business location. Do not upload pictures of private houses.
        </p>
      </div>

      {/* Delivery Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Delivery Options</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/50">
            <input
              type="checkbox"
              checked={formData.offersDelivery}
              onChange={(e) => setFormData({ ...formData, offersDelivery: e.target.checked })}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="font-semibold">Offer Delivery</p>
              <p className="text-sm text-muted-foreground">Deliver products to customers</p>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/50">
            <input
              type="checkbox"
              checked={formData.offersPickup}
              onChange={(e) => setFormData({ ...formData, offersPickup: e.target.checked })}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="font-semibold">Offer Pickup</p>
              <p className="text-sm text-muted-foreground">Allow customers to pick up orders</p>
            </div>
          </label>
        </div>
      </div>

      {/* Opening Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Opening Hours</h3>
        <div className="space-y-2">
          {Object.entries(formData.openingHours).map(([day, hours]: [string, any]) => (
            <div key={day} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <input
                type="checkbox"
                checked={!hours.closed}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    openingHours: {
                      ...formData.openingHours,
                      [day]: { ...hours, closed: !e.target.checked }
                    }
                  });
                }}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="w-24 font-semibold capitalize">{day}</span>
              {!hours.closed && (
                <>
                  <input
                    type="time"
                    value={hours.open || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        openingHours: {
                          ...formData.openingHours,
                          [day]: { ...hours, open: e.target.value }
                        }
                      });
                    }}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <span>-</span>
                  <input
                    type="time"
                    value={hours.close || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        openingHours: {
                          ...formData.openingHours,
                          [day]: { ...hours, close: e.target.value }
                        }
                      });
                    }}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </>
              )}
              {hours.closed && <span className="text-sm text-muted-foreground">Closed</span>}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <X size={16} className="flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      >
        {loading ? 'Saving Profile...' : 'Save Profile'}
      </button>

      {/* Map Picker Modal */}
      <LocationMapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.shopLatitude || -3.364}
        initialLng={formData.shopLongitude || 29.367}
      />
    </form>
  );
}
