import { Link } from 'wouter';
import {
  Package,
} from 'lucide-react';
import { type Category, type Product } from '@workspace/api-client-react';
import { SkeletonBlock } from '@/components/marketplace-shell';
import { useLocale } from '@/lib/i18n/locale-context';

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
  const { tr } = useLocale();

  return (
    <section className="mb-4 bg-white px-3 py-3 lg:px-8">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-gray-900">{tr('ui.recommendedProducts')}</h2><span className="text-[11px] text-gray-500">{productsLoading ? 'Loading…' : `${products?.length ?? 0} products`}</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(productsLoading ? [] : (products || []).slice(0, 4)).map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="overflow-hidden rounded-md border border-gray-200 bg-white hover:border-[#ff6a00]">
                <div className="aspect-[1.3] bg-gray-100">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Package size={22} className="text-gray-300" /></div>}</div>
                <div className="p-2"><p className="line-clamp-2 text-[11px] font-semibold text-gray-800">{product.name}</p><p className="mt-1 text-xs font-bold text-[#ff6a00]">{product.price.toLocaleString()} BIF</p></div>
              </Link>
            ))}
          </div>
      </div>
    </section>
  );
}
