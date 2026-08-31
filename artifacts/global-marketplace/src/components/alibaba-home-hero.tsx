import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowUpRight,
  Camera,
  ChevronRight,
  Headphones,
  Package,
  Shirt,
  Smartphone,
  Sparkles,
  Truck,
  Watch,
  Zap,
} from 'lucide-react';
import { type Category, type Product } from '@workspace/api-client-react';
import { SkeletonBlock } from '@/components/marketplace-shell';
import { useLocale } from '@/lib/i18n/locale-context';

const categoryIcons: Record<string, typeof Package> = {
  default: Package,
  apparel: Shirt,
  electronics: Smartphone,
  jewelry: Watch,
  sports: Zap,
  logistics: Truck,
  shipping: Truck,
};

function pickIcon(name: string) {
  const key = Object.keys(categoryIcons).find((k) => name.toLowerCase().includes(k));
  return categoryIcons[key ?? 'default'] ?? Package;
}

const frequentSearches = [
  { label: 'Earphones', icon: Headphones, query: 'earphone' },
  { label: 'Digital Cameras', icon: Camera, query: 'camera' },
  { label: 'Headphones', icon: Headphones, query: 'headphone' },
];

export function AlibabaHomeHero({
  categories,
  products,
  categoriesLoading,
  productsLoading,
}: {
  categories?: Category[];
  products?: Product[];
  categoriesLoading?: boolean;
  productsLoading?: boolean;
}) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const featured = Array.isArray(products) ? products.slice(0, 4) : [];
  const { tr } = useLocale();

  const frequentSearches = [
    { label: tr('trending.earphones'), icon: Headphones, query: 'earphone' },
    { label: tr('trending.digitalCameras'), icon: Camera, query: 'camera' },
    { label: tr('trending.headphones'), icon: Headphones, query: 'headphone' },
  ];

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => setBannerIndex((i) => (i + 1) % featured.length), 5000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const banner = featured[bannerIndex];

  return (
    <section className="mb-4 bg-white px-4 py-4 lg:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
        <span>{tr('hero.welcome')} <strong className="text-gray-800">Nzanila.com</strong></span>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/products" className="flex items-center gap-1 font-semibold hover:text-[#ff6a00]">
            {tr('hero.requestQuote')} <ArrowUpRight size={12} />
          </Link>
          <Link href="/products?sort=rating" className="flex items-center gap-1 font-semibold hover:text-[#ff6a00]">
            {tr('hero.topRanking')} <ArrowUpRight size={12} />
          </Link>
          <Link href="/suppliers" className="flex items-center gap-1 font-semibold hover:text-[#ff6a00]">
            {tr('hero.fastCustomization')} <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1fr_280px]">
        <div className="rounded border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">{tr('hero.frequentSearch')}</p>
          <div className="grid grid-cols-3 gap-3">
            {frequentSearches.map(({ label, icon: Icon, query }) => (
              <Link
                key={label}
                href={`/products?search=${query}`}
                className="group flex flex-col items-center rounded border border-gray-100 bg-gray-50 p-4 hover:border-[#ff6a00]/30 hover:shadow-sm"
              >
                <div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-white shadow-sm">
                  <Icon size={28} className="text-gray-600 group-hover:text-[#ff6a00]" />
                </div>
                <span className="text-center text-xs font-bold text-gray-800">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded border border-gray-200 bg-gradient-to-br from-[#e8f5e9] to-[#f1f8e9]">
          {productsLoading || !banner ? (
            <SkeletonBlock className="h-full min-h-[220px] rounded-none" />
          ) : (
            <>
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#008744]">{tr('hero.secureTrending')}</p>
                <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-gray-800">{banner.name}</h3>
                <p className="mt-1 text-xs text-gray-600">{banner.supplierName} · MOQ {banner.moq}</p>
                <Link href={`/products/${banner.id}`} className="mt-4 inline-flex items-center gap-1 rounded bg-[#008744] px-4 py-2 text-xs font-bold text-white hover:bg-[#007038]">
                  {tr('home.viewMore')} <ArrowUpRight size={13} />
                </Link>
              </div>
              {banner.image && <img src={banner.image} alt="" className="absolute bottom-0 right-0 h-24 w-24 object-cover opacity-80" />}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {featured.map((_, i) => (
                  <button key={i} onClick={() => setBannerIndex(i)} className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-5 bg-[#008744]' : 'w-1.5 bg-gray-300'}`} aria-label={`Banner ${i + 1}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
