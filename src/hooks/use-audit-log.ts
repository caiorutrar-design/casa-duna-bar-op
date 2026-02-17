import { supabase } from "@/integrations/supabase/client";

export async function logAuditAction(action: string, module?: string, details?: Record<string, any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email || "",
      action,
      module,
      details: details || {},
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
