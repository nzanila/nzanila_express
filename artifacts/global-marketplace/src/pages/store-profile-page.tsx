import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import {
  Store, Star, Shield, Package, MessageSquare, ShoppingCart,
  MapPin, Clock, Award, TrendingUp, Users,
} from 'lucide-react';
import { StorefrontRenderer } from '../components/storefront-renderer';

const API_BASE = import.meta.env.VITE_API_URL || 'https://nzanila-api.pages.dev';

export default function StoreProfilePage() {
  const { slug } = useParams();
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
          const cfgRes = await fetch(`${API_BASE}/api/stores/${s.id}/storefront`);
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
            setProducts(Array.isArray(prodData) ? prodData : []);
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
          <div className="max-w-7xl mx-auto px-4 py-8">
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
        <p className="text-gray-500">Store not found</p>
      </div>
    );
  }

  // If storefront config exists, render from DB modules
  if (storefrontConfig) {
    return (
      <div className="min-h-screen bg-[#f3f3f3] text-[#222]">
        {/* Utility header */}
        <div className="border-b border-[#e44e00] bg-[#ff6a00] text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 text-[10px] sm:px-6">
            <Link href="/" className="shrink-0 font-extrabold tracking-wide">nzanila.com</Link>
            <div className="hidden flex-1 items-center justify-center gap-4 sm:flex">
              <span>Wholesale marketplace</span>
              <span>Sell on Nzanila</span>
              <span>Help</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link href="/auth" className="font-bold hover:underline">Sign in</Link>
              <button aria-label="Messages"><MessageSquare size={13} /></button>
              <button aria-label="Cart"><ShoppingCart size={13} /></button>
            </div>
          </div>
        </div>

        {/* Store masthead from DB */}
        <div className="relative h-28 overflow-hidden bg-[#d9efff] sm:h-36">
          {(store.banner || store.logo) && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#c7e7fb]/95 via-[#d9efff]/70 to-transparent" />
          )}
          <div className="absolute inset-x-0 top-0 mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-white shadow-sm sm:h-16 sm:w-16">
              {store.logo ? <img src={store.logo} alt={store.name} className="h-full w-full object-cover" /> : <Store size={25} className="text-[#1677d2]" />}
            </div>
            <div className="min-w-0 text-[#123d63]">
              <p className="truncate text-sm font-extrabold sm:text-lg">{store.name}</p>
              <p className="mt-0.5 truncate text-[10px] sm:text-xs">
                {store.commune}, {store.province} · {store.years_active || store.yearsActive} years · {store.business_category || 'Wholesale'}
              </p>
              {store.is_verified && (
                <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-[#1677d2]">
                  <Shield size={10} /> Verified supplier
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Render storefront modules from DB */}
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <StorefrontRenderer config={storefrontConfig} />
        </div>

        {/* Products grid from DB */}
        {products.length > 0 && (
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">All Products ({products.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((pr: any) => (
                <div key={pr.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pr.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pr.description?.slice(0, 60)}...</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p>
                      <p className="text-[10px] text-gray-400">MOQ {pr.minimum_order_quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Store info from DB */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">About {store.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{store.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <MapPin size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-semibold text-gray-900">{store.commune}, {store.province}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Clock size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Response Time</p>
                <p className="text-sm font-semibold text-gray-900">{store.response_time || '2 hours'}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <TrendingUp size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">On-time Delivery</p>
                <p className="text-sm font-semibold text-gray-900">{store.on_time_delivery || 95}%</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Users size={20} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Team Size</p>
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

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-[10px] text-gray-500">
          Nzanila Express • Terms & Privacy
        </div>
      </div>
    );
  }

  // No storefront config — render store info from DB only
  return (
    <div className="min-h-screen bg-[#f3f3f3] text-[#222]">
      {/* Utility header */}
      <div className="border-b border-[#e44e00] bg-[#ff6a00] text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-1.5 text-[10px] sm:px-6">
          <Link href="/" className="shrink-0 font-extrabold tracking-wide">nzanila.com</Link>
          <div className="hidden flex-1 items-center justify-center gap-4 sm:flex">
            <span>Wholesale marketplace</span>
            <span>Sell on Nzanila</span>
            <span>Help</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/auth" className="font-bold hover:underline">Sign in</Link>
            <button aria-label="Messages"><MessageSquare size={13} /></button>
            <button aria-label="Cart"><ShoppingCart size={13} /></button>
          </div>
        </div>
      </div>

      {/* Store masthead */}
      <div className="relative h-28 overflow-hidden bg-[#d9efff] sm:h-36">
        <div className="absolute inset-0 bg-gradient-to-r from-[#c7e7fb]/95 via-[#d9efff]/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-white shadow-sm sm:h-16 sm:w-16">
            {store.logo ? <img src={store.logo} alt={store.name} className="h-full w-full object-cover" /> : <Store size={25} className="text-[#1677d2]" />}
          </div>
          <div className="min-w-0 text-[#123d63]">
            <p className="truncate text-sm font-extrabold sm:text-lg">{store.name}</p>
            <p className="mt-0.5 truncate text-[10px] sm:text-xs">
              {store.commune}, {store.province} · {store.years_active || store.yearsActive} years
            </p>
            {store.is_verified && (
              <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-[#1677d2]">
                <Shield size={10} /> Verified supplier
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Store info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{store.name}</h1>
          <p className="text-sm text-gray-600 mb-4">{store.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <MapPin size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-semibold text-gray-900">{store.commune}, {store.province}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Star size={20} className="mx-auto text-yellow-400 mb-1" />
              <p className="text-xs text-gray-500">Rating</p>
              <p className="text-sm font-semibold text-gray-900">{store.rating || 0}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <TrendingUp size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">On-time Delivery</p>
              <p className="text-sm font-semibold text-gray-900">{store.on_time_delivery || 95}%</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Users size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Team Size</p>
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
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Products ({products.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((pr: any) => (
                <div key={pr.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pr.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pr.description?.slice(0, 60)}...</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p>
                      <p className="text-[10px] text-gray-400">MOQ {pr.minimum_order_quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {products.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No products listed yet</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-[10px] text-gray-500 mt-8">
        Nzanila Express • Terms & Privacy
      </div>
    </div>
  );
}
