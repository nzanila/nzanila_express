import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, PackageCheck, Search, ShoppingBag, Star } from 'lucide-react';
import { type Product } from '@workspace/api-client-react';

const money = (v: number) => `$${v.toFixed(2)}`;

export function HomePageSlideshow({ products, loading }: { products?: Product[]; loading?: boolean }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!products || products.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % products.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [products]);

  if (loading || !products || products.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-2xl shadow-sm border border-border bg-card mb-8 h-[400px] animate-pulse" />
    );
  }

  const product = products[current];

  return (
    <section className="relative overflow-hidden rounded-2xl shadow-sm border border-border bg-card mb-8">
      <div className="flex flex-col md:flex-row">
        <div className="relative flex-1 overflow-hidden bg-secondary md:aspect-[1.12]">
          {!product.image ? (
            <div className="grid h-full w-full place-items-center">
              <PackageCheck size={48} className="text-primary/40" />
            </div>
          ) : (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading={current === 0 ? 'eager' : 'lazy'}
            />
          )}
        </div>

        <div className="relative flex-1 p-6 sm:p-8 md:p-10">
          <div className="mb-3 flex items-center gap-1.5">
            <Star size={14} className="fill-primary text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {product.rating.toFixed(1)} · {product.reviews} reviews
            </span>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {product.category} · MOQ {product.moq} {product.unit}
          </p>

          <Link href={`/products/${product.id}`} className="mt-2 block">
            <h2 className="font-display text-xl font-bold leading-tight tracking-[-0.04em] text-card-foreground hover:text-primary transition-colors">
              {product.name}
            </h2>
          </Link>

          <p className="mt-3 font-display text-2xl font-bold text-card-foreground">
            {money(product.price)} <span className="text-xs font-sans font-medium text-muted-foreground">per {product.unit}</span>
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Supplier: {product.supplierName}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link href={`/products/${product.id}`}>
              <button className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-5 py-3 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md" data-testid={`slide-cta-${product.id}`}>
                View details <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <form action="/products" className="absolute bottom-6 left-6 right-6">
        <div className="flex h-12 max-w-2xl items-center rounded-lg border border-border bg-card px-3 shadow-sm">
          <Search size={17} className="text-muted-foreground" />
          <input name="search" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground" placeholder="What are you looking to source?" data-testid="input-hero-search" />
          <span className="hidden rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground lg:inline">⌘ K</span>
        </div>
      </form>

      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 pb-4">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? 'w-8 bg-primary' : 'w-2 bg-border'
            }`}
            aria-label={`Go to slide ${i + 1}`}
            data-testid={`slide-indicator-${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
