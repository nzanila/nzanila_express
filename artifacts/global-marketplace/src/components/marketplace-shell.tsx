import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import {
  Camera,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Globe2,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
import { useGetCart, useListCategories } from '@workspace/api-client-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { useAuth } from '@/lib/auth-context';
import { locales } from '@/lib/i18n/translations';
import { CategoriesModal } from '@/components/categories-modal';
import { recordSearch } from '@/lib/search-history';

export type NavTab = 'ai' | 'products' | 'suppliers' | 'market' | 'profile';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
      <img src="/logo.png" alt="Nzanila.com" className="h-8 w-auto" />
      <span className="text-base font-black tracking-[-0.04em] text-[#1f2937]">Nzanila</span>
    </Link>
  );
}

function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const current = locales.find((l) => l.code === locale) ?? locales[0];

  return (
    <div className="relative" data-testid="language-selector">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
        <span className="sm:hidden uppercase">{current.code}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-20 mt-1 w-40 rounded border border-gray-200 bg-white py-1 shadow-lg">
            {locales.map((lang) => (
              <button key={lang.code} onClick={() => { setLocale(lang.code); setOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 ${lang.code === current.code ? 'font-bold' : ''}`}>
                {lang.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HeroSearch({ activeTab, onCategoriesClick }: { activeTab?: NavTab; onCategoriesClick?: (categoryId?: string) => void }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    recordSearch(query);
    window.dispatchEvent(new CustomEvent('nzanila-ai-search', { detail: query.trim() }));
    setLocation(`/products?search=${encodeURIComponent(query)}&ai=1`);
  };

  return (
    <div className="border-b border-gray-200 bg-white pb-4">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
        <form onSubmit={onSubmit} className="flex h-[44px] overflow-hidden rounded-full border-2 border-[#ff6a00] bg-white">
          <button type="button" onClick={() => onCategoriesClick?.()} className="hidden lg:flex items-center gap-1.5 border-r border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <LayoutGrid size={16} />
            <span>Categories</span>
          </button>
          <button type="button" className="flex items-center gap-1.5 border-r border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Camera size={16} />
            <span className="hidden sm:inline">Image search</span>
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products with Nzanila AI…"
            className="min-w-0 flex-1 px-4 text-sm outline-none"
            data-testid="input-hero-search"
          />
          <button type="submit" className="flex items-center gap-1.5 bg-[#ff6a00] px-8 text-sm font-bold text-white hover:bg-[#e55f00]" data-testid="button-hero-search">
            <Sparkles size={14} /> AI Search
          </button>
        </form>
        <div className="mt-2.5 flex flex-wrap gap-x-5 text-xs text-gray-600">
          <Link href="/products" className="hover:text-[#ff6a00] hover:underline">All categories</Link>
          <Link href="/products?category=Shipping+%26+Logistics" className="hover:text-[#ff6a00] hover:underline">Dropshipping</Link>
        </div>
      </div>
    </div>
  );
}

function ModeTabs({ activeTab }: { activeTab?: NavTab }) {
  const [location] = useLocation();
  const tabs: { id: NavTab; href: string; label: string; icon: typeof Sparkles }[] = [
    { id: 'market', href: '/', label: 'Home', icon: Home },
    { id: 'ai', href: '/ai-research', label: 'AI Mode', icon: Sparkles },
    { id: 'products', href: '/products', label: 'Products', icon: LayoutGrid },
  ];
  const resolved = activeTab ?? (
    location.startsWith('/ai-research') ? 'ai'
    : location.startsWith('/products') ? 'products'
    : 'market'
  );

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center gap-0 px-2 sm:px-4 lg:px-8">
        {tabs.map(({ id, href, label, icon: Icon }) => {
          const active = resolved === id;
          return (
            <Link
              key={id}
              href={href}
              className={`flex items-center gap-0.5 sm:gap-2 border-b-2 px-1.5 sm:px-5 py-2 sm:py-3 text-[9px] sm:text-sm font-bold whitespace-nowrap ${active ? 'border-[#ff6a00] text-[#ff6a00]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              data-testid={`tab-${id}`}
            >
              <Icon size={11} className="sm:hidden" />
              <Icon size={15} className="hidden sm:block" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function isPwaMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function AppShell({ children, mode = 'buyer', activeTab, hideSearch = false, hideSidebar = false, hideFooter = false, sidebarContent, discoveryContent }: { children: ReactNode; mode?: 'buyer' | 'supplier'; activeTab?: NavTab; hideSearch?: boolean; hideSidebar?: boolean; hideFooter?: boolean; sidebarContent?: ReactNode; discoveryContent?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [pwa, setPwa] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: cart } = useGetCart({ query: { queryKey: ['cart', user?.id], enabled: isAuthenticated, retry: false, staleTime: 30_000 } });
  const { data: catalogCategories } = useListCategories();
  const isSupplier = mode === 'supplier';
  const { tr } = useLocale();
  const ordersHref = isAuthenticated && user?.role === 'seller' ? '/supplier/orders' : '/orders';
  const accountHref = isAuthenticated ? (user?.role === 'seller' ? '/seller/profile' : '/buyer/dashboard') : '/onboarding';

  useEffect(() => {
    setPwa(isPwaMode());
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height);
      document.documentElement.style.setProperty('--nzanila-keyboard-offset', `${offset}px`);
      const keyboardVisible = offset > 150;
      if (keyboardVisible) document.documentElement.classList.add('nzanila-keyboard-open');
      else document.documentElement.classList.remove('nzanila-keyboard-open');
      setKeyboardOpen(keyboardVisible);
    };
    updateKeyboardState();
    viewport.addEventListener('resize', updateKeyboardState);
    viewport.addEventListener('scroll', updateKeyboardState);
    return () => {
      viewport.removeEventListener('resize', updateKeyboardState);
      viewport.removeEventListener('scroll', updateKeyboardState);
      document.documentElement.style.removeProperty('--nzanila-keyboard-offset');
    };
  }, []);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (window.innerWidth <= 767 && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        document.documentElement.classList.add('nzanila-keyboard-open');
        setKeyboardOpen(true);
      }
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) {
          document.documentElement.classList.remove('nzanila-keyboard-open');
          setKeyboardOpen(false);
        }
      }, 100);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-[#f5f5f5] text-[#222]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="hidden border-b border-gray-200 bg-[#f5f5f5] sm:block">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-1.5 text-xs text-gray-600 lg:px-8">
            <span>Welcome to Nzanila.com</span>
            <div className="flex items-center gap-5">
              <Link href="/" className="hover:text-[#ff6a00]">About Nzanila.com</Link>
              <Link href="/" className="hover:text-[#ff6a00]">Help Center</Link>
              <Link href="/ai-research" className="hover:text-[#ff6a00]">AI Sourcing</Link>
              <Link href="/supplier" className="font-semibold hover:text-[#ff6a00]">Sell on Nzanila.com</Link>
            </div>
          </div>
        </div>
        {pwa && (
          <div className="border-b border-gray-100 bg-white sm:hidden">
            <div className="flex items-center justify-center px-4 py-1.5">
              <p className="text-[10px] font-semibold text-[#1a5f4a]">🇧🇮 Sell Burundian products online — Wholesale & B2B</p>
            </div>
          </div>
        )}
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-4 px-4 lg:px-8">
          <button className="rounded p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu"><Menu size={22} /></button>
          {location !== '/' && <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else setLocation('/'); }} className="hidden items-center gap-1 rounded px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 sm:flex" aria-label="Back"><ChevronRight size={16} className="rotate-180" />Back</button>}
          <Logo />
          <nav className="ml-auto flex items-center gap-0.5">
            {isAuthenticated && <Link href={ordersHref} className="hidden items-center gap-1 rounded px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:flex">
              <Truck size={16} /> Orders
            </Link>}
            <Link href="/messages" className="hidden items-center gap-1 rounded px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:flex">
              <MessageSquare size={16} /> Messages
            </Link>
            {isAuthenticated && <Link href="/cart" className="relative rounded p-2.5 text-gray-700 hover:bg-gray-100" data-testid="link-cart">
              <ShoppingBag size={20} />
              {cart?.itemCount ? <span className="absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-[#ff6a00] px-1 text-[10px] font-bold text-white">{cart.itemCount}</span> : null}
            </Link>}
            <LanguageSelector />
            {isAuthenticated ? (
              <>
                <Link href={accountHref} className="hidden items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:flex">
                  <CircleUserRound size={16} />
                  <span className="max-w-[80px] truncate">{user?.name || 'Account'}</span>
                </Link>
                <button onClick={logout} className="hidden rounded px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:flex items-center gap-1">
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth" className="hidden rounded px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:block">Sign in</Link>
                <Link href="/onboarding" className="hidden rounded bg-[#ff6a00] px-4 py-2 text-xs font-bold text-white hover:bg-[#e55f00] sm:block">Create account</Link>
              </>
            )}
            <button className="rounded p-2 sm:hidden">
              <Link href={isAuthenticated ? (user?.role === 'seller' ? '/supplier' : '/auth') : '/onboarding'}>
                <CircleUserRound size={20} />
              </Link>
            </button>
          </nav>
        </div>
      </header>

      <div className="pt-[60px] sm:pt-[90px]">
      {!isSupplier && !hideSearch && (
        <>
          <div className="bg-white">
            <ModeTabs activeTab={activeTab} />
            <HeroSearch activeTab={activeTab} onCategoriesClick={(categoryId) => { setSelectedCategory(categoryId); setCategoriesOpen(true); }} />
          </div>
        </>
      )}

      <main className="mx-auto max-w-[1440px] pb-14 lg:pb-0">
        <div className={`grid grid-cols-1 ${!hideSearch && !hideSidebar && !isSupplier ? discoveryContent ? 'lg:grid-cols-[210px_minmax(0,1fr)] px-3 sm:px-4 lg:px-8 py-4 gap-3' : 'lg:grid-cols-[150px_1fr]' : ''}`}>
          {/* Categories Sidebar - Desktop */}

          {!isSupplier && !hideSearch && !hideSidebar && (
            <div className="hidden lg:block">
              <div className={discoveryContent ? 'h-[230px] flex flex-col overflow-hidden rounded-lg border border-border bg-card' : 'm-3 rounded-lg border border-border bg-card shadow-sm'}>
                <button onClick={() => { setSelectedCategory(undefined); setCategoriesOpen(true); }} className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-bold text-card-foreground hover:bg-muted">
                  <span>{tr('sidebar.categories')}</span>
                  <ChevronRight size={15} className="text-muted-foreground" />
                </button>
                <div className="border-t border-border px-3 py-2">
                  <button onClick={() => { setSelectedCategory(undefined); setCategoriesOpen(true); }} className="text-[11px] font-semibold text-primary hover:underline">View all categories</button>
                </div>
                <nav className="min-h-0 max-h-[220px] overflow-y-auto overscroll-contain border-t border-border px-2 py-1.5">
                  {catalogCategories === undefined ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="my-1 h-6 animate-pulse rounded bg-muted" />) : catalogCategories.map((category) => (
                    <button key={category.id} onClick={() => { setSelectedCategory(category.id); setCategoriesOpen(true); }} className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm text-card-foreground hover:bg-muted">
                      <span>{category.name}</span><ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </nav>
                {sidebarContent && <div className="border-t border-border p-2">{sidebarContent}</div>}
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1">{discoveryContent || children}</div>
        </div>
        {discoveryContent && children}
      </main>
      </div>

      {!isSupplier && !hideFooter && <footer className="mt-8 border-t border-gray-200 bg-white pb-20 lg:pb-6">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div><Logo /><p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">Discover products, explore stores, and connect with sellers on Nzanila.</p></div>
          <div><h2 className="mb-4 text-sm font-bold">Shop on Nzanila</h2><nav aria-label="Footer shopping" className="flex flex-col items-start gap-3 text-sm text-gray-600"><Link href="/products" className="hover:text-orange-500">Browse products</Link><button onClick={() => { setSelectedCategory(undefined); setCategoriesOpen(true); }} className="hover:text-orange-500">All categories</button>{isAuthenticated && <Link href="/cart" className="hover:text-orange-500">Your cart</Link>}</nav></div>
          <div><h2 className="mb-4 text-sm font-bold">Your account</h2><nav aria-label="Footer account" className="flex flex-col items-start gap-3 text-sm text-gray-600"><Link href={accountHref} className="hover:text-orange-500">My account</Link>{isAuthenticated && <Link href={ordersHref} className="hover:text-orange-500">My orders</Link>}<Link href="/messages" className="hover:text-orange-500">Messages</Link></nav></div>
          <div><h2 className="mb-4 text-sm font-bold">For sellers</h2><Link href="/supplier" className="text-sm text-gray-600 hover:text-orange-500">Seller Central</Link><p className="mt-4 text-xs leading-relaxed text-gray-500">Manage your products and stores, and connect with buyers.</p></div>
        </div>
        <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-gray-100 px-4 pt-5 text-xs text-gray-500 lg:px-8"><span>© {new Date().getFullYear()} Nzanila. All rights reserved.</span><span>Online payments coming soon</span></div>
      </footer>}

      {!isSupplier && !keyboardOpen && (
        <div className="fixed bottom-24 right-0 z-40 hidden flex-col gap-1 lg:flex">
          {[
            { icon: MessageSquare, label: 'Messenger' },
            { icon: Sparkles, label: 'AI Sourcing' },
            { icon: Camera, label: 'Image Search' },
          ].map(({ icon: Icon, label }) => (
            <button key={label} className="flex w-[52px] flex-col items-center gap-0.5 border border-gray-200 bg-white py-2 text-[9px] font-semibold text-gray-600 shadow-sm hover:border-[#ff6a00] hover:text-[#ff6a00]">
              <Icon size={18} />
              {label.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-[280px] bg-white p-4 shadow-xl">
            <div className="flex justify-between"><Logo /><button onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
            <nav className="mt-6 space-y-1">
              {[['/', 'Home'], ['/ai-research', 'AI Mode'], ['/products', 'Products'], ['/cart', 'Cart'], ['/orders', 'Orders'], ['/messages', 'Messages']].filter(([href]) => isAuthenticated || !['/cart', '/orders'].includes(href)).map(([href, label]) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="block rounded px-3 py-2.5 text-sm font-semibold hover:bg-gray-100">{label}</Link>
              ))}
              <Link href="/categories" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded px-3 py-2.5 text-sm font-semibold hover:bg-gray-100">
                <LayoutGrid size={16} /> Categories
              </Link>
            </nav>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {!isSupplier && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white lg:hidden">
          <div className={`grid ${isAuthenticated ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <Link href="/" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <Home size={20} />
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link href="/categories" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <LayoutGrid size={20} />
              <span className="text-[10px] font-medium">Categories</span>
            </Link>
            <Link href="/ai-research" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <Sparkles size={20} />
              <span className="text-[10px] font-medium">AI Research</span>
            </Link>
            <Link href="/messages" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <div className="relative">
                <MessageSquare size={20} />
                <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[7px] font-bold leading-none text-primary-foreground">4</span>
              </div>
              <span className="text-[10px] font-medium">Messages</span>
            </Link>
            {isAuthenticated && <Link href="/cart" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <div className="relative">
                <ShoppingBag size={20} />
                {cart?.itemCount ? <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[7px] font-bold leading-none text-primary-foreground">{cart.itemCount}</span> : null}
              </div>
              <span className="text-[10px] font-medium">Cart</span>
            </Link>}
            <Link href={accountHref} className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <Globe2 size={20} />
              <span className="text-[10px] font-medium">Account</span>
            </Link>
          </div>
        </nav>
      )}

      <CategoriesModal key={`${categoriesOpen}:${selectedCategory || 'all'}`} isOpen={categoriesOpen} onClose={() => setCategoriesOpen(false)} initialCategory={selectedCategory} />
      <PwaInstallPrompt />
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#ff6a00]">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, link }: { eyebrow?: string; title: string; link?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff6a00]">{eyebrow}</p>}
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      {link}
    </div>
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 ${className}`} />;
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-8 text-center">
      <p className="text-lg font-bold">Something went wrong</p>
      <p className="mt-1 text-sm text-gray-500">We couldn't load this page. Please try again.</p>
      {onRetry && <button onClick={onRetry} className="mt-4 rounded bg-[#ff6a00] px-4 py-2 text-sm font-bold text-white" data-testid="button-retry">Try again</button>}
    </div>
  );
}
