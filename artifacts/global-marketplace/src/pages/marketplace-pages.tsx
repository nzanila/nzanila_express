import { BuyerWorkspace } from '@/components/buyer-workspace';
import { useMemo, useState, useEffect, useRef, useCallback, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  DollarSign,
  Layers3,
  MapPin,
  MessageSquare,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  getGetCartQueryKey,
  getGetProductQueryKey,
  getGetSupplierDashboardQueryKey,
  getListMySupplierProductsQueryKey,
  getListOrdersQueryKey,
  getListSupplierOrdersQueryKey,
  getListSuppliersQueryKey,
  useAddCartItem,
  useCreateOrder,
  useCreateSupplierProduct,
  useGetCart,
  useGetProduct,
  useGetSupplierDashboard,
  useListCategories,
  useListMySupplierProducts,
  useListOrders,
  useListProducts,
  useListSupplierOrders,
  useListSuppliers,
  useRemoveCartItem,
  useUpdateCartItem,
  useUpdateOrderStatus,
  useUpdateSupplierOrderStatus,
  useUpdateSupplierProduct,
  type Order,
  type OrderStatusUpdateStatus,
  type Product,
  type Supplier,
} from '@workspace/api-client-react';
import {
  AppShell,
  ErrorState,
  PageIntro,
  SectionHeading,
  SkeletonBlock,
} from '@/components/marketplace-shell';
import { useLocale } from '@/lib/i18n/locale-context';
import { readSearchHistory, recordSearch, clearSearchHistory } from '@/lib/search-history';
import { LocationSearchPicker, type LocationData } from '@/components/location-search-picker';

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'BIF',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);
const directionsFor = (product: Product) => {
  const supplied = String((product as Product & { storeDirections?: string }).storeDirections || '').trim();
  if (/^https?:\/\//i.test(supplied)) return supplied;
  const location = String((product as Product & { storeLocation?: string }).storeLocation || product.supplierName || '').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
};
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const SEARCH_STOP_WORDS = new Set('a an and for i in me of please the to want with find show looking need'.split(' '));
const SEARCH_SYNONYMS: Record<string, string[]> = {
  phone: ['mobile', 'smartphone', 'telephone', 'telephone'], mobile: ['phone', 'smartphone'],
  laptop: ['computer', 'notebook', 'pc'], computer: ['laptop', 'notebook', 'pc'],
  shoe: ['shoes', 'footwear', 'sneaker', 'sandal', 'viatu', 'inkweto'], shoes: ['shoe', 'footwear', 'sneaker', 'sandal', 'viatu', 'inkweto'],
  shirt: ['clothing', 'apparel', 'tee', 'top', 'chemise'], clothing: ['apparel', 'garment', 'shirt', 'clothes'],
  rice: ['grain', 'cereal', 'umuceri', 'mpunga', 'riz'], grain: ['rice', 'cereal'],
  bag: ['bags', 'luggage', 'backpack', 'suitcase'], bags: ['bag', 'luggage', 'backpack'],
  water: ['drink', 'beverage', 'amazi', 'maji', 'eau'], drink: ['beverage', 'water'],
  watch: ['watches', 'timepiece', 'montre', 'isaha', 'saa'], watches: ['watch', 'timepiece'],
};
const normalizeSearch = (value: unknown) => String(value || '').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const searchTokens = (value: string) => normalizeSearch(value).split(/\s+/).filter(token => token.length > 0 && !SEARCH_STOP_WORDS.has(token));
const expandedSearchTokens = (value: string) => [...new Set(searchTokens(value).flatMap(token => [token, ...(SEARCH_SYNONYMS[token] || [])]))];
const editSimilarity = (left: string, right: string) => {
  if (left === right) return 1;
  if (!left || !right) return 0;
  if (left.includes(right) || right.includes(left)) return Math.min(left.length, right.length) / Math.max(left.length, right.length) * 0.92 + 0.08;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    let diagonal = previous[0]; previous[0] = row;
    for (let column = 1; column <= right.length; column++) {
      const saved = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (left[row - 1] === right[column - 1] ? 0 : 1));
      diagonal = saved;
    }
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
};
const ngrams = (value: string, size = 3) => {
  const normalized = normalizeSearch(value).replace(/\s+/g, ' ');
  if (normalized.length <= size) return new Set([normalized]);
  return new Set(Array.from({ length: normalized.length - size + 1 }, (_, index) => normalized.slice(index, index + size)));
};
const ngramSimilarity = (left: string, right: string) => {
  const a = ngrams(left);
  const b = ngrams(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  a.forEach(gram => { if (b.has(gram)) shared += 1; });
  return (2 * shared) / (a.size + b.size);
};
const manualMatchScore = (query: string, product: Product) => {
  const tokens = expandedSearchTokens(query);
  const originalTokens = searchTokens(query);
  const fields = [normalizeSearch(product.name), normalizeSearch(product.category), normalizeSearch(product.description), normalizeSearch(product.supplierName)];
  const fieldWeights = [1, 0.82, 0.58, 0.38];
  const fieldWords = fields.map(field => field.split(' ').filter(Boolean));
  const phrase = normalizeSearch(query);
  const phraseBoost = fields[0].includes(phrase) ? 1.2 : fields.some(field => field.includes(phrase)) ? 0.35 : 0;
  const tokenScore = tokens.reduce((total, token) => {
    const best = fieldWords.reduce((score, words, index) => {
      const similarity = Math.max(...words.map(word => {
        if (token.length === 1) return word.startsWith(token) ? 0.7 : word.includes(token) ? 0.45 : 0;
        return Math.max(editSimilarity(token, word), ngramSimilarity(token, word) * 0.96);
      }), 0);
      return Math.max(score, similarity * fieldWeights[index]);
    }, 0);
    const threshold = token.length === 1 ? 0.35 : token.length === 2 ? 0.58 : 0.52;
    return total + (best >= threshold ? best : 0);
  }, 0);
  const coverage = originalTokens.length ? originalTokens.reduce((count, token) => {
    const matched = tokens.some(candidate => candidate === token && fieldWords.some(words => words.some(word => editSimilarity(token, word) >= (token.length < 3 ? 0.7 : 0.72))));
    return count + (matched ? 1 : 0);
  }, 0) / originalTokens.length : 0;
  const popularity = Math.min(0.12, ((Number(product.rating) || 0) / 5) * 0.06 + ((Number((product as Product & { totalSales?: number }).totalSales) || 0) > 0 ? 0.06 : 0));
  return tokenScore + phraseBoost + coverage * 0.35 + popularity;
};

function soldCount(product: Product): number | null {
  const totalSales = (product as Product & { totalSales?: number }).totalSales;
  return typeof totalSales === 'number' && totalSales > 0 ? totalSales : null;
}

import { ProductCard as SellerProductCard, ProductCardGrid } from '@/components/product-card';
import { SellerWorkspace } from '@/components/seller-workspace';

function ProductImage({
  product,
  image,
  className = '',
}: {
  product: Product;
  image?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [image]);
  const imageSource = image || product.image;
  return (
    <div className={`relative overflow-hidden rounded-xl bg-secondary ${className}`}>
      {!broken && imageSource ? (
        <img
          src={imageSource}
          alt={product.name}
          className="h-full w-full rounded-[inherit] object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/10 to-secondary">
          <PackageCheck size={36} className="text-primary/40" />
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [added, setAdded] = useState(false);
  const add = useAddCartItem();
  const { tr } = useLocale();
  const addToCart = () =>
    add.mutate(
      {
        data: { productId: product.id, quantity: Math.max(product.moq, 1) },
      },
      {
        onSuccess: () => {
          setAdded(true);
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          setTimeout(() => setAdded(false), 1800);
        },
      }
    );
  const sold = soldCount(product);
  const priceHigh = product.compareAtPrice && product.compareAtPrice > product.price ? product.compareAtPrice : null;
  const discount = priceHigh ? Math.round(((priceHigh - product.price) / priceHigh) * 100) : 0;

  return (
    <article
      className="group relative overflow-hidden rounded-lg bg-white p-2.5 transition-shadow hover:ring-1 hover:ring-gray-900 focus-within:ring-1 focus-within:ring-gray-900"
      data-testid={`card-product-${product.id}`}
    >
      <Link
        href={`/products/${product.id}`}
        className="block relative overflow-hidden"
        data-testid={`link-product-${product.id}`}
      >
        <ProductImage product={product} className="aspect-square w-full rounded-lg" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>
      <div className="pt-2">
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 min-h-10 text-sm font-normal leading-5 text-card-foreground hover:text-primary transition-colors"
          data-testid={`link-product-name-${product.id}`}
        >
          {product.name}
        </Link>
        {discount > 0 && (
          <div className="mt-1 text-xs text-orange-600">
            <span>{discount}% off</span>
          </div>
        )}
        <p className="mt-1 flex flex-wrap items-baseline gap-1 text-lg sm:text-xl font-bold leading-tight text-gray-950">
          {money(product.price)}
          {priceHigh && (
            <span className="ml-1 text-[10px] sm:text-sm font-normal text-muted-foreground line-through">
              {money(priceHigh)}
            </span>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            {tr('product.moq')}: {product.moq} {product.unit}(s)
          </span>
          {sold !== null && <span>{sold.toLocaleString()} {tr('product.sold')}</span>}
          <span className="text-green-600 font-medium">{product.stock.toLocaleString()} in stock</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          {product.verified && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-blue-700">
              <BadgeCheck size={10} /> {tr('product.verified')}
            </span>
          )}
        </div>
        {isAuthenticated && <button
          onClick={addToCart}
          disabled={add.isPending || added || product.stock < Math.max(product.moq, 1)}
          aria-label={added ? 'Added to cart' : `Add ${product.name} to cart`}
          title={product.stock < Math.max(product.moq, 1) ? 'Not enough stock for minimum order' : added ? 'Added to cart' : 'Add to cart'}
          className={[
            'absolute right-4 top-4 flex h-9 w-9 items-center justify-center',
            'rounded-full bg-white shadow-sm',
            'text-xs font-bold text-gray-800',
            'transition-colors hover:bg-orange-50',
            'active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed',
          ].join(' ')}
          data-testid={`button-add-cart-${product.id}`}
        >
          {added ? (
            <>
              <Check size={16} />
            </>
          ) : add.isPending ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <>
              <ShoppingBag size={16} />
            </>
          )}
        </button>}
        {add.isError && <p role="alert" className="mt-2 text-xs text-red-600">{(add.error as any)?.message || "Couldn’t add this product. Check available stock."}</p>}
      </div>
    </article>
  );
}

function PaginatedProducts({ products, loading }: { products?: Product[]; loading?: boolean }) {
  const [limit, setLimit] = useState(24);
  const sentinel = useRef<HTMLDivElement>(null);
  const total = products?.length ?? 0;
  useEffect(() => {
    if (loading || limit >= total || !sentinel.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setLimit((value) => Math.min(value + 24, total));
    }, { rootMargin: '200px' });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, limit, total]);
  return <div>
    <ProductGrid products={products?.slice(0, limit)} loading={loading} />
    {!loading && total > 0 && <div ref={sentinel} role="status" className="py-6 text-center text-xs text-muted-foreground">
      {limit < total ? 'Scroll to load more products…' : 'You’ve reached the end of the products.'}
    </div>}
  </div>;
}

function ProductGrid({
  products,
  loading,
}: {
  products?: Product[];
  loading?: boolean;
}) {
  if (loading)
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          >
            <SkeletonBlock className="aspect-square rounded-none" />
            <div className="space-y-2 p-2.5">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-6 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  if (!products?.length)
    return (
      <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <Layers3 className="mx-auto text-muted-foreground" size={28} />
        <p className="mt-3 text-lg font-bold">Nothing in this lane yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different search or category.
        </p>
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function HomePage() {
  const { tr } = useLocale();
  const {
    data: products,
    isLoading: productsLoading,
    isError,
    refetch,
  } = useListProducts({ sort: 'featured' });

  return (
    <AppShell activeTab="market" discoveryContent={<DiscoveryStrip products={products} loading={productsLoading} />}>
      <div className="bg-muted/30 px-0 pb-8 sm:px-4 lg:px-8">
        <section className="rounded-lg bg-[#f3f3f3] p-3 sm:p-4">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-bold text-card-foreground">
              Products from Nzanila stores
            </h2>
            <Link
              href="/products"
              className="text-xs font-bold text-primary hover:underline"
              data-testid="link-shop-all"
            >
              {tr('home.viewAll')} <ArrowUpRight size={14} />
            </Link>
          </div>
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <PaginatedProducts products={products} loading={productsLoading} />
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SearchHistoryCard({ term }: { term: string }) {
  const { data: matches, isLoading, isError } = useListProducts({ search: term });
  const product = matches?.[0];
  return <Link href={'/products?search=' + encodeURIComponent(term)} className="flex h-[190px] min-w-0 flex-col rounded-lg border border-border bg-card p-2 hover:border-primary">
    <p className="text-xs font-bold">Keep looking for</p><p className="mb-2 truncate text-sm">{term}</p>
    <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded bg-muted">
      {isLoading ? <span className="text-xs">Loading…</span> : product?.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain" /> : <span className="px-2 text-center text-xs">{isError ? 'Search again' : product ? product.name : 'See search results'}</span>}
      {product && <span className="absolute bottom-2 rounded-full bg-white px-2 py-1 text-xs font-bold">{money(product.price)}</span>}
    </div>
  </Link>;
}

function DiscoveryStrip({ products, loading }: { products?: Product[]; loading?: boolean }) {
  const [history, setHistory] = useState(readSearchHistory);
  useEffect(() => {
    const refresh = () => setHistory(readSearchHistory());
    window.addEventListener('nzanila-search-history', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('nzanila-search-history', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return <section aria-label="Recent product searches">
    <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-bold">Your recent searches</h2>{history.length > 0 && <button onClick={clearSearchHistory} className="text-xs underline">Clear history</button>}</div>
    {history.length ? <div className="grid grid-cols-3 gap-2 sm:gap-3">{history.slice(0, 3).map((entry) => <SearchHistoryCard key={entry.term} term={entry.term} />)}</div> : <div className="flex h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white p-4 text-center"><Search size={24} className="mb-3 text-muted-foreground" /><p className="text-sm font-semibold">Pick up where you left off</p><p className="mt-1 text-xs text-muted-foreground">Search for a product to see it here. History is saved in this browser.</p></div>}
  </section>;
}

function SupplierMini({ supplier }: { supplier: Supplier }) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-secondary to-secondary/80 font-display text-sm font-bold text-primary shadow-sm">
        {supplier.name.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-card-foreground">
          {supplier.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {supplier.location} · {supplier.responseRate}% response
        </p>
      </div>
      <BadgeCheck
        size={17}
        className={
          supplier.verified ? 'text-emerald-600' : 'text-muted-foreground'
        }
      />
    </div>
  );
}

export function ProductsPage() {
  const params = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const initialSearch = params.get('search') ?? '';
  const initialCategory = params.get('category') ?? '';
  const [search, setSearch] = useState(initialSearch);
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);
  useEffect(() => {
    const handleLiveSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === 'string') setSearch(value);
    };
    window.addEventListener('nzanila-manual-search', handleLiveSearch);
    return () => window.removeEventListener('nzanila-manual-search', handleLiveSearch);
  }, []);
  useEffect(() => {
    if (!search.trim() || search === initialSearch) return;
    const timer = window.setTimeout(() => recordSearch(search), 1200);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch]);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<
    'featured' | 'price-low' | 'price-high' | 'rating'
  >('rating');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tradeAssurance, setTradeAssurance] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minOrder, setMinOrder] = useState('');
  const { data: categories } = useListCategories();
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useListProducts({
    search: undefined,
    category: category || undefined,
    sort,
  });
  const visibleProducts = useMemo(() => {
    const ranked = (products as Product[] | undefined ?? []).map((product: Product) => ({ product, score: search.trim() ? manualMatchScore(search, product) : 0 }))
    .sort((a: { score: number }, b: { score: number }) => search.trim() ? b.score - a.score : 0)
    const matches = ranked.filter(item => !search.trim() || item.score > 0);
    // Keep the catalog useful for very short or imperfect queries: when no
    // token clears the confidence threshold, show the closest ranked listings
    // instead of presenting a dead-end empty state.
    return (matches.length ? matches : ranked.slice(0, 12)).map((item: { product: Product }) => item.product).filter((product: Product) => {
    const item = product as Product & { verified?: boolean; tradeAssurance?: boolean; minimumOrderQuantity?: number };
    if (verifiedOnly && item.verified !== true) return false;
    if (tradeAssurance && item.tradeAssurance !== true) return false;
    if (minOrder && Number(item.minimumOrderQuantity ?? 0) > Number(minOrder)) return false;
    return true;
    });
  }, [products, search, verifiedOnly, tradeAssurance, minOrder]);
  return (
    <AppShell activeTab="products" hideSidebar>
      <div className="bg-[#f3f3f3] px-4 py-6 lg:px-8">
        <PageIntro
          eyebrow="Marketplace catalog"
          title="Products for every scale"
          description="Compare price, minimums, and supplier reliability in one clear view."
          action={
            <button
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-bold md:hidden"
              onClick={() => setFiltersOpen(!filtersOpen)}
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal size={15} /> Filters
            </button>
          }
        />
        <div className="mb-6 flex justify-end">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            data-testid="select-sort-products"
          >
            <option value="rating">Top rated</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className={`${filtersOpen ? 'block' : 'hidden'} rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4 lg:block`}>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Filters</h2><button className="text-xs text-muted-foreground lg:hidden" onClick={() => setFiltersOpen(false)}>Close</button></div>
            <div className="border-b border-border pb-4"><p className="mb-2 text-sm font-bold">Categories</p><div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              <button onClick={() => setCategory('')} className={`block w-full rounded px-2 py-1.5 text-left text-sm ${!category ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-muted'}`}>All products</button>
              {(categories ?? []).map((item) => <button key={item.id} onClick={() => { setCategory(category === item.name ? '' : item.name); setFiltersOpen(false); }} className={`block w-full rounded px-2 py-1.5 text-left text-sm ${category === item.name ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-muted'}`} data-testid={`filter-category-${item.id}`}>{item.name}</button>)}
            </div></div>
            <div className="border-b border-border py-4"><p className="mb-2 text-sm font-bold">Supplier types</p><label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={tradeAssurance} onChange={(e) => setTradeAssurance(e.target.checked)} /> Trade Assurance</label><label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Verified supplier</label></div>
            <div className="pt-4"><p className="mb-2 text-sm font-bold">Min. order</p><div className="flex gap-2"><input value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Max" className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm" /><button onClick={() => setMinOrder(minOrder)} className="rounded border border-border px-2 text-xs font-bold">OK</button></div></div>
          </aside>
          <section className="min-w-0">
            {isError ? <ErrorState onRetry={() => refetch()} /> : <>
              <div className="mb-4 flex items-center justify-between text-xs text-gray-500"><span>{isLoading ? 'Finding products…' : `${visibleProducts.length} products in view`}</span><span>{category || 'All categories'}</span></div>
              <PaginatedProducts key={`${search}:${category}:${sort}:${verifiedOnly}:${tradeAssurance}:${minOrder}`} products={visibleProducts} loading={isLoading} />
            </>}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

export function ProductDetailPage() {
  const { isAuthenticated } = useAuth();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { tr } = useLocale();
  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = useGetProduct(productId);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const touchStartX = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'attributes' | 'supplier'>('description');
  const add = useAddCartItem();

  const relatedQuery = useListProducts({
    category: product?.category,
    limit: 8,
  });
  const cartQuery = useGetCart({
    query: {
      enabled: isAuthenticated,
      retry: false,
      staleTime: 30_000,
    },
  });
  const relatedProducts = (relatedQuery.data ?? []).filter(
    (p) => p.id !== productId
  );

  const sold = product ? soldCount(product) : null;
  const cartItem = cartQuery.data?.items?.find((item) => item.productId === productId);
  const cartStatusLoading = isAuthenticated && cartQuery.isLoading;

  const addToCart = useCallback(() => {
    if (!product) return;

    add.mutate(
      {
        data: {
          productId: product.id,
          quantity: Math.max(quantity, product.moq),
        },
      },
      {
        onSuccess: () => {
          setAdded(true);
          queryClient.invalidateQueries({
            queryKey: getGetCartQueryKey(),
          });
        },
        onError: () => {
          setAdded(false);
        },
      }
    );
  }, [add, product, quantity, queryClient]);

  useEffect(() => {
    if (!add.isSuccess) return;
    queryClient.invalidateQueries({
      queryKey: getGetProductQueryKey(productId),
    });
  }, [add.isSuccess, productId, queryClient]);

  if (isLoading)
    return (
      <AppShell>
        <div className="px-4 py-6 sm:px-5 sm:py-10 lg:px-10">
          <SkeletonBlock className="mb-6 h-4 w-32" />
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10">
            <SkeletonBlock className="aspect-square" />
            <div className="space-y-4">
              <SkeletonBlock className="h-5 w-1/3" />
              <SkeletonBlock className="h-10 w-4/5" />
              <SkeletonBlock className="h-32 w-full" />
              <SkeletonBlock className="h-40 w-full" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  if (isError || !product)
    return (
      <AppShell>
        <div className="px-4 py-6 sm:px-5 sm:py-10 lg:px-10">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </AppShell>
    );

  const productImages = ((product as Product & { images?: string[] }).images || [product.image]).filter(Boolean);
  const visibleProductImages = productImages.filter(image => !brokenImages.has(image));
  const selectedImage = (activeImage && !brokenImages.has(activeImage) ? activeImage : visibleProductImages[0]) || product.image;
  const markBrokenImage = (image: string) => setBrokenImages(current => new Set(current).add(image));
  const changeImageBy = (direction: number) => {
    if (visibleProductImages.length < 2) return;
    const currentIndex = Math.max(0, visibleProductImages.indexOf(selectedImage));
    const nextIndex = (currentIndex + direction + visibleProductImages.length) % visibleProductImages.length;
    setActiveImage(visibleProductImages[nextIndex]);
  };

  const tabs = [
    { key: 'description' as const, label: tr('detail.description') },
    { key: 'attributes' as const, label: tr('detail.attributes') },
    { key: 'supplier' as const, label: tr('detail.supplier') },
  ];

  return (
    <AppShell activeTab="products" hideSearch>
      <div className="mt-4 max-w-full overflow-x-hidden rounded-t-xl bg-background px-4 py-5 sm:px-5 sm:py-8 lg:px-10">
        {/* ── Breadcrumb ── */}
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground sm:mb-6 sm:text-xs">
          <Link href="/" className="hover:text-foreground transition-colors">{tr('nav.products')}</Link>
          <span>/</span>
          <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground transition-colors">
            {product.category}
          </Link>
          <span>/</span>
          <span className="truncate text-foreground font-medium max-w-[200px] sm:max-w-none">{product.name}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr_320px] lg:gap-6 xl:gap-8">
          {/* ════ LEFT COLUMN: image + supplier ════ */}
          <div className="min-w-0">
            {/* Image gallery */}
            <div className="hidden sm:flex gap-3 lg:gap-3">
              <div className="flex flex-col gap-2">
                {visibleProductImages.map((image, i) => (
                  <button
                    type="button"
                    onClick={() => setActiveImage(image)}
                    key={`${image}-${i}`}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 lg:h-[68px] lg:w-[68px] ${
                      image === selectedImage ? 'border-primary' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {image ? (
                      <img src={image} alt={`${product.name} view ${i + 1}`} className="h-full w-full bg-white object-contain p-1" onError={() => markBrokenImage(image)} />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-secondary">
                        <PackageCheck size={14} className="text-muted-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="group min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-xl" onClick={() => setGalleryOpen(true)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setGalleryOpen(true); }}>
                <ProductImage product={product} image={selectedImage} className="aspect-[4/3]" />
              </div>
            </div>
            <div className="sm:hidden">
              <div className="group touch-pan-y cursor-zoom-in overflow-hidden rounded-xl" onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const start = touchStartX.current; touchStartX.current = null; if (start == null) return; const delta = event.changedTouches[0]?.clientX - start; if (Math.abs(delta) > 40) { changeImageBy(delta < 0 ? 1 : -1); } }} onClick={() => setGalleryOpen(true)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setGalleryOpen(true); }}>
                <ProductImage product={product} image={selectedImage} className="aspect-[4/3]" />
              </div>
              <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
                {visibleProductImages.map((image, i) => (
                  <button type="button" onClick={() => setActiveImage(image)} key={`${image}-${i}`} className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white ${image === selectedImage ? 'border-primary' : 'border-border'}`} aria-label={`View image ${i + 1}`}>
                    {image ? (
                      <img src={image} alt={`${product.name} view ${i + 1}`} className="h-full w-full object-contain p-1" onError={() => markBrokenImage(image)} />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-secondary"><PackageCheck size={12} className="text-muted-foreground" /></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {galleryOpen && selectedImage && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Product image viewer" onClick={() => setGalleryOpen(false)}>
              <button type="button" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Close image viewer" onClick={() => setGalleryOpen(false)}><X size={22} /></button>
              <img src={selectedImage} alt={product.name} className="max-h-[90vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} onError={() => { markBrokenImage(selectedImage); setGalleryOpen(false); }} />
            </div>}

            {/* Supplier card — below image */}
            <div className="mt-4 min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="flex min-w-0 flex-wrap items-start gap-3">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Store size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-bold leading-tight text-foreground">{product.supplierName}</p>
                  <p className="mt-0.5 break-words text-[10px] text-muted-foreground">Store owner / supplier: {product.supplierName}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {product.verified && (
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <BadgeCheck size={12} /> {tr('product.verified')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex w-full max-w-full flex-wrap gap-1.5 sm:w-auto">
                  <Link href={directionsFor(product)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 rounded-lg border border-primary px-2 py-1.5 text-center text-[11px] font-bold text-primary hover:bg-primary/5 sm:flex-none sm:px-3">
                    Get directions
                  </Link>
                  {(product as any).storeSlug ? (
                    <Link href={`/store/${encodeURIComponent((product as Product & { storeSlug?: string }).storeSlug as string)}`} className="min-w-0 flex-1 rounded-lg border border-primary px-2 py-1.5 text-center text-[11px] font-bold text-primary hover:bg-primary/5 sm:flex-none sm:px-3">
                      View profile
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid min-w-0 grid-cols-3 gap-2">
                <div className="min-w-0 rounded-lg bg-background p-2 text-center">
                  <p className="break-words text-[11px] font-bold leading-tight text-foreground">{(product as any).storeLocation || product.supplierName}</p>
                  <p className="text-[10px] text-muted-foreground">{tr('detail.supplier')}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-background p-2 text-center">
                  <p className="text-[11px] font-bold text-foreground">{(product as any).storeProductCount || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Products</p>
                </div>
                <div className="min-w-0 rounded-lg bg-background p-2 text-center">
                  <p className="text-[11px] font-bold text-foreground">{product.stock.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{tr('detail.stock')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ════ MIDDLE COLUMN: details + attributes ════ */}
          <div className="min-w-0">
            {/* Shipping banner */}
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Truck size={15} />
              <span>{product.shipping || 'Seller delivery details not provided'}</span>
            </div>

            {/* Title */}
            <h1 className="max-w-2xl text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
              {product.name}
            </h1>

            {/* Rating + stats */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="flex items-center gap-1 font-bold text-foreground">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {product.rating > 0 ? product.rating.toFixed(1) : '—'}
              </span>
              <span className="text-muted-foreground">
                ({product.reviews > 0 ? product.reviews.toLocaleString() : 0} {tr('detail.reviews')})
              </span>
              <span className="h-4 w-px bg-border" />
              {sold !== null && (
                <span className="text-muted-foreground">
                  {sold.toLocaleString()} {tr('product.sold')}
                </span>
              )}
            </div>

            {/* Price tiers */}
            <div className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">{tr('detail.unitPrice')}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
                    {money(product.price)} <span className="text-sm font-medium text-muted-foreground">/ {product.unit}</span>
                  </p>
                </div>
                {product.compareAtPrice && (
                  <p className="pb-1 text-sm text-muted-foreground line-through">{money(product.compareAtPrice)}</p>
                )}
              </div>

              {/* MOQ */}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{tr('product.moq')}</span>
                <strong className="text-foreground">{product.moq} {product.unit}</strong>
              </div>

              {/* Quantity + buttons */}
              {isAuthenticated && <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="flex h-11 items-center rounded-lg border border-border bg-background sm:h-12">
                  <button
                    type="button"
                    onClick={() => {
                      if (add.isPending) return;
                      setQuantity((prev) => Math.max(1, prev - 1));
                    }}
                    disabled={add.isPending || quantity <= 1}
                    className="px-3 text-lg font-bold text-foreground disabled:opacity-50"
                    data-testid="button-decrease-quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-foreground" data-testid="text-product-quantity">
                    {cartItem?.quantity ?? quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (add.isPending) return;
                      setQuantity((prev) => prev + 1);
                    }}
                    disabled={add.isPending}
                    className="px-3 text-lg font-bold text-foreground disabled:opacity-50"
                    data-testid="button-increase-quantity"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={add.isPending || added || cartStatusLoading || Boolean(cartItem)}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:h-12"
                  data-testid="button-detail-add-cart"
                >
                  {cartStatusLoading ? (
                    tr('product.adding')
                  ) : added || cartItem ? (
                    <>
                      <Check size={16} /> {cartItem ? 'Already in cart' : tr('product.added')}
                    </>
                  ) : add.isPending ? (
                    tr('product.adding')
                  ) : (
                    tr('product.addCart')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cartItem) {
                      setLocation('/cart');
                      return;
                    }
                    if (add.isPending) return;
                    addToCart();
                    setTimeout(() => setLocation('/cart'), 400);
                  }}
                  disabled={add.isPending || added || cartStatusLoading}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-bold text-foreground hover:bg-muted sm:h-12"
                  data-testid="button-start-order"
                >
                  {tr('detail.startOrder')}
                </button>
              </div>
              {added && (
                <button
                  type="button"
                  onClick={() => setLocation('/cart')}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-primary py-2.5 text-xs font-bold text-primary"
                  data-testid="button-go-cart"
                >
                  {tr('cart.view')} <ArrowRight size={14} />
                </button>
              )}
              {cartItem && !added && (
                <button
                  type="button"
                  onClick={() => setLocation('/cart')}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-primary py-2.5 text-xs font-bold text-primary"
                  data-testid="button-go-cart-existing"
                >
                  {tr('cart.view')} <ArrowRight size={14} />
                </button>
              )}
              </>}
            </div>

            {/* Key attributes — inline, not in tabs */}
            <div className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5">
              <h3 className="mb-3 text-sm font-bold text-foreground">{tr('detail.keyAttributes')}</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground">{tr('detail.category')}</p>
                  <p className="mt-0.5 font-bold text-foreground">{product.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{tr('detail.unit')}</p>
                  <p className="mt-0.5 font-bold text-foreground">{product.unit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{tr('product.moq')}</p>
                  <p className="mt-0.5 font-bold text-foreground">
                    {product.moq > 0 ? `${product.moq} ${product.unit}` : product.unit}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{tr('detail.stock')}</p>
                  <p className="mt-0.5 font-bold text-foreground">
                    {product.stock > 0 ? `${product.stock.toLocaleString()} units` : 'Out of stock'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fulfillment and support */}
          <div className="space-y-4">
            {/* Fulfillment panel — values come from the seller's listing */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">Fulfillment information</p>
              <div className="mt-3 space-y-3">
                <div className="flex gap-3">
                  <Truck size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Delivery</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{(product as any).deliveryAvailable ? (product.shipping || 'Seller delivery available') : 'Not offered by this seller'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Store size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Pickup</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{(product as any).pickupAvailable ? 'Buyer pickup available at the store' : 'Not offered by this seller'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <PackageCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Availability</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{product.stock.toLocaleString()} units currently listed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need help */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">{tr('detail.needHelp')}</p>
                  <p className="text-[11px] text-muted-foreground">{tr('detail.chatWithSupplier')}</p>
                </div>
                {isAuthenticated ? (
                  <Link href={`/messages?store=${encodeURIComponent(String((product as any).store_id || (product as any).storeId || ''))}&seller=${encodeURIComponent(String((product as any).supplier_id || (product as any).supplierId || ''))}`} className="flex-shrink-0 rounded-lg border border-primary px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5" data-testid="link-message-supplier">
                    Message supplier
                  </Link>
                ) : (
                  <Link href="/auth" className="flex-shrink-0 rounded-lg border border-primary px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5" data-testid="link-message-supplier-login">
                    Sign in to message
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="mt-8 sm:mt-10">
          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-bold transition-colors ${
                  activeTab === tab.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'description' && (
              <div className="max-w-none text-muted-foreground">
                <p className="text-sm leading-7">
                  {product.description || 'The seller has not provided a product description yet.'}
                </p>
              </div>
            )}

            {activeTab === 'attributes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      [tr('detail.category'), product.category],
                      [tr('detail.unit'), product.unit],
                      [tr('product.moq'), `${product.moq} ${product.unit}`],
                      [tr('detail.stock'), product.stock.toLocaleString()],
                      [tr('detail.supplier'), product.supplierName],
                      [tr('detail.verified'), product.verified ? tr('product.verified') : '—'],
                    ].map(([label, value]) => (
                      <tr key={label} className="border-b border-border">
                        <td className="py-3 pr-4 font-medium text-muted-foreground">{label}</td>
                        <td className="py-3 text-foreground">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'supplier' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Store size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{product.supplierName}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">Store owner / supplier: {product.supplierName}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {product.verified && (
                          <span className="flex items-center gap-0.5 text-emerald-600">
                            <BadgeCheck size={12} /> {tr('product.verified')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Link href={directionsFor(product)} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 rounded-lg border border-primary px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5">
                        Get directions
                      </Link>
                      {(product as any).storeSlug ? (
                        <Link href={`/store/${encodeURIComponent((product as Product & { storeSlug?: string }).storeSlug as string)}`} className="flex-shrink-0 rounded-lg border border-primary px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5">
                          View profile
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-background p-3 text-center">
                      <p className="text-sm font-bold text-foreground">{(product as any).storeLocation || tr('detail.supplier')}</p>
                      <div className="mt-2 flex justify-center gap-2">
                        <MapPin size={12} className="text-muted-foreground" />
                        <a href={directionsFor(product)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-primary hover:underline">
                          Get directions
                        </a>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3 text-center">
                      <p className="text-sm font-bold text-foreground">{product.supplierName}</p>
                      <p className="text-[10px] text-muted-foreground">{tr('detail.supplier')}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-background p-4 text-center">
                      <Star size={18} className="mx-auto fill-amber-400 text-amber-400" />
                      <p className="mt-1 text-sm font-bold text-foreground">{product.rating.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">{tr('detail.rating')}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4 text-center">
                      <RefreshCw size={18} className="mx-auto text-primary" />
                      <p className="mt-1 text-sm font-bold text-foreground">{product.stock.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{tr('detail.stock')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Related products ── */}
        {relatedProducts.length > 0 && (
          <div className="mt-10 sm:mt-12">
            <h2 className="mb-4 text-lg font-bold text-foreground sm:mb-5">{tr('detail.relatedProducts')}</h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:gap-3 sm:px-0">
              {relatedProducts.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/products/${p.id}`} className="group flex-shrink-0 w-36 sm:w-auto">
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="aspect-square overflow-hidden bg-secondary">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full w-full place-items-center"><PackageCheck size={24} className="text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-[11px] font-bold text-foreground">{p.name}</p>
                      <p className="mt-1 text-xs font-bold text-primary">{money(p.price)}</p>
                      <p className="text-[10px] text-muted-foreground">{tr('product.moq')} {p.moq} {p.unit}</p>
                    </div>
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

export function CartPage() {
  const { user, session, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const {
    data: cart,
    isLoading,
    isError,
    refetch,
  } = useGetCart();
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const [destination, setDestination] = useState('');
  const [destinationLatitude, setDestinationLatitude] = useState<number | undefined>();
  const [destinationLongitude, setDestinationLongitude] = useState<number | undefined>();
  const [deliveryPhoto, setDeliveryPhoto] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checkoutStore, setCheckoutStore] = useState<string | null>(null);
  const [locationPickerStore, setLocationPickerStore] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const create = useCreateOrder();
  const savedCheckoutLocation = useMemo(() => {
    const profileLocation = user && [
      user.approximateAddress || [user.zone, user.city, user.province].filter(Boolean).join(', '),
      user.landmark,
      user.directions,
    ].filter(Boolean).join(' · ');
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const saved = JSON.parse(localStorage.getItem(`nzanila_buyer_addresses_${user.id}`) || '[]');
        const address = Array.isArray(saved) ? saved.find((item: any) => item?.isDefault) || saved[0] : null;
        if (address) return [address.approximateAddress || [address.zone, address.commune, address.province].filter(Boolean).join(', '), address.landmark, address.detailedDirections].filter(Boolean).join(' · ');
      } catch { /* Use the server profile location when local storage is unavailable. */ }
    }
    return profileLocation || '';
  }, [user]);
  useEffect(() => {
    if (!destination && savedCheckoutLocation) setDestination(savedCheckoutLocation);
  }, [destination, savedCheckoutLocation]);
  useEffect(() => {
    if (destinationLatitude == null && typeof user?.latitude === 'number') setDestinationLatitude(user.latitude);
    if (destinationLongitude == null && typeof user?.longitude === 'number') setDestinationLongitude(user.longitude);
  }, [user, destinationLatitude, destinationLongitude]);
  const storeGroups = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof cart>['items']>();
    (cart?.items || []).forEach((item) => {
      const storeName = item.product.supplierName || 'Store';
      groups.set(storeName, [...(groups.get(storeName) || []), item]);
    });
    return Array.from(groups.entries()).map(([storeName, items]) => ({
      storeName,
      items,
      subtotal: items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
      total: items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    }));
  }, [cart?.items]);
  const selectedStoreGroup = storeGroups.find((group) => group.storeName === checkoutStore);
  const cartSubtotal = Number(cart?.subtotal || 0);
  const cartTotal = cartSubtotal;
  const changeCheckoutLocation = async (data: LocationData) => {
    const formatted = [data.approximateAddress || [data.zone, data.commune, data.province].filter(Boolean).join(', '), data.landmark, data.directions].filter(Boolean).join(' · ');
    setDestination(formatted);
    setDestinationLatitude(data.latitude);
    setDestinationLongitude(data.longitude);
    setShowLocationPicker(false);
    setCheckoutStore(locationPickerStore);
    if (session?.accessToken) {
      setLocationSaving(true);
      try {
        await fetch(`${import.meta.env.VITE_API_URL || 'https://nzanila-api-server.nzanilaexpress.workers.dev'}/api/profiles/onboarding/buyer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
          body: JSON.stringify({
            name: user?.name,
            province: data.province,
            city: data.commune,
            zone: data.zone,
            landmark: data.landmark,
            deliveryPhone: data.phone || user?.deliveryPhone || user?.phone,
            latitude: data.latitude,
            longitude: data.longitude,
            addressName: data.locationName || 'Delivery address',
            directions: data.directions,
            meetAtPublicLandmark: data.meetAtPublicLandmark,
            approximateAddress: data.approximateAddress,
          }),
        });
        await refreshUser();
      } finally {
        setLocationSaving(false);
      }
    }
  };
  const refresh = (next: unknown) => {
    queryClient.setQueryData(getGetCartQueryKey(), next);
  };
  const onUpdate = (productId: number, quantity: number) =>
    update.mutate(
      { id: productId, data: { quantity: Math.max(1, quantity) } },
      { onSuccess: refresh }
    );
  const onRemove = (productId: number) =>
    remove.mutate(
      { id: productId },
      { onSuccess: refresh }
    );
  const checkout = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(
      { data: {
        shippingFee: 0,
        termsAccepted,
        productIds: selectedStoreGroup?.items.map((item) => item.productId),
      } },
      {
        onSuccess: (order) => {
          queryClient.invalidateQueries({
            queryKey: getGetCartQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getListOrdersQueryKey(),
          });
          setCheckoutStore(null);
          setLocation(`/orders/${order.id}`);
        },
      }
    );
  };
  if (isLoading)
    return (
      <BuyerWorkspace active="cart">
        <div className="px-5 py-10 lg:px-10">
          <PageIntro
            eyebrow="Your cart"
            title="Loading your order"
          />
          <SkeletonBlock className="h-48" />
        </div>
      </BuyerWorkspace>
    );
  if (isError)
    return (
      <BuyerWorkspace active="cart">
        <div className="px-5 py-10 lg:px-10">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </BuyerWorkspace>
    );
  return (
    <BuyerWorkspace active="cart">
      <div className="space-y-5">
        <PageIntro
          eyebrow="Your cart"
          title={
            cart?.itemCount
              ? `Cart (${cart.itemCount})`
              : 'Your cart'
          }
          description={
            cart?.itemCount
              ? 'Review your items, then choose delivery or pickup.'
              : undefined
          }
        />
        <>
          {!cart?.items?.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
              <ShoppingBag
                className="mx-auto text-muted-foreground"
                size={32}
              />
              <p className="mt-4 font-display text-xl font-bold">
                Your cart is empty.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add products from the marketplace and they will appear in
                your cart.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground"
                data-testid="link-empty-cart-shop"
              >
                Browse products <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {storeGroups.map((group) => (
                  <div key={`store-${group.storeName}`}>
                    <div className="mb-2 mt-2 flex items-center gap-2 text-sm font-bold text-foreground first:mt-0">
                      <Store size={16} className="text-primary" />
                      <span>{group.storeName}</span>
                      <span className="text-xs font-normal text-muted-foreground">· separate checkout</span>
                      <Link
                        href={`/messages?store=${encodeURIComponent(String((group.items[0].product as any).storeId || ''))}&seller=${encodeURIComponent(String((group.items[0].product as any).supplierId || ''))}`}
                        className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5"
                        data-testid={`link-message-supplier-${group.storeName}`}
                      >
                        <MessageSquare size={13} /> Message supplier
                      </Link>
                    </div>
                    {group.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-5 transition-all duration-300 hover:shadow-md hover:border-border/80"
                    data-testid={`row-cart-item-${item.productId}`}
                  >
                    <ProductImage
                      product={item.product}
                      className="h-16 w-16 shrink-0 rounded-xl sm:h-28 sm:w-28"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-mono text-[10px] uppercase text-muted-foreground">
                            {item.product.category}
                          </p>
                          <Link
                            href={`/products/${item.productId}`}
                            className="mt-1 block text-sm font-bold leading-snug text-card-foreground hover:text-primary transition-colors"
                            data-testid={`link-cart-product-${item.productId}`}
                          >
                            {item.product.name}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.product.supplierName}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemove(item.productId)}
                          className="h-fit rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label={`Remove ${item.product.name}`}
                          data-testid={`button-remove-cart-${item.productId}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-h-11 items-center rounded-lg border border-border">
                          <button
                            onClick={() =>
                              onUpdate(
                                item.productId,
                                item.quantity - 1
                              )
                            }
                            className="min-h-11 min-w-11 px-2.5"
                            data-testid={`button-decrease-cart-${item.productId}`}
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              onUpdate(
                                item.productId,
                                item.quantity + 1
                              )
                            }
                            className="min-h-11 min-w-11 px-2.5"
                            data-testid={`button-increase-cart-${item.productId}`}
                          >
                            +
                          </button>
                        </div>
                        <p className="font-display text-lg font-bold">
                          {money(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                ))}
              </div>
              <aside className="h-fit rounded-2xl border border-border bg-white p-6 text-foreground lg:sticky lg:top-28">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Order summary
                </p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Subtotal
                    </span>
                    <span>{money(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-4 font-display text-xl font-bold">
                    <span>Total</span>
                    <span>{money(cartTotal)}</span>
                  </div>
                </div>
                <div className="mt-7 space-y-3 border-t border-border pt-5">
                  <p className="text-xs font-bold">Checkout by store</p>
                  {storeGroups.map((group) => (
                    <div key={group.storeName} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{group.storeName}</p>
                          <p className="text-[11px] text-muted-foreground">{group.items.length} item{group.items.length === 1 ? '' : 's'} · {money(group.total)}</p>
                        </div>
                        <button
                          onClick={() => { setCheckoutStore(group.storeName); setTermsAccepted(false); setDeliveryPhoto(''); }}
                          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
                          data-testid={`button-checkout-${group.storeName}`}
                        >
                          Checkout <ArrowRight size={13} className="ml-1 inline" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-[10px] text-muted-foreground">Each store has its own delivery or pickup choice.</p>
                </div>
              </aside>
            </div>
          )}
        </>
        {checkoutStore && selectedStoreGroup && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
            <form
              onSubmit={checkout}
              className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-card p-5 pb-8 shadow-2xl sm:rounded-2xl sm:p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Review order
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold">
                    Review order for {selectedStoreGroup.storeName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedStoreGroup.storeName} · this checkout creates one separate store order</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutStore(null)}
                  className="rounded-lg p-1.5 text-muted-foreground"
                  aria-label="Close checkout"
                  data-testid="button-close-checkout"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"><strong>Choose delivery after placing the order</strong><p className="mt-1">After the seller receives this order, choose delivery or store pickup and provide your location from the order details page.</p></div>
              <div className="mt-5 rounded-xl bg-secondary p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Order total
                  </span>
                    <strong>{money(selectedStoreGroup.total)}</strong>
                </div>
              </div>
              <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" required checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5" /><span>I confirm these items and agree to continue to fulfillment after placing the order.</span></label>
              {create.isError && <p role="alert" className="mt-4 text-sm text-red-600">Could not place your order. Please try again.</p>}
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutStore(null)}
                  className="flex-1 rounded-xl border border-border py-3.5 text-xs font-bold text-foreground hover:bg-secondary"
                  data-testid="button-cancel-checkout"
                >
                  Cancel
                </button>
                <button
                  disabled={create.isPending || !termsAccepted}
                  className="flex-1 rounded-xl bg-primary py-3.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  data-testid="button-place-order"
                >
                  {create.isPending ? 'Placing order…' : 'Place order'}
                </button>
              </div>
            </form>
          </div>
        )}
        {showLocationPicker && <LocationSearchPicker
          mode="buyer"
          initialLat={user?.latitude || -3.3731}
          initialLng={user?.longitude || 29.3644}
          onCancel={() => { setShowLocationPicker(false); setCheckoutStore(locationPickerStore); }}
          onConfirm={changeCheckoutLocation}
        />}
      </div>
    </BuyerWorkspace>
  );
}

export function OrdersPage() {
  const [filter, setFilter] = useState<'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useListOrders();
  const visibleOrders = useMemo(() => {
    if (!orders) return [];
    if (filter === 'all') return orders;
    if (filter === 'processing') return orders.filter((order) => order.status === 'confirmed' || order.status === 'processing' || order.status === 'ready');
    if (filter === 'shipped') return orders.filter((order) => order.status === 'shipped' || order.status === 'out_for_delivery');
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);
  return (
    <BuyerWorkspace active="orders">
      <div className="space-y-5">
        <PageIntro
          eyebrow="Buyer workspace"
          title="Your orders"
          description="Review processing, shipping, and delivery in one place."
          action={
            <Link
              href="/products"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
              data-testid="link-order-again"
            >
              <ShoppingBag size={15} /> Shop again
            </Link>
          }
        />
        <div className="mb-5 flex overflow-x-auto gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm" role="tablist" aria-label="Order status filters">
          {([
            ['all', 'All orders'],
            ['processing', 'Processing'],
            ['shipped', 'Shipped'],
            ['delivered', 'Delivered'],
            ['cancelled', 'Cancelled'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${filter === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock
                key={i}
                className="h-40 rounded-2xl"
              />
            ))}
          </div>
        ) : !orders?.length ? (
          <EmptyOrders />
        ) : !visibleOrders.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <Truck className="mx-auto text-muted-foreground" size={30} />
            <p className="mt-4 font-display text-xl font-bold text-card-foreground">No {filter.replace('_', ' ')} orders</p>
            <p className="mt-2 text-sm text-muted-foreground">Orders will appear here when they move into this stage.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => (
              <OrderCard order={order} key={order.id} />
            ))}
          </div>
        )}
      </div>
    </BuyerWorkspace>
  );
}

function EmptyOrders() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center shadow-sm">
      <Truck className="mx-auto text-muted-foreground" size={30} />
      <p className="mt-4 font-display text-xl font-bold text-card-foreground">
        No orders yet
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Your first confident buy is a few clicks away.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
        data-testid="link-empty-orders-shop"
      >
        Explore products
      </Link>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const confirmDelivery = useUpdateOrderStatus();
  const statusColor =
    order.status === 'delivered'
      ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950'
      : order.status === 'cancelled'
        ? 'text-destructive bg-destructive/10'
        : 'text-primary bg-primary/10';
  return (
    <article
      className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md hover:border-border/80"
      data-testid={`card-order-${order.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xs font-bold text-muted-foreground">
              ORDER #{String(order.id).padStart(5, '0')}
            </p>
            <span
              className={`rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase ${statusColor}`}
              data-testid={`status-order-${order.id}`}
            >
              {order.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDate(order.date)} · {order.destination}
          </p>
          <p className="mt-1 text-xs font-semibold text-primary">
            {Array.from(new Set((order.items || []).map((item) => item.supplierName).filter(Boolean))).join(', ') || 'Store order'}
          </p>
        </div>
        <p className="font-display text-2xl font-bold text-card-foreground">
          {money(order.total)}
        </p>
      </div>
      <div className="mt-6 flex items-center gap-2">
        {['pending', 'processing', 'shipped', 'delivered'].map(
          (step, i) => (
            <div key={step} className="flex flex-1 items-center gap-2">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  [
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                  ].indexOf(order.status) >= i
                    ? 'bg-primary'
                    : 'bg-border'
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  [
                    'pending',
                    'processing',
                    'shipped',
                    'delivered',
                  ].indexOf(order.status) > i
                    ? 'bg-primary'
                    : 'bg-secondary'
                }`}
              />
            </div>
          )
        )}
      </div>
      {order.status === 'shipped' && (
        <button
          type="button"
          onClick={() => confirmDelivery.mutate({ id: order.id, data: { status: 'delivered' } })}
          disabled={confirmDelivery.isPending}
          className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {confirmDelivery.isPending ? 'Confirming…' : 'Confirm delivery received'}
        </button>
      )}
      {['processing', 'confirmed', 'preparing', 'ready'].includes(order.status) && (
        <button
          type="button"
          onClick={() => { if (window.confirm('Cancel this order?')) confirmDelivery.mutate({ id: order.id, data: { status: 'cancelled' } }); }}
          disabled={confirmDelivery.isPending}
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 disabled:opacity-60"
        >
          {confirmDelivery.isPending ? 'Cancelling…' : 'Cancel order'}
        </button>
      )}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        <span>
          {order.itemCount} item{order.itemCount === 1 ? '' : 's'} ·{' '}
          {order.buyerName}
        </span>
        <Link href={`/orders/${order.id}`} className="flex items-center gap-1.5 font-bold text-primary hover:underline">
          <Clock3 size={14} /> View details
        </Link>
      </div>
    </article>
  );
}

export function SuppliersPage() {
  const {
    data: suppliers,
    isLoading,
    isError,
    refetch,
  } = useListSuppliers();
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () =>
      suppliers?.filter(
        (s) =>
          `${s.name} ${s.location} ${s.specialty ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [suppliers, search]
  );
  return (
    <AppShell activeTab="suppliers">
      <div className="bg-background px-3 py-4 sm:px-5 sm:py-8 lg:px-10">
        <PageIntro
          eyebrow="Sourcing network"
          title="Meet your supply side"
          description="Explore vetted businesses with the capacity, responsiveness, and category depth to help you buy with confidence."
          action={
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-bold sm:flex">
              <ShieldCheck
                size={15}
                className="text-emerald-600"
              />{' '}
              Verified network
            </div>
          }
        />
        <div className="mb-5 sm:mb-7 flex h-10 sm:h-11 max-w-xl items-center rounded-lg border border-border bg-card px-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent px-3 text-xs sm:text-sm outline-none"
            placeholder="Search suppliers, locations, specialties"
            data-testid="input-supplier-search"
          />
        </div>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock
                key={i}
                className="h-48 sm:h-64 rounded-xl sm:rounded-2xl"
              />
            ))}
          </div>
        ) : !filtered?.length ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No suppliers match that search.
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <Link href={`/seller/${supplier.id}`}>
    <article
      className="group rounded-xl sm:rounded-2xl border border-border bg-card p-2.5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
      data-testid={`card-supplier-${supplier.id}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={[
            'grid h-10 w-10 sm:h-14 sm:w-14 place-items-center',
            'rounded-xl sm:rounded-2xl bg-gradient-to-br from-secondary to-secondary/80',
            'font-display text-base sm:text-2xl font-bold text-primary shadow-sm',
          ].join(' ')}
        >
          {supplier.name.slice(0, 2).toUpperCase()}
        </div>
        {supplier.verified && (
          <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 sm:px-2.5 sm:py-1.5 font-mono text-[8px] sm:text-[10px] font-bold uppercase text-emerald-700">
            <BadgeCheck size={10} className="sm:hidden" />
            <BadgeCheck
              size={13}
              className="hidden sm:block"
            />{' '}
            Verified
          </span>
        )}
      </div>
      <h2 className="mt-2 sm:mt-5 font-display text-sm sm:text-xl font-bold tracking-[-0.04em] text-card-foreground leading-tight">
        {supplier.name}
      </h2>
      <p className="mt-1 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-sm text-muted-foreground">
        <MapPin size={11} className="sm:hidden" />
        <MapPin size={14} className="hidden sm:block" />{' '}
        {supplier.location}
      </p>
      <p className="mt-1.5 sm:mt-4 line-clamp-2 text-[10px] sm:text-sm text-muted-foreground leading-relaxed">
        {supplier.specialty ||
          'Multi-category sourcing partner with a ready-to-ship catalog.'}
      </p>
      <div className="mt-3 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4 border-t border-border pt-2.5 sm:pt-5">
        <div className="text-center">
          <p className="flex items-center justify-center gap-0.5 text-[11px] sm:text-base font-bold text-card-foreground">
            <Star
              size={10}
              className="fill-amber-400 text-amber-400 sm:hidden"
            />
            <Star
              size={14}
              className="fill-amber-400 text-amber-400 hidden sm:block"
            />{' '}
            {supplier.rating.toFixed(1)}
          </p>
          <p className="mt-0.5 sm:mt-1 text-[7px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">
            rating
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] sm:text-base font-bold text-card-foreground">
            {supplier.responseRate}%
          </p>
          <p className="mt-0.5 sm:mt-1 text-[7px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">
            response
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] sm:text-base font-bold text-card-foreground">
            {supplier.yearsActive} yrs
          </p>
          <p className="mt-0.5 sm:mt-1 text-[7px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">
            active
          </p>
        </div>
      </div>
    </article>
    </Link>
  );
}

export function SupplierFrame({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  const { user } = useAuth();
  const verificationStatus = (user as any)?.verificationStatus || 'not_verified';
  const isUnverified = verificationStatus === 'not_verified' || verificationStatus === 'not_submitted';

  return (
    <SellerWorkspace title={title}>
      <div>
        {isUnverified && (
          <Link href="/seller/verify" className="mb-6 flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3 transition-colors hover:bg-yellow-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base text-yellow-600">✓</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-yellow-800">Verify your ID to get a Verified badge</p>
            </div>
            <span className="text-xs font-semibold text-yellow-700">Optional →</span>
          </Link>
        )}

        <div className="mb-6 border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff6a00]">
                Seller performance center
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-3">{action}<div className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-[#3e856d]" />
              Storefront live
            </div></div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/supplier/orders" className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary">
              Orders
            </Link>
            <Link href="/supplier/products" className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary">
              Products
            </Link>
            <Link href="/seller/profile" className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary">
              Profile
            </Link>
            <Link href="/seller/verify" className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary">
              Verification
            </Link>
          </div>
        </div>
        {children}
      </div>
    </SellerWorkspace>
  );
}

function Kpi({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: string;
  icon: typeof DollarSign;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary">
          <Icon size={17} />
        </span>
        {change && (
          <span className="rounded-full bg-[#3e856d]/10 px-2 py-1 font-mono text-[10px] font-bold text-[#3e856d]">
            {change}
          </span>
        )}
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-bold tracking-[-0.06em]">
        {value}
      </p>
    </div>
  );
}

export function SupplierDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const dashboardQuery = useGetSupplierDashboard();

  useEffect(() => {
    setStats(dashboardQuery.data || null);
    setLoading(dashboardQuery.isLoading);
  }, [dashboardQuery.data, dashboardQuery.isLoading]);

  if (loading || !stats)
    return (
      <SupplierFrame title="Dashboard">
        <div className="space-y-4">
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24 w-48 flex-shrink-0" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonBlock className="h-64" />
            <SkeletonBlock className="h-64" />
          </div>
        </div>
      </SupplierFrame>
    );

  const businessName = (user as any)?.businessName || 'My Business';
  const verificationStatus = (user as any)?.verificationStatus || 'not_submitted';
  const isVerified = verificationStatus === 'verified';
  const sc = stats.statusCounts || {};
  const actionable = stats.actionableOrders || [];
  const topProducts = stats.topProducts || [];
  const recentOrders = stats.recentOrders || [];

  const totalOpenOrders = (sc.new || 0) + (sc.confirmed || 0) + (sc.processing || 0);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <SupplierFrame title="Dashboard">
      {/* Account Health Bar */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs font-bold text-gray-700">Account Health:</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
          isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
          {isVerified ? 'Healthy' : 'Needs attention'}
        </span>
      </div>

      {/* Top Metric Bar — horizontal scroll, Amazon style */}
      <div className="mb-5 flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {[
          {
            label: "Today's Sales",
            value: money(stats.revenue || 0),
            sub: stats.revenueChange > 0 ? `↑ ${stats.revenueChange}%` : stats.revenueChange < 0 ? `↓ ${Math.abs(stats.revenueChange)}%` : 'No change',
            subColor: stats.revenueChange > 0 ? 'text-emerald-600' : stats.revenueChange < 0 ? 'text-red-500' : 'text-gray-500',
            icon: DollarSign,
            border: 'border-l-4 border-l-[#ff6a00]',
          },
          {
            label: 'Open Orders',
            value: String(totalOpenOrders),
            sub: `${sc.new || 0} new, ${sc.confirmed || 0} confirmed`,
            subColor: 'text-gray-500',
            icon: ShoppingBag,
            border: '',
          },
          {
            label: 'Products',
            value: String(stats.activeProducts || 0),
            sub: (stats.lowStockProducts || 0) > 0 ? `${stats.lowStockProducts} low stock` : 'All in stock',
            subColor: (stats.lowStockProducts || 0) > 0 ? 'text-orange-500' : 'text-gray-500',
            icon: PackageCheck,
            border: '',
          },
          {
            label: 'Completed',
            value: String(sc.delivered || 0),
            sub: 'orders delivered',
            subColor: 'text-gray-500',
            icon: Check,
            border: '',
          },
          {
            label: 'Response Rate',
            value: '95%',
            sub: 'Avg 2h response',
            subColor: 'text-gray-500',
            icon: Clock3,
            border: '',
          },
        ].map((card, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-44 rounded-lg border border-gray-200 bg-white p-4 ${card.border}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} className="text-gray-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
            <p className={`text-[10px] font-semibold mt-1 ${card.subColor}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Action Pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/supplier/orders" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#ff6a00] hover:text-[#ff6a00] transition-colors">
          <ShoppingBag size={12} /> Manage Orders
        </Link>
        <Link href="/supplier/products" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#ff6a00] hover:text-[#ff6a00] transition-colors">
          <PackageCheck size={12} /> Manage Products
        </Link>
        <Link href="/seller/profile/edit" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#ff6a00] hover:text-[#ff6a00] transition-colors">
          <Store size={12} /> Store Settings
        </Link>
        <Link href="/messages" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#ff6a00] hover:text-[#ff6a00] transition-colors">
          <MessageSquare size={12} /> Messages
        </Link>
      </div>

      {/* Widget Grid — Amazon-style cards */}
      <div className="grid gap-4 sm:grid-cols-2 mb-5">

        {/* Orders Widget */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-bold text-gray-900">Orders</h3>
            <Link href="/supplier/orders" className="text-xs font-semibold text-[#ff6a00] hover:underline">View all</Link>
          </div>
          <div className="p-5">
            {/* Status breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-lg font-bold text-orange-600">{sc.new || 0}</p>
                <p className="text-[10px] font-semibold text-gray-500 mt-0.5">New</p>
              </div>
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-lg font-bold text-blue-600">{sc.confirmed || 0}</p>
                <p className="text-[10px] font-semibold text-gray-500 mt-0.5">Confirmed</p>
              </div>
              <div className="text-center rounded-lg bg-gray-50 p-3">
                <p className="text-lg font-bold text-purple-600">{sc.out_for_delivery || 0}</p>
                <p className="text-[10px] font-semibold text-gray-500 mt-0.5">In Transit</p>
              </div>
            </div>
            {/* Recent orders list */}
            {actionable.length > 0 ? (
              <div className="space-y-2">
                {actionable.slice(0, 3).map((order: any) => (
                  <Link
                    key={order.id}
                    href={`/supplier/orders/${order.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5 hover:border-[#ff6a00]/30 hover:bg-orange-50/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">#{order.id}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          order.status === 'new' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status === 'new' ? 'New' : 'Confirmed'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{order.buyerName || 'Buyer'} · {money(order.total)}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{timeAgo(order.date)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No pending orders</p>
            )}
          </div>
        </div>

        {/* Inventory Widget */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-bold text-gray-900">Inventory</h3>
            <Link href="/supplier/products" className="text-xs font-semibold text-[#ff6a00] hover:underline">Manage</Link>
          </div>
          <div className="p-5">
            {topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.slice(0, 4).map((p: any) => (
                  <SellerProductCard
                    key={p.id}
                    product={{ ...p, unit: 'unit' }}
                    variant="compact"
                    showCategory={false}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No products yet</p>
            )}
            {(stats.lowStockProducts || 0) > 0 && (
              <div className="mt-3 rounded-lg bg-orange-50 border border-orange-200 p-2.5">
                <p className="text-[10px] font-bold text-orange-700">⚠ {stats.lowStockProducts} product{stats.lowStockProducts > 1 ? 's' : ''} running low on stock</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products Widget */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-bold text-gray-900">Top Products</h3>
            <Link href="/supplier/products" className="text-xs font-semibold text-[#ff6a00] hover:underline">View all</Link>
          </div>
          <div className="p-5">
            {topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.slice(0, 4).map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/supplier/products/${p.id}/edit`} className="text-xs font-semibold text-gray-900 hover:text-[#ff6a00] truncate block">
                        {p.name}
                      </Link>
                      <p className="text-[10px] text-gray-500">{p.stock} in stock</p>
                    </div>
                    <span className="text-xs font-bold text-gray-900">{money(p.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400 mb-2">No products yet</p>
                <Link href="/supplier/products/new" className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6a00] hover:underline">
                  <Plus size={12} /> Add your first product
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Widget */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <Link href="/supplier/products/new" className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center hover:border-[#ff6a00] hover:bg-orange-50 transition-colors">
                <Plus size={18} className="text-[#ff6a00]" />
                <span className="text-[11px] font-semibold text-gray-900">Add product</span>
              </Link>
              <Link href="/supplier/orders" className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center hover:border-[#ff6a00] hover:bg-orange-50 transition-colors">
                <Truck size={18} className="text-[#ff6a00]" />
                <span className="text-[11px] font-semibold text-gray-900">Orders</span>
              </Link>
              <Link href="/seller/profile" className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center hover:border-[#ff6a00] hover:bg-orange-50 transition-colors">
                <Store size={18} className="text-[#ff6a00]" />
                <span className="text-[11px] font-semibold text-gray-900">Store profile</span>
              </Link>
              <Link href="/seller/verify" className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center hover:border-[#ff6a00] hover:bg-orange-50 transition-colors">
                <ShieldCheck size={18} className="text-[#ff6a00]" />
                <span className="text-[11px] font-semibold text-gray-900">Verification</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders — full width */}
      {recentOrders.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-bold text-gray-900">Recent Orders</h3>
            <Link href="/supplier/orders" className="text-xs font-semibold text-[#ff6a00] hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Order</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Buyer</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-right">Total</th>
                  <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 5).map((order: any) => (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <Link href={`/supplier/orders/${order.id}`} className="text-xs font-bold text-[#ff6a00] hover:underline">
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-700">{order.buyerName || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                        order.status === 'new' ? 'bg-orange-50 text-orange-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-gray-900 text-right">{money(order.total)}</td>
                    <td className="px-5 py-3 text-[10px] text-gray-500 text-right">{timeAgo(order.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SupplierFrame>
  );
}

export function SupplierProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const supplierProductsQuery = useListMySupplierProducts();

  useEffect(() => {
    setIsLoading(supplierProductsQuery.isLoading);
    if (supplierProductsQuery.data) setProducts(supplierProductsQuery.data.map(product => ({ ...product, imageUrl: product.image, stock: product.stock, category: product.category, price: product.price, unit: product.unit })));
  }, [supplierProductsQuery.data, supplierProductsQuery.isLoading]);

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Drafts' },
    { value: 'out_of_stock', label: 'Out of stock' },
    { value: 'needs_review', label: 'Needs review' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'stock', label: 'Stock' },
    { value: 'sales', label: 'Sales' },
  ];

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products || [];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => {
        if (statusFilter === 'active') return product.stock > 0 && product.verified;
        if (statusFilter === 'out_of_stock') return product.stock === 0;
        if (statusFilter === 'draft') return !product.verified;
        if (statusFilter === 'needs_review') return !product.verified;
        return true;
      });
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.id - a.id;
        case 'oldest':
          return a.id - b.id;
        case 'price_high':
          return b.price - a.price;
        case 'price_low':
          return a.price - b.price;
        case 'stock':
          return b.stock - a.stock;
        case 'sales':
          return (b.reviews || 0) - (a.reviews || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [products, searchQuery, statusFilter, sortBy]);

  const getProductStatus = (product: Product) => {
    if (product.stock === 0) return { label: 'Out of stock', color: 'bg-red-100 text-red-700' };
    if (!product.verified) return { label: 'Needs review', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <SupplierFrame title="Products" action={
      <Link
        href="/supplier/products/new"
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
      >
        <Plus size={15} /> Add product
      </Link>
    }>
      <div className="mb-5">
        <p className="text-sm text-muted-foreground mb-4">
          Add, edit, pause, and update your products.
        </p>
        
        {/* Search and Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex h-11 flex-1 items-center rounded-lg border border-border bg-card px-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent px-3 text-sm outline-none"
              placeholder="Search products"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm outline-none"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === filter.value
                  ? 'border-[#ff6a00] bg-[#ff6a00] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      ) : !filteredAndSortedProducts.length ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <PackageCheck
            className="mx-auto text-muted-foreground"
            size={28}
          />
          <p className="mt-3 font-display text-lg font-bold">
            {products.length === 0 ? 'Your storefront is waiting' : 'No products match your filters'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length === 0 ? 'Add your first product to open the lane.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedProducts.map((product) => (
            <SellerProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                category: product.category,
                image: product.imageUrl,
                verified: product.verified,
                unit: product.unit,
              }}
              variant="seller"
              showEdit={true}
            />
          ))}
        </div>
      )}
    </SupplierFrame>
  );
}

export function SupplierOrdersPage() {
  const { data: orders = [], isLoading } = useListSupplierOrders({
    query: { refetchInterval: 10000 },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Pickup' },
    { value: 'out_for_delivery', label: 'Delivery' },
    { value: 'delivered', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.buyerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.destination || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(order.id).includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <SupplierFrame title="Orders">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground mb-4">
          Manage buyer requests, preparation, pickup, and delivery.
        </p>
        
        {/* Search Bar */}
        <div className="mb-4 flex h-11 items-center rounded-lg border border-border bg-card px-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent px-3 text-sm outline-none"
            placeholder="Search orders by buyer, location, or order number"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === filter.value
                  ? 'border-[#ff6a00] bg-[#ff6a00] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className="h-40 rounded-2xl"
            />
          ))}
        </div>
      ) : !filteredOrders.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Truck
            className="mx-auto text-muted-foreground"
            size={28}
          />
          <p className="mt-3 font-display text-lg font-bold">
            {orders.length === 0 ? 'No orders in the queue' : 'No orders match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-md hover:border-border/80"
              data-testid={`card-supplier-order-${order.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-mono text-xs font-bold text-muted-foreground">
                      ORDER #{String(order.id).padStart(5, '0')}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      order.status === 'new' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'ready' ? 'bg-purple-100 text-purple-700' :
                      order.status === 'out_for_delivery' ? 'bg-orange-100 text-orange-700' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-sm font-bold text-card-foreground">
                    {order.buyerName}
                  </p>
                  
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin size={13} />
                    <span className="truncate">
                      {(order as any).deliveryMethod === 'seller_delivery' ? 'Seller delivery' : 'Buyer pickup'} · {order.destination}
                    </span>
                  </div>
                  
                  <p className="mt-1 text-xs text-muted-foreground">
                    Received {formatDate(order.date)}
                  </p>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-xl font-bold text-card-foreground">
                    {money(order.total)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.itemCount} product{order.itemCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <Link 
                  href={`/supplier/orders/${order.id}`}
                  className="text-xs font-bold text-[#ff6a00] hover:underline"
                >
                  Review
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </SupplierFrame>
  );
}
