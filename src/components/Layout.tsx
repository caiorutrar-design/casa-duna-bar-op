import { NavLink } from "@/components/NavLink";
import { Home, Package, TrendingUp, FileText, LogOut, Bell, DollarSign, BarChart3, CalendarDays, Users, PackageMinus } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Vendas", path: "/" },
  { to: "/stock", icon: Package, label: "Estoque", path: "/stock" },
  { to: "/entry", icon: TrendingUp, label: "Entrada", path: "/entry" },
  { to: "/bar", icon: Bell, label: "Bar", path: "/bar" },
  { to: "/cash-closure", icon: DollarSign, label: "Caixa", path: "/cash-closure" },
  { to: "/dre", icon: BarChart3, label: "DRE", path: "/dre" },
  { to: "/reports", icon: FileText, label: "Alertas", path: "/reports" },
  { to: "/stock-withdrawal", icon: PackageMinus, label: "Retirada", path: "/stock-withdrawal" },
  { to: "/events", icon: CalendarDays, label: "Eventos", path: "/events" },
  { to: "/collaborators", icon: Users, label: "Equipe", path: "/collaborators" },
];

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { canAccessPage, isAdmin } = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("bartender_name");
    navigate("/auth");
  };

  const bartenderName = localStorage.getItem("bartender_name");

  // DRE is admin-only
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.path === "/dre") return isAdmin;
    return canAccessPage(item.path);
  });

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
          <div
            className="flex overflow-x-auto gap-1 py-2"
            style={{ scrollbarWidth: "none" }}
          >
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors min-w-[60px]"
                activeClassName="text-primary bg-muted"
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};
