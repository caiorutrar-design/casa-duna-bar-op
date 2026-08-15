import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/use-user-role";

const Auth = lazy(() => import("./pages/Auth"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Sales = lazy(() => import("./pages/Sales"));
const Stock = lazy(() => import("./pages/Stock"));
const Entry = lazy(() => import("./pages/Entry"));
const Reports = lazy(() => import("./pages/Reports"));
const CustomerOrder = lazy(() => import("./pages/CustomerOrder"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const Bar = lazy(() => import("./pages/Bar"));
const MenuEditor = lazy(() => import("./pages/MenuEditor"));
const CashClosure = lazy(() => import("./pages/CashClosure"));
const IncomeStatement = lazy(() => import("./pages/IncomeStatement"));
const Events = lazy(() => import("./pages/Events"));
const Collaborators = lazy(() => import("./pages/Collaborators"));
const StockWithdrawal = lazy(() => import("./pages/StockWithdrawal"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Users = lazy(() => import("./pages/Users"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <Layout>
    <PageSkeleton />
  </Layout>
);

const RoleGate = ({ path, children }: { path: string; children: React.ReactNode }) => {
  const { loading, canAccessPage, homePath } = useUserRole();

  if (loading) return <PageFallback />;
  if (path !== "/" && !canAccessPage(path)) {
    return <Navigate to={homePath()} replace />;
  }
  return <>{children}</>;
};

const ProtectedRoute = ({ path, children }: { path: string; children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <PageFallback />;
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <RoleGate path={path}>{children}</RoleGate>;
};

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/comanda" element={<CustomerOrder />} />
              {[
                { path: "/", element: <HomePage /> },
                { path: "/sales", element: <Sales /> },
                { path: "/stock", element: <Stock /> },
                { path: "/entry", element: <Entry /> },
                { path: "/reports", element: <Reports /> },
                { path: "/kitchen", element: <Kitchen /> },
                { path: "/bar", element: <Bar /> },
                { path: "/menu", element: <MenuEditor /> },
                { path: "/cash-closure", element: <CashClosure /> },
                { path: "/dre", element: <IncomeStatement /> },
                { path: "/events", element: <Events /> },
                { path: "/collaborators", element: <Collaborators /> },
                { path: "/stock-withdrawal", element: <StockWithdrawal /> },
                { path: "/audit", element: <AuditLogs /> },
                { path: "/users", element: <Users /> },
              ].map(({ path, element }) => (
                <Route
                  key={path}
                  path={path}
                  element={<ProtectedRoute path={path}>{element}</ProtectedRoute>}
                />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
