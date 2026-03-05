import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Auth = lazy(() => import("./pages/Auth"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Sales = lazy(() => import("./pages/Sales"));
const Stock = lazy(() => import("./pages/Stock"));
const Entry = lazy(() => import("./pages/Entry"));
const Reports = lazy(() => import("./pages/Reports"));
const CustomerOrder = lazy(() => import("./pages/CustomerOrder"));
const BarNotifications = lazy(() => import("./pages/BarNotifications"));
const CashClosure = lazy(() => import("./pages/CashClosure"));
const IncomeStatement = lazy(() => import("./pages/IncomeStatement"));
const Events = lazy(() => import("./pages/Events"));
const Collaborators = lazy(() => import("./pages/Collaborators"));
const StockWithdrawal = lazy(() => import("./pages/StockWithdrawal"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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

  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
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
              { path: "/bar", element: <BarNotifications /> },
              { path: "/cash-closure", element: <CashClosure /> },
              { path: "/dre", element: <IncomeStatement /> },
              { path: "/events", element: <Events /> },
              { path: "/collaborators", element: <Collaborators /> },
              { path: "/stock-withdrawal", element: <StockWithdrawal /> },
              { path: "/audit", element: <AuditLogs /> },
            ].map(({ path, element }) => (
              <Route
                key={path}
                path={path}
                element={<ProtectedRoute>{element}</ProtectedRoute>}
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
