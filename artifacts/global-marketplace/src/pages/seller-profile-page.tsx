import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ArrowLeft, MapPin, Clock, Truck, ShoppingBag, Star, Phone, ShieldCheck, Camera, Edit, Save, X, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { AppShell } from '@/components/marketplace-shell';
import { useAuth } from '@/lib/auth-context';
import { LocationMapPickerModal } from '@/components/location-map-picker';
import { getLocationsForCountry, getDefaultCenter } from '@/lib/locations';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

interface SellerProfile {
  id: number;
  businessName: string;
  businessDescription: string;
  rating: number;
  responseTimeHours: number;
  totalOrders: number;
  verificationStatus: string;
  province: string;
  city: string;
  zone?: string;
  landmark?: string;
  shopLatitude: number;
  shopLongitude: number;
  shopLocationApproximate: boolean;
  profilePicture: string;
  offersDelivery: boolean;
  offersPickup: boolean;
  phone?: string;
  sellerFullName?: string;
  productCategories?: string[];
  openingHours?: Record<string, { open: string; close: string; closed: boolean }>;
  deliveryFeeStructure?: any;
  deliveryAreas?: string;
}

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
}

export function SellerProfilePage() {
  const params = useParams();
  const sellerId = params?.id;
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/profiles/sellers/${sellerId}/profile`).then(r => r.json()),
      fetch(`${API}/api/suppliers/${sellerId}/products`).then(r => r.json()).catch(() => []),
    ]).then(([p, prods]) => {
      setProfile(p);
      setProducts(Array.isArray(prods) ? prods : []);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load seller profile');
      setLoading(false);
    });
  }, [sellerId]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error || !profile) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">{error || 'Seller not found'}</p>
          <Link href="/suppliers" className="mt-4 text-sm text-primary hover:underline">Back to suppliers</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideSearch>
      <div className="bg-background px-3 py-4 sm:px-5 sm:py-8 lg:px-10 max-w-4xl mx-auto">
        <Link href="/suppliers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to suppliers
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt={profile.businessName} className="h-full w-full object-cover" />
              ) : (
                <ShoppingBag size={40} className="text-primary/60" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{profile.businessName || 'Seller'}</h1>
                {profile.verificationStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
              </div>
              {profile.sellerFullName && (
                <p className="text-sm text-muted-foreground mt-0.5">{profile.sellerFullName}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {profile.province && (
                  <span className="flex items-center gap-1"><MapPin size={14} /> {profile.city || profile.province}</span>
                )}
                <span className="flex items-center gap-1"><Clock size={14} /> Responds in {profile.responseTimeHours}h</span>
                {profile.rating > 0 && (
                  <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500" /> {profile.rating.toFixed(1)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.offersDelivery && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    <Truck size={12} /> Delivery
                  </span>
                )}
                {profile.offersPickup && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <ShoppingBag size={12} /> Pickup
                  </span>
                )}
                {profile.productCategories?.map(cat => (
                  <span key={cat} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{cat}</span>
                ))}
              </div>
            </div>
          </div>

          {profile.businessDescription && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-1">About</h3>
              <p className="text-sm text-muted-foreground">{profile.businessDescription}</p>
            </div>
          )}

          {profile.shopLatitude && profile.shopLongitude && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-2">Location</h3>
              <div className="rounded-lg overflow-hidden h-48 bg-gray-100">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${profile.shopLongitude - 0.01},${profile.shopLatitude - 0.01},${profile.shopLongitude + 0.01},${profile.shopLatitude + 0.01}&layer=mapnik&marker=${profile.shopLatitude},${profile.shopLongitude}`}
                  style={{ border: 0 }}
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {profile.deliveryAreas && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-1">Delivery Areas</h3>
              <p className="text-sm text-muted-foreground">{profile.deliveryAreas}</p>
            </div>
          )}

          {profile.openingHours && typeof profile.openingHours === 'object' && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-2">Opening Hours</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {Object.entries(profile.openingHours).map(([day, hours]: [string, any]) => (
                  <div key={day} className="flex justify-between">
                    <span className="font-medium">{day}</span>
                    <span className="text-muted-foreground">
                      {hours.closed ? 'Closed' : `${hours.open} – ${hours.close}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-4">Products</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {products.filter(p => p.is_active !== false).map(product => (
                <Link key={product.id} href={`/products/${product.id}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{product.price} BIF/{product.unit}</span>
                    <span className="text-xs text-muted-foreground">MOQ: {product.minimumOrderQuantity}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function SellerProfileEditPage() {
  const { user, session, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [sellerFullName, setSellerFullName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [landmark, setLandmark] = useState('');
  const [shopLatitude, setShopLatitude] = useState<number | null>(null);
  const [shopLongitude, setShopLongitude] = useState<number | null>(null);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [offersPickup, setOffersPickup] = useState(false);
  const [deliveryAreas, setDeliveryAreas] = useState('');
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [profilePicture, setProfilePicture] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    Mon: { open: '08:00', close: '18:00', closed: false },
    Tue: { open: '08:00', close: '18:00', closed: false },
    Wed: { open: '08:00', close: '18:00', closed: false },
    Thu: { open: '08:00', close: '18:00', closed: false },
    Fri: { open: '08:00', close: '18:00', closed: false },
    Sat: { open: '08:00', close: '13:00', closed: false },
    Sun: { open: '08:00', close: '18:00', closed: true },
  });
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [freeDeliveryMinOrder, setFreeDeliveryMinOrder] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/profiles/sellers/${user.id}/profile`)
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setBusinessName(data.businessName || '');
        setSellerFullName(data.sellerFullName || '');
        setBusinessDescription(data.businessDescription || '');
        setProvince(data.province || '');
        setCity(data.city || '');
        setZone(data.zone || '');
        setLandmark(data.landmark || '');
        setShopLatitude(data.shopLatitude || null);
        setShopLongitude(data.shopLongitude || null);
        setOffersDelivery(data.offersDelivery || false);
        setOffersPickup(data.offersPickup || false);
        setDeliveryAreas(data.deliveryAreas || '');
        setProductCategories(data.productCategories || []);
        setProfilePicture(data.profilePicture || '');
        if (data.openingHours && typeof data.openingHours === 'object') setOpeningHours(data.openingHours);
        if (data.deliveryFeeStructure) {
          setDeliveryFee(data.deliveryFeeStructure.baseFee || '');
          setFreeDeliveryMinOrder(data.deliveryFeeStructure.freeDeliveryMinOrder || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setProfilePicture(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/profiles/sellers/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.session?.accessToken || ''}`,
        },
        body: JSON.stringify({
          businessName,
          sellerFullName,
          businessDescription,
          province,
          city,
          zone,
          landmark,
          shopLatitude,
          shopLongitude,
          offersDelivery,
          offersPickup,
          deliveryAreas,
          productCategories,
          profilePicture: profilePicture || null,
          openingHours,
          deliveryFeeStructure: {
            baseFee: deliveryFee || null,
            freeDeliveryMinOrder: freeDeliveryMinOrder || null,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to save profile');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppShell mode="supplier">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell mode="supplier" activeTab="profile">
      <div className="bg-background px-3 py-4 sm:px-5 sm:py-8 lg:px-10 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Edit Business Profile</h1>
          <button onClick={() => setLocation('/supplier')} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Business Name</label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Your Full Name</label>
            <input value={sellerFullName} onChange={e => setSellerFullName(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Business Description</label>
            <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Province</label>
              <input value={province} onChange={e => setProvince(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Commune / City</label>
              <input value={city} onChange={e => setCity(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Zone / Quartier</label>
              <input value={zone} onChange={e => setZone(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Landmark</label>
              <input value={landmark} onChange={e => setLandmark(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Shop Location (optional)</label>
            <button onClick={() => setShowMap(true)} className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-left text-muted-foreground hover:border-primary/50">
              {shopLatitude ? `📍 ${shopLatitude.toFixed(4)}, ${shopLongitude?.toFixed(4)}` : 'Click to pin on map'}
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Product Categories</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {productCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {cat}
                  <button onClick={() => setProductCategories(productCategories.filter(c => c !== cat))}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Add category" className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none" onKeyDown={e => { if (e.key === 'Enter' && newCategory.trim()) { setProductCategories([...productCategories, newCategory.trim()]); setNewCategory(''); } }} />
              <button onClick={() => { if (newCategory.trim()) { setProductCategories([...productCategories, newCategory.trim()]); setNewCategory(''); } }} className="h-10 rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20">Add</button>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={offersDelivery} onChange={e => setOffersDelivery(e.target.checked)} className="rounded" />
              Offers Delivery
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={offersPickup} onChange={e => setOffersPickup(e.target.checked)} className="rounded" />
              Offers Pickup
            </label>
          </div>

          {offersDelivery && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Delivery Areas</label>
              <input value={deliveryAreas} onChange={e => setDeliveryAreas(e.target.value)} placeholder="e.g. Bujumbura Mairie, Gitega" className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          )}

          {offersDelivery && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Delivery Fee (BIF)</label>
                <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="e.g. 2000" className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Free Delivery Min (BIF)</label>
                <input type="number" value={freeDeliveryMinOrder} onChange={e => setFreeDeliveryMinOrder(e.target.value)} placeholder="e.g. 50000" className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Profile Picture / Logo</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <Camera size={28} className="text-primary/40" />
                )}
              </div>
              <div className="flex-1">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePictureUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-gray-50">
                  Choose Image
                </button>
                {profilePicture && (
                  <button onClick={() => setProfilePicture('')} className="ml-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                    Remove
                  </button>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">Shop, business, or logo. Max 2MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Opening Hours</label>
            <div className="space-y-2">
              {Object.entries(openingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-semibold">{day}</span>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={!hours.closed} onChange={e => setOpeningHours({ ...openingHours, [day]: { ...hours, closed: !e.target.checked } })} className="rounded" />
                    <span className="text-xs">{hours.closed ? 'Closed' : 'Open'}</span>
                  </label>
                  {!hours.closed && (
                    <>
                      <input type="time" value={hours.open} onChange={e => setOpeningHours({ ...openingHours, [day]: { ...hours, open: e.target.value } })} className="h-8 rounded-lg border border-border px-2 text-xs outline-none" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input type="time" value={hours.close} onChange={e => setOpeningHours({ ...openingHours, [day]: { ...hours, close: e.target.value } })} className="h-8 rounded-lg border border-border px-2 text-xs outline-none" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !businessName.trim()} className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
            {saving ? 'Saving…' : 'Save Profile'}
          </button>

          {/* Delete Account Section */}
          <div className="mt-6 pt-6 border-t border-border">
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
              This action cannot be undone. All your products, shop data, and order history will be permanently deleted.
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
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await fetch(`${API}/api/profiles/account`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${session?.accessToken || ''}` },
                    });
                    await logout();
                    setLocation('/auth');
                  } catch { setDeleting(false); }
                }}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LocationMapPickerModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        onLocationSelect={(lat, lng) => { setShopLatitude(lat); setShopLongitude(lng); }}
        initialLat={shopLatitude || getDefaultCenter('BI').lat}
        initialLng={shopLongitude || getDefaultCenter('BI').lng}
      />
    </AppShell>
  );
}
