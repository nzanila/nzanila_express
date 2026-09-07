import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { Link } from 'wouter';
import { useListCategories, useListProducts, type Category, type Product } from '@workspace/api-client-react';
import { AppShell } from '@/components/marketplace-shell';
import { useLocale } from '@/lib/i18n/locale-context';

export function CategoriesPage() {
  const { tr } = useLocale();
  const { data: categoryData, isLoading: categoriesLoading, isError: categoriesError } = useListCategories();
  const categories = (categoryData || []) as Category[];
  const [selectedId, setSelectedId] = useState('');
  const { data: productData, isLoading: productsLoading } = useListProducts({ limit: 100 });
  const products = (productData || []) as Product[];
  useEffect(() => {
    if (!selectedId && categories[0]) setSelectedId(categories[0].id);
    if (selectedId && !categories.some(category => category.id === selectedId)) setSelectedId(categories[0]?.id || '');
  }, [categories, selectedId]);
  const selectedCategory = categories.find(category => category.id === selectedId) || categories[0];
  const selectedProducts = useMemo(() => selectedCategory ? products.filter(product => product.category.toLowerCase() === selectedCategory.name.toLowerCase()).slice(0, 12) : [], [products, selectedCategory]);

  return <AppShell activeTab="market">
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      <div className="flex min-w-0">
        <aside className="sticky top-[56px] h-[calc(100vh-56px-56px)] w-[158px] flex-shrink-0 overscroll-contain overflow-y-auto border-r border-border bg-card [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin] sm:w-[205px] lg:h-[calc(100vh-56px)] lg:w-[240px]" aria-label={tr('ui.productCategories')}>
          <nav className="space-y-0.5 py-2">
            {categoriesLoading && <p className="p-3 text-[11px] text-muted-foreground">{tr('ui.loading2')}</p>}
            {categoriesError && <p className="p-3 text-[11px] text-red-600">{tr('ui.unavailable')}</p>}
            {categories.map(category => <button key={category.id} type="button" onClick={() => setSelectedId(category.id)} className={`flex min-h-11 w-full items-center gap-2 border-l-2 px-3 py-3 text-left text-xs leading-tight transition-colors sm:px-4 ${selectedCategory?.id === category.id ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}><LayoutGrid size={15} className="shrink-0" /><span className="break-words">{category.name}</span></button>)}
          </nav>
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overscroll-contain overflow-y-auto pb-20 p-3 [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin] sm:p-5">
          <div className="mb-5 flex min-w-0 items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 text-white sm:p-5"><div className="min-w-0"><p className="truncate text-sm font-bold sm:text-base">{selectedCategory?.name || 'Categories'}</p><p className="mt-1 text-xs text-emerald-100">{tr('ui.chooseAProductToContinue')}</p></div>{selectedCategory && <Link href={`/products?category=${encodeURIComponent(selectedCategory.name)}`} className="shrink-0 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-emerald-700">{tr('ui.viewAll')}</Link>}</div>
          <section><h1 className="mb-4 text-base font-bold text-foreground">{selectedCategory?.name || 'Recommendations'}</h1>{productsLoading ? <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">{Array.from({ length: 9 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-full bg-muted" />)}</div> : selectedProducts.length ? <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">{selectedProducts.map(product => <Link key={product.id} href={`/products?category=${encodeURIComponent(selectedCategory.name)}&search=${encodeURIComponent(product.name)}`} className="group min-w-0 text-center"><div className="mx-auto aspect-square w-full max-w-[96px] overflow-hidden rounded-full bg-secondary ring-1 ring-transparent transition group-hover:ring-2 group-hover:ring-primary/40"><img src={product.image} alt={product.name} className="h-full w-full rounded-[inherit] object-cover" loading="lazy" /></div><span className="mt-2 block line-clamp-2 break-words text-[11px] font-medium leading-tight text-foreground sm:text-xs">{product.name}</span></Link>)}</div> : <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">{tr('ui.noProductsInThisCategoryYet')}</div>}</section>
          {selectedCategory && <Link href={`/products?category=${encodeURIComponent(selectedCategory.name)}`} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-primary">View all {selectedCategory.name} products <ChevronRight size={16} /></Link>}
        </main>
      </div>
    </div>
  </AppShell>;
}
