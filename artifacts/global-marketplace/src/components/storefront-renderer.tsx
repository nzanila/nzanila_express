import { useState, useEffect, type ReactNode } from 'react';
import {
  Package, Video, ShieldCheck, Clock, Users, Building, Globe,
} from 'lucide-react';

const API = 'https://nzanila-api.pages.dev';

interface StorefrontModule {
  id: string;
  type: string;
  props: Record<string, unknown>;
  position: number;
}

interface StorefrontSection {
  id: string;
  name: string;
  slug: string;
  modules: StorefrontModule[];
}

interface StorefrontConfig {
  storeId: number;
  sections: StorefrontSection[];
  shopSign?: { imageUrl: string | null; altText: string; hidden: boolean } | null;
  template?: string;
}

function ModuleRenderer({ mod, storeId }: { mod: StorefrontModule; storeId?: number }) {
  const props = mod.props as Record<string, string | number | boolean | null | undefined>;
  const p = (key: string) => props[key];
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    if (!['recommended-products', 'product-category', 'double-row-products', 'hot-products', 'new-arrivals'].includes(mod.type)) return;
    let cancelled = false;
    setProductsLoading(true);
    setProductsError(null);
    fetch(`${API}/api/stores/${storeId}/products`)
      .then(r => { if (!r.ok) throw new Error(`Products API returned ${r.status}`); return r.json(); })
      .then(d => {
        if (cancelled) return;
        if (Array.isArray(d)) setLiveProducts(d.slice(0, Number(p('limit')) || Number((props as any).productCount) || 9));
        else setProductsError('Invalid response format');
      })
      .catch(e => { if (!cancelled) setProductsError(e.message || 'Failed to load products'); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, mod.type, props.limit, (props as any).productCount]);

  switch (mod.type) {
    case 'hero':
      return (
        <div className="relative h-44 overflow-hidden bg-black flex">
          <div className="flex-1 flex flex-col justify-center px-6 bg-black text-white">
            {p('brand') && <p className="text-xs font-bold tracking-widest text-white mb-1">{String(p('brand'))}</p>}
            <h3 className="text-lg font-bold leading-tight">{String(p('title') || 'Hero Banner')}</h3>
            {p('subtitle') && <p className="text-[11px] text-gray-300 mt-1">{String(p('subtitle'))}</p>}
            {p('buttonText') ? <span className="mt-2 inline-block w-fit rounded bg-[#ff9900] px-3 py-1 text-xs font-semibold text-white">{String(p('buttonText'))}</span> : null}
          </div>
          <div className="h-44 w-[52%] bg-gradient-to-l from-gray-700 to-black relative overflow-hidden">
            <img src={String(p('imageUrl') || 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=600&q=80')} alt={String(p('title') || 'Hero')} className="h-full w-full object-cover object-right" />
          </div>
        </div>
      );

    case 'image-text':
      return (
        <div className="relative h-32 rounded-lg overflow-hidden">
          <img src={String(p('imageUrl') || 'https://via.placeholder.com/800x200')} alt={String(p('title') || '')} className="h-32 w-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
            <h3 className="text-lg font-bold text-white">{String(p('title') || 'Image & Text')}</h3>
            {p('subtitle') && <p className="text-sm text-gray-200">{String(p('subtitle'))}</p>}
          </div>
        </div>
      );

    case 'marketing':
      return (
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: String(p('backgroundColor') || '#fff3f0') }}>
          <h3 className="text-lg font-bold" style={{ color: String(p('textColor') || '#ff5a36') }}>{String(p('title') || 'Marketing Section')}</h3>
          {p('description') && <p className="text-sm text-gray-700 mt-1">{String(p('description'))}</p>}
          {p('buttonText') && <button className="mt-3 rounded-lg bg-[#ff9900] px-4 py-2 text-sm font-semibold text-white">{String(p('buttonText'))}</button>}
        </div>
      );

    case 'video':
      return (
        <div className="aspect-video rounded-lg bg-black/10 flex items-center justify-center">
          {p('videoUrl') ? (
            <iframe src={p('videoUrl') as string} className="h-full w-full rounded-lg" allowFullScreen />
          ) : (
            <div className="text-center text-gray-500"><Video size={32} className="mx-auto mb-2" /><p className="text-sm">Video placeholder</p></div>
          )}
        </div>
      );

    case 'company':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900">{String(p('title') || 'Our Company')}</h3>
          {p('description') && <p className="text-sm text-gray-600 mt-1">{String(p('description'))}</p>}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {p('showCertification') && <div><ShieldCheck size={24} className="mx-auto text-gray-400" /><p className="text-xs text-gray-500">Certified</p></div>}
            {p('showYearsActive') && <div><Clock size={24} className="mx-auto text-gray-400" /><p className="text-xs text-gray-500">5+ Years</p></div>}
            {p('showEmployees') && <div><Users size={24} className="mx-auto text-gray-400" /><p className="text-xs text-gray-500">100+ Employees</p></div>}
          </div>
        </div>
      );

    case 'product-category':
      if (productsLoading) {
        return (
          <div className="bg-[#f5f7fa] p-3">
            <div className="text-center mb-3"><h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3><div className="mx-auto mt-1 h-0.5 w-8 bg-[#1677ff]" /></div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: Number(p('productCount')) || 6 }).map((_, i) => (
                <div key={i} className="bg-white p-1 animate-pulse"><div className="h-20 bg-gray-200 rounded" /><div className="h-3 bg-gray-200 rounded mt-1 w-3/4 mx-auto" /></div>
              ))}
            </div>
          </div>
        );
      }
      if (productsError) {
        return (
          <div className="bg-[#f5f7fa] p-3">
            <div className="text-center mb-3"><h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3></div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"><p className="text-xs text-red-600">Failed to load products</p></div>
          </div>
        );
      }
      if (liveProducts.length > 0) {
        return (
          <div className="bg-[#f5f7fa] p-3">
            <div className="text-center mb-3"><h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3><div className="mx-auto mt-1 h-0.5 w-8 bg-[#1677ff]" /><div className="mx-auto mt-0.5 h-0.5 w-16 bg-[#1677ff]/30" /></div>
            <div className="grid grid-cols-3 gap-2">
              {liveProducts.slice(0, Number(p('productCount')) || 6).map((pr: any) => (
                <div key={pr.id} className="bg-white p-1"><div className="h-20 bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover" /></div><p className="text-[11px] font-medium text-center truncate">{pr.name}</p><p className="text-[10px] text-center text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p></div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="bg-[#f5f7fa] p-3">
          <div className="text-center mb-3"><h3 className="text-sm font-bold text-gray-900">{String(p('title') || 'Product Category')}</h3><div className="mx-auto mt-1 h-0.5 w-8 bg-[#1677ff]" /></div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: Number(p('productCount')) || 6 }).map((_, i) => (
              <div key={i} className="bg-white p-1"><div className="h-20 bg-gray-100 flex items-center justify-center"><Package size={20} className="text-gray-400" /></div><p className="text-[11px] font-medium text-center text-gray-400">Product {i + 1}</p></div>
            ))}
          </div>
        </div>
      );

    case 'recommended-products':
    case 'double-row-products':
      if (productsLoading) {
        return (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: Number(p('limit')) || 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden animate-pulse"><div className="aspect-square bg-gray-200" /><div className="p-2"><div className="h-3 bg-gray-200 rounded w-3/4 mb-1" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div>
              ))}
            </div>
          </div>
        );
      }
      if (productsError) {
        return (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center"><p className="text-sm text-red-600">Failed to load products</p></div>
          </div>
        );
      }
      if (liveProducts.length > 0) {
        return (
          <div className="bg-white border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold">{String(p('title') || 'Featured Products')}</h3><span className="text-xs text-[#1677ff]">View More ›</span></div>
            <div className="grid grid-cols-3 gap-2">
              {liveProducts.map((pr: any) => (
                <div key={pr.id} className="border border-gray-100 p-1">
                  <div className="h-24 bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover" /></div>
                  <p className="text-[11px] font-medium truncate mt-1">{pr.name}</p>
                  <p className="text-xs font-bold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p>
                  <p className="text-[10px] text-gray-500">MOQ {pr.minimum_order_quantity} {pr.unit_type}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: Number(p('limit')) || 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <div className="aspect-square bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center"><Package size={24} className="text-orange-300" /></div>
                <div className="p-2"><div className="h-3 bg-gray-200 rounded w-3/4 mb-1" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'category-cards':
      const categories = (props.categories as unknown as Array<{ name: string; sublabel?: string; imageUrl: string; link: string }>) || [];
      return (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <div key={i} className="relative h-28 overflow-hidden flex p-0" style={{ backgroundColor: String(p('backgroundColor') || '#1677ff') }}>
              {cat.sublabel && <div className="absolute right-0 top-0 bg-white text-[#1677ff] text-[10px] font-bold px-6 py-0.5 rotate-[35deg] translate-x-6 translate-y-3">{cat.sublabel}</div>}
              <div className="flex-1 py-4 pl-4 pr-2 flex flex-col justify-center">
                <span className="text-sm font-bold leading-tight" style={{ color: String(p('textColor') || '#ffffff') }}>{cat.name.split(' ')[0]}<br />{cat.name.split(' ').slice(1).join(' ')}</span>
                <span className="mt-2 inline-block w-fit border border-white/80 rounded px-2 py-0.5 text-[10px] font-semibold text-white">SEE MORE</span>
              </div>
              <div className="w-[46%] flex items-end justify-end pb-2 pr-2">
                <img src={cat.imageUrl || 'https://via.placeholder.com/120x100'} alt={cat.name} className="h-20 w-auto object-contain drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'stats':
      const stats = (props.stats as unknown as Array<{ value: string; label: string; suffix: string }>) || [];
      return (
        <div className="relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=60" alt="factory" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative p-4" style={{ backgroundColor: `${String(p('backgroundColor') || '#0f4fd8')}ee` }}>
            <div className="grid grid-cols-4 gap-4 text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <p className="text-lg font-bold" style={{ color: String(p('textColor') || '#ffffff') }}>{stat.value}{stat.suffix}</p>
                  <p className="text-[10px] opacity-90" style={{ color: String(p('textColor') || '#ffffff') }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'features':
      const features = (props.features as unknown as Array<{ icon: string; title: string; description: string }>) || [];
      return (
        <div className="rounded-lg p-6 bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            {features.map((feat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#ff9900]/10 flex items-center justify-center"><Building size={24} className="text-[#ff9900]" /></div>
                <p className="text-sm font-semibold text-gray-900">{feat.title}</p>
                <p className="text-xs text-gray-500 mt-1">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'company-capacity':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Manufacturer Capability')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Years in Business</p><p className="text-lg font-bold text-gray-900">15+</p></div>
            <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Export %</p><p className="text-lg font-bold text-gray-900">80%</p></div>
            <div className="text-center p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">Factory Size</p><p className="text-lg font-bold text-gray-900">50,000 m²</p></div>
          </div>
        </div>
      );

    case 'certifications':
      const certs = (props.certifications as unknown as Array<{ name: string; description: string }>) || [];
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Certifications')}</h3>
          <div className="flex flex-wrap gap-3">
            {certs.map((cert, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <ShieldCheck size={20} className="text-green-500" />
                <div><p className="text-sm font-semibold text-gray-900">{cert.name}</p><p className="text-xs text-gray-500">{cert.description}</p></div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'company-performance':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Company Performance')}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-xs text-gray-500">Response Time</p><p className="text-lg font-bold text-green-600">{String(p('responseTime') || '< 24 hours')}</p></div>
            <div className="text-center p-3 bg-blue-50 rounded-lg"><p className="text-xs text-gray-500">On-time Delivery</p><p className="text-lg font-bold text-blue-600">{String(p('onTimeDelivery') || '98.5%')}</p></div>
            <div className="text-center p-3 bg-orange-50 rounded-lg"><p className="text-xs text-gray-500">Transaction Level</p><p className="text-lg font-bold text-orange-600">{String(p('transactionLevel') || 'AAA')}</p></div>
          </div>
        </div>
      );

    case 'warehouse-info':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Our Warehouses')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Building size={24} className="mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{String(p('warehouseCount') || '5')}</p>
              <p className="text-xs text-gray-500">Warehouses</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Globe size={24} className="mx-auto text-green-500 mb-2" />
              <p className="text-xs text-gray-500">Locations</p>
              <div className="flex flex-wrap justify-center gap-1 mt-1">
                {(props.locations as string[] || ['USA', 'Europe', 'Asia']).map((loc, i) => (
                  <span key={i} className="text-xs bg-white px-2 py-0.5 rounded text-gray-700">{loc}</span>
                ))}
              </div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Package size={24} className="mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{String(p('totalArea') || '100K')}</p>
              <p className="text-xs text-gray-500">Total Area</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Users size={24} className="mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{String(p('capacity') || '50K+')}</p>
              <p className="text-xs text-gray-500">SKU Capacity</p>
            </div>
          </div>
        </div>
      );

    case 'shipping-info':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Shipping Options')}</h3>
          <div className="space-y-3">
            {(props.shippingMethods as Array<{ name: string; time: string; price: string }> || [
              { name: 'Express', time: '3-5 days', price: '$25+' },
              { name: 'Standard', time: '7-14 days', price: '$15+' },
              { name: 'Economy', time: '15-30 days', price: '$10+' },
            ]).map((method, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">{method.name}</p>
                  <p className="text-xs text-gray-500">{method.time}</p>
                </div>
                <p className="font-bold text-orange-500">{method.price}</p>
              </div>
            ))}
            {p('freeShippingThreshold') && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-green-700">Free shipping on orders over {String(p('freeShippingThreshold'))}</p>
              </div>
            )}
          </div>
        </div>
      );

    case 'trust-badges':
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{String(p('title') || 'Trusted By')}</h3>
          <div className="flex flex-wrap gap-3">
            {(props.badges as Array<{ name: string; icon: string }> || [
              { name: 'Secure Payment', icon: 'lock' },
              { name: 'Verified Supplier', icon: 'check-circle' },
              { name: 'Money Back Guarantee', icon: 'shield' },
              { name: '24/7 Support', icon: 'headphones' },
            ]).map((badge, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <ShieldCheck size={20} className="text-green-500" />
                <span className="text-sm font-medium text-gray-700">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'promo-banner':
      return (
        <div
          className="rounded-lg p-6 text-center"
          style={{ backgroundColor: String(p('backgroundColor') || '#ff5a36') }}
        >
          <h3 className="text-xl font-bold" style={{ color: String(p('textColor') || '#ffffff') }}>{String(p('title') || 'Special Offer')}</h3>
          {p('subtitle') && <p className="text-sm mt-1" style={{ color: String(p('textColor') || '#ffffff') }}>{String(p('subtitle'))}</p>}
          {p('buttonText') && <button className="mt-3 rounded-lg bg-white px-6 py-2 text-sm font-semibold hover:bg-gray-100">{String(p('buttonText'))}</button>}
        </div>
      );

    case 'hot-products':
    case 'new-arrivals':
      if (productsLoading) {
        return (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: Number(p('limit')) || 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden animate-pulse"><div className="aspect-square bg-gray-200" /><div className="p-2"><div className="h-3 bg-gray-200 rounded w-3/4 mb-1" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div>
              ))}
            </div>
          </div>
        );
      }
      if (productsError) {
        return (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center"><p className="text-sm text-red-600">Failed to load products</p></div>
          </div>
        );
      }
      if (liveProducts.length > 0) {
        return (
          <div className="bg-white border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">{String(p('title') || mod.type === 'hot-products' ? 'Hot Products' : 'New Arrivals')}</h3>
              <span className="text-xs text-[#1677ff]">View More ›</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {liveProducts.map((pr: any) => (
                <div key={pr.id} className="border border-gray-100 p-1">
                  <div className="h-24 bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover" /></div>
                  <p className="text-[11px] font-medium truncate mt-1">{pr.name}</p>
                  <p className="text-xs font-bold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p>
                  <p className="text-[10px] text-gray-500">MOQ {pr.minimum_order_quantity} {pr.unit_type}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">{String(p('title') || 'Products')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: Number(p('limit')) || 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <div className="aspect-square bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center"><Package size={24} className="text-orange-300" /></div>
                <div className="p-2"><div className="h-3 bg-gray-200 rounded w-3/4 mb-1" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">{String(p('title') || mod.type)}</p>
        </div>
      );
  }
}

export function StorefrontRenderer({ config }: { config: StorefrontConfig }) {
  const [activeTab, setActiveTab] = useState(config.sections[0]?.id || 'home');
  const activeSection = config.sections.find((s) => s.id === activeTab);

  return (
    <div className="max-w-5xl mx-auto bg-[#f5f7fa] border border-gray-200 rounded-lg overflow-hidden">
      {/* Alibaba Nav - blue bar */}
      <div className="bg-[#1677ff] text-white flex items-center gap-0 px-2 overflow-x-auto">
        {config.sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveTab(section.id)}
            className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 ${activeTab === section.id ? 'bg-white text-[#1677ff] border-white' : 'border-transparent hover:bg-white/10'}`}
          >
            {section.name}
          </button>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-1 bg-white rounded-full px-2 py-1 my-1">
          <span className="text-[10px] text-gray-500">Search in store</span>
        </div>
      </div>

      {/* Shop Sign / Banner */}
      {config.shopSign?.imageUrl && !config.shopSign.hidden && (
        <div className="relative h-36 bg-gray-100 overflow-hidden">
          <img src={config.shopSign.imageUrl} alt={config.shopSign.altText || 'Store Banner'} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="min-h-[400px] bg-[#f5f7fa]">
        {activeSection && activeSection.modules.length === 0 ? (
          <div className="text-center py-12 bg-white m-4 rounded">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No content in this section.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {activeSection?.modules.map((mod) => (
              <ModuleRenderer key={mod.id} mod={mod} storeId={config.storeId} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-[10px] text-gray-500">
        Nzanila Express • Powered by Nzanila Express • Terms & Privacy
      </div>
    </div>
  );
}
