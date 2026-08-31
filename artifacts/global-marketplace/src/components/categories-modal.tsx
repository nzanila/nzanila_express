import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, TrendingUp, Zap, Truck, Star } from 'lucide-react';
import { Link } from 'wouter';
import { subcategoryImages } from '@/lib/subcategory-images';

const categories = [
  { id: 'for-you', name: 'For you', icon: Star, subcategories: ['Hot selling', 'New Arrival', 'Top Rated', 'Fast shipping', 'Bulk deals', 'Local stock', 'Best value', 'Trending now', 'Verified suppliers'], featured: [] },
  { id: 'featured', name: 'Featured', icon: Zap, subcategories: ['Editor picks', 'Staff favorites', 'Rising stars', 'Premium', 'Exclusive', 'Limited edition'], featured: [] },
  { id: 'deals', name: 'Deals', icon: TrendingUp, subcategories: ['Flash sales', 'Clearance', 'Bundle offers', 'Free shipping', 'Buy 2 get 1', 'Wholesale only'], featured: [] },
  { id: 'apparel-accessories', name: 'Apparel & Accessories', icon: null, subcategories: ['Sandals', 'Sneakers', 'Sunglasses', 'Hoodies', 'Jackets', 'T-shirts', 'Jeans', 'Watches', 'Handbags', 'Belts', 'Hats', 'Scarves'], featured: ['Summer collection', 'Custom logo', 'Bulk orders'] },
  { id: 'consumer-electronics', name: 'Consumer Electronics', icon: null, subcategories: ['Laptops', 'Cameras', 'Drones', 'Earbuds', 'Smartphones', 'Tablets', 'Speakers', 'Headphones', 'Smartwatches', 'Power banks', 'Cables', 'Chargers'], featured: ['Hot selling', 'New Arrival', 'Fast shipping'] },
  { id: 'sports-entertainment', name: 'Sports & Entertainment', icon: null, subcategories: ['Basketball', 'Football', 'Tennis', 'Golf', 'Camping', 'Hiking', 'Cycling', 'Fishing', 'Yoga', 'Swimming', 'Fitness', 'Martial Arts'], featured: ['Summer collection', 'Custom logo', 'Bulk orders'] },
  { id: 'jewelry-eyewear', name: 'Jewelry, Eyewear & Watches', icon: null, subcategories: ['Rings', 'Necklaces', 'Earrings', 'Bracelets', 'Watches', 'Sunglasses', 'Eyeglasses', 'Brooches', 'Anklets', 'Fine Jewelry'], featured: ['Local stock', 'Fast delivery', 'Eco-friendly'] },
  { id: 'shoes-accessories', name: 'Shoes & Accessories', icon: null, subcategories: ['Sneakers', 'Sandals', 'Boots', 'Heels', 'Flats', 'Athletic Shoes', 'Socks', 'Slippers', 'Insoles', 'Shoe Care'], featured: ['Organic', 'Cruelty-free', 'Private label'] },
  { id: 'home-garden', name: 'Home & Garden', icon: null, subcategories: ['Furniture', 'Kitchen', 'Decor', 'Lighting', 'Bedding', 'Storage', 'Rugs', 'Curtains', 'Pillows', 'Planters', 'Wall Art'], featured: ['No import charges', 'Fastest delivery', 'Warranty'] },
  { id: 'sportswear-outdoor', name: 'Sportswear & Outdoor Apparel', icon: null, subcategories: ['Jerseys', 'Athletic Wear', 'Yoga Clothes', 'Running Gear', 'Jackets', 'Swimwear', 'Compression', 'Uniforms', 'Training', 'Performance'], featured: ['Bulk pricing', 'Custom printing', 'Quick ship'] },
  { id: 'beauty', name: 'Beauty', icon: null, subcategories: ['Skincare', 'Makeup', 'Hair Care', 'Nail Care', 'Fragrances', 'Personal Care', 'Tools', 'Organic', 'Anti-Aging', 'Sun Care'], featured: ['Safe materials', 'Educational', 'Wholesale'] },
  { id: 'luggage-bags', name: 'Luggage, Bags & Cases', icon: null, subcategories: ['Suitcases', 'Backpacks', 'Handbags', 'Travel Bags', 'Laptop Bags', 'Briefcases', 'Duffel', 'Wallets', 'Accessories'], featured: ['Heavy duty', 'Industrial grade', 'Bulk orders'] },
];

