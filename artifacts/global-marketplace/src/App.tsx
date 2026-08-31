import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { AuthProvider } from '@/lib/auth-context';
import { setBaseUrl } from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';
import { AiResearchPage } from '@/pages/ai-research-page';
import { AuthPage } from '@/pages/auth-page';
import { CategoriesPage } from '@/pages/categories-page';
import { MessagesPage } from '@/pages/messages-page';
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
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bd75c998.nzanila-api.pages.dev');
setBaseUrl(apiBase || null);

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
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
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LocaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
