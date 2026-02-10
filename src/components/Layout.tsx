import { NavLink } from "@/components/NavLink";
import { Home, Package, TrendingUp, FileText, LogOut, Bell, DollarSign, BarChart3, CalendarDays } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { isManager } = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("bartender_name");
    navigate("/auth");
  };

  const bartenderName = localStorage.getItem("bartender_name");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-gradient-dark shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Casa Duna</h1>
              <p className="text-sm text-primary-foreground/70">Sistema de Controle</p>
            </div>
            {bartenderName && (
              <div className="flex items-center gap-3">
                <span className="text-primary-foreground text-sm">
                  Olá, <span className="font-semibold">{bartenderName}</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border sticky bottom-0 shadow-strong">
        <div className="container mx-auto px-4">
          <div className={`grid ${isManager ? 'grid-cols-8' : 'grid-cols-7'} gap-1 py-2`}>
            <NavLink
              to="/"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <Home className="h-5 w-5" />
              <span className="text-xs font-medium">Vendas</span>
            </NavLink>
            <NavLink
              to="/stock"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <Package className="h-5 w-5" />
              <span className="text-xs font-medium">Estoque</span>
            </NavLink>
            <NavLink
              to="/entry"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-medium">Entrada</span>
            </NavLink>
            <NavLink
              to="/bar"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <Bell className="h-5 w-5" />
              <span className="text-xs font-medium">Bar</span>
            </NavLink>
            <NavLink
              to="/cash-closure"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <DollarSign className="h-5 w-5" />
              <span className="text-xs font-medium">Caixa</span>
            </NavLink>
            <NavLink
              to="/dre"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs font-medium">DRE</span>
            </NavLink>
            <NavLink
              to="/reports"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs font-medium">Alertas</span>
            </NavLink>
            {isManager && (
              <NavLink
                to="/events"
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                activeClassName="text-primary bg-muted"
              >
                <CalendarDays className="h-5 w-5" />
                <span className="text-xs font-medium">Eventos</span>
              </NavLink>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};
