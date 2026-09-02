import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, MapPin, Plus, Trash2, Edit, Home, Building, Map, X, Check, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { AppShell } from '@/components/marketplace-shell';
import { useAuth } from '@/lib/auth-context';
import { LocationSearchPicker, type LocationData } from '@/components/location-search-picker';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

interface BuyerAddress {
  id: number;
  addressName: string;
  recipientName: string;
  phoneNumber: string;
  province: string;
  commune: string;
  zone: string;
  landmark: string;
  detailedDirections: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  approximateAddress?: string;
}

export function BuyerProfilePage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState<BuyerAddress | null>(null);
  const [dashStats, setDashStats] = useState<any>(null);

  useEffect(() => {
    // Hardcoded mock data
    const mockAddresses: BuyerAddress[] = [
      {
        id: 1,
        addressName: 'Main Warehouse',
        recipientName: user?.name || 'John Doe',
        phoneNumber: user?.phone || '+257 79 123 456',
        province: 'Kigali City',
        commune: 'Nyarugenge',
        zone: 'Nyamirambo',
        landmark: 'Near the main market',
        detailedDirections: 'Third building on the left after the roundabout',
        latitude: -1.9403,
        longitude: 29.8739,
        isDefault: true,
        approximateAddress: 'Nyamirambo, Nyarugenge, Kigali City',
      },
      {
        id: 2,
        addressName: 'Branch Office',
        recipientName: user?.name || 'John Doe',
        phoneNumber: user?.phone || '+257 79 123 456',
        province: 'Southern Province',
        commune: 'Huye',
        zone: 'Town Center',
        landmark: 'Next to the bank',
        detailedDirections: 'Across from the post office',
        latitude: -2.5965,
        longitude: 29.5396,
        isDefault: false,
        approximateAddress: 'Town Center, Huye, Southern Province',
      },
    ];
    
    const mockDashStats = {
      orderCount: 18,
      totalSpent: 8450.00,
      addressCount: 2,
    };
    
    setTimeout(() => {
      setAddresses(mockAddresses);
      setDashStats(mockDashStats);
      setLoading(false);
    }, 400);
  }, [user]);

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];

  const handleDeleteAccount = async () => {
    setDeleting(true);
    await logout();
    setLocation('/auth');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this address?')) return;
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const handleSetDefault = async (id: number) => {
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
  };

  const handleLocationConfirm = async (data: LocationData) => {
    const newAddress: BuyerAddress = {
      id: editingAddress ? editingAddress.id : Date.now(),
      addressName: data.locationName || 'Home',
      recipientName: user?.name || '',
      phoneNumber: data.phone || user?.phone || '',
      province: data.province || '',
      commune: data.commune || '',
      zone: data.zone || '',
      landmark: data.landmark || '',
      detailedDirections: data.directions || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      isDefault: !editingAddress && addresses.length === 0,
      approximateAddress: data.approximateAddress || '',
    };

    if (editingAddress) {
      setAddresses(addresses.map(a => a.id === editingAddress.id ? newAddress : a));
    } else {
      setAddresses([...addresses, newAddress]);
    }
    setShowLocationPicker(false);
    setEditingAddress(null);
  };

  function money(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BIF', maximumFractionDigits: 0 }).format(amount);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-5 sm:py-8 lg:px-10">
        <Link href="/buyer/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Dashboard
        </Link>

        <div className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                {user?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Buyer account</p>
                <h1 className="mt-1 text-2xl font-bold text-foreground">{user?.name || 'Buyer'}</h1>
                <p className="text-sm text-muted-foreground">{user?.phone}</p>
              </div>
            </div>
            <button onClick={() => { setEditingAddress(null); setShowLocationPicker(true); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90">
              <Plus size={14} /> Add Address
            </button>
          </div>

          {/* Stats row */}
          {dashStats && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total orders</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{dashStats.orderCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total spent</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{money(dashStats.totalSpent || 0)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Saved addresses</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{dashStats.addressCount || addresses.length}</p>
              </div>
            </div>
          )}

        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Saved Addresses</h2>
            {defaultAddress && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">Default delivery</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No saved addresses yet. Add one for faster checkout.
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map(addr => (
                <div key={addr.id} className={`rounded-2xl border ${addr.isDefault ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary/30'} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-muted-foreground shadow-sm">
                        {addr.addressName === 'Home' ? <Home size={16} /> : addr.addressName === 'Work' ? <Building size={16} /> : <Map size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{addr.addressName}</span>
                          {addr.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DEFAULT</span>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{addr.recipientName} · {addr.phoneNumber}</p>
                        {addr.approximateAddress && <p className="text-xs text-muted-foreground">{addr.approximateAddress.split(',').slice(0, 2).join(',')}</p>}
                        {!addr.approximateAddress && <p className="text-xs text-muted-foreground">{[addr.province, addr.commune, addr.zone].filter(Boolean).join(', ')}</p>}
                        {addr.landmark && <p className="text-xs text-muted-foreground">📍 {addr.landmark}</p>}
                        {addr.detailedDirections && <p className="text-xs text-muted-foreground">{addr.detailedDirections}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!addr.isDefault && <button onClick={() => handleSetDefault(addr.id)} className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-white" title="Set as default"><Check size={14} /></button>}
                      <button onClick={() => { setEditingAddress(addr); setShowLocationPicker(true); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(addr.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {addr.latitude && addr.longitude && (
                    <div className="mt-3">
                      <div className="h-24 overflow-hidden rounded-xl bg-gray-100">
                        <iframe
                          width="100%" height="100%" frameBorder="0"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${addr.longitude - 0.005},${addr.latitude - 0.005},${addr.longitude + 0.005},${addr.latitude + 0.005}&layer=mapnik&marker=${addr.latitude},${addr.longitude}`}
                          style={{ border: 0 }} loading="lazy"
                        />
                      </div>
                      <a href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        Open in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-4">
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors">
            <Trash2 size={16} />
            Delete my account
          </button>
          <p className="mt-1 text-xs text-muted-foreground">Permanently delete your account and all data</p>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Account?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. All your data, addresses, and order history will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Search Picker */}
      {showLocationPicker && (
        <LocationSearchPicker
          mode="buyer"
          onConfirm={handleLocationConfirm}
          onCancel={() => { setShowLocationPicker(false); setEditingAddress(null); }}
          initialLat={editingAddress?.latitude || undefined}
          initialLng={editingAddress?.longitude || undefined}
        />
      )}
    </AppShell>
  );
}
