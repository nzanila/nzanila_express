import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
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
import { AlibabaHomeHero } from '@/components/alibaba-home-hero';

const money = (value: number) => `$${value.toFixed(2)}`;
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function reorderRate(product: Product) {
  return Math.min(
    98,
    Math.round(72 + product.rating * 5 + (product.verified ? 8 : 0))
  );
}

function soldCount(product: Product) {
  return Math.round(product.reviews * 12.5 + product.stock * 0.3);
}

function supplierYears(name: string) {
  const map: Record<string, number> = {
    'Nova Living Co.': 9,
    'Kivu Craft Collective': 6,
    'Orion Tech Manufacturing': 11,
    'Safi Essentials': 7,
    'Global Freight Solutions': 12,
    'Pacific Logistics Hub': 8,
    'EastBridge Trading': 10,
    'Shenzhen Express Co.': 14,
  };
  return map[name] ?? 5;
}

function ProductImage({
  product,
  className = '',
}: {
  product: Product;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      {!broken && product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/10 to-secondary">
          <PackageCheck size={36} className="text-primary/40" />
        </div>
      )}
      {product.featured && (
        <span className="absolute left-3 top-3 rounded-md bg-primary px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
          Featured
        </span>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
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
          setTimeout(() => setAdded(false), 1800);
        },
      }
    );
  const rate = reorderRate(product);
  const sold = soldCount(product);
  const priceHigh = product.compareAtPrice ?? product.price * 1.18;
  const years = supplierYears(product.supplierName);

  return (
    <article
      className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
      data-testid={`card-product-${product.id}`}
    >
      <Link
        href={`/products/${product.id}`}
        className="block relative overflow-hidden"
        data-testid={`link-product-${product.id}`}
      >
        <ProductImage product={product} className="aspect-square w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </Link>
      <div className="p-2.5 sm:p-4">
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 text-[11px] sm:text-sm font-medium leading-tight text-card-foreground hover:text-primary transition-colors"
          data-testid={`link-product-name-${product.id}`}
        >
          {product.name}
        </Link>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {tr('product.reorderRate')}
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-emerald-600">
            {rate}%
          </span>
        </div>
        <p className="mt-1 text-sm sm:text-lg font-bold text-card-foreground">
          {money(product.price)}
          {priceHigh > product.price && (
            <span className="ml-1 text-[10px] sm:text-sm font-normal text-muted-foreground line-through">
              {money(priceHigh)}
            </span>
          )}
        </p>
        <div className="mt-1 hidden sm:flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {tr('product.moq')}: {product.moq} {product.unit}(s)
          </span>
          <span>{sold.toLocaleString()} {tr('product.sold')}</span>
        </div>
        <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 border-t border-border pt-1.5 sm:pt-2">
          {product.verified && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700">
              <BadgeCheck size={10} /> {tr('product.verified')}
            </span>
          )}
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {years} {tr('product.yrs')}
          </span>
        </div>
        <button
          onClick={addToCart}
          disabled={add.isPending || added}
          className={[
            'mt-2 sm:mt-3 flex w-full items-center justify-center gap-1.5',
            'rounded-md bg-primary px-3 py-2 sm:py-2.5',
            'text-[11px] sm:text-xs font-bold text-primary-foreground',
            'transition-all hover:bg-primary/90 hover:shadow-md',
            'active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed',
          ].join(' ')}
          data-testid={`button-add-cart-${product.id}`}
        >
          {added ? (
            <>
              <Check size={12} /> {tr('product.added')}
            </>
          ) : add.isPending ? (
            tr('product.adding')
          ) : (
            <>
              <ShoppingBag size={12} /> {tr('product.addCart')}
            </>
          )}
        </button>
      </div>
    </article>
  );
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
  const { data: categories, isLoading: categoriesLoading } =
    useListCategories();
  const { tr } = useLocale();
  const {
    data: products,
    isLoading: productsLoading,
    isError,
    refetch,
  } = useListProducts({ sort: 'featured' });
  const { data: suppliers } = useListSuppliers();

  return (
    <AppShell activeTab="market">
      <AlibabaHomeHero
        categories={categories}
        products={products}
        categoriesLoading={categoriesLoading}
        productsLoading={productsLoading}
      />
      <div className="bg-muted/30 px-0 pb-8 sm:px-4 lg:px-8">
        <section className="sm:rounded-xl border-0 sm:border border-border bg-card p-3 sm:p-6 shadow-none sm:shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-bold text-card-foreground">
              {tr('home.shippingSourcing')}
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
            <ProductGrid products={products} loading={productsLoading} />
          )}
        </section>
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              {tr('home.wholesaleSignal')}
            </p>
            <h2 className="mt-2 text-xl font-bold text-card-foreground">
              {tr('home.wholesaleTitle')}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {tr('home.wholesaleDesc')}
            </p>
            <Link
              href="/suppliers"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md"
              data-testid="link-explore-suppliers"
            >
              {tr('home.exploreSuppliers')} <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                {tr('home.supplierPulse')}
              </p>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-600" /> {tr('home.live')}
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {(Array.isArray(suppliers) ? suppliers : []).slice(0, 3).map((s) => (
                <SupplierMini key={s.id} supplier={s} />
              )) ??
                Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-10" />
                ))}
            </div>
            <Link
              href="/suppliers"
              className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs font-bold text-card-foreground hover:text-primary transition-colors"
              data-testid="link-view-suppliers"
            >
              {tr('home.viewSupplierDir')} <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
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
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const initialSearch = params.get('search') ?? '';
  const initialCategory = params.get('category') ?? '';
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<
    'featured' | 'price-low' | 'price-high' | 'rating'
  >('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: categories } = useListCategories();
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useListProducts({
    search: search || undefined,
    category: category || undefined,
    sort,
  });
  return (
    <AppShell activeTab="products">
      <div className="bg-background px-4 py-6 lg:px-8">
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
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex h-11 flex-1 items-center rounded-lg border border-border bg-card px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search size={17} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')
                  setLocation(
                    `/products?search=${encodeURIComponent(search)}`
                  );
              }}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              placeholder="Search by product, material, or supplier"
              data-testid="input-product-search"
            />
            <button
              onClick={() => setSearch('')}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear"
              data-testid="button-clear-search"
            >
              {search && <X size={15} />}
            </button>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            data-testid="select-sort-products"
          >
            <option value="featured">Featured first</option>
            <option value="rating">Top rated</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
        <div
          className={`mb-6 flex-wrap gap-2 ${filtersOpen ? 'flex' : 'hidden'} md:flex`}
        >
          <button
            onClick={() => setCategory('')}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
              !category
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-card-foreground hover:bg-muted'
            }`}
            data-testid="button-category-all"
          >
            All products
          </button>
          {categories?.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                setCategory(category === item.name ? '' : item.name)
              }
              className={`rounded-full border px-3 py-2 text-xs font-bold ${
                category === item.name
                  ? 'border-[#ff6a00] bg-[#ff6a00] text-white'
                  : 'border-gray-200 bg-white'
              }`}
              data-testid={`button-category-${item.id}`}
            >
              {item.name}
            </button>
          ))}
        </div>
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
              <span>
                {isLoading
                  ? 'Finding products…'
                  : `${products?.length ?? 0} products in view`}
              </span>
            </div>
            <ProductGrid products={products} loading={isLoading} />
          </>
        )}
      </div>
    </AppShell>
  );
}

export function ProductDetailPage() {
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
  const [activeTab, setActiveTab] = useState<'description' | 'attributes' | 'supplier'>('description');
  const add = useAddCartItem();

  const relatedQuery = useListProducts({
    category: product?.category,
    limit: 8,
  });
  const relatedProducts = (relatedQuery.data ?? []).filter(
    (p) => p.id !== productId
  );

  const sold = product ? soldCount(product) : 0;
  const reorder = product ? reorderRate(product) : 0;
  const yrs = product ? supplierYears(product.supplierName) : 5;

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

  const addToCart = () =>
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
      }
    );

  const tiers = [
    { from: 1, to: product.moq, price: product.price },
    { from: product.moq * 2, to: product.moq * 5, price: +(product.price * 0.92).toFixed(2) },
    { from: product.moq * 6, to: product.moq * 12, price: +(product.price * 0.85).toFixed(2) },
    { from: product.moq * 13, to: null, price: +(product.price * 0.78).toFixed(2) },
  ];

  const tabs = [
    { key: 'description' as const, label: tr('detail.description') },
    { key: 'attributes' as const, label: tr('detail.attributes') },
    { key: 'supplier' as const, label: tr('detail.supplier') },
  ];

  return (
    <AppShell activeTab="products" hideSearch>
      <div className="bg-background px-4 py-5 sm:px-5 sm:py-8 lg:px-10">
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
          <div>
            {/* Image gallery */}
            <div className="hidden sm:flex gap-3 lg:gap-3">
              <div className="flex flex-col gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 lg:h-[68px] lg:w-[68px] ${
                      i === 0 ? 'border-primary' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {product.image ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-secondary">
                        <PackageCheck size={14} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="group min-w-0 flex-1 overflow-hidden rounded-xl border border-border">
                <ProductImage product={product} className="aspect-square" />
              </div>
            </div>
            <div className="sm:hidden">
              <div className="group overflow-hidden rounded-xl border border-border">
                <ProductImage product={product} className="aspect-square" />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 ${i === 0 ? 'border-primary' : 'border-border'}`}>
                    {product.image ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-secondary"><PackageCheck size={12} className="text-muted-foreground" /></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Supplier card — below image */}
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Store size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{product.supplierName}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {product.verified && (
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <BadgeCheck size={12} /> {tr('product.verified')}
                      </span>
                    )}
                    <span>·</span>
                    <span>{tr('detail.yearsOnNzanila')}</span>
                  </div>
                </div>
                <Link href="/suppliers" className="flex-shrink-0 rounded-lg border border-primary px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/5">
                  {tr('detail.viewProfile')}
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-background p-2 text-center">
                  <p className="text-xs font-bold text-foreground">{product.rating.toFixed(1)}/5</p>
                  <p className="text-[10px] text-muted-foreground">{tr('detail.storeRating')}</p>
                </div>
                <div className="rounded-lg bg-background p-2 text-center">
                  <p className="text-xs font-bold text-foreground">&lt;{Math.round(24 - product.rating * 2)}h</p>
                  <p className="text-[10px] text-muted-foreground">{tr('detail.responseTime')}</p>
                </div>
                <div className="rounded-lg bg-background p-2 text-center">
                  <p className="text-xs font-bold text-foreground">{90 + Math.round(product.rating)}%</p>
                  <p className="text-[10px] text-muted-foreground">{tr('detail.onTime')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ════ MIDDLE COLUMN: details + attributes ════ */}
          <div className="min-w-0">
            {/* Shipping banner */}
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <Truck size={15} />
              <span>{tr('detail.freeShipping')} — {tr('detail.shippingCapped')}</span>
            </div>

            {/* Title */}
            <h1 className="max-w-2xl text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
              {product.name}
            </h1>

            {/* Rating + stats */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="flex items-center gap-1 font-bold text-foreground">
                <Star size={14} className="fill-amber-400 text-amber-400" /> {product.rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">({product.reviews.toLocaleString()} {tr('detail.reviews')})</span>
              <span className="h-4 w-px bg-border" />
              <span className="text-muted-foreground">{sold.toLocaleString()} {tr('product.sold')}</span>
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

              {/* Tier prices — horizontal chips */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {tiers.map((t, i) => {
                  const active = quantity >= t.from && (!t.to || quantity <= t.to);
                  return (
                    <div key={i} className={`rounded-lg border px-3 py-2 text-center text-xs ${active ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-border text-foreground'}`}>
                      <p className="font-bold">{money(t.price)}</p>
                      <p className="text-[10px] text-muted-foreground">{t.from}–{t.to ?? '∞'} {product.unit}</p>
                    </div>
                  );
                })}
              </div>

              {/* MOQ */}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{tr('product.moq')}</span>
                <strong className="text-foreground">{product.moq} {product.unit}</strong>
              </div>

              {/* Quantity + buttons */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="flex h-11 items-center rounded-lg border border-border bg-background sm:h-12">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 text-lg font-bold text-foreground" data-testid="button-decrease-quantity">−</button>
                  <span className="w-10 text-center text-sm font-bold text-foreground" data-testid="text-product-quantity">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-3 text-lg font-bold text-foreground" data-testid="button-increase-quantity">+</button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={addToCart}
                  disabled={add.isPending || added}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:h-12"
                  data-testid="button-detail-add-cart"
                >
                  {added ? <><Check size={16} /> {tr('product.added')}</> : add.isPending ? tr('product.adding') : tr('product.addCart')}
                </button>
                <button
                  onClick={() => { addToCart(); setTimeout(() => setLocation('/cart'), 400); }}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-bold text-foreground hover:bg-muted sm:h-12"
                  data-testid="button-start-order"
                >
                  {tr('detail.startOrder')}
                </button>
              </div>
              {added && (
                <button onClick={() => setLocation('/cart')} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-primary py-2.5 text-xs font-bold text-primary" data-testid="button-go-cart">
                  {tr('cart.view')} <ArrowRight size={14} />
                </button>
              )}
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
                  <p className="mt-0.5 font-bold text-foreground">{product.moq} {product.unit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{tr('detail.stock')}</p>
                  <p className="mt-0.5 font-bold text-foreground">{product.stock.toLocaleString()} units</p>
                </div>
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: guarantee + payment ════ */}
          <div className="space-y-4">
            {/* Guarantee panel */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">{tr('detail.nzanilaGuarantee')}</p>
              <div className="mt-3 space-y-3">
                <div className="flex gap-3">
                  <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{tr('detail.securePayments')}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{tr('detail.securePaymentsDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Truck size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{tr('detail.guaranteedDelivery')}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{tr('detail.guaranteedDeliveryDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <RefreshCw size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{tr('detail.moneyBack')}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{tr('detail.moneyBackDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-bold text-foreground">{tr('detail.paymentMethods')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Visa', 'Mastercard', 'PayPal', 'Apple Pay', 'Bank Transfer'].map((m) => (
                  <span key={m} className="rounded-md border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-foreground">{m}</span>
                ))}
              </div>
            </div>

            {/* Need help */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="flex-shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">{tr('detail.needHelp')}</p>
                  <p className="text-[11px] text-muted-foreground">{tr('detail.chatWithSupplier')}</p>
                </div>
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
                  {product.description || 'A carefully specified product from a verified supplier ready to ship worldwide.'}
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <Star size={18} className="mx-auto fill-amber-400 text-amber-400" />
                    <p className="mt-1 text-sm font-bold text-foreground">{product.rating.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">{tr('detail.rating')}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <Clock3 size={18} className="mx-auto text-primary" />
                    <p className="mt-1 text-sm font-bold text-foreground">&lt;{Math.round(24 - product.rating * 2)}h</p>
                    <p className="text-[10px] text-muted-foreground">{tr('detail.responseTime')}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <RefreshCw size={18} className="mx-auto text-primary" />
                    <p className="mt-1 text-sm font-bold text-foreground">{90 + Math.round(product.rating)}%</p>
                    <p className="text-[10px] text-muted-foreground">{tr('detail.onTime')}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <Layers3 size={18} className="mx-auto text-primary" />
                    <p className="mt-1 text-sm font-bold text-foreground">{yrs} {tr('product.yrs')}</p>
                    <p className="text-[10px] text-muted-foreground">{tr('detail.experience')}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{tr('detail.supplierDesc')}</p>
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
  const [destination, setDestination] = useState(
    'New York, United States'
  );
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const create = useCreateOrder();
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
      { data: { destination } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetCartQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getListOrdersQueryKey(),
          });
          setCheckoutOpen(false);
          setLocation('/orders');
        },
      }
    );
  };
  if (isLoading)
    return (
      <AppShell>
        <div className="px-5 py-10 lg:px-10">
          <PageIntro
            eyebrow="Your cart"
            title="Loading your order"
          />
          <SkeletonBlock className="h-48" />
        </div>
      </AppShell>
    );
  if (isError)
    return (
      <AppShell>
        <div className="px-5 py-10 lg:px-10">
          <ErrorState onRetry={() => refetch()} />
        </div>
      </AppShell>
    );
  return (
    <AppShell>
      <div className="px-5 py-8 lg:px-10">
        <PageIntro
          eyebrow="Your cart"
          title={
            cart?.itemCount
              ? `${cart.itemCount} items ready to go`
              : 'Your cart is clear'
          }
          description={
            cart?.itemCount
              ? 'Review quantities, confirm your destination, and hand off to checkout.'
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
                Your sourcing list starts here.
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add products from the marketplace and they will appear in
                this workspace.
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
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-md hover:border-border/80"
                    data-testid={`row-cart-item-${item.productId}`}
                  >
                    <ProductImage
                      product={item.product}
                      className="h-24 w-24 shrink-0 rounded-xl sm:h-28 sm:w-28"
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
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex h-9 items-center rounded-lg border border-border">
                          <button
                            onClick={() =>
                              onUpdate(
                                item.productId,
                                item.quantity - 1
                              )
                            }
                            className="px-2.5"
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
                            className="px-2.5"
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
              <aside className="h-fit rounded-2xl bg-primary p-6 text-primary-foreground">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground/60">
                  Order summary
                </p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/65">
                      Subtotal
                    </span>
                    <span>{money(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary-foreground/65">
                      Estimated shipping
                    </span>
                    <span>{money(cart.shipping)}</span>
                  </div>
                  <div className="flex justify-between border-t border-primary-foreground/15 pt-4 font-display text-xl font-bold">
                    <span>Total</span>
                    <span>{money(cart.total)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-xs font-bold text-accent-foreground"
                  data-testid="button-checkout"
                >
                  Continue to checkout <ArrowRight size={15} />
                </button>
                <p className="mt-3 text-center text-[10px] text-primary-foreground/45">
                  You will confirm destination next
                </p>
              </aside>
            </div>
          )}
        </>
        {checkoutOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-primary/30 p-4 backdrop-blur-sm">
            <form
              onSubmit={checkout}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Checkout handoff
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold">
                    Where should it land?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground"
                  aria-label="Close checkout"
                  data-testid="button-close-checkout"
                >
                  <X size={18} />
                </button>
              </div>
              <label className="mt-6 block text-xs font-bold">
                Destination
                <input
                  required
                  minLength={2}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                  placeholder="City, country"
                  data-testid="input-checkout-destination"
                />
              </label>
              <div className="mt-5 rounded-xl bg-secondary p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Order total
                  </span>
                  <strong>{money(cart?.total ?? 0)}</strong>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your supplier will confirm the shipping details after
                  the order is placed.
                </p>
              </div>
              <button
                disabled={create.isPending}
                className="mt-5 flex w-full justify-center rounded-xl bg-primary py-3.5 text-xs font-bold text-primary-foreground"
                data-testid="button-place-order"
              >
                {create.isPending
                  ? 'Placing order…'
                  : 'Place order'}
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function OrdersPage() {
  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useListOrders();
  return (
    <AppShell>
      <div className="px-5 py-8 lg:px-10">
        <PageIntro
          eyebrow="Buyer workspace"
          title="Your orders"
          description="Follow every order from confirmation to doorstep."
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
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard order={order} key={order.id} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
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
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        <span>
          {order.itemCount} item{order.itemCount === 1 ? '' : 's'} ·{' '}
          {order.buyerName}
        </span>
        <span className="flex items-center gap-1.5 font-bold text-primary cursor-pointer hover:underline">
          <Clock3 size={14} /> Track shipment
        </span>
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
}: {
  children: ReactNode;
  title: string;
}) {
  const { user } = useAuth();
  const verificationStatus = (user as any)?.verificationStatus || 'not_verified';
  const isUnverified = verificationStatus === 'not_verified' || verificationStatus === 'not_submitted';

  return (
    <AppShell mode="supplier">
      <div className="px-5 py-8 lg:px-10">
        {isUnverified && (
          <Link href="/seller/verify" className="mb-6 flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3 transition-colors hover:bg-yellow-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base text-yellow-600">✓</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-yellow-800">Verify your ID to get a Verified badge</p>
            </div>
            <span className="text-xs font-semibold text-yellow-700">Optional →</span>
          </Link>
        )}

        <div className="mb-8 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Supplier desk
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.06em]">
                {title}
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-[#3e856d]" />
              Storefront live
            </div>
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
    </AppShell>
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
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetSupplierDashboard();
  if (isError)
    return (
      <SupplierFrame title="Overview">
        <ErrorState onRetry={() => refetch()} />
      </SupplierFrame>
    );
  if (isLoading)
    return (
      <SupplierFrame title="Overview">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-36" />
          ))}
        </div>
      </SupplierFrame>
    );
  return (
    <SupplierFrame title="Overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Revenue this month"
          value={money(data?.revenue ?? 0)}
          change={`+${data?.revenueChange ?? 0}%`}
          icon={DollarSign}
        />
        <Kpi
          label="Orders to fulfill"
          value={String(data?.orders ?? 0)}
          change={`+${data?.ordersChange ?? 0}%`}
          icon={Truck}
        />
        <Kpi
          label="Live products"
          value={String(data?.products ?? 0)}
          icon={PackageCheck}
        />
        <Kpi
          label="Low stock watch"
          value={String(data?.lowStock ?? 0)}
          icon={Layers3}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Sales performance
              </p>
              <h2 className="mt-1 font-display text-xl font-bold">
                Revenue rhythm
              </h2>
            </div>
            <BarChart3 size={19} className="text-muted-foreground" />
          </div>
          <div className="mt-8 flex h-48 items-end gap-2 border-b border-border pb-0">
            {(data?.sales ?? []).map((point, i) => (
              <div
                key={point.label}
                className="group flex flex-1 flex-col items-center gap-2"
              >
                <div
                  className="relative w-full max-w-8 rounded-t-md bg-accent transition-all duration-500 group-hover:bg-primary"
                  style={{
                    height: `${Math.max(
                      8,
                      (point.value /
                        Math.max(
                          ...(data?.sales ?? [{ value: 1 }]).map(
                            (x) => x.value
                          )
                        )) *
                        100
                    )}%`,
                  }}
                  title={money(point.value)}
                />
                <span className="font-mono text-[9px] text-muted-foreground">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Action queue
              </p>
              <h2 className="mt-1 font-display text-xl font-bold">
                Recent orders
              </h2>
            </div>
            <Link
              href="/supplier/orders"
              className="text-xs font-bold text-primary"
              data-testid="link-dashboard-orders"
            >
              View all
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {(Array.isArray(data?.recentOrders) ? data.recentOrders : []).slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    #{order.id} · {order.destination}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.itemCount} items · {order.status}
                  </p>
                </div>
                <p className="font-display font-bold">
                  {money(order.total)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SupplierFrame>
  );
}

export function SupplierProductsPage() {
  const queryClient = useQueryClient();
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useListMySupplierProducts();
  const create = useCreateSupplierProduct();
  const update = useUpdateSupplierProduct();
  const [editing, setEditing] = useState<Product | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    price: '',
    moq: '1',
    stock: '0',
    unit: 'unit',
    description: '',
  });
  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      category: '',
      price: '',
      moq: '1',
      stock: '0',
      unit: 'unit',
      description: '',
    });
    setModal(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      moq: String(product.moq),
      stock: String(product.stock),
      unit: product.unit,
      description: product.description ?? '',
    });
    setModal(true);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (editing)
      update.mutate(
        {
          id: editing.id,
          data: {
            name: form.name,
            price: Number(form.price),
            moq: Number(form.moq),
            stock: Number(form.stock),
            description: form.description,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListMySupplierProductsQueryKey(),
            });
            queryClient.invalidateQueries({
              queryKey: getGetSupplierDashboardQueryKey(),
            });
            setModal(false);
          },
        }
      );
    else
      create.mutate(
        {
          data: {
            name: form.name,
            category: form.category,
            price: Number(form.price),
            moq: Number(form.moq),
            stock: Number(form.stock),
            unit: form.unit,
            description: form.description,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListMySupplierProductsQueryKey(),
            });
            queryClient.invalidateQueries({
              queryKey: getGetSupplierDashboardQueryKey(),
            });
            setModal(false);
          },
        }
      );
  };
  return (
    <SupplierFrame title="My products">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products?.length ?? 0} active listings
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
          data-testid="button-create-product"
        >
          <Plus size={15} /> Add product
        </button>
      </div>
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20" />
          ))}
        </div>
      ) : !products?.length ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <PackageCheck
            className="mx-auto text-muted-foreground"
            size={28}
          />
          <p className="mt-3 font-display text-lg font-bold">
            Your storefront is waiting
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first product to open the lane.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-border bg-secondary/50 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">MOQ</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border last:border-0"
                  data-testid={`row-supplier-product-${product.id}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ProductImage
                        product={product}
                        className="h-11 w-11 rounded-lg"
                      />
                      <div>
                        <p className="font-bold">{product.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {product.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-bold">
                    {money(product.price)} / {product.unit}
                  </td>
                  <td className="px-5 py-4">{product.moq}</td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        product.stock < 20
                          ? 'font-bold text-destructive'
                          : ''
                      }
                    >
                      {product.stock.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => openEdit(product)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-secondary"
                      data-testid={`button-edit-product-${product.id}`}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-primary/30 p-4 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Catalog editor
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  {editing ? 'Edit product' : 'Add product'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground"
                aria-label="Close product editor"
                data-testid="button-close-product-editor"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ['name', 'Product name'],
                ['category', 'Category'],
                ['price', 'Price'],
                ['moq', 'Minimum order'],
                ['stock', 'Stock'],
                ['unit', 'Unit'],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-bold">
                  {label}
                  <input
                    required={['name', 'category', 'price'].includes(
                      key
                    )}
                    type={
                      ['price', 'moq', 'stock'].includes(key)
                        ? 'number'
                        : 'text'
                    }
                    value={
                      form[key as keyof typeof form]
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]: e.target.value,
                      })
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:border-primary"
                    data-testid={`input-product-${key}`}
                  />
                </label>
              ))}
              <label className="text-xs font-bold sm:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  className="mt-2 min-h-20 w-full rounded-lg border border-border bg-background p-3 text-sm font-normal outline-none focus:border-primary"
                  data-testid="input-product-description"
                />
              </label>
            </div>
            <button
              disabled={create.isPending || update.isPending}
              className="mt-6 flex w-full justify-center rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground"
              data-testid="button-save-product"
            >
              {create.isPending || update.isPending
                ? 'Saving…'
                : editing
                  ? 'Save changes'
                  : 'Publish product'}
            </button>
          </form>
        </div>
      )}
    </SupplierFrame>
  );
}

export function SupplierOrdersPage() {
  const queryClient = useQueryClient();
  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useListSupplierOrders();
  const update = useUpdateSupplierOrderStatus();
  const setStatus = (id: number, status: OrderStatusUpdateStatus) =>
    update.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListSupplierOrdersQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetSupplierDashboardQueryKey(),
          });
        },
      }
    );
  return (
    <SupplierFrame title="Orders">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Keep buyers moving with clear updates.
        </p>
        <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <RefreshCw size={13} /> Auto-synced
        </span>
      </div>
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className="h-48 rounded-2xl"
            />
          ))}
        </div>
      ) : !orders?.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Truck
            className="mx-auto text-muted-foreground"
            size={28}
          />
          <p className="mt-3 font-display text-lg font-bold">
            No orders in the queue
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md hover:border-border/80"
              data-testid={`card-supplier-order-${order.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold text-muted-foreground">
                    ORDER #{String(order.id).padStart(5, '0')}
                  </p>
                  <p className="mt-2 text-sm font-bold text-card-foreground">
                    {order.buyerName}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin size={13} />
                    {order.destination} · {formatDate(order.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-card-foreground">
                    {money(order.total)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.itemCount} items
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <span className="rounded-full bg-secondary px-3 py-1.5 font-mono text-[10px] font-bold uppercase">
                  {order.status}
                </span>
                <div className="flex gap-2">
                  {order.status !== 'processing' &&
                    order.status !== 'shipped' &&
                    order.status !== 'delivered' && (
                      <button
                        onClick={() =>
                          setStatus(order.id, 'processing')
                        }
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                        data-testid={`button-process-order-${order.id}`}
                      >
                        Start processing
                      </button>
                    )}
                  {order.status === 'processing' && (
                    <button
                      onClick={() =>
                        setStatus(order.id, 'shipped')
                      }
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                      data-testid={`button-ship-order-${order.id}`}
                    >
                      Mark shipped
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button
                      onClick={() =>
                        setStatus(order.id, 'delivered')
                      }
                      className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground"
                      data-testid={`button-deliver-order-${order.id}`}
                    >
                      Mark delivered
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </SupplierFrame>
  );
}
