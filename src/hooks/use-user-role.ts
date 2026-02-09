import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsManager(false); setLoading(false); return; }

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = (data || []).map((r: any) => r.role);
        setIsManager(roles.includes("manager") || roles.includes("admin"));
      } catch {
        setIsManager(false);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  return { isManager, loading };
}
