import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import {
  Camera,
  ClipboardList,
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
  ShoppingCart,
  Sparkles,
  Store,
  User,
  X,
} from 'lucide-react';
import { useGetCart, useListCategories } from '@workspace/api-client-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { useAuth } from '@/lib/auth-context';
import { locales } from '@/lib/i18n/translations';
import { CategoriesModal } from '@/components/categories-modal';
import { BuyerNotificationsModal } from '@/components/buyer-notifications-modal';
import { BuyerMessagesLink } from '@/components/buyer-messages-link';
import { BuyerOrdersLink } from '@/components/buyer-orders-link';
import { recordSearch } from '@/lib/search-history';

export type NavTab = 'ai' | 'products' | 'suppliers' | 'market' | 'profile';

export function Logo() {
  const { tr } = useLocale();
  return (
    <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
      <img src="/logo.png" alt={tr('ui.nzanilacom')} className="h-8 w-auto" />
      <span className="text-base font-black tracking-[-0.04em] text-[#1f2937]">{tr('ui.nzanila')}</span>
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
  const { tr } = useLocale();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('search') || '';
  });

  const onQueryChange = (value: string) => {
    setQuery(value);
    window.dispatchEvent(new CustomEvent('nzanila-manual-search', { detail: value }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    recordSearch(query);
    setLocation(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="border-b border-gray-200 bg-white pb-4">
      <div className="mx-auto max-w-[1231px] px-4 lg:px-8">
        <form onSubmit={onSubmit} className="flex h-[44px] overflow-hidden rounded-full border-2 border-[#ff6a00] bg-white">
          <button type="button" onClick={() => onCategoriesClick?.()} className="hidden lg:flex items-center gap-1.5 border-r border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <LayoutGrid size={16} />
            <span>{tr('ui.categories')}</span>
          </button>
          <button type="button" className="flex items-center gap-1.5 border-r border-gray-200 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Camera size={16} />
            <span className="hidden sm:inline">{tr('ui.imageSearch')}</span>
          </button>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={tr('ui.searchProductsMaterialsOrSuppliers')}
            className="min-w-0 flex-1 px-4 text-sm outline-none"
            data-testid="input-hero-search"
          />
          <button type="submit" className="flex items-center gap-1.5 bg-[#ff6a00] px-8 text-sm font-bold text-white hover:bg-[#e55f00]" data-testid="button-hero-search">
            {tr('ui.search')}
          </button>
        </form>
        <div className="mt-2.5 flex flex-wrap gap-x-5 text-xs text-gray-600">
          <Link href="/products" className="hover:text-[#ff6a00] hover:underline">{tr('ui.allCategories')}</Link>
          <Link href="/products?category=Shipping+%26+Logistics" className="hover:text-[#ff6a00] hover:underline">{tr('ui.dropshipping')}</Link>
        </div>
      </div>
    </div>
  );
}

function ModeTabs({ activeTab }: { activeTab?: NavTab }) {
  const { tr } = useLocale();
  const [location] = useLocation();
  const tabs: { id: NavTab; href: string; label: string; icon: typeof Sparkles }[] = [
    { id: 'market', href: '/', label: tr('ui.home'), icon: Home },
    { id: 'ai', href: '/ai-research', label: tr('ui.aiMode'), icon: Sparkles },
    { id: 'products', href: '/products', label: tr('ui.products'), icon: LayoutGrid },
  ];
  const resolved = activeTab ?? (
    location.startsWith('/ai-research') ? 'ai'
    : location.startsWith('/products') ? 'products'
    : 'market'
  );

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1231px] items-center gap-0 px-2 sm:px-4 lg:px-8">
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

export function AppShell({ children, mode = 'buyer', activeTab, hideSearch = false, hideSidebar = false, hideFooter = false, fullBleed = false, hideTopBar = false, sidebarContent, discoveryContent }: { children: ReactNode; mode?: 'buyer' | 'supplier'; activeTab?: NavTab; hideSearch?: boolean; hideSidebar?: boolean; hideFooter?: boolean; fullBleed?: boolean; hideTopBar?: boolean; sidebarContent?: ReactNode; discoveryContent?: ReactNode }) {
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
  const { tr, locale } = useLocale();
  // The API returns each category's name in every shipped language; fall back to the
  // stored English name for anything it doesn't know about (custom seller suggestions).
  const categoryLabel = (category: { name: string; names?: Record<string, string> }) =>
    category.names?.[locale] || category.name;
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
    <div className="nzanila-marketplace-shell min-h-[100dvh] overflow-x-clip bg-[#f5f5f5] text-[#222]">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className={`${hideTopBar ? 'hidden' : 'hidden sm:block'} border-b border-gray-200 bg-[#f5f5f5]`}>
          <div className="mx-auto flex max-w-[1231px] items-center justify-between px-4 py-1.5 text-xs text-gray-600 lg:px-8">
            <span>{tr('ui.nzanilaMarketplace')}</span>
            <div className="flex items-center gap-5">
              <Link href="/" className="hover:text-[#ff6a00]">{tr('ui.help')}</Link>
              <Link href="/ai-research" className="hover:text-[#ff6a00]">{tr('ui.aiSourcing')}</Link>
              <Link href="/supplier" className="font-semibold hover:text-[#ff6a00]">{tr('ui.sellOnNzanila')}</Link>
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
        <div className="mx-auto flex h-[60px] max-w-[1231px] items-center gap-4 px-4 lg:px-8">
          <button className="rounded p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={tr('ui.menu')}><Menu size={22} /></button>
          {location !== '/' && <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else setLocation('/'); }} className="hidden items-center gap-1 rounded px-2 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 sm:flex" aria-label={tr('ui.back')}><ChevronRight size={16} className="rotate-180" />{tr('ui.back')}</button>}
          <Logo />
          <nav className="ml-auto flex items-center gap-0.5">
            {isAuthenticated && <BuyerOrdersLink href={ordersHref} />}
            {isAuthenticated && <BuyerMessagesLink />}
            {isAuthenticated && <BuyerNotificationsModal />}
            {isAuthenticated && <Link href="/cart" title={tr('ui.cart')} aria-label={tr('ui.cart')} className="relative rounded-lg p-2.5 text-gray-700 hover:bg-gray-100" data-testid="link-cart">
              <ShoppingCart size={20} className="text-gray-700" />
              {cart?.itemCount ? <span className="absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-[#ff6a00] px-1 text-[10px] font-bold text-white">{cart.itemCount}</span> : null}
            </Link>}
            <LanguageSelector />
            {isAuthenticated ? (
              <>
                <Link href={accountHref} title={user?.name || 'Account'} aria-label={user?.name || 'Account'} className="hidden rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 sm:flex">
                  <CircleUserRound size={19} />
                </Link>
                <button onClick={logout} title={tr('ui.signOut')} aria-label={tr('ui.signOut')} className="hidden rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 sm:flex">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link href="/auth" className="hidden rounded px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:block">{tr('ui.signIn')}</Link>
                <Link href="/onboarding" className="hidden rounded bg-[#ff6a00] px-4 py-2 text-xs font-bold text-white hover:bg-[#e55f00] sm:block">{tr('ui.createAccount')}</Link>
              </>
            )}
            <Link href={accountHref} aria-label={tr('ui.account')} className="grid h-11 w-11 place-items-center rounded-lg hover:bg-gray-100 sm:hidden">
              <CircleUserRound size={20} />
            </Link>
          </nav>
        </div>
      </header>

      <div className={hideTopBar ? 'pt-[60px]' : 'pt-[60px] sm:pt-[90px]'}>
      {!isSupplier && !hideSearch && (
        <>
          <div className="bg-white">
            <ModeTabs activeTab={activeTab} />
            <HeroSearch activeTab={activeTab} onCategoriesClick={(categoryId) => { setSelectedCategory(categoryId); setCategoriesOpen(true); }} />
          </div>
        </>
      )}

      <main className={`${fullBleed ? 'w-full' : 'mx-auto max-w-[1368px]'} pb-14 lg:pb-0`}>
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
                  <button onClick={() => { setSelectedCategory(undefined); setCategoriesOpen(true); }} className="text-[11px] font-semibold text-primary hover:underline">{tr('ui.viewAllCategories')}</button>
                </div>
                <nav className="min-h-0 max-h-[220px] overflow-y-auto overscroll-contain border-t border-border px-2 py-1.5">
                  {catalogCategories === undefined ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="my-1 h-6 animate-pulse rounded bg-muted" />) : catalogCategories.map((category) => (
                    <button key={category.id} onClick={() => { setSelectedCategory(category.id); setCategoriesOpen(true); }} className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm text-card-foreground hover:bg-muted">
                      <span>{categoryLabel(category)}</span><ChevronRight size={14} className="shrink-0 text-muted-foreground" />
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

      {!isSupplier && !hideFooter && <footer className="mt-5 border-t border-gray-200 bg-white pb-16 lg:mt-8 lg:pb-6">
        <div className="mx-auto grid max-w-[1231px] grid-cols-2 gap-x-4 gap-y-5 px-4 py-5 sm:gap-8 sm:py-8 lg:grid-cols-4 lg:px-8 lg:py-10">
          <div className="col-span-2 sm:col-span-1"><Logo /><p className="mt-2 max-w-xs text-xs leading-relaxed text-gray-500 sm:mt-4 sm:text-sm">{tr('ui.discoverProductsExploreStoresAndConnect')}</p></div>
          <div><h2 className="mb-2 text-xs font-bold sm:mb-4 sm:text-sm">{tr('ui.shopOnNzanila')}</h2><nav aria-label={tr('ui.footerShopping')} className="flex flex-col items-start gap-1.5 text-xs text-gray-600 sm:gap-3 sm:text-sm"><Link href="/products" className="hover:text-orange-500">{tr('ui.browseProducts')}</Link><button onClick={() => { setSelectedCategory(undefined); setCategoriesOpen(true); }} className="hover:text-orange-500">{tr('ui.allCategories')}</button>{isAuthenticated && <Link href="/cart" className="hover:text-orange-500">{tr('ui.yourCart')}</Link>}</nav></div>
          <div><h2 className="mb-2 text-xs font-bold sm:mb-4 sm:text-sm">{tr('ui.yourAccount')}</h2><nav aria-label={tr('ui.footerAccount')} className="flex flex-col items-start gap-1.5 text-xs text-gray-600 sm:gap-3 sm:text-sm"><Link href={accountHref} className="hover:text-orange-500">{tr('ui.myAccount')}</Link>{isAuthenticated && <Link href={ordersHref} className="hover:text-orange-500">{tr('ui.myOrders')}</Link>}<Link href="/messages" className="hover:text-orange-500">{tr('ui.messages')}</Link></nav></div>
          <div className="col-span-2 sm:col-span-1"><h2 className="mb-2 text-xs font-bold sm:mb-4 sm:text-sm">{tr('ui.forSellers')}</h2><Link href="/supplier" className="text-xs text-gray-600 hover:text-orange-500 sm:text-sm">{tr('ui.sellerCentral')}</Link><p className="mt-2 max-w-xs text-[11px] leading-relaxed text-gray-500 sm:mt-4 sm:text-xs">{tr('ui.manageYourProductsAndStoresAnd')}</p></div>
        </div>
        <div className="mx-auto flex max-w-[1231px] flex-wrap justify-between gap-1 border-t border-gray-100 px-4 pt-3 text-[10px] text-gray-500 sm:gap-3 sm:pt-5 sm:text-xs lg:px-8"><span>© {new Date().getFullYear()} Nzanila. All rights reserved.</span><span>{tr('ui.onlinePaymentsComingSoon')}</span></div>
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
              {[['/', tr('ui.home')], ['/ai-research', tr('ui.aiMode')], ['/products', tr('ui.products')], ['/cart', tr('ui.cart')], ['/orders', tr('ui.orders')], ['/messages', tr('ui.messages')]].filter(([href]) => isAuthenticated || !['/cart', '/orders', '/messages'].includes(href)).map(([href, label]) => (
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
          <div className={`grid ${isAuthenticated ? 'grid-cols-6' : 'grid-cols-4'}`}>
            <Link href="/" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <Home size={20} />
              <span className="text-[10px] font-medium">{tr('ui.home')}</span>
            </Link>
            <Link href="/categories" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <LayoutGrid size={20} />
              <span className="text-[10px] font-medium">{tr('ui.categories')}</span>
            </Link>
            <Link href="/ai-research" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <Sparkles size={20} />
              <span className="text-[10px] font-medium">{tr('ui.aiResearch')}</span>
            </Link>
            {isAuthenticated && <Link href="/messages" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <div className="relative">
                <MessageSquare size={20} />
              </div>
              <span className="text-[10px] font-medium">{tr('ui.messages')}</span>
            </Link>}
            {isAuthenticated && <Link href="/cart" className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <div className="relative">
                <ShoppingBag size={20} />
                {cart?.itemCount ? <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[7px] font-bold leading-none text-primary-foreground">{cart.itemCount}</span> : null}
              </div>
              <span className="text-[10px] font-medium">{tr('ui.cart')}</span>
            </Link>}
            <Link href={accountHref} className="flex flex-col items-center gap-0.5 py-2 text-muted-foreground hover:text-primary">
              <Globe2 size={20} />
              <span className="text-[10px] font-medium">{tr('ui.account')}</span>
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
  const { tr } = useLocale();
  return (
    <div className="rounded border border-gray-200 bg-white p-8 text-center">
      <p className="text-lg font-bold">{tr('ui.somethingWentWrong')}</p>
      <p className="mt-1 text-sm text-gray-500">{tr('ui.weCouldntLoadThisPagePlease')}</p>
      {onRetry && <button onClick={onRetry} className="mt-4 rounded bg-[#ff6a00] px-4 py-2 text-sm font-bold text-white" data-testid="button-retry">{tr('ui.tryAgain')}</button>}
    </div>
  );
}
