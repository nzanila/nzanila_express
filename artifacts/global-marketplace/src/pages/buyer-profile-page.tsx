import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, MapPin, Plus, Trash2, Edit, Home, Building, Map, X, Check, AlertTriangle } from 'lucide-react';
import { AppShell } from '@/components/marketplace-shell';
import { useAuth } from '@/lib/auth-context';
import { LocationMapPickerModal } from '@/components/location-map-picker';
import { getLocationsForCountry, getDefaultCenter, type Province } from '@/lib/locations';

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
}

export function BuyerProfilePage() {
  const { user, session, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<BuyerAddress | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          <button onClick={() => { setEditingAddress(null); setShowForm(true); }} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
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
                      <p className="text-xs text-muted-foreground">{[addr.province, addr.commune, addr.zone].filter(Boolean).join(', ')}</p>
                      {addr.landmark && <p className="text-xs text-muted-foreground">📍 {addr.landmark}</p>}
                      {addr.detailedDirections && <p className="text-xs text-muted-foreground">{addr.detailedDirections}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!addr.isDefault && <button onClick={() => handleSetDefault(addr.id)} className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-gray-100" title="Set as default"><Check size={14} /></button>}
                    <button onClick={() => { setEditingAddress(addr); setShowForm(true); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(addr.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </div>
                {addr.latitude && addr.longitude && (
                  <div className="mt-3 rounded-lg overflow-hidden h-24 bg-gray-100">
                    <iframe
                      width="100%" height="100%" frameBorder="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${addr.longitude - 0.005},${addr.latitude - 0.005},${addr.longitude + 0.005},${addr.latitude + 0.005}&layer=mapnik&marker=${addr.latitude},${addr.longitude}`}
                      style={{ border: 0 }} loading="lazy"
                    />
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

      {showForm && (
        <AddressFormModal
          address={editingAddress}
          onClose={() => { setShowForm(false); setEditingAddress(null); }}
          onSaved={() => { setShowForm(false); setEditingAddress(null); fetchAddresses(); }}
        />
      )}
    </AppShell>
  );
}

function AddressFormModal({ address, onClose, onSaved }: { address: BuyerAddress | null; onClose: () => void; onSaved: () => void }) {
  const { user, session } = useAuth();
  const [addressName, setAddressName] = useState(address?.addressName || 'Home');
  const [recipientName, setRecipientName] = useState(address?.recipientName || user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(address?.phoneNumber || user?.phone || '');
  const [province, setProvince] = useState(address?.province || '');
  const [commune, setCommune] = useState(address?.commune || '');
  const [zone, setZone] = useState(address?.zone || '');
  const [landmark, setLandmark] = useState(address?.landmark || '');
  const [detailedDirections, setDetailedDirections] = useState(address?.detailedDirections || '');
  const [latitude, setLatitude] = useState<number | null>(address?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(address?.longitude || null);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const locations = getLocationsForCountry('BI');
  const selectedProvince = locations.find(p => p.name === province);
  const selectedCommune = selectedProvince?.communes.find(c => c.name === commune);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const body = { addressName, recipientName, phoneNumber, province, commune, zone, landmark, detailedDirections, latitude, longitude, isDefault: !address };
    const url = address ? `${API}/api/profiles/buyers/addresses/${address.id}` : `${API}/api/profiles/buyers/addresses`;
    const method = address ? 'PATCH' : 'POST';
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.accessToken || ''}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
    } catch { setError('Failed to save address'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold">{address ? 'Edit Address' : 'New Address'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Address Name</label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map(name => (
                <button key={name} onClick={() => setAddressName(name)} className={`flex-1 rounded-xl border py-2 text-xs font-medium ${addressName === name ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}>{name}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Recipient Name</label>
              <input value={recipientName} onChange={e => setRecipientName(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Phone Number</label>
              <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Province</label>
            <select value={province} onChange={e => { setProvince(e.target.value); setCommune(''); setZone(''); }} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none bg-white">
              <option value="">Select province</option>
              {locations.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {selectedProvince && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Commune / City</label>
              <select value={commune} onChange={e => { setCommune(e.target.value); setZone(''); }} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none bg-white">
                <option value="">Select commune</option>
                {selectedProvince.communes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          {selectedCommune && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold">Zone / Quartier</label>
              <select value={zone} onChange={e => setZone(e.target.value)} className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none bg-white">
                <option value="">Select zone</option>
                {selectedCommune.zones.map(z => <option key={z.name} value={z.name}>{z.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Nearest Landmark</label>
            <input value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="e.g. Near Hotel Source du Nil" className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Detailed Directions (optional)</label>
            <textarea value={detailedDirections} onChange={e => setDetailedDirections(e.target.value)} rows={2} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold">Map Pin (optional)</label>
            <button onClick={() => setShowMap(true)} className="h-10 w-full rounded-xl border border-border px-3 text-sm text-left text-muted-foreground hover:border-primary/50">
              {latitude ? `📍 ${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : 'Click to pin on map'}
            </button>
          </div>

          <button onClick={handleSave} disabled={!recipientName.trim() || !phoneNumber.trim() || saving} className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
            {saving ? 'Saving…' : address ? 'Update Address' : 'Save Address'}
          </button>
        </div>
      </div>

      <LocationMapPickerModal isOpen={showMap} onClose={() => setShowMap(false)} onLocationSelect={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} initialLat={latitude || getDefaultCenter('BI').lat} initialLng={longitude || getDefaultCenter('BI').lng} />
    </div>
  );
}
