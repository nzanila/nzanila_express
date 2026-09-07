import { useEffect, useState } from 'react';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { Link } from 'wouter';
import { useListCategories, useListProducts, type Category } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLocale } from '@/lib/i18n/locale-context';

type CatalogCategory = Category & { parentId?: string | null };

export function CategoriesModal({ isOpen, onClose, initialCategory }: { isOpen: boolean; onClose: () => void; initialCategory?: string }) {
  const { tr } = useLocale();
  const { data, isLoading, isError, refetch } = useListCategories();
  const categories = (data || []) as CatalogCategory[];
  const [selected, setSelected] = useState(initialCategory);
  useEffect(() => { if (isOpen) setSelected(initialCategory); }, [isOpen, initialCategory]);
  const parentKey = (category: CatalogCategory) => String(category.parentId ?? (category as CatalogCategory & { parent_id?: string | null }).parent_id ?? '');
  const hasProducts = (category: CatalogCategory) => Number(category.count ?? 0) > 0;
  const roots = categories.filter((category) => {
    if (parentKey(category) && parentKey(category) !== 'null') return false;
    return hasProducts(category) || categories.some((child) => parentKey(child) === String(category.id) && hasProducts(child));
  });
  const active = categories.find((category) => category.id === selected) || roots[0];
  const children = categories.filter((category) => {
    const parent = parentKey(category);
    return Boolean(active) && hasProducts(category) && (parent === String(active?.id) || parent === String((active as CatalogCategory & { slug?: string }).slug || ''));
  });
  const { data: products, isLoading: productsLoading, isError: productsError } = useListProducts(
    { category: active?.name },
    { query: { enabled: isOpen && !!active && children.length === 0 } },
  );
  const categoryHref = '/products?category=' + encodeURIComponent(active?.name || '');
  const tiles = children.length ? children.map((category) => ({
    id: category.id, name: category.name, image: category.image,
    href: '/products?category=' + encodeURIComponent(category.name),
  })) : (products || []).map((product) => ({
    id: String(product.id), name: product.name, image: product.image, href: categoryHref,
  }));
  return <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="w-[96vw] max-w-6xl h-[min(720px,88dvh)] p-0 overflow-hidden">
      <DialogTitle className="sr-only">{tr('ui.browseCategories')}</DialogTitle>
      <div className="grid h-full min-h-0 grid-cols-[130px_minmax(0,1fr)] sm:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="overflow-y-auto overscroll-contain bg-gray-50 py-4">
          {isLoading && <p className="p-4 text-sm">{tr('ui.loadingCategories')}</p>}
          {isError && <button onClick={() => refetch()} className="p-4 text-sm">{tr('ui.couldntLoadCategoriesRetry')}</button>}
          {roots.map((category) => <button key={category.id} aria-pressed={active?.id === category.id} ref={(element) => { if (element && active?.id === category.id) element.scrollIntoView({ block: 'nearest' }); }} onClick={() => setSelected(category.id)}
            className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left text-xs sm:text-sm ${active?.id === category.id ? 'border-orange-500 bg-white font-bold' : 'border-transparent hover:bg-white'}`}>
            <LayoutGrid size={18} className="hidden shrink-0 sm:block" /><span className="flex-1">{category.name}</span><ChevronRight size={15} className="shrink-0" />
          </button>)}
        </aside>
        <section className="min-w-0 overflow-y-auto overscroll-contain p-4 pt-12 sm:p-6 sm:pt-12">
          {active && <><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{active.name}</h2><Link onClick={onClose} href={'/products?category=' + encodeURIComponent(active.name)} className="text-xs underline">{tr('ui.browseAllProducts')}</Link></div>
            {children.length === 0 && productsLoading && <p className="text-sm text-gray-500">{tr('ui.loadingProducts')}</p>}
            {children.length === 0 && productsError && <p className="text-sm text-gray-500">{tr('ui.productsCouldNotBeLoaded')}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
              {tiles.map((tile) => <Link key={tile.id} href={tile.href} onClick={onClose} className="group flex flex-col items-center gap-3 text-center">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gray-100 sm:h-24 sm:w-24 group-hover:ring-2 group-hover:ring-orange-400">
                  {tile.image ? <img src={tile.image} alt={tile.name} className="h-full w-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span className="px-2 text-center text-[10px] font-medium text-gray-400">{tr('ui.noImage')}</span>}
                </div><span className="text-xs sm:text-sm">{tile.name}</span>
              </Link>)}
              <Link href={'/products?category=' + encodeURIComponent(active.name)} onClick={onClose} className="flex flex-col items-center gap-3 text-center"><div className="grid h-20 w-20 place-items-center rounded-full bg-gray-100 sm:h-24 sm:w-24"><LayoutGrid size={30} className="text-gray-500" /></div><span className="text-sm">{tr('ui.viewAll')}</span></Link>
            </div>
          </>}
        </section>
      </div>
    </DialogContent>
  </Dialog>;
}
