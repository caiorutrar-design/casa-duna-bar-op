import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "bartender" | "manager" | "admin" | "garcom" | "barman" | "usuario";

// Page access mapping per role
// - Cozinha (barman): apenas o módulo da cozinha
// - Vendas (garcom/bartender): apenas o módulo de vendas
// - Demais módulos: somente gerente ou administrador
const MANAGER_PAGES = [
  "/sales",
  "/kitchen",
  "/stock",
  "/entry",
  "/cash-closure",
  "/reports",
  "/dre",
  "/events",
  "/collaborators",
  "/stock-withdrawal",
  "/audit",
  "/menu",
];

const ROLE_PAGES: Record<AppRole, string[]> = {
  admin: ["all"],
  manager: MANAGER_PAGES,
  garcom: ["/sales"],
  bartender: ["/sales"],
  barman: ["/kitchen"],
  usuario: [],
};

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setRoles([]); setLoading(false); return; }

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const userRoles = (data || []).map((r: any) => r.role as AppRole);
        setRoles(userRoles);
      } catch {
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  const isAdmin = roles.includes("admin");
  const isManager = isAdmin || roles.includes("manager");

  const canAccessPage = (path: string): boolean => {
    if (roles.length === 0) return false;
    if (path === "/users") return isAdmin;
    return roles.some((role) => {
      const pages = ROLE_PAGES[role] ?? [];
      return pages.includes("all") || pages.includes(path);
    });
  };

  const homePath = (): string => {
    if (isManager) return "/";
    if (roles.includes("barman")) return "/kitchen";
    if (roles.includes("garcom") || roles.includes("bartender")) return "/sales";
    return "/";
  };

  return { roles, isAdmin, isManager, loading, canAccessPage, homePath };
}
