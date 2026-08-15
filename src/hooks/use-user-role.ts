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
  "/bar",
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
  barman: ["/kitchen", "/bar"],
  usuario: [],
};

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRoles = async (userId?: string) => {
      try {
        let uid = userId;
        if (!uid) {
          const { data: { session } } = await supabase.auth.getSession();
          uid = session?.user?.id;
        }
        if (!uid) {
          if (active) { setRoles([]); setLoading(false); }
          return;
        }
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        if (active) setRoles((data || []).map((r: any) => r.role as AppRole));
      } catch {
        // mantém as permissões atuais em caso de falha de rede
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadRoles(session.user.id);
      else { setRoles([]); setLoading(false); }
    });

    return () => { active = false; subscription.unsubscribe(); };
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
