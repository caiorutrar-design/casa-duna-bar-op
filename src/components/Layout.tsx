import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Home, Package, TrendingUp, FileText, Bell, DollarSign, BarChart3, CalendarDays, Users, PackageMinus, Shield } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { SettingsDialog } from "@/components/SettingsDialog";
import dunaLogo from "@/assets/duna-logo.jpeg";

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
  { to: "/audit", icon: Shield, label: "Auditoria", path: "/audit" },
];

export const Layout = ({ children }: LayoutProps) => {
  const { canAccessPage, isAdmin } = useUserRole();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // DRE and Audit are admin-only
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.path === "/dre" || item.path === "/audit") return isAdmin;
    return canAccessPage(item.path);
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-gradient-dark shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Casa Duna</h1>
              <p className="text-xs text-primary-foreground/60">Sistema de Controle</p>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full overflow-hidden border-2 border-primary-foreground/30 hover:border-primary transition-colors h-10 w-10 flex-shrink-0"
            >
              <img src={dunaLogo} alt="Duna Club" className="h-full w-full object-cover" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">{children}</main>

      {/* Bottom Navigation - Centered */}
      <nav className="bg-card border-t border-border fixed bottom-0 left-0 right-0 shadow-strong z-50">
        <div className="container mx-auto px-2">
          <div
            className="flex justify-center gap-0.5 py-1.5 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors min-w-[52px]"
                activeClassName="text-primary bg-muted"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-[10px] font-medium whitespace-nowrap leading-tight">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};
