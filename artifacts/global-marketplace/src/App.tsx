import { type ReactNode } from 'react';
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
import { SellerProductsPage as SellerProductsPageNew } from '@/pages/seller-products-page';
import { SellerVerificationPage } from '@/pages/seller-verification-page';
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

  if (loading) return null;
  if (!isAuthenticated || !user) return <>{children}</>;

  // If onboarding not completed and not already on onboarding/auth pages
  if (user.onboardingCompleted === false && !location.startsWith('/onboarding') && !location.startsWith('/auth')) {
    setLocation('/onboarding');
    return null;
  }

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
        <Route path="/cart" component={CartPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/supplier" component={SupplierDashboardPage} />
        <Route path="/supplier/products" component={SupplierProductsPage} />
        <Route path="/supplier/orders" component={SupplierOrdersPage} />
        <Route path="/seller/:id" component={SellerProfilePage} />
        <Route path="/seller/profile/edit" component={SellerProfileEditPage} />
        <Route path="/seller/products" component={SellerProductsPageNew} />
        <Route path="/seller/verify" component={SellerVerificationPage} />
        <Route path="/buyer/profile" component={BuyerProfilePage} />
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
