import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import Sales from "./pages/Sales";
import Stock from "./pages/Stock";
import Entry from "./pages/Entry";
import Reports from "./pages/Reports";
import CustomerOrder from "./pages/CustomerOrder";
import BarNotifications from "./pages/BarNotifications";
import CashClosure from "./pages/CashClosure";
import IncomeStatement from "./pages/IncomeStatement";
import Events from "./pages/Events";
import Collaborators from "./pages/Collaborators";
import StockWithdrawal from "./pages/StockWithdrawal";
import NotFound from "./pages/NotFound";

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/comanda" element={<CustomerOrder />} />
          {/* All protected routes - access control handled by each page via useUserRole */}
          {[
            { path: "/", element: <Sales /> },
            { path: "/stock", element: <Stock /> },
            { path: "/entry", element: <Entry /> },
            { path: "/reports", element: <Reports /> },
            { path: "/bar", element: <BarNotifications /> },
            { path: "/cash-closure", element: <CashClosure /> },
            { path: "/dre", element: <IncomeStatement /> },
            { path: "/events", element: <Events /> },
            { path: "/collaborators", element: <Collaborators /> },
            { path: "/stock-withdrawal", element: <StockWithdrawal /> },
          ].map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ProtectedRoute>{element}</ProtectedRoute>}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