export function CategoriesModal({ isOpen, onClose, initialCategory }: { isOpen: boolean; onClose: () => void; initialCategory?: string }) {
  const [selectedCategory, setSelectedCategory] = useState(() => initialCategory ? categories.find(c => c.id === initialCategory) || categories[0] : categories[0]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const visibleCategories = sidebarExpanded ? categories : categories.slice(0, 9);

  useEffect(() => {
    if (initialCategory) {
      const category = categories.find(c => c.id === initialCategory);
      if (category) setSelectedCategory(category);
    }
  }, [initialCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-6xl mx-0 sm:mx-4 bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">Categories</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ════ LEFT SIDEBAR ════ */}
          <aside className="w-[130px] flex-shrink-0 border-r border-border overflow-y-auto sm:w-[180px] md:w-[200px]">
            <nav className="py-1 space-y-0.5">
              {visibleCategories.map((cat) => {
                const isSelected = selectedCategory.id === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center gap-1.5 rounded-none px-2.5 py-2.5 text-left text-[11px] font-medium transition-colors border-l-2 sm:px-3 sm:text-xs ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {Icon && <Icon size={13} className="flex-shrink-0" />}
                    <span className="truncate leading-tight">{cat.name}</span>
                  </button>
                );
              })}
            </nav>
            {categories.length > 9 && (
              <div className="px-2 pb-3 pt-1">
                <button
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors sm:px-3 sm:text-[11px]"
                >
                  {sidebarExpanded ? (
                    <><ChevronDown size={12} className="rotate-180" /> Show less</>
                  ) : (
                    <><ChevronDown size={12} /> All {categories.length}</>
                  )}
                </button>
              </div>
            )}
          </aside>

          {/* ════ MAIN CONTENT ════ */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            {/* Promo banner */}
            <div className="mb-4 rounded-xl overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 p-3 sm:p-5 text-white">
              <p className="text-sm font-bold sm:text-base">Local stock</p>
              <div className="mt-1.5 space-y-0.5 text-[11px] sm:text-sm text-emerald-100">
                <p className="flex items-center gap-1.5"><Truck size={12} /> Fastest delivery in 5 days</p>
                <p className="flex items-center gap-1.5"><Zap size={12} /> No import charges</p>
              </div>
            </div>

            {/* Circular subcategory icons */}
            <div className="mb-4">
              <h3 className="mb-3 text-sm font-bold text-foreground sm:text-base">Recommendations</h3>
              <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-5">
                {selectedCategory.subcategories.map((sub, i) => (
                  <Link
                    key={sub}
                    href={`/products?category=${encodeURIComponent(selectedCategory.name)}&search=${encodeURIComponent(sub)}`}
                    onClick={onClose}
                    className="group flex flex-col items-center gap-1.5 sm:gap-2"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-full bg-secondary transition-all group-hover:ring-2 group-hover:ring-primary/30 sm:h-20 sm:w-20">
                      <img
                        src={subcategoryImages[sub] ?? `https://placehold.co/200x200/f5f5f5/333333?text=${encodeURIComponent(sub.split(' ')[0])}`}
                        alt={sub}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {(i === 0 || i === 3) && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] text-white sm:h-4 sm:w-4 sm:text-[8px]">
                          <TrendingUp size={8} />
                        </span>
                      )}
                      {i === 5 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[7px] text-white sm:h-4 sm:w-4 sm:text-[8px]">
                          <Zap size={8} />
                        </span>
                      )}
                    </div>
                    <span className="text-center text-[10px] font-medium leading-tight text-foreground sm:text-xs">
                      {sub}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Featured tags */}
            {selectedCategory.featured.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-bold text-foreground sm:text-base">Featured</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {selectedCategory.featured.map((f) => (
                    <Link
                      key={f}
                      href={`/products?category=${encodeURIComponent(selectedCategory.name)}&search=${encodeURIComponent(f)}`}
                      onClick={onClose}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-bold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors sm:text-xs"
                    >
                      {f}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* View all */}
            <Link
              href={`/products?category=${encodeURIComponent(selectedCategory.name)}`}
              onClick={onClose}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-primary hover:bg-muted transition-colors sm:py-3 sm:text-sm"
            >
              View all {selectedCategory.name} products <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
