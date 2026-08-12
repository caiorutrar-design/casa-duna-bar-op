import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLES = ["admin", "manager", "bartender", "garcom", "barman", "usuario"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = String(body.action ?? "");

  try {
    if (action === "list") {
      const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) throw error;
      const ids = list.users.map((u) => u.id);
      const { data: roles } = await admin.from("user_roles").select("user_id, role").in("user_id", ids);
      const { data: profiles } = await admin.from("profiles").select("user_id, bartender_name, photo_url").in("user_id", ids);
      return json({
        users: list.users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          name: profiles?.find((p) => p.user_id === u.id)?.bartender_name ?? u.email,
          photo_url: profiles?.find((p) => p.user_id === u.id)?.photo_url ?? null,
          roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role),
        })),
      });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const name = String(body.name ?? "").trim();
      const role = String(body.role ?? "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) return json({ error: "E-mail inválido" }, 400);
      if (password.length < 8 || password.length > 72) return json({ error: "Senha deve ter ao menos 8 caracteres" }, 400);
      if (name.length < 2 || name.length > 100) return json({ error: "Nome inválido" }, 400);
      if (!ROLES.includes(role)) return json({ error: "Função inválida" }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { bartender_name: name },
      });
      if (error) return json({ error: error.message }, 400);

      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: created.user.id, role });
      if (roleErr) return json({ error: roleErr.message }, 400);
      return json({ success: true, id: created.user.id });
    }

    if (action === "set_role") {
      const userId = String(body.user_id ?? "");
      const role = String(body.role ?? "");
      if (!userId || !ROLES.includes(role)) return json({ error: "Dados inválidos" }, 400);
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error } = await admin.from("user_roles").insert({ user_id: userId, role });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "set_photo") {
      const userId = String(body.user_id ?? "");
      const photoPath = body.photo_url === null ? null : String(body.photo_url ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "Dados inválidos" }, 400);
      if (photoPath !== null && (photoPath.length === 0 || photoPath.length > 300 || !/^[\w./-]+$/.test(photoPath))) {
        return json({ error: "Caminho de foto inválido" }, 400);
      }
      const { error } = await admin.from("profiles").update({ photo_url: photoPath }).eq("user_id", userId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === "delete") {
      const userId = String(body.user_id ?? "");
      if (!userId) return json({ error: "Dados inválidos" }, 400);
      if (userId === userData.user.id) return json({ error: "Você não pode excluir seu próprio usuário" }, 400);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
