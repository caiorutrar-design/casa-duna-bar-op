import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "bartender" | "manager" | "admin" | "garcom" | "barman" | "usuario";

// Page access mapping per role
const ROLE_PAGES: Record<AppRole, string[]> = {
  admin: ["all"],
  manager: ["/", "/stock", "/entry", "/cash-closure", "/reports"],
  garcom: ["/", "/bar", "/cash-closure", "/reports"],
  bartender: ["/", "/bar", "/cash-closure", "/reports"], // legacy, same as garcom
  barman: ["/bar", "/stock-withdrawal", "/stock", "/reports"],
  usuario: ["/events", "/collaborators", "/reports", "/audit"],
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
    return roles.some((role) => {
      const pages = ROLE_PAGES[role];
      return pages.includes("all") || pages.includes(path);
    });
  };

  return { roles, isAdmin, isManager, loading, canAccessPage };
}
