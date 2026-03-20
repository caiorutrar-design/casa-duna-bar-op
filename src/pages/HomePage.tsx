import { NavLink } from "@/components/NavLink";
import { Home, Package, TrendingUp, FileText, Bell, DollarSign, BarChart3, CalendarDays, Users, PackageMinus, Shield } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import dunaLogo from "@/assets/duna-logo.jpeg";

const NAV_ITEMS = [
  { to: "/sales", icon: Home, label: "Vendas", path: "/sales" },
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

export default function HomePage() {
  const { canAccessPage, isAdmin } = useUserRole();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bartenderName, setBartenderName] = useState<string | null>(null);

  useEffect(() => {
    const fetchName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("bartender_name")
          .eq("user_id", user.id)
          .single();
        setBartenderName(profile?.bartender_name || user.email || null);
      }
    };
    fetchName();
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.path === "/dre" || item.path === "/audit") return isAdmin;
    return canAccessPage(item.path);
  });

  return (
    <div className="min-h-screen bg-gradient-sand flex flex-col">
      {/* Header */}
      <header className="bg-gradient-dark shadow-strong sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display font-bold text-primary-foreground tracking-tight">Casa Duna</h1>
              {bartenderName && (
                <p className="text-xs text-primary-foreground/60 font-body">
                  Olá, <span className="font-semibold">{bartenderName}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-full overflow-hidden border-2 border-primary/40 hover:border-primary transition-colors h-11 w-11 flex-shrink-0 active:scale-95"
            >
              <img src={dunaLogo} alt="Casa Duna" className="h-full w-full object-cover" />
            </button>
          </div>
        </div>
      </header>

      {/* Module Grid */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4">
          {visibleItems.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl bg-card border border-border shadow-soft hover:shadow-strong hover:border-primary/40 transition-all active:scale-95"
              activeClassName=""
              style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="text-sm font-semibold font-body text-foreground text-center leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
