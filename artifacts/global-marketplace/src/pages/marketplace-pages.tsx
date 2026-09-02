import { useMemo, useState, useEffect, type FormEvent, type ReactNode } from 'react';
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

import { ProductCard as SellerProductCard, ProductCardGrid } from '@/components/product-card';
import { SellerWorkspace } from '@/components/seller-workspace';

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
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hardcoded mock data for preview
    const mockData = {
      revenue: 12450.80,
      revenueChange: 12,
      ordersThisWeek: 47,
      ordersChange: -3,
      activeProducts: 23,
      lowStockProducts: 4,
      statusCounts: {
        new: 8,
        confirmed: 5,
        processing: 3,
        ready: 2,
        out_for_delivery: 12,
        delivered: 156,
        cancelled: 7,
      },
      actionableOrders: [
        { id: 1847, status: 'new', buyerName: 'Kigali Fresh Market', itemCount: 12, total: 485.00, date: new Date(Date.now() - 1800000).toISOString() },
        { id: 1846, status: 'new', buyerName: 'Nyamirambo Wholesalers', itemCount: 8, total: 320.50, date: new Date(Date.now() - 3600000).toISOString() },
        { id: 1845, status: 'confirmed', buyerName: 'Huye Distributors', itemCount: 5, total: 195.00, date: new Date(Date.now() - 7200000).toISOString() },
        { id: 1844, status: 'new', buyerName: 'Musanze Traders', itemCount: 3, total: 87.50, date: new Date(Date.now() - 10800000).toISOString() },
      ],
      topProducts: [
        { id: 1, name: 'Premium Cassava Flour (50kg)', price: 45.00, stock: 120, category: 'Grains & Flour' },
        { id: 2, name: 'Fresh Beans (25kg)', price: 32.00, stock: 8, category: 'Legumes' },
        { id: 3, name: 'Vegetable Oil (20L)', price: 58.50, stock: 34, category: 'Oils & Fats' },
        { id: 4, name: 'Maize Grain (100kg)', price: 67.00, stock: 5, category: 'Grains & Flour' },
        { id: 5, name: 'Sugar (50kg)', price: 42.00, stock: 89, category: 'Sweeteners' },
      ],
      recentOrders: [
        { id: 1842, status: 'delivered', buyerName: 'Rubavu Markets Ltd', total: 782.00, date: new Date(Date.now() - 86400000).toISOString() },
        { id: 1838, status: 'delivered', buyerName: 'Kigali Fresh Market', total: 1245.50, date: new Date(Date.now() - 172800000).toISOString() },
        { id: 1835, status: 'out_for_delivery', buyerName: 'Gisenyi Wholesalers', total: 340.00, date: new Date(Date.now() - 259200000).toISOString() },
        { id: 1831, status: 'cancelled', buyerName: 'Muhanga Traders', total: 95.00, date: new Date(Date.now() - 345600000).toISOString() },
        { id: 1829, status: 'delivered', buyerName: 'Nyamirambo Wholesalers', total: 567.25, date: new Date(Date.now() - 432000000).toISOString() },
      ],
    };

    setTimeout(() => { setStats(mockData); setLoading(false); }, 600);
  }, []);

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

  useEffect(() => {
    // Hardcoded mock products
    const mockProducts = [
      { id: 1, name: 'Premium Cassava Flour (50kg)', category: 'Grains & Flour', price: 45.00, unit: 'bag', stock: 120, verified: true, reviews: 24, imageUrl: '/placeholder-product.jpg' },
      { id: 2, name: 'Fresh Beans (25kg)', category: 'Legumes', price: 32.00, unit: 'bag', stock: 8, verified: true, reviews: 18, imageUrl: '/placeholder-product.jpg' },
      { id: 3, name: 'Vegetable Oil (20L)', category: 'Oils & Fats', price: 58.50, unit: 'tin', stock: 34, verified: true, reviews: 31, imageUrl: '/placeholder-product.jpg' },
      { id: 4, name: 'Maize Grain (100kg)', category: 'Grains & Flour', price: 67.00, unit: 'bag', stock: 5, verified: true, reviews: 12, imageUrl: '/placeholder-product.jpg' },
      { id: 5, name: 'Sugar (50kg)', category: 'Sweeteners', price: 42.00, unit: 'bag', stock: 89, verified: true, reviews: 28, imageUrl: '/placeholder-product.jpg' },
      { id: 6, name: 'Rice (25kg)', category: 'Grains & Flour', price: 38.00, unit: 'bag', stock: 0, verified: true, reviews: 15, imageUrl: '/placeholder-product.jpg' },
      { id: 7, name: 'Salt (20kg)', category: 'Seasonings', price: 12.00, unit: 'bag', stock: 150, verified: true, reviews: 9, imageUrl: '/placeholder-product.jpg' },
      { id: 8, name: 'Onions (10kg)', category: 'Vegetables', price: 15.00, unit: 'bag', stock: 0, verified: false, reviews: 6, imageUrl: '/placeholder-product.jpg' },
      { id: 9, name: 'Tomatoes (5kg)', category: 'Vegetables', price: 8.00, unit: 'bag', stock: 25, verified: true, reviews: 21, imageUrl: '/placeholder-product.jpg' },
      { id: 10, name: 'Cooking Gas (12kg)', category: 'Fuel', price: 35.00, unit: 'cylinder', stock: 15, verified: true, reviews: 33, imageUrl: '/placeholder-product.jpg' },
    ];
    setTimeout(() => { setProducts(mockProducts); setIsLoading(false); }, 400);
  }, []);

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
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    // Hardcoded mock orders
    const mockOrders = [
      { id: 1847, status: 'new', buyerName: 'Kigali Fresh Market', destination: 'Nyarugenge, Kigali', itemCount: 12, total: 485.00, date: new Date(Date.now() - 1800000).toISOString(), deliveryMethod: 'seller_delivery' },
      { id: 1846, status: 'new', buyerName: 'Nyamirambo Wholesalers', destination: 'Nyamirambo, Kigali', itemCount: 8, total: 320.50, date: new Date(Date.now() - 3600000).toISOString(), deliveryMethod: 'buyer_pickup' },
      { id: 1845, status: 'confirmed', buyerName: 'Huye Distributors', destination: 'Huye Town', itemCount: 5, total: 195.00, date: new Date(Date.now() - 7200000).toISOString(), deliveryMethod: 'seller_delivery' },
      { id: 1844, status: 'new', buyerName: 'Musanze Traders', destination: 'Musanze Town', itemCount: 3, total: 87.50, date: new Date(Date.now() - 10800000).toISOString(), deliveryMethod: 'buyer_pickup' },
      { id: 1842, status: 'delivered', buyerName: 'Rubavu Markets Ltd', destination: 'Rubavu Town', itemCount: 15, total: 782.00, date: new Date(Date.now() - 86400000).toISOString(), deliveryMethod: 'seller_delivery' },
      { id: 1838, status: 'delivered', buyerName: 'Kigali Fresh Market', destination: 'Nyarugenge, Kigali', itemCount: 6, total: 275.00, date: new Date(Date.now() - 172800000).toISOString(), deliveryMethod: 'seller_delivery' },
      { id: 1835, status: 'out_for_delivery', buyerName: 'Gisenyi Wholesalers', destination: 'Gisenyi Town', itemCount: 10, total: 456.00, date: new Date(Date.now() - 259200000).toISOString(), deliveryMethod: 'seller_delivery' },
      { id: 1831, status: 'cancelled', buyerName: 'Muhanga Traders', destination: 'Muhanga Town', itemCount: 2, total: 95.00, date: new Date(Date.now() - 345600000).toISOString(), deliveryMethod: 'buyer_pickup' },
      { id: 1829, status: 'delivered', buyerName: 'Nyamirambo Wholesalers', destination: 'Nyamirambo, Kigali', itemCount: 8, total: 567.25, date: new Date(Date.now() - 432000000).toISOString(), deliveryMethod: 'seller_delivery' },
    ];
    setTimeout(() => { setOrders(mockOrders); setIsLoading(false); }, 400);
  }, []);

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
