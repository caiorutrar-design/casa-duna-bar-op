import { NavLink } from "@/components/NavLink";
import { Home, Package, TrendingUp, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
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
          <div className="grid grid-cols-4 gap-2 py-2">
            <NavLink
              to="/"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <Home className="h-6 w-6" />
              <span className="text-xs font-medium">Vendas</span>
            </NavLink>
            <NavLink
              to="/stock"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <Package className="h-6 w-6" />
              <span className="text-xs font-medium">Estoque</span>
            </NavLink>
            <NavLink
              to="/entry"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-xs font-medium">Entrada</span>
            </NavLink>
            <NavLink
              to="/reports"
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              activeClassName="text-primary bg-muted"
            >
              <FileText className="h-6 w-6" />
              <span className="text-xs font-medium">Relatórios</span>
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
};
