import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowUpRight,
  Camera,
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
};

function pickIcon(name: string) {
  const key = Object.keys(categoryIcons).find((k) => name.toLowerCase().includes(k));
  return categoryIcons[key ?? 'default'] ?? Package;
}

const accentColors = ['bg-[#1a5f4a]', 'bg-[#ce1126]', 'bg-[#fcd116]', 'bg-[#6a9a88]', 'bg-[#9281a9]', 'bg-[#c6a44b]'];

export function HomeHero({
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
  const { tr } = useLocale();
  const [bannerIndex, setBannerIndex] = useState(0);
  const featured = Array.isArray(products) ? products.slice(0, 4) : [];

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => setBannerIndex((i) => (i + 1) % featured.length), 5000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const banner = featured[bannerIndex];

  const trending = [
    { label: tr('trending.earphones'), icon: Headphones, query: 'earphone' },
    { label: tr('trending.electronics'), icon: Smartphone, query: 'electronic' },
    { label: tr('trending.packaging'), icon: Package, query: 'packaging' },
  ];

  return (
    <section className="mb-6">
      {/* Welcome */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#1a5f4a]/8 via-white to-[#ce1126]/5 p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1a5f4a]">
          🇧🇮 {tr('footer.operating')}
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
          {tr('home.welcome')}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
          {tr('home.subtitle')}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/ai-research" className="inline-flex items-center gap-1.5 rounded-full bg-[#1a5f4a] px-4 py-2 text-xs font-bold text-white hover:bg-[#154a3a]">
            <Sparkles size={14} /> {tr('nav.aiResearch')}
          </Link>
          <Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[#ce1126] hover:underline">
            {tr('home.requestQuote')} <ArrowUpRight size={12} />
          </Link>
          <Link href="/products?sort=rating" className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-[#1a5f4a]">
            {tr('home.topRanking')} <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {/* Category chips — horizontal, no sidebar */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-bold text-gray-800">{tr('home.categories')}</p>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {categoriesLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-7 sm:h-9 w-20 sm:w-28 shrink-0" />)
            : (Array.isArray(categories) ? categories : []).slice(0, 10).map((cat) => {
                const Icon = pickIcon(cat.name);
                return (
                  <Link
                    key={cat.id}
                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                    className="flex shrink-0 items-center gap-1 sm:gap-2 rounded-full border border-gray-200 bg-white px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-gray-700 transition-colors hover:border-[#1a5f4a] hover:text-[#1a5f4a]"
                    data-testid={`hero-category-${cat.id}`}
                  >
                    <Icon size={12} className="sm:hidden" />
                    <Icon size={14} className="hidden sm:block" />
                    {cat.name}
                  </Link>
                );
              })}
        </div>
      </div>

      {/* Two-column content — no left sidebar */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_320px]">
        {/* Trending searches */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">{tr('home.frequentSearch')}</p>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {trending.map(({ label, icon: Icon, query }) => (
              <Link
                key={label}
                href={`/products?search=${query}`}
                className="group flex flex-col items-center rounded-lg sm:rounded-xl border border-gray-100 bg-gray-50 p-1.5 sm:p-4 transition-all hover:border-[#1a5f4a]/30 hover:shadow-sm"
              >
                <div className="mb-1 sm:mb-2 grid h-8 w-8 sm:h-14 sm:w-14 place-items-center rounded-lg sm:rounded-2xl bg-white shadow-sm">
                  <Icon size={14} className="text-gray-600 group-hover:text-[#1a5f4a] sm:hidden" />
                  <Icon size={24} className="hidden text-gray-600 group-hover:text-[#1a5f4a] sm:block" />
                </div>
                <span className="text-center text-[9px] sm:text-xs font-bold text-gray-800 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
          <Link
            href="/ai-research"
            className="mt-3 sm:mt-4 flex items-center gap-2 rounded-xl border border-[#1a5f4a]/20 bg-[#1a5f4a]/5 p-2.5 sm:p-3 text-[10px] sm:text-xs font-semibold text-[#1a5f4a] hover:bg-[#1a5f4a]/10"
          >
            <Sparkles size={14} />
            {tr('ai.subtitle').slice(0, 80)}…
            <ArrowUpRight size={12} className="ml-auto" />
          </Link>
        </div>

        {/* Featured banner */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-[#1a5f4a]/10 to-[#fcd116]/10">
          {productsLoading || !banner ? (
            <SkeletonBlock className="min-h-[200px] rounded-none" />
          ) : (
            <>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#1a5f4a]">
                  {tr('home.discoverMakers')}
                </p>
                <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-gray-900">
                  {banner.name}
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  {banner.supplierName} · MOQ {banner.moq}
                </p>
                <Link
                  href={`/products/${banner.id}`}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#ce1126] px-4 py-2 text-xs font-bold text-white hover:bg-[#a80e1e]"
                >
                  {tr('home.viewMore')} <ArrowUpRight size={13} />
                </Link>
              </div>
              {banner.image && (
                <img src={banner.image} alt="" className="absolute bottom-0 right-0 h-20 w-20 object-cover opacity-70" />
              )}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {featured.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-5 bg-[#1a5f4a]' : 'w-1.5 bg-gray-300'}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category grid cards */}
      {categories && categories.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-6">
          {(Array.isArray(categories) ? categories : []).slice(0, 6).map((category, i) => (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.name)}`}
              className="group relative flex min-h-[60px] sm:min-h-[96px] flex-col justify-end overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-white p-2 sm:p-3 transition-all hover:border-[#1a5f4a]/40 hover:shadow-sm"
            >
              <div className={`absolute inset-0 opacity-12 transition-opacity group-hover:opacity-20 ${accentColors[i % accentColors.length]}`} />
              <span className="relative text-[10px] sm:text-xs font-bold text-gray-800">{category.name}</span>
              <span className="relative mt-0.5 text-[8px] sm:text-[10px] text-gray-500">
                {category.count.toLocaleString()} {tr('home.listings')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
