import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { TranslateContentPrompt } from '@/components/translate-content-prompt';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { AiResearchPage } from '@/pages/ai-research-page';
import { ForgotPasswordPage } from '@/pages/forgot-password-page';
import { AuthPage } from '@/pages/auth-page';
import { CategoriesPage } from '@/pages/categories-page';
import { MessagesPage } from '@/pages/messages-page';
import { OnboardingPage } from '@/pages/onboarding-page';
import {
  CartPage,
  HomePage,
  OrdersPage,
  ProductDetailPage,
  ProductsPage,
  SupplierDashboardPage,
  SupplierOrdersPage,
  SupplierProductsPage,
} from '@/pages/marketplace-pages';
import { SellerProfilePage, SellerProfileEditPage } from '@/pages/seller-profile-page';
import { BuyerProfilePage } from '@/pages/buyer-profile-page';
import { BuyerOrderDetailPage } from '@/pages/buyer-order-detail-page';
import { StorefrontBuilderPage, SellerStorefrontRedirect } from '@/pages/storefront-builder-page';
import { InventoryDashboardPage } from '@/pages/inventory-page';
import { StoresPage } from '@/pages/stores-page';
import { SellerVerificationPage } from '@/pages/seller-verification-page';
import { SellerSettingsPage } from '@/pages/seller-settings-page';
import { SellerOrderDetailPage } from '@/pages/seller-order-detail-page';
import StoreProfilePage from '@/pages/store-profile-page';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from 'wouter';
import { useLocale } from '@/lib/i18n/locale-context';

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://nzanila-api-server.nzanilaexpress.workers.dev');
setBaseUrl(apiBase || null);
setAuthTokenGetter(() => {
  try {
    const stored = localStorage.getItem('nz_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.session?.accessToken || null;
    }
  } catch {}
  return null;
});

const queryClient = new QueryClient();
const SELLER_CENTRAL_URL = 'https://seller-central.pages.dev';

function SellerCentralRedirect() {
  const { tr } = useLocale();
  useEffect(() => {
    const currentPath = window.location.pathname;
    const sellerPath = currentPath.startsWith('/supplier/products')
      ? `/seller-central${currentPath.replace('/supplier', '')}`
      : '/seller-central';
    window.location.replace(`${SELLER_CENTRAL_URL}${sellerPath}`);
  }, []);
  return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">{tr('ui.openingSellerCentral')}</div>;
}

// Redirect to onboarding if account exists but onboarding not completed
function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    if (user.role !== 'seller' && (user as any).onboardingCompleted === false && !location.startsWith('/onboarding') && !location.startsWith('/auth')) {
      setLocation('/onboarding');
    }
  }, [loading, isAuthenticated, user, location, setLocation]);

  if (loading) return null;
  if (!isAuthenticated || !user) return <>{children}</>;
  if (user.role !== 'seller' && (user as any).onboardingCompleted === false && !location.startsWith('/onboarding') && !location.startsWith('/auth')) {
    return null;
  }

  return <>{children}</>;
}

function RequireRole({ children, role, redirectTo }: { children: ReactNode; role: 'buyer' | 'seller'; redirectTo: string }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) {
      setLocation('/auth');
      return;
    }
    if (user.role !== role) {
      setLocation(redirectTo);
    }
  }, [loading, isAuthenticated, user, role, redirectTo, setLocation]);

  if (loading) return null;
  if (!isAuthenticated || !user) return null;
  if (user.role !== role) return null;

  return <>{children}</>;
}

