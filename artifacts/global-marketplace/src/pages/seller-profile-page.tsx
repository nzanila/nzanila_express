import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ArrowLeft, MapPin, Clock, Truck, ShoppingBag, Star, Phone, ShieldCheck, Camera, Edit, Eye, ChevronRight, Pencil, Save, X, ChevronDown, Trash2, AlertTriangle, Settings } from 'lucide-react';
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
  store?: {
    id: number;
    name: string;
    slug: string;
    description: string;
    storeTemplate: string;
  };
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
  const { user } = useAuth();
  const sellerId = params?.id ?? (user?.role === 'seller' ? String(user.id) : undefined);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = user?.role === 'seller' && !params?.id;

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/profiles/sellers/${sellerId}/profile`).then(r => r.json()),
      fetch(`${API}/api/suppliers/${sellerId}/products`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/stores/seller/${sellerId}`).then(r => r.json()).catch(() => ({ store: null })),
    ]).then(([p, prods, storeData]) => {
      // Merge store info into profile
      const profileWithStore = {
        ...p,
        store: storeData.store || null,
      };
      setProfile(profileWithStore);
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
        <div className="px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !profile) {
    return (
      <AppShell>
        <div className="px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">{error || 'Seller not found'}</p>
            <Link href="/suppliers" className="mt-4 text-sm text-primary hover:underline">Back to suppliers</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const ProfileContent = () => (
    <div className="mx-auto max-w-5xl">
      {isOwnProfile && (
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Store profile</h1>
          <Link 
            href="/seller/profile/edit" 
            className="flex items-center gap-2 rounded-xl bg-[#ff6a00] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#e55f00]"
          >
            <Edit size={14} /> Edit profile
          </Link>
        </div>
      )}

      {/* Public Profile Preview */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[#ff6a00]/10 shadow-inner">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt={profile.businessName} className="h-full w-full object-cover" />
              ) : (
                <ShoppingBag size={40} className="text-[#ff6a00]/60" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile.businessName || 'Seller'}</h1>
                {profile.verificationStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
              </div>
              {profile.sellerFullName && <p className="mt-1 text-sm text-gray-600">{profile.sellerFullName}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                {profile.province && <span className="flex items-center gap-1"><MapPin size={14} /> {profile.city || profile.province}</span>}
                <span className="flex items-center gap-1"><Clock size={14} /> Responds in {profile.responseTimeHours}h</span>
                {profile.rating > 0 && <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500" /> {profile.rating.toFixed(1)}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-900 hover:bg-gray-50">
                <Phone size={14} /> Call seller
              </a>
            )}
            {!isOwnProfile && (
              <Link 
                href={`/seller/${sellerId}`}
                className="flex items-center gap-2 rounded-xl border border-[#ff6a00] bg-[#ff6a00]/10 px-3 py-2 text-xs font-bold text-[#ff6a00] hover:bg-[#ff6a00]/20"
              >
                <Eye size={14} /> View public shop
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Rating</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{profile.rating > 0 ? profile.rating.toFixed(1) : 'New'}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Response</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{profile.responseTimeHours}h</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Orders</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{profile.totalOrders || 0}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Service</p>
            <p className="mt-2 text-sm font-bold text-gray-900">{[profile.offersDelivery ? 'Delivery' : '', profile.offersPickup ? 'Pickup' : ''].filter(Boolean).join(' / ') || 'Online only'}</p>
          </div>
        </div>
      </div>

      {/* Store Information */}
      {profile.store && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Your Store</h2>
            <Link
              href={`/seller/${sellerId}/storefront`}
              className="flex items-center gap-2 rounded-xl border border-[#ff6a00] bg-[#ff6a00]/10 px-3 py-2 text-xs font-bold text-[#ff6a00] hover:bg-[#ff6a00]/20"
            >
              <Eye size={14} /> View Storefront
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Store Name</span>
              <span className="text-sm font-semibold text-gray-900">{profile.store.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Template</span>
              <span className="text-sm font-semibold text-[#1677ff] capitalize">{profile.store.storeTemplate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Store URL</span>
              <Link href={`/store/${profile.store.slug}`} className="text-sm font-semibold text-[#1677ff] hover:underline">
                /store/{profile.store.slug}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Store Preview Section */}
      {isOwnProfile && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">STORE PREVIEW</h2>
          <p className="text-sm text-gray-600 mb-4">This is how buyers see your shop.</p>
          
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#ff6a00]/10">
                {profile.profilePicture ? (
                  <img src={profile.profilePicture} alt="" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <ShoppingBag size={24} className="text-[#ff6a00]/60" />
                )}
              </div>
              <div>
                <p className="font-bold text-gray-900">{profile.businessName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="flex items-center gap-1"><Star size={12} className="text-yellow-500" /> {profile.rating > 0 ? profile.rating.toFixed(1) : 'New'}</span>
                  <span>·</span>
                  <span>Responds in {profile.responseTimeHours}h</span>
                  <span>·</span>
                  <span>{profile.totalOrders || 0} completed orders</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-3">
              {profile.offersDelivery && <span className="flex items-center gap-1"><Truck size={12} /> Delivery</span>}
              {profile.offersPickup && <span className="flex items-center gap-1"><ShoppingBag size={12} /> Pickup</span>}
              <span>·</span>
              <span>Opening hours: 9AM - 6PM</span>
            </div>
            
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Public product list</p>
              <div className="space-y-2">
                {products.slice(0, 3).map(product => (
                  <div key={product.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-900">{product.name}</span>
                    <span className="font-medium text-[#ff6a00]">{product.price} BIF/{product.unit}</span>
                  </div>
                ))}
                {products.length === 0 && <p className="text-gray-500 text-xs">No products yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Health — profile completeness for own profile */}
      {isOwnProfile && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">STORE HEALTH</h2>
          <div className="space-y-3">
            {[
              { label: 'Business name', done: !!profile.businessName },
              { label: 'Business description', done: !!profile.businessDescription },
              { label: 'Profile picture', done: !!profile.profilePicture },
              { label: 'Shop location', done: !!(profile.province || profile.shopLatitude) },
              { label: 'Phone number', done: !!profile.phone },
              { label: 'At least 1 product', done: products.length > 0 },
              { label: 'ID verified', done: profile.verificationStatus === 'verified' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={`text-xs font-bold ${item.done ? 'text-emerald-600' : 'text-orange-500'}`}>
                  {item.done ? '✓ Done' : 'Add'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700">Profile completeness</span>
              <span className="text-xs font-bold text-gray-900">
                {Math.round(
                  ([
                    !!profile.businessName,
                    !!profile.businessDescription,
                    !!profile.profilePicture,
                    !!(profile.province || profile.shopLatitude),
                    !!profile.phone,
                    products.length > 0,
                    profile.verificationStatus === 'verified',
                  ].filter(Boolean).length / 7) * 100
                )}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#ff6a00] transition-all"
                style={{
                  width: `${Math.round(
                    ([
                      !!profile.businessName,
                      !!profile.businessDescription,
                      !!profile.profilePicture,
                      !!(profile.province || profile.shopLatitude),
                      !!profile.phone,
                      products.length > 0,
                      profile.verificationStatus === 'verified',
                    ].filter(Boolean).length / 7) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
          <Link href="/seller/profile/edit" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ff6a00] px-4 py-2 text-xs font-bold text-white hover:bg-[#e55f00]">
            <Pencil size={12} /> Complete profile
          </Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {profile.businessDescription && (
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">About this supplier</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{profile.businessDescription}</p>
            </div>
          )}

          {products.length > 0 && (
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Featured products</h2>
                <span className="text-xs font-bold text-gray-600">{products.filter(p => p.is_active !== false).length} items</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {products.filter(p => p.is_active !== false).map(product => (
                  <Link key={product.id} href={`/products/${product.id}`} className="group overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3 transition-all hover:border-[#ff6a00]/40 hover:bg-white">
                    <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6a00]/10 to-gray-100 text-[#ff6a00]/60">
                      <ShoppingBag size={30} />
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900">{product.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{product.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#ff6a00]">{product.price} BIF/{product.unit}</span>
                      <span className="text-xs text-gray-600">MOQ: {product.minimumOrderQuantity}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {isOwnProfile && (
            <>
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">BUSINESS INFORMATION</h3>
                  <Link href="/seller/profile/edit" className="text-xs font-bold text-[#ff6a00] hover:underline">Edit</Link>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Business name</span>
                    <span className="font-medium text-gray-900">{profile.businessName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Business description</span>
                    <span className="font-medium text-gray-900 max-w-[150px] truncate">{profile.businessDescription || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Logo/profile picture</span>
                    <span className="font-medium text-gray-900">{profile.profilePicture ? 'Set' : 'Not set'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">SHOP LOCATION</h3>
                  <Link href="/seller/profile/edit" className="text-xs font-bold text-[#ff6a00] hover:underline">Edit</Link>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">General location</span>
                    <span className="font-medium text-gray-900">{profile.city || profile.province || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Nearest landmark</span>
                    <span className="font-medium text-gray-900">{profile.landmark || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Directions</span>
                    <span className="font-medium text-gray-900 max-w-[150px] truncate">{profile.businessDescription || 'Not set'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">SERVICES</h3>
                  <Link href="/seller/profile/edit" className="text-xs font-bold text-[#ff6a00] hover:underline">Edit</Link>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Seller delivery</span>
                    <span className={`font-medium ${profile.offersDelivery ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {profile.offersDelivery ? 'Available' : 'Not available'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Buyer pickup</span>
                    <span className={`font-medium ${profile.offersPickup ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {profile.offersPickup ? 'Available' : 'Not available'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Delivery areas</span>
                    <span className="font-medium text-gray-900 max-w-[150px] truncate">{profile.deliveryAreas || 'Not set'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">VERIFICATION</h3>
                  <Link href="/seller/verify" className="text-xs font-bold text-[#ff6a00] hover:underline">View status</Link>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Phone</span>
                    <span className="font-medium text-emerald-600">Verified</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Seller profile</span>
                    <span className={`font-medium ${profile.verificationStatus === 'verified' ? 'text-emerald-600' : 'text-yellow-600'}`}>
                      {profile.verificationStatus === 'verified' ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {!isOwnProfile && (
            <>
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900">Business details</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-gray-600">Location</span>
                    <span className="font-medium text-gray-900">{profile.city || profile.province || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium text-gray-900">{profile.offersDelivery ? 'Available' : 'Not available'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                    <span className="text-gray-600">Pickup</span>
                    <span className="font-medium text-gray-900">{profile.offersPickup ? 'Available' : 'Not available'}</span>
                  </div>
                </div>
              </div>

              {profile.productCategories?.length ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900">Categories</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.productCategories.map(cat => (
                      <span key={cat} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-900">{cat}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-10">
         {isOwnProfile && (
           <>
             <Link href="/supplier" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
               <ArrowLeft size={16} /> Back to dashboard
             </Link>
             <Link href={`/seller/${sellerId}/storefront`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
               <Settings size={16} /> Customize Storefront
             </Link>
           </>
         )}
        {!isOwnProfile && (
          <Link href="/suppliers" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to suppliers
          </Link>
        )}
        <ProfileContent />
      </div>
    </AppShell>
  );
}

export function SellerProfileEditPage() {
  const { user, session } = useAuth();
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
      <AppShell>
        <div className="px-4 py-8 sm:px-6 lg:px-10">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/seller/profile" className="text-gray-500 hover:text-gray-900">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold">Edit store profile</h1>
          </div>
          <Link href="/seller/profile" className="text-sm text-gray-600 hover:text-gray-900">Cancel</Link>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

        <div className="space-y-8">
          {/* BUSINESS IDENTITY */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">BUSINESS IDENTITY</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Business name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" />
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Business description</label>
                <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Logo or profile picture</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfilePictureUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50">
                      Upload image
                    </button>
                    {profilePicture && (
                      <button onClick={() => setProfilePicture('')} className="ml-2 rounded-lg px-2 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Shop/business picture</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                    <Camera size={24} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <button className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-50">
                      Upload shop image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BUSINESS LOCATION */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">BUSINESS LOCATION</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Choose shop location on map</label>
                <button onClick={() => setShowMap(true)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-left text-gray-600 hover:border-[#ff6a00]">
                  {shopLatitude ? `📍 ${shopLatitude.toFixed(4)}, ${shopLongitude?.toFixed(4)}` : 'Click to set location on map'}
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">General location</label>
                <input value={city || province} onChange={e => { setCity(e.target.value); setProvince(e.target.value); }} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Nearest landmark</label>
                <input value={landmark} onChange={e => setLandmark(e.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Directions</label>
                <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" placeholder="How to find your shop..." />
              </div>
            </div>
          </section>

          {/* SERVICES */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">SERVICES</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Seller delivery</p>
                  <p className="text-xs text-gray-600">Offer delivery to customers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={offersDelivery} onChange={e => setOffersDelivery(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff6a00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6a00]" />
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Buyer pickup</p>
                  <p className="text-xs text-gray-600">Allow customers to pick up orders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={offersPickup} onChange={e => setOffersPickup(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff6a00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6a00]" />
                </label>
              </div>

              {offersDelivery && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">Delivery areas</label>
                  <input value={deliveryAreas} onChange={e => setDeliveryAreas(e.target.value)} placeholder="e.g. Bujumbura, Gitega, Bubanza" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Delivery fee rule</label>
                <input value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="Base delivery fee in BIF" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#ff6a00] focus:ring-1 focus:ring-[#ff6a00]" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Opening hours</label>
                <div className="space-y-2">
                  {Object.entries(openingHours).slice(0, 3).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-12 text-xs font-medium">{day}</span>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={!hours.closed} onChange={e => setOpeningHours({ ...openingHours, [day]: { ...hours, closed: !e.target.checked } })} className="rounded" />
                        <span className="text-xs">{hours.closed ? 'Closed' : 'Open'}</span>
                      </label>
                      {!hours.closed && (
                        <>
                          <input type="time" value={hours.open} onChange={e => setOpeningHours({ ...openingHours, [day]: { ...hours, open: e.target.value } })} className="h-8 rounded-lg border border-gray-300 px-2 text-xs outline-none" />
                          <span className="text-xs text-gray-600">to</span>
                          <input type="time" value={hours.close} onChange={e => setOpeningHours({ ...openingHours, [day]: { ...hours, close: e.target.value } })} className="h-8 rounded-lg border border-gray-300 px-2 text-xs outline-none" />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* STORE AVAILABILITY */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">STORE AVAILABILITY</h2>
            
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Store status</p>
                <p className="text-xs text-gray-600">Control if your store is visible to buyers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={true} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#ff6a00] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6a00]" />
              </label>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Link href="/seller/profile" className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 text-center">
              Cancel
            </Link>
            <button onClick={handleSave} disabled={saving || !businessName.trim()} className="flex-1 rounded-lg bg-[#ff6a00] px-4 py-3 text-xs font-bold text-white hover:bg-[#e55f00] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

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
