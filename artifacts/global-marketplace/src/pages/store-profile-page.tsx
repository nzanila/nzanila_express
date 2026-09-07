import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import {
  Store, Star, Shield, Package, MessageSquare, ShoppingCart,
  MapPin, Clock, Award, TrendingUp, Users, Search, Globe2, UserRound,
  Truck, LogOut,
  Mail, Phone, ExternalLink,
} from 'lucide-react';
import { StorefrontRenderer, ProductThumb, normalizeStoreProduct } from '../components/storefront-renderer';
// The header is the marketplace's own, not a copy: it already knows whether the visitor
// is signed in, and carries the cart, messages and orders a buyer needs to act on a
// storefront — send an inquiry, message the supplier, or check an order.
import { AppShell, Logo } from '../components/marketplace-shell';
import { useAuth } from '../lib/auth-context';
import { useLocale, tg } from '@/lib/i18n/locale-context';
import { TranslatableText } from '@/components/translatable-text';

const API_BASE = import.meta.env.VITE_API_URL || 'https://nzanila-seller-api.nzanilaexpress.workers.dev';

export default function StoreProfilePage() {
  const { slug } = useParams();
  const { user, isAuthenticated, logout } = useAuth();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [storefrontConfig, setStorefrontConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storeRes = await fetch(`${API_BASE}/api/stores/${slug}`);
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          const s = storeData.store;
          setStore(s);

          // Fetch storefront config
          // Storefront configs are keyed by seller_id in the API, while the
          // public store URL resolves the store row by its own id.
          const cfgRes = await fetch(`${API_BASE}/api/storefront/${s.id}`);
          if (cfgRes.ok) {
            const cfg = await cfgRes.json();
            if (cfg && Array.isArray(cfg.sections) && cfg.sections.length > 0) {
              const hasModules = cfg.sections.some((sec: any) => sec.modules?.length > 0);
              if (hasModules) setStorefrontConfig({ ...cfg, storeId: s.id });
            }
          }

          // Fetch products
          const prodRes = await fetch(`${API_BASE}/api/stores/${s.id}/products`);
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            setProducts(Array.isArray(prodData) ? prodData.map(normalizeStoreProduct) : []);
          }
        }
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200" />
          <div className="max-w-[1280px] mx-auto px-4 py-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{tg('ui.storeNotFound')}</p>
      </div>
    );
  }

  const savedHeader = storefrontConfig?.header || {};
  const displayName = savedHeader.companyName || store.name;
  const profileImage = savedHeader.profileImage || store.logo || store.profile_image || store.profileImage || store.gallery_images?.[0] || store.galleryImages?.[0];
  const tagline = savedHeader.tagline || store.description || store.business_category || 'Wholesale supplier';
  const yearsLabel = savedHeader.yearsActive || (store.years_active ? `${store.years_active} years` : 'New supplier');
  const verificationLabel = savedHeader.verificationLabel || 'Verified Supplier';
  const mastheadImage = !storefrontConfig?.shopSign?.hidden ? storefrontConfig?.shopSign?.imageUrl : null;
  const locationLabel = [store.commune || store.location_address, store.province].filter(Boolean).join(', ');
  const hasCoordinates = Number.isFinite(Number(store.latitude)) && Number.isFinite(Number(store.longitude)) && (Number(store.latitude) !== 0 || Number(store.longitude) !== 0);
  const locationQuery = hasCoordinates ? `${store.latitude},${store.longitude}` : (store.location_address || store.address || locationLabel || 'Rwanda');
  const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery)}`;
  const accountHref = isAuthenticated
    ? (user?.role === 'seller' ? '/seller/profile' : '/buyer/dashboard')
    : '/auth';
  const ordersHref = isAuthenticated && user?.role === 'seller' ? '/supplier/orders' : '/orders';
  const storeMasthead = (
    <div className="relative min-h-[120px] overflow-hidden bg-[#dcefff] sm:min-h-[162px]">
      {(mastheadImage || store.banner) && (
        <img src={mastheadImage || store.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#e9f6ff]/95 via-[#dcefff]/90 to-[#b9d9ff]/75" />
      <div className="relative mx-auto flex min-h-[120px] w-full max-w-[1280px] flex-col justify-center gap-3 px-4 py-4 sm:gap-4 sm:py-5 sm:min-h-[162px] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/5 sm:h-20 sm:w-28">
            {profileImage ? (
              <img src={profileImage} alt={displayName} className="h-full w-full object-contain" />
            ) : (
              <Store size={32} className="text-[#1677d2]" />
            )}
          </div>
          <div className="min-w-0 text-[#233548]">
            <h1 className="truncate text-base font-extrabold sm:text-xl">{displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold sm:text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-[#1677d2]"><Shield size={12} /> {verificationLabel}</span>
              <span>{yearsLabel}</span>
              {locationLabel && <><span>•</span><span>{locationLabel}</span></>}
            </div>
            <p className="mt-1 line-clamp-1 text-[10px] text-[#40566d] sm:mt-2 sm:text-xs">Main products: {tagline}</p>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex w-fit max-w-full items-center gap-1.5 text-[10px] font-semibold text-[#1268b3] hover:text-[#ff6a00] hover:underline sm:text-xs"><MapPin size={13} className="shrink-0" /><span className="truncate">{store.location_address || store.address || locationLabel || 'View supplier location'}</span><span className="shrink-0">· Directions ↗</span></a>
            <div className="mt-2 hidden flex-wrap gap-1.5 text-[9px] font-medium text-[#40566d] sm:flex sm:text-[10px]">
              <span className="rounded bg-white/85 px-2 py-1">{tg('ui.supplierAssessmentAvailable')}</span>
              <span className="rounded bg-white/85 px-2 py-1">On-time delivery {store.on_time_delivery || 95}%</span>
              <span className="rounded bg-white/85 px-2 py-1">Response: {store.response_time || 'Within 2 hours'}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 sm:w-44 sm:flex-col">
          <Link
            href={`/messages?store=${store.id}&seller=${store.seller_id || ''}`}
            className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-[#ff6a00] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-[#e85f00] active:bg-[#d95700]"
          >
            <Mail size={13} className="shrink-0" /> Contact supplier
          </Link>
          <Link
            href={`/messages?store=${store.id}&seller=${store.seller_id || ''}`}
            className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#1677d2]/30 bg-white px-4 py-2.5 text-[11px] font-semibold text-[#1268b3] shadow-sm transition-colors hover:border-[#1677d2]/60 hover:bg-[#f2f8ff] active:bg-[#e7f1fb]"
          >
            <MessageSquare size={13} className="shrink-0" /> Chat now
          </Link>
        </div>
      </div>
    </div>
  );
  const marketplaceFooter = (
    <footer className="mt-auto border-t-4 border-[#ff6a00] bg-white text-[#233548]">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="inline-flex"><Logo /></div>
          <p className="mt-4 max-w-xs text-xs leading-5 text-gray-600">Connecting African buyers and verified suppliers through one trusted wholesale marketplace.</p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">{tg('ui.buyOnNzanila')}</h3>
          <div className="mt-4 space-y-2 text-xs text-gray-600"><Link href="/products" className="block hover:text-[#ff6a00]">{tg('ui.browseProducts')}</Link><Link href="/suppliers" className="block hover:text-[#ff6a00]">{tg('ui.findSuppliers')}</Link><Link href="/ai-research" className="block hover:text-[#ff6a00]">{tg('ui.productResearch')}</Link><Link href="/orders" className="block hover:text-[#ff6a00]">{tg('ui.trackOrders')}</Link></div>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">{tg('ui.sellWithUs')}</h3>
          <div className="mt-4 space-y-2 text-xs text-gray-600"><Link href="/onboarding" className="block hover:text-[#ff6a00]">{tg('ui.startSelling')}</Link><Link href="/auth" className="block hover:text-[#ff6a00]">{tg('ui.sellerSignIn')}</Link><Link href="/messages" className="block hover:text-[#ff6a00]">{tg('ui.messageCenter')}</Link><span className="block">{tg('ui.verifiedSupplierProgram')}</span></div>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">{tg('ui.contactUs')}</h3>
          <div className="mt-4 space-y-3 text-xs text-gray-600"><a href="mailto:support@nzanila.com" className="flex items-center gap-2 hover:text-[#ff6a00]"><Mail size={14} /> support@nzanila.com</a><a href="tel:+257799944538" className="flex items-center gap-2 hover:text-[#ff6a00]"><Phone size={14} /> +257 79 994 4538</a><p className="flex items-center gap-2"><MapPin size={14} /> {tg('ui.kigaliRwanda')}</p><p className="text-[10px] text-white/40">{tg('ui.temporaryContactDetailsEditableLater')}</p></div>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-5 py-4 text-[10px] text-gray-500 sm:flex-row sm:px-6"><p>© {new Date().getFullYear()} Nzanila Express. All rights reserved.</p><p>{tg('ui.termsOfUsePrivacyPolicyCookie')}</p></div>
      </div>
    </footer>
  );
  const storeAbout = (
    <section className="w-full border-y border-gray-200 bg-white">
      {/* Same 1280 band as the header, nav, products and footer — the white runs edge to
          edge, the content stays on the page's single alignment line. */}
      <div className="mx-auto w-full max-w-[1280px] overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="px-4 py-8 sm:px-6 sm:py-10 lg:py-12 lg:pr-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff6a00]">{tg('ui.supplierInformation')}</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">About {store.name}</h2>
            <p className="mt-2 text-xs font-semibold text-gray-500">Store owner: {store.owner_name || store.ownerName || store.seller_name || store.sellerName || 'Contact this supplier for owner details'}</p>
            {store.description
              ? <TranslatableText as="p" className="mt-3 text-sm leading-6 text-gray-600" text={store.description} />
              : <p className="mt-3 text-sm leading-6 text-gray-600">{tg('ui.contactThisSupplierForCompanyAnd')}</p>}
            <div className="mt-7 border-l-4 border-[#ff6a00] pl-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{tg('ui.warehouseOrShowroom')}</p><p className="mt-1 text-sm font-bold text-gray-900">{store.location_address || store.address || locationLabel || 'Location available from supplier'}</p><a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#1677d2] hover:text-[#ff6a00]">{tg('ui.openDirections')} <ExternalLink size={13} /></a>
            </div>
            <dl className="mt-8 grid grid-cols-3 border-t border-gray-200 pt-5"><div><dt className="text-[9px] text-gray-400">{tg('ui.response')}</dt><dd className="mt-1 text-xs font-bold">{store.response_time || '2 hours'}</dd></div><div><dt className="text-[9px] text-gray-400">{tg('ui.ontimeDelivery2')}</dt><dd className="mt-1 text-xs font-bold">{store.on_time_delivery || 95}%</dd></div><div><dt className="text-[9px] text-gray-400">{tg('ui.teamSize2')}</dt><dd className="mt-1 text-xs font-bold">{store.employee_count || '10–50'}</dd></div></dl>
          </div>
          <div className="relative min-h-[380px] border-t border-gray-200 bg-gray-100 sm:min-h-[440px] lg:min-h-[480px] lg:border-l lg:border-t-0"><iframe src={mapsEmbedUrl} title={`${store.name} location`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" /></div>
        </div>
      </div>
    </section>
  );

  // If storefront config exists, render from DB modules
  if (storefrontConfig) {
    return (
      <AppShell mode="buyer" hideTopBar hideSearch hideSidebar hideFooter fullBleed>
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#f3f3f3] text-[#222]">

        {/* Alibaba-style supplier masthead shared by every storefront template */}
        {storeMasthead}

        {/* Render storefront modules from DB */}
        <div className="min-h-[760px] w-full">
          <StorefrontRenderer config={storefrontConfig} sellerId={Number(store.seller_id) || undefined} store={store} />
        </div>

        {/* Products grid from DB */}
        {products.length > 0 && (
          <div id="store-products" className="mx-auto max-w-[1280px] scroll-mt-4 px-4 py-6 sm:px-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">All Products ({products.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((pr: any) => (
                <Link href={`/products/${pr.id}`} key={pr.id} className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <ProductThumb src={pr.primary_image} name={pr.name} />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pr.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pr.description?.slice(0, 60)}...</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p>
                      <p className="text-[10px] text-gray-400">MOQ {pr.minimum_order_quantity}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Store info from DB */}
        {storeAbout}
        <div className="hidden">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">About {store.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{store.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <MapPin size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">{tg('ui.location')}</p>
                <p className="text-sm font-semibold text-gray-900">{store.commune}, {store.province}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Clock size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">{tg('ui.responseTime')}</p>
                <p className="text-sm font-semibold text-gray-900">{store.response_time || '2 hours'}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <TrendingUp size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">{tg('ui.ontimeDelivery')}</p>
                <p className="text-sm font-semibold text-gray-900">{store.on_time_delivery || 95}%</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Users size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">{tg('ui.teamSize')}</p>
                <p className="text-sm font-semibold text-gray-900">{store.employee_count || '10-50'}</p>
              </div>
            </div>
            {store.certifications && store.certifications.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {store.certifications.map((cert: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200">
                    <Award size={12} /> {cert}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {marketplaceFooter}
      </div>
      </AppShell>
    );
  }

  // No storefront config — render store info from DB only
  return (
    <AppShell mode="buyer" hideTopBar hideSearch hideSidebar hideFooter fullBleed>
    <div className="flex min-h-screen flex-col bg-[#f3f3f3] text-[#222]">

      {/* Alibaba-style supplier masthead shared by every storefront template */}
      {storeMasthead}

      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        {/* Store info */}
        {storeAbout}
        <div className="hidden">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{store.name}</h1>
          <p className="text-sm text-gray-600 mb-4">{store.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <MapPin size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">{tg('ui.location')}</p>
              <p className="text-sm font-semibold text-gray-900">{store.commune}, {store.province}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Star size={20} className="mx-auto text-yellow-400 mb-1" />
              <p className="text-xs text-gray-500">{tg('ui.rating')}</p>
              <p className="text-sm font-semibold text-gray-900">{store.rating || 0}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <TrendingUp size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">{tg('ui.ontimeDelivery')}</p>
              <p className="text-sm font-semibold text-gray-900">{store.on_time_delivery || 95}%</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">{tg('ui.teamSize')}</p>
              <p className="text-sm font-semibold text-gray-900">{store.employee_count || '10-50'}</p>
            </div>
          </div>
          {store.certifications && store.certifications.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {store.certifications.map((cert: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200">
                  <Award size={12} /> {cert}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Products from DB */}
        {products.length > 0 && (
          <div id="store-products" className="scroll-mt-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Products ({products.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((pr: any) => (
                <Link href={`/products/${pr.id}`} key={pr.id} className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <ProductThumb src={pr.primary_image} name={pr.name} />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pr.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pr.description?.slice(0, 60)}...</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p>
                      <p className="text-[10px] text-gray-400">MOQ {pr.minimum_order_quantity}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {products.length === 0 && (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{tg('ui.noProductsListedYet')}</p>
          </div>
        )}
      </div>

      {marketplaceFooter}
    </div>
    </AppShell>
  );
}
