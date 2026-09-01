import { useState, useEffect } from 'react';
import { LocationMapPickerModal } from './location-map-picker';
import { MapPin, Home, Briefcase, Building2, Upload } from 'lucide-react';

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

interface BuyerAddressFormProps {
  onSubmit: (data: any) => void;
  initialData?: any;
  onCancel?: () => void;
}

export function BuyerAddressForm({ onSubmit, initialData, onCancel }: BuyerAddressFormProps) {
  const [formData, setFormData] = useState({
    addressName: initialData?.addressName || 'Home',
    recipientName: initialData?.recipientName || '',
    phoneNumber: initialData?.phoneNumber || '',
    provinceId: initialData?.provinceId || '',
    communeId: initialData?.communeId || '',
    zoneId: initialData?.zoneId || '',
    landmark: initialData?.landmark || '',
    detailedDirections: initialData?.detailedDirections || '',
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    isDefault: initialData?.isDefault || false,
  });

  const [provinces, setProvinces] = useState<BurundiProvince[]>([]);
  const [communes, setCommunes] = useState<BurundiCommune[]>([]);
  const [zones, setZones] = useState<BurundiZone[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      latitude: lat,
      longitude: lng,
    }));
    setShowMapPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        province: provinces.find(p => p.id === parseInt(formData.provinceId))?.name,
        commune: communes.find(c => c.id === parseInt(formData.communeId))?.name,
        zone: zones.find(z => z.id === parseInt(formData.zoneId))?.name,
      };

      await onSubmit(submitData);
    } catch (err) {
      setError('Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addressTypes = [
    { value: 'Home', label: 'Home', icon: Home },
    { value: 'Work', label: 'Work', icon: Briefcase },
    { value: 'Other', label: 'Other', icon: Building2 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Address Type */}
      <div>
        <label className="mb-2 block text-sm font-semibold">Address Type</label>
        <div className="grid grid-cols-3 gap-3">
          {addressTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, addressName: type.value })}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  formData.addressName === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <Icon size={24} className={formData.addressName === type.value ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-semibold">{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipient Information */}
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Recipient Name *</label>
          <input
            type="text"
            value={formData.recipientName}
            onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
            placeholder="e.g. Jean Ndayisaba"
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
      </div>

      {/* Location Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Delivery Location</h3>
        
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
            placeholder="e.g. Near Market, Next to Pharmacy"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Detailed Directions</label>
          <textarea
            value={formData.detailedDirections}
            onChange={(e) => setFormData({ ...formData, detailedDirections: e.target.value })}
            placeholder="Additional directions to help the courier find you (e.g., 'Blue gate, second house on the left')"
            rows={3}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Map Location Picker */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Location on Map (Optional)</label>
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card py-8 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
          >
            <MapPin size={20} />
            {formData.latitude && formData.longitude ? (
              <span>Update Location ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})</span>
            ) : (
              <span>Select Location on Map</span>
            )}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            Pin your exact location for more accurate delivery. This is private and only shared with sellers after you place an order.
          </p>
        </div>
      </div>

      {/* Default Address */}
      <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/50">
        <input
          type="checkbox"
          checked={formData.isDefault}
          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
          className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
        />
        <div>
          <p className="font-semibold">Set as Default Address</p>
          <p className="text-sm text-muted-foreground">This will be used as your default delivery address</p>
        </div>
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
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
          {loading ? 'Saving Address...' : 'Save Address'}
        </button>
      </div>

      {/* Map Picker Modal */}
      <LocationMapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.latitude || -3.364}
        initialLng={formData.longitude || 29.367}
      />
    </form>
  );
}
