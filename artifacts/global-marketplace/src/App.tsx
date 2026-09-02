import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { setBaseUrl } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { AiResearchPage } from '@/pages/ai-research-page';
import { AuthPage } from '@/pages/auth-page';
import { SignupPage } from '@/pages/signup-page';
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
  SuppliersPage,
} from '@/pages/marketplace-pages';
import { SellerProfilePage, SellerProfileEditPage } from '@/pages/seller-profile-page';
import { BuyerProfilePage } from '@/pages/buyer-profile-page';
import { BuyerDashboardPage } from '@/pages/buyer-dashboard-page';
import { SellerProductsPage as SellerProductsPageNew } from '@/pages/seller-products-page';
import { InventoryDashboardPage } from '@/pages/inventory-page';
import { StoresPage } from '@/pages/stores-page';
import { SellerVerificationPage } from '@/pages/seller-verification-page';
import { SellerSettingsPage } from '@/pages/seller-settings-page';
import { SellerOrderDetailPage } from '@/pages/seller-order-detail-page';
import { SellerProductFormPage } from '@/pages/seller-product-form-page';
import StoreProfilePage from '@/pages/store-profile-page';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from 'wouter';

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bd75c998.nzanila-api.pages.dev');
setBaseUrl(apiBase || null);

const queryClient = new QueryClient();

// Redirect to onboarding if account exists but onboarding not completed
function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    if ((user as any).onboardingCompleted === false && !location.startsWith('/onboarding') && !location.startsWith('/auth')) {
      setLocation('/onboarding');
    }
  }, [loading, isAuthenticated, user, location, setLocation]);

  if (loading) return null;
  if (!isAuthenticated || !user) return <>{children}</>;
  if ((user as any).onboardingCompleted === false && !location.startsWith('/onboarding') && !location.startsWith('/auth')) {
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
        <Route path="/auth/signup" component={SignupPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/ai-research" component={AiResearchPage} />
        <Route path="/categories" component={CategoriesPage} />
        <Route path="/products" component={ProductsPage} />
        <Route path="/products/:id" component={ProductDetailPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/store/:slug" component={StoreProfilePage} />

        <Route path="/cart" component={() => <RequireRole role="buyer" redirectTo="/"> <CartPage /> </RequireRole>} />
        <Route path="/orders" component={() => <RequireAnyRole redirectTo="/auth"> <OrdersPage /> </RequireAnyRole>} />
        <Route path="/messages" component={() => <RequireAnyRole redirectTo="/auth"> <MessagesPage /> </RequireAnyRole>} />
        <Route path="/buyer/profile" component={() => <RequireRole role="buyer" redirectTo="/"> <BuyerProfilePage /> </RequireRole>} />
        <Route path="/buyer/dashboard" component={() => <RequireRole role="buyer" redirectTo="/"> <BuyerDashboardPage /> </RequireRole>} />

        <Route path="/seller/:id" component={SellerProfilePage} />

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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <OnboardingGuard>
                <Router />
              </OnboardingGuard>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
