import { useState } from 'react';
import { Link } from 'wouter';
import { PackageCheck, Pencil, ExternalLink } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    price: number;
    stock: number;
    category: string;
    image?: string;
    verified?: boolean;
    unit?: string;
  };
  variant?: 'seller' | 'buyer' | 'compact';
  showEdit?: boolean;
  showStock?: boolean;
  showCategory?: boolean;
}

function ProductImage({ src, name, className = '' }: { src?: string; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  
  if (!src || broken) {
    return (
      <div className={`grid place-items-center bg-gradient-to-br from-orange-50 to-gray-100 ${className}`}>
        <PackageCheck size={24} className="text-orange-300" />
      </div>
    );
  }
  
  return (
    <img
      src={src}
      alt={name}
      className={`object-cover ${className}`}
      onError={() => setBroken(true)}
    />
  );
}

export function ProductCard({ product, variant = 'seller', showEdit = false, showStock = true, showCategory = true }: ProductCardProps) {
  const isLowStock = product.stock < 10;
  
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5 hover:border-orange-200 hover:bg-orange-50/30 transition-colors">
        <ProductImage
          src={product.image}
          name={product.name}
          className="h-12 w-12 rounded-lg flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
          {showCategory && <p className="text-[10px] text-gray-500">{product.category}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-gray-900">{product.price.toLocaleString()} BIF</p>
          {showStock && (
            <p className={`text-[10px] font-semibold ${isLowStock ? 'text-red-500' : 'text-gray-500'}`}>
              {product.stock} units
            </p>
          )}
        </div>
      </div>
    );
  }
  
  if (variant === 'buyer') {
    return (
      <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
        <Link href={`/products/${product.id}`} className="block">
          <div className="relative aspect-square overflow-hidden">
            <ProductImage
              src={product.image}
              name={product.name}
              className="h-full w-full group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
        <div className="p-3">
          <Link href={`/products/${product.id}`}>
            <p className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-orange-500 transition-colors">{product.name}</p>
          </Link>
          {showCategory && <p className="text-xs text-gray-500 mt-1">{product.category}</p>}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">{product.price.toLocaleString()} BIF</p>
            {product.verified && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Verified
              </span>
            )}
          </div>
          {showStock && (
            <p className={`text-xs mt-1 ${isLowStock ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
              {isLowStock ? `Only ${product.stock} left` : `${product.stock} in stock`}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // Seller variant
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:border-orange-200 hover:shadow-sm transition-all">
      <div className="flex gap-3">
        <ProductImage
          src={product.image}
          name={product.name}
          className="h-20 w-20 rounded-lg flex-shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</p>
            {product.stock === 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 flex-shrink-0">
                Out of stock
              </span>
            )}
            {product.stock > 0 && product.stock < 10 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 flex-shrink-0">
                Low stock
              </span>
            )}
          </div>
          {showCategory && <p className="text-xs text-gray-500 mt-0.5">{product.category}</p>}
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm font-bold text-gray-900">{product.price.toLocaleString()} BIF/{product.unit || 'unit'}</p>
            {showStock && (
              <p className={`text-xs ${isLowStock ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                Stock: {product.stock}
              </p>
            )}
          </div>
        </div>
      </div>
      {showEdit && (
        <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
          <Link
            href={`/supplier/products/${product.id}/edit`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={12} /> Edit
          </Link>
          <Link
            href={`/products/${product.id}`}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}

export function ProductCardGrid({ products, variant = 'seller', showEdit = false, columns = 2 }: {
  products: ProductCardProps['product'][];
  variant?: 'seller' | 'buyer' | 'compact';
  showEdit?: boolean;
  columns?: 2 | 3 | 4;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <PackageCheck size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No products yet</p>
      </div>
    );
  }
  
  const gridClass = variant === 'buyer'
    ? `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${columns} gap-3`
    : variant === 'compact'
    ? 'space-y-2'
    : `grid grid-cols-1 sm:grid-cols-${columns} gap-3`;
  
  return (
    <div className={gridClass}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={variant} showEdit={showEdit} />
      ))}
    </div>
  );
}
