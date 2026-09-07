import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'wouter';
import {
  Package, Video, ShieldCheck, Clock, Users, Building, Globe,
  ChevronDown, LayoutGrid, Search,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'https://nzanila-seller-api.nzanilaexpress.workers.dev';

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

function getVideoSource(url: string) {
  if (url.startsWith('data:video/') || /\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { file: true, url };
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
  return { file: false, url: match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : url };
}

const CATEGORY_LABELS: Record<number, string> = {
  1: 'Food & Groceries', 2: 'Clothing & Shoes', 3: 'Phones & Electronics',
  4: 'Beauty & Personal Care', 5: 'Home & Furniture', 6: 'Building Materials',
  7: 'Agriculture & Farming', 8: 'Vehicles & Spare Parts', 9: 'Books & School Supplies',
  10: 'Services', 11: 'Other', 12: 'Rice & Grains', 13: 'Fruits & Vegetables',
  14: 'Drinks', 15: 'Cooking Ingredients',
};

function productCategory(product: any) {
  return product.category_name || product.custom_category_suggestion || CATEGORY_LABELS[Number(product.category_id)] || 'Other';
}

// The public store products API returns a marketplace-shaped record (`image`,
// `price`, `moq`, `unit`), while Canvas modules historically used the seller
// record names. Normalize once so every Canvas module renders the same data.
export function normalizeStoreProduct(product: any) {
  return {
    ...product,
    primary_image: product.primary_image || product.image || product.primaryImage || '',
    base_price: product.base_price ?? product.price ?? 0,
    minimum_order_quantity: product.minimum_order_quantity ?? product.moq ?? 1,
    unit_type: product.unit_type || product.unit || 'piece',
    category_name: product.category_name || product.category || '',
  };
}

function sortProducts(products: any[], sort: string) {
  const rows = [...products];
  if (sort === 'price-low') return rows.sort((a, b) => Number(a.base_price) - Number(b.base_price));
  if (sort === 'price-high') return rows.sort((a, b) => Number(b.base_price) - Number(a.base_price));
  if (sort === 'name') return rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

function ModuleRenderer({ mod, storeId, categoryFilter = 'all', productSort = 'newest', productSearch = '', onStoreSearch, onTemplateAction }: { mod: StorefrontModule; storeId?: number; categoryFilter?: string; productSort?: string; productSearch?: string; onStoreSearch?: (query: string) => void; onTemplateAction?: (target?: string, label?: string) => void }) {
  const props = mod.props as Record<string, string | number | boolean | null | undefined>;
  const p = (key: string) => props[key];
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const slideshowItems = ((props.slides as unknown as Array<{ headline?: string; subheadline?: string; title?: string; subtitle?: string; imageUrl?: string; ctaLabel?: string; buttonText?: string; ctaLink?: string; buttonUrl?: string; link?: string }>) || []).map(slide => ({
    ...slide,
    headline: slide.headline || slide.title,
    subheadline: slide.subheadline || slide.subtitle,
    ctaLabel: slide.ctaLabel || slide.buttonText,
    ctaLink: slide.ctaLink || slide.buttonUrl || slide.link,
  }));
  const actionTarget = (...keys: string[]) => {
    for (const key of keys) {
      const value = p(key);
      if (typeof value === 'string' && value.trim() && value.trim() !== '#' && !value.trim().toLowerCase().startsWith('javascript:')) return value.trim();
    }
    return '';
  };

  useEffect(() => {
    if (!['slideshow', 'hero-slideshow'].includes(mod.type) || (!props.autoplay && !props.autoplaySeconds) || slideshowItems.length < 2) return;
    const timer = window.setInterval(() => setSlideIndex(i => (i + 1) % slideshowItems.length), Math.max(2000, Number(props.interval) || Number(props.autoplaySeconds) * 1000 || 5000));
    return () => window.clearInterval(timer);
  }, [mod.type, props.autoplay, props.autoplaySeconds, props.interval, slideshowItems.length]);

  useEffect(() => {
    if (!storeId) return;
    if (!['recommended-products', 'product-category', 'double-row-products', 'hot-products', 'new-arrivals', 'trending-now'].includes(mod.type)) return;
    let cancelled = false;
    setProductsLoading(true);
    setProductsLoaded(false);
    setProductsError(null);
    fetch(`${API}/api/stores/${storeId}/products`)
      .then(r => { if (!r.ok) throw new Error(`Products API returned ${r.status}`); return r.json(); })
      .then(d => {
        if (cancelled) return;
        if (Array.isArray(d)) {
          const normalizedProducts = d.map(normalizeStoreProduct);
          const categoryFiltered = categoryFilter === 'all' ? normalizedProducts : normalizedProducts.filter(product => productCategory(product) === categoryFilter);
          const query = productSearch.trim().toLowerCase().replace(/s$/, '');
          const filtered = query
            ? categoryFiltered.filter(product => `${product.name || ''} ${product.description || ''} ${productCategory(product)}`.toLowerCase().replace(/s\b/g, '').includes(query))
            : categoryFiltered;
          setLiveProducts(sortProducts(filtered, productSort).slice(0, Number(p('limit')) || Number((props as any).productCount) || 9));
        }
        else setProductsError('Invalid response format');
      })
      .catch(e => { if (!cancelled) setProductsError(e.message || 'Failed to load products'); })
      .finally(() => { if (!cancelled) { setProductsLoading(false); setProductsLoaded(true); } });
    return () => { cancelled = true; };
  }, [storeId, mod.type, props.limit, (props as any).productCount, categoryFilter, productSort, productSearch]);

  const isProductModule = ['recommended-products', 'product-category', 'double-row-products', 'hot-products', 'new-arrivals', 'trending-now'].includes(mod.type);
  if (isProductModule && productsLoaded && !productsError && liveProducts.length === 0) {
    if (mod.type === 'trending-now') return null;
    return <div className="flex min-h-[440px] w-full flex-col items-center justify-center bg-white p-8 text-center"><Package size={40} className="text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-600">No products match this filter.</p><p className="mt-1 text-xs text-gray-400">Try another category or search term.</p></div>;
  }

  switch (mod.type) {
    case 'slideshow':
    case 'hero-slideshow': {
      const slide = slideshowItems[slideIndex] || slideshowItems[0];
      return <div className="relative h-64 overflow-hidden bg-[#131921] text-white sm:h-80">
        {slide?.imageUrl && <img src={slide.imageUrl} alt={slide.headline || 'Store promotion'} className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
        <div className="relative flex h-full max-w-xl flex-col justify-center px-7 sm:px-12"><h2 className="text-3xl font-bold sm:text-4xl">{slide?.headline}</h2><p className="mt-2 text-base text-white/90">{slide?.subheadline}</p>{slide?.ctaLabel && <button type="button" onClick={() => onTemplateAction?.(slide.ctaLink, slide.ctaLabel)} className="mt-5 w-fit rounded bg-[#ff9900] px-5 py-2 text-sm font-bold text-[#131921] hover:bg-[#ffad2f]">{slide.ctaLabel}</button>}</div>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">{slideshowItems.map((_, i) => <button key={i} aria-label={`Show slide ${i + 1}`} onClick={() => setSlideIndex(i)} className={`h-2 rounded-full ${i === slideIndex ? 'w-7 bg-white' : 'w-2 bg-white/50'}`} />)}</div>
      </div>;
    }

    case 'shop-now-banner':
      return <div className="relative overflow-hidden px-8 py-14 sm:px-12" style={{ minHeight: Number(p('height')) || 250, backgroundColor: String(p('backgroundColor') || '#febd69'), color: String(p('textColor') || '#131921') }}>{p('imageUrl') && <img src={String(p('imageUrl'))} alt="" className="absolute inset-0 h-full w-full object-cover" />}<div className="absolute inset-0 bg-white/30" style={{ opacity: Number(p('overlayOpacity')) || .3 }} /><div className="relative max-w-lg"><h3 className="text-3xl font-bold">{String(p('title') || '')}</h3><p className="mt-2">{String(p('subtitle') || '')}</p><button type="button" onClick={() => onTemplateAction?.(actionTarget('buttonUrl', 'buttonLink', 'ctaLink', 'link'), String(p('buttonText') || 'Shop Now'))} className="mt-5 inline-block rounded px-5 py-2 text-sm font-bold hover:brightness-105" style={{ backgroundColor: String(p('buttonColor') || '#ff9900') }}>{String(p('buttonText') || 'Shop Now')}</button></div></div>;

    case 'product-comparison': {
      const features = (props.features as unknown as string[]) || [];
      const items = (props.products as unknown as Array<{ name: string; values: string[] }>) || [];
      return <div className="overflow-x-auto bg-white p-6"><h3 className="mb-4 text-xl font-bold">{String(p('title') || 'Compare Products')}</h3><table className="w-full min-w-[600px] border-collapse text-sm"><thead><tr><th className="border bg-gray-50 p-3 text-left">Feature</th>{items.map((item, i) => <th key={i} className="border p-3 text-left">{item.name}</th>)}</tr></thead><tbody>{features.map((feature, row) => <tr key={feature}><td className="border bg-gray-50 p-3 font-semibold">{feature}</td>{items.map((item, col) => <td key={col} className="border p-3">{item.values?.[row] || '—'}</td>)}</tr>)}</tbody></table></div>;
    }

    case 'seasonal-sale':
      return <div className="p-8 text-center" style={{ backgroundColor: String(p('backgroundColor') || '#cc0c39'), color: String(p('textColor') || '#fff') }}><p className="text-sm font-bold uppercase tracking-widest">{String(p('discount') || '')} off</p><h3 className="mt-2 text-3xl font-black">{String(p('title') || 'Seasonal Sale')}</h3><p className="mt-2">{String(p('subtitle') || '')}</p><button type="button" onClick={() => onTemplateAction?.(actionTarget('buttonUrl', 'buttonLink', 'ctaLink', 'link'), String(p('buttonText') || 'Shop Sale'))} className="mt-5 inline-block rounded bg-white px-5 py-2 text-sm font-bold text-gray-900 hover:bg-gray-100">{String(p('buttonText') || 'Shop Sale')}</button></div>;

    case 'trending-now': {
      if (productsLoading || productsError || !liveProducts.length) return null;
      return <div className="bg-white p-6"><h3 className="text-xl font-bold">Store picks</h3><p className="mt-1 text-sm text-gray-500">Products available from this supplier</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{liveProducts.slice(0, 4).map((product: any) => <Link href={`/products/${product.id}`} key={product.id} className="group relative rounded border p-3 text-left hover:border-[#ff6a00] hover:shadow-md"><div className="aspect-square overflow-hidden bg-gray-100">{product.primary_image && <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />}</div><p className="mt-2 line-clamp-2 text-sm font-semibold">{product.name}</p><p className="text-sm font-bold text-[#b12704]">{Number(product.base_price).toLocaleString()} BIF</p><p className="mt-1 text-[10px] text-gray-500">MOQ {product.minimum_order_quantity} {product.unit_type}</p></Link>)}</div></div>;
    }

    case 'hero':
      return (
        <div className="relative h-44 overflow-hidden bg-black flex">
          <div className="flex-1 flex flex-col justify-center px-6 bg-black text-white">
            {p('brand') && <p className="text-xs font-bold tracking-widest text-white mb-1">{String(p('brand'))}</p>}
            <h3 className="text-lg font-bold leading-tight">{String(p('title') || 'Hero Banner')}</h3>
            {p('subtitle') && <p className="text-[11px] text-gray-300 mt-1">{String(p('subtitle'))}</p>}
            {p('buttonText') ? <button type="button" onClick={() => onTemplateAction?.(actionTarget('buttonUrl', 'buttonLink', 'ctaLink', 'link'), String(p('buttonText')))} className="mt-2 inline-block w-fit rounded bg-[#ff9900] px-3 py-1 text-xs font-semibold text-white hover:bg-[#ffad2f]">{String(p('buttonText'))}</button> : null}
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

    case 'image-grid': {
      const images = (props.images as unknown as Array<string | { imageUrl?: string; url?: string; altText?: string; title?: string; link?: string }>) || [];
      const columns = Math.min(4, Math.max(2, Number(p('columns')) || 3));
      return <section className="bg-white p-4"><h3 className="mb-3 text-base font-bold">{String(p('title') || 'Gallery')}</h3><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{images.map((item, i) => { const image = typeof item === 'string' ? { imageUrl: item } : item; return <button type="button" key={i} onClick={() => onTemplateAction?.(image.link, image.title)} className="aspect-square overflow-hidden rounded border bg-gray-100"><img src={image.imageUrl || image.url || ''} alt={image.altText || image.title || `Gallery image ${i + 1}`} className="h-full w-full object-cover transition hover:scale-105" /></button>; })}</div></section>;
    }

    case 'video-grid': {
      const videos = (props.videos as unknown as Array<string | { videoUrl?: string; url?: string; title?: string }>) || [];
      return <section className="bg-white p-4"><h3 className="mb-3 text-base font-bold">{String(p('title') || 'Videos')}</h3><div className="grid gap-3 sm:grid-cols-2">{videos.map((item, i) => { const entry = typeof item === 'string' ? { videoUrl: item } : item; const source = getVideoSource(entry.videoUrl || entry.url || ''); return <div key={i} className="aspect-video overflow-hidden rounded bg-black">{source.file ? <video src={source.url} controls playsInline className="h-full w-full object-contain" /> : <iframe src={source.url} title={entry.title || `Store video ${i + 1}`} className="h-full w-full" allowFullScreen />}</div>; })}</div></section>;
    }

    case 'page-background':
    case 'store-sign':
      return null;

    case 'marketing':
      return (
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: String(p('backgroundColor') || '#fff3f0') }}>
          <h3 className="text-lg font-bold" style={{ color: String(p('textColor') || '#ff5a36') }}>{String(p('title') || 'Marketing Section')}</h3>
          {p('description') && <p className="text-sm text-gray-700 mt-1">{String(p('description'))}</p>}
          {p('buttonText') && <button type="button" onClick={() => onTemplateAction?.(actionTarget('buttonUrl', 'buttonLink', 'ctaLink', 'link'), String(p('buttonText')))} className="mt-3 inline-block rounded-lg bg-[#ff9900] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e88b00]">{String(p('buttonText'))}</button>}
        </div>
      );

    case 'video':
      const video = getVideoSource(String(p('videoUrl') || ''));
      return (
        <div className="mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-black/10 flex items-center justify-center">
          {p('videoUrl') ? (
            video.file ? <video src={video.url} controls playsInline className="h-full w-full rounded-lg bg-black object-contain" /> : <iframe src={video.url} title={String(p('title') || 'Store video')} className="h-full w-full rounded-lg" allowFullScreen />
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {liveProducts.slice(0, Number(p('productCount')) || 6).map((pr: any) => (
                <Link href={`/products/${pr.id}`} key={pr.id} className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff6a00]/50 hover:shadow-md"><div className="aspect-square bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover transition group-hover:scale-105" /></div><div className="p-3"><p className="line-clamp-2 min-h-8 text-xs font-semibold text-gray-900">{pr.name}</p><p className="mt-1 text-sm font-extrabold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p><p className="mt-1 text-[10px] text-gray-500">MOQ {pr.minimum_order_quantity} {pr.unit_type}</p><span className="mt-2 block rounded bg-[#ff6a00] px-2 py-1.5 text-center text-[10px] font-bold text-white">View product</span></div></Link>
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
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold">{String(p('title') || 'Featured Products')}</h3><button type="button" onClick={() => onTemplateAction?.('/products', 'View products')} className="text-xs text-[#1677ff] hover:underline">View More ›</button></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {liveProducts.map((pr: any) => (
                <Link href={`/products/${pr.id}`} key={pr.id} className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff6a00]/50 hover:shadow-md">
                  <div className="aspect-square bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover transition group-hover:scale-105" /></div>
                  <div className="p-3"><p className="line-clamp-2 min-h-8 text-xs font-semibold text-gray-900">{pr.name}</p><p className="mt-1 text-sm font-extrabold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p><p className="mt-1 text-[10px] text-gray-500">MOQ {pr.minimum_order_quantity} {pr.unit_type}</p><span className="mt-2 block rounded bg-[#ff6a00] px-2 py-1.5 text-center text-[10px] font-bold text-white">View product</span></div>
                </Link>
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
            <button type="button" onClick={() => onStoreSearch?.(cat.name)} key={i} className="relative h-28 overflow-hidden flex p-0 text-left hover:brightness-105" style={{ backgroundColor: String(p('backgroundColor') || '#1677ff') }}>
              {cat.sublabel && <div className="absolute right-0 top-0 bg-white text-[#1677ff] text-[10px] font-bold px-6 py-0.5 rotate-[35deg] translate-x-6 translate-y-3">{cat.sublabel}</div>}
              <div className="flex-1 py-4 pl-4 pr-2 flex flex-col justify-center">
                <span className="text-sm font-bold leading-tight" style={{ color: String(p('textColor') || '#ffffff') }}>{cat.name.split(' ')[0]}<br />{cat.name.split(' ').slice(1).join(' ')}</span>
                <span className="mt-2 inline-block w-fit border border-white/80 rounded px-2 py-0.5 text-[10px] font-semibold text-white">SEE MORE</span>
              </div>
              <div className="w-[46%] flex items-end justify-end pb-2 pr-2">
                <img src={cat.imageUrl || 'https://via.placeholder.com/120x100'} alt={cat.name} className="h-20 w-auto object-contain drop-shadow" />
              </div>
            </button>
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
          {p('buttonText') && <button type="button" onClick={() => onTemplateAction?.(actionTarget('buttonUrl', 'buttonLink', 'ctaLink', 'link'), String(p('buttonText')))} className="mt-3 inline-block rounded-lg bg-white px-6 py-2 text-sm font-semibold hover:bg-gray-100">{String(p('buttonText'))}</button>}
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
              <h3 className="text-sm font-bold">{String(p('title') || (mod.type === 'hot-products' ? 'Hot Products' : 'New Arrivals'))}</h3>
              <button type="button" onClick={() => onTemplateAction?.('/products', 'View products')} className="text-xs text-[#1677ff] hover:underline">View More ›</button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {liveProducts.map((pr: any) => (
                <Link href={`/products/${pr.id}`} key={pr.id} className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff6a00]/50 hover:shadow-md">
                  <div className="aspect-square bg-gray-100 overflow-hidden"><img src={pr.primary_image || ''} alt={pr.name} className="h-full w-full object-cover transition group-hover:scale-105" /></div>
                  <div className="p-3"><p className="line-clamp-2 min-h-8 text-xs font-semibold text-gray-900">{pr.name}</p><p className="mt-1 text-sm font-extrabold text-[#ff5a36]">{Number(pr.base_price).toLocaleString()} BIF</p><p className="mt-1 text-[10px] text-gray-500">MOQ {pr.minimum_order_quantity} {pr.unit_type}</p><span className="mt-2 block rounded bg-[#ff6a00] px-2 py-1.5 text-center text-[10px] font-bold text-white">View product</span></div>
                </Link>
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
  const [storeSearch, setStoreSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [productSort, setProductSort] = useState('newest');
  const activeSection = config.sections.find((s) => s.id === activeTab);
  const productSection = config.sections.find(section => /product|shop/i.test(`${section.id} ${section.name} ${section.slug}`));
  const categoryCounts = storeProducts.reduce<Record<string, number>>((counts, product) => {
    const category = productCategory(product);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const visibleCategories = Object.entries(categoryCounts).sort((a, b) => a[0].localeCompare(b[0]));

  useEffect(() => {
    fetch(`${API}/api/stores/${config.storeId}/products`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`Products API returned ${response.status}`)))
      .then(data => setStoreProducts(Array.isArray(data) ? data.map(normalizeStoreProduct) : []))
      .catch(() => setStoreProducts([]));
  }, [config.storeId]);

  const chooseCategory = (category: string) => {
    setSelectedCategory(category);
    setAppliedSearch('');
    setStoreSearch('');
    if (productSection) setActiveTab(productSection.id);
  };

  const searchThisStore = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSelectedCategory('all');
    setAppliedSearch(storeSearch.trim());
    if (productSection) setActiveTab(productSection.id);
  };

  const applyStoreSearch = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase().replace(/s$/, '');
    const hasMatch = storeProducts.some(product => `${product.name || ''} ${product.description || ''} ${productCategory(product)}`.toLowerCase().replace(/s\b/g, '').includes(normalizedQuery));
    setSelectedCategory('all');
    setStoreSearch(hasMatch ? query : '');
    setAppliedSearch(hasMatch ? query : '');
    if (productSection) setActiveTab(productSection.id);
  };

  const handleTemplateAction = (target = '', label = '') => {
    const value = target.trim();
    if (/^(https?:|mailto:|tel:)/i.test(value)) {
      window.location.assign(value);
      return;
    }
    const normalized = value.toLowerCase().replace(/\/$/, '');
    const contactSection = config.sections.find(section => /contact/i.test(`${section.id} ${section.name} ${section.slug}`));
    const companySection = config.sections.find(section => /company|about|profile/i.test(`${section.id} ${section.name} ${section.slug}`));
    if (/^(#?\/?contacts?|#contact)$/.test(normalized)) {
      if (contactSection) setActiveTab(contactSection.id);
      else window.location.assign(`/messages?store=${config.storeId}`);
      return;
    }
    if (/^(#about|\/?about|\/?company(?:-profile)?)$/.test(normalized) && companySection) {
      setActiveTab(companySection.id);
      return;
    }
    if (['/cart', '/messages', '/orders', '/auth', '/onboarding', '/suppliers', '/ai-research'].includes(normalized)) {
      window.location.assign(normalized);
      return;
    }
    const categoryHint = normalized.match(/^\/(?:category\/)?([^/?#]+)$/)?.[1];
    const genericProductAction = !value || value === '#' || ['/products', '/shop', '/sale', '#products'].includes(normalized);
    if (genericProductAction) chooseCategory('all');
    else applyStoreSearch(label || (categoryHint ? decodeURIComponent(categoryHint).replace(/-/g, ' ') : value));
  };

  const matchingProductCount = storeProducts.filter(product => {
    const categoryMatches = selectedCategory === 'all' || productCategory(product) === selectedCategory;
    const query = appliedSearch.toLowerCase();
    const searchMatches = !query || `${product.name || ''} ${product.description || ''} ${productCategory(product)}`.toLowerCase().includes(query);
    return categoryMatches && searchMatches;
  }).length;
  const filteredStoreProducts = sortProducts(storeProducts.filter(product => {
    const categoryMatches = selectedCategory === 'all' || productCategory(product) === selectedCategory;
    const query = appliedSearch.toLowerCase().replace(/s$/, '');
    const searchable = `${product.name || ''} ${product.description || ''} ${productCategory(product)}`.toLowerCase().replace(/s\b/g, '');
    return categoryMatches && (!query || searchable.includes(query));
  }), productSort);
  const activeHasProductModule = activeSection?.modules.some(mod => ['recommended-products', 'product-category', 'double-row-products', 'hot-products', 'new-arrivals', 'trending-now'].includes(mod.type));

  return (
    <div className="mx-auto flex min-h-[760px] w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-[#f5f7fa]">
      {/* Alibaba Nav - blue bar */}
      <div className="relative z-20 flex min-h-11 items-center gap-2 border-b border-[#075fca] bg-[#1677ff] px-2 text-white shadow-sm">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {config.sections.map((section) => {
          const isProducts = section.id === productSection?.id;
          return <div key={section.id} className="group relative shrink-0">
            <button
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-1 whitespace-nowrap border-b-2 px-4 py-2 text-xs font-medium ${activeTab === section.id ? 'border-white bg-white text-[#1677ff]' : 'border-transparent hover:bg-white/10'}`}
            >
              {section.name}{isProducts && <ChevronDown size={12} />}
            </button>
            {isProducts && (
              <div className="invisible absolute left-0 top-full z-50 w-56 translate-y-1 rounded-b-lg border border-gray-200 bg-white py-2 text-gray-800 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <button onClick={() => setActiveTab(section.id)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold hover:bg-orange-50 hover:text-[#ff6a00]"><LayoutGrid size={14} /> All store products</button>
                {visibleCategories.map(([category, count]) => <button key={category} onClick={() => chooseCategory(category)} className="flex w-full items-center justify-between px-4 py-2 text-left text-xs hover:bg-orange-50 hover:text-[#ff6a00]"><span>{category}</span><span className="text-gray-400">{count}</span></button>)}
                <Link href="/products" className="mx-3 mt-1 block rounded bg-[#ff6a00] px-3 py-2 text-center text-xs font-bold text-white hover:bg-[#e85f00]">Shop marketplace</Link>
              </div>
            )}
          </div>;
        })}
        </div>
        <form onSubmit={searchThisStore} className="ml-auto hidden h-8 w-48 shrink-0 items-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm sm:flex">
          <input name="search" value={storeSearch} onChange={(event) => setStoreSearch(event.target.value)} aria-label="Search in store" placeholder="Search in this store" className="min-w-0 flex-1 px-3 text-[11px] text-gray-700 outline-none" />
          <button type="submit" aria-label="Search" className="flex h-full w-8 shrink-0 items-center justify-center text-[#1677ff] hover:bg-blue-50"><Search size={15} /></button>
        </form>
      </div>

      {/* Shop Sign / Banner */}
      {config.shopSign?.imageUrl && !config.shopSign.hidden && (
        <div className="relative h-36 bg-gray-100 overflow-hidden">
          <img src={config.shopSign.imageUrl} alt={config.shopSign.altText || 'Store Banner'} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="flex min-h-[650px] flex-1 bg-[#f5f7fa]">
        <aside className="sticky top-16 hidden h-fit max-h-[calc(100vh-72px)] w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-[#f4f5f6] p-3 lg:block xl:w-64">
          <button type="button" onClick={() => chooseCategory('all')} className="mb-2 flex w-full items-center gap-2 bg-[#e8f0f7] px-2.5 py-2 text-left text-xs font-medium text-[#3f4d5a] hover:bg-[#dceaf5]"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8eafd0] text-white"><LayoutGrid size={12} /></span> Top picks</button>
          <div className="border border-[#cbd8e5] bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 text-sm font-bold text-gray-900">Product categories</div>
            <div className="px-3 py-3">
              <button onClick={() => chooseCategory('all')} className={`w-full truncate rounded px-2 py-2 text-left text-xs hover:bg-[#f5f8fb] hover:text-[#ff6a00] ${selectedCategory === 'all' ? 'bg-orange-50 font-bold text-[#ff6a00]' : 'text-gray-700'}`}>All products <span className="text-gray-400">({storeProducts.length})</span></button>
              {visibleCategories.map(([category, count]) => <button title={category} key={category} onClick={() => chooseCategory(category)} className={`flex min-h-9 w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs hover:bg-[#f5f8fb] hover:text-[#ff6a00] ${selectedCategory === category ? 'bg-orange-50 font-bold text-[#ff6a00]' : 'text-gray-600'}`}><span className="truncate">{category}</span><span className="shrink-0 text-gray-400">{count}</span></button>)}
              {visibleCategories.length === 0 && <p className="px-2 py-2 text-xs text-gray-400">No categories yet.</p>}
            </div>
          </div>
          {storeProducts.length > 0 && <div className="mt-3 border border-[#cbd8e5] bg-white p-1 shadow-sm">{storeProducts.slice(0, 4).map(product => <Link href={`/products/${product.id}`} key={product.id} className="flex gap-2 border-b border-gray-100 p-1.5 last:border-0 hover:bg-orange-50"><div className="h-12 w-12 shrink-0 overflow-hidden border border-gray-100 bg-gray-100"><img src={product.primary_image || ''} alt={product.name} className="h-full w-full object-cover" /></div><div className="min-w-0"><p className="line-clamp-2 text-[9px] leading-tight text-gray-700">{product.name}</p><p className="mt-1 truncate text-[9px] font-bold text-[#b12704]">{Number(product.base_price).toLocaleString()} BIF</p><p className="truncate text-[8px] text-gray-400">Min. order {product.minimum_order_quantity}</p></div></Link>)}</div>}
        </aside>
        <main className="min-h-[650px] min-w-0 flex-1">
        {storeProducts.length > 0 && (
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-[#fafafa] px-4 py-2">
            <p className="text-xs font-semibold text-gray-700">{appliedSearch ? `Results for “${appliedSearch}” (${matchingProductCount})` : selectedCategory === 'all' ? `All products (${storeProducts.length})` : `${selectedCategory} (${categoryCounts[selectedCategory] || 0})`}</p>
            <label className="flex items-center gap-2 text-[10px] font-medium text-gray-500"><span className="hidden sm:inline">Sort by</span><select value={productSort} onChange={event => setProductSort(event.target.value)} className="h-8 min-w-36 rounded border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm outline-none focus:border-[#1677ff] focus:ring-1 focus:ring-[#1677ff]" aria-label="Sort store products">
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select></label>
          </div>
        )}
        {activeSection && activeSection.modules.length === 0 ? (
          <div className="m-4 flex min-h-[440px] w-[calc(100%-2rem)] flex-col items-center justify-center rounded bg-white px-6 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No content in this section.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {activeSection?.modules.map((mod) => (
              <ModuleRenderer key={mod.id} mod={mod} storeId={config.storeId} categoryFilter={selectedCategory} productSort={productSort} productSearch={appliedSearch} onStoreSearch={applyStoreSearch} onTemplateAction={handleTemplateAction} />
            ))}
            {activeSection?.id === productSection?.id && !activeHasProductModule && (
              <div className="bg-white p-4">
                {filteredStoreProducts.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredStoreProducts.map(product => <Link href={`/products/${product.id}`} key={product.id} className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff6a00]/50 hover:shadow-md"><div className="aspect-square overflow-hidden bg-gray-100"><img src={product.primary_image || ''} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" /></div><div className="p-3"><p className="line-clamp-2 min-h-8 text-xs font-semibold text-gray-900">{product.name}</p><p className="mt-1 text-sm font-extrabold text-[#ff5a36]">{Number(product.base_price).toLocaleString()} BIF</p><p className="mt-1 text-[10px] text-gray-500">MOQ {product.minimum_order_quantity} {product.unit_type}</p><span className="mt-2 block rounded bg-[#ff6a00] px-2 py-1.5 text-center text-[10px] font-bold text-white">View product</span></div></Link>)}
                </div> : <div className="flex min-h-[440px] w-full flex-col items-center justify-center text-center"><Package size={40} className="text-gray-300" /><p className="mt-3 text-sm font-semibold text-gray-600">No products match this search.</p></div>}
              </div>
            )}
          </div>
        )}
        </main>
      </div>

    </div>
  );
}