function RequireAnyRole({ children, redirectTo }: { children: ReactNode; redirectTo: string }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    if (user.role !== 'buyer' && user.role !== 'seller') {
      setLocation(redirectTo);
    }
  }, [loading, isAuthenticated, user, redirectTo, setLocation]);

  if (loading) return null;
  if (!isAuthenticated || !user) return <>{children}</>;
  if (user.role !== 'buyer' && user.role !== 'seller') return null;

  return <>{children}</>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/forgot" component={ForgotPasswordPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/ai-research" component={AiResearchPage} />
        <Route path="/ai-search" component={() => <Redirect to="/products" />} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/products/:id" component={ProductDetailPage} />
        <Route path="/store/:slug" component={StoreProfilePage} />

        <Route path="/cart" component={() => <RequireRole role="buyer" redirectTo="/"> <CartPage /> </RequireRole>} />
        <Route path="/orders" component={() => <RequireAnyRole redirectTo="/auth"> <OrdersPage /> </RequireAnyRole>} />
        <Route path="/orders/:id" component={() => <RequireRole role="buyer" redirectTo="/auth"> <BuyerOrderDetailPage /> </RequireRole>} />
        <Route path="/messages" component={() => <RequireAnyRole redirectTo="/auth"> <MessagesPage /> </RequireAnyRole>} />
        <Route path="/buyer/profile" component={() => <RequireRole role="buyer" redirectTo="/"> <BuyerProfilePage /> </RequireRole>} />
        {/* Keep the legacy dashboard URL, but show the complete buyer account in one place. */}
        <Route path="/buyer/dashboard" component={() => <RequireRole role="buyer" redirectTo="/"> <BuyerProfilePage /> </RequireRole>} />

        {/* Both must come before /seller/:id — wouter matches in order, and "profile"
            would otherwise be read as a seller id. The Edit buttons across the seller
            pages already link here. */}
        <Route path="/seller/profile/edit" component={() => <RequireRole role="seller" redirectTo="/auth"> <SellerProfileEditPage /> </RequireRole>} />
        <Route path="/seller/profile" component={() => <RequireRole role="seller" redirectTo="/auth"> <SellerProfilePage /> </RequireRole>} />
        <Route path="/seller/:id" component={SellerProfilePage} />
        <Route path="/seller/:id/storefront" component={SellerStorefrontRedirect} />
        <Route path="/supplier/dashboard" component={() => <RequireRole role="seller" redirectTo="/"> <SupplierDashboardPage /> </RequireRole>} />
        <Route path="/supplier/orders/:id" component={() => <RequireRole role="seller" redirectTo="/"> <SellerOrderDetailPage /> </RequireRole>} />
        <Route path="/supplier/orders" component={() => <RequireRole role="seller" redirectTo="/"> <SupplierOrdersPage /> </RequireRole>} />
        {/* Product creation and editing live in Seller Central only. */}
        <Route path="/supplier/products/:id/edit" component={SellerCentralRedirect} />
        <Route path="/supplier/products/new" component={SellerCentralRedirect} />
        <Route path="/supplier/products" component={SellerCentralRedirect} />
        <Route path="/supplier/inventory" component={() => <RequireRole role="seller" redirectTo="/"> <InventoryDashboardPage /> </RequireRole>} />
        <Route path="/supplier/stores/:storeId/storefront" component={() => <RequireRole role="seller" redirectTo="/"> <StorefrontBuilderPage /> </RequireRole>} />
        <Route path="/supplier/stores" component={() => <RequireRole role="seller" redirectTo="/"> <StoresPage /> </RequireRole>} />
        <Route path="/supplier/settings" component={() => <RequireRole role="seller" redirectTo="/"> <SellerSettingsPage /> </RequireRole>} />
        <Route path="/supplier/stores/new" component={() => <RequireRole role="seller" redirectTo="/"> <StoresPage /> </RequireRole>} />

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  // LocaleProvider is outermost on purpose: AuthProvider and the query client render UI
  // of their own (auth gates, toasts, error states) and any of it may need translating.
  // With the provider nested inside, those threw "useLocale must be used within
  // LocaleProvider".
  return (
    <LocaleProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <OnboardingGuard>
                <Router />
              </OnboardingGuard>
            </WouterRouter>
            <Toaster />
            <TranslateContentPrompt />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LocaleProvider>
  );
}

export default App;
