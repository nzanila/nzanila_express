import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, MapPin, Plus, Trash2, Edit, Home, Building, Map, X, Check, AlertTriangle } from 'lucide-react';
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
  const { user, session, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState<BuyerAddress | null>(null);

  const fetchAddresses = () => {
    if (!user) return;
    fetch(`${API}/api/profiles/buyers/addresses`, {
      headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
    })
      .then(r => r.json())
      .then(data => { setAddresses(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchAddresses(); }, [user]);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/api/profiles/account`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
      });
      await logout();
      setLocation('/auth');
    } catch {
      setDeleting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this address?')) return;
    await fetch(`${API}/api/profiles/buyers/addresses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
    });
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const handleSetDefault = async (id: number) => {
    await fetch(`${API}/api/profiles/buyers/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken || ''}` },
      body: JSON.stringify({ isDefault: true }),
    });
    fetchAddresses();
  };

  const handleLocationConfirm = async (data: LocationData) => {
    const body = {
      addressName: data.locationName || 'Home',
      recipientName: user?.name || '',
      phoneNumber: data.phone || user?.phone || '',
      province: data.province || '',
      commune: data.commune || '',
      zone: data.zone || '',
      landmark: data.landmark || '',
      detailedDirections: data.directions || '',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      isDefault: !editingAddress && addresses.length === 0,
      approximateAddress: data.approximateAddress || '',
    };

    const url = editingAddress ? `${API}/api/profiles/buyers/addresses/${editingAddress.id}` : `${API}/api/profiles/buyers/addresses`;
    const method = editingAddress ? 'PATCH' : 'POST';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken || ''}` },
        body: JSON.stringify(body),
      });
      fetchAddresses();
    } catch (err) {
      console.error('Failed to save address:', err);
    }
    setShowLocationPicker(false);
    setEditingAddress(null);
  };

  return (
    <AppShell>
      <div className="bg-background px-3 py-4 sm:px-5 sm:py-8 lg:px-10 max-w-2xl mx-auto">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your delivery addresses</p>
          </div>
          <button onClick={() => { setEditingAddress(null); setShowLocationPicker(true); }} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
            <Plus size={14} /> Add Address
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-semibold">{user?.name || 'Buyer'}</p>
              <p className="text-xs text-muted-foreground">{user?.phone}</p>
            </div>
          </div>
        </div>

        <h2 className="text-sm font-semibold mb-3">Saved Addresses</h2>

        {loading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : addresses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No saved addresses yet. Add one for faster checkout.
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`rounded-xl border ${addr.isDefault ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'} p-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {addr.addressName === 'Home' ? <Home size={16} className="mt-0.5 text-muted-foreground" /> : addr.addressName === 'Work' ? <Building size={16} className="mt-0.5 text-muted-foreground" /> : <Map size={16} className="mt-0.5 text-muted-foreground" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{addr.addressName}</span>
                        {addr.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DEFAULT</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{addr.recipientName} · {addr.phoneNumber}</p>
                      {addr.approximateAddress && <p className="text-xs text-muted-foreground">{addr.approximateAddress.split(',').slice(0, 2).join(',')}</p>}
                      {!addr.approximateAddress && <p className="text-xs text-muted-foreground">{[addr.province, addr.commune, addr.zone].filter(Boolean).join(', ')}</p>}
                      {addr.landmark && <p className="text-xs text-muted-foreground">📍 {addr.landmark}</p>}
                      {addr.detailedDirections && <p className="text-xs text-muted-foreground">{addr.detailedDirections}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!addr.isDefault && <button onClick={() => handleSetDefault(addr.id)} className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-gray-100" title="Set as default"><Check size={14} /></button>}
                    <button onClick={() => { setEditingAddress(addr); setShowLocationPicker(true); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(addr.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
                {addr.latitude && addr.longitude && (
                  <div className="mt-3">
                    <div className="rounded-lg overflow-hidden h-24 bg-gray-100">
                      <iframe
                        width="100%" height="100%" frameBorder="0"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${addr.longitude - 0.005},${addr.latitude - 0.005},${addr.longitude + 0.005},${addr.latitude + 0.005}&layer=mapnik&marker=${addr.latitude},${addr.longitude}`}
                        style={{ border: 0 }} loading="lazy"
                      />
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Delete Account Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
          >
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
