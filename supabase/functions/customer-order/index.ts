import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = (body as Record<string, unknown>).tableNumber;
    if (typeof raw !== "number" && typeof raw !== "string") {
      return new Response(JSON.stringify({ error: "Invalid table number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const str = String(raw).trim();
    if (!/^\d{1,3}$/.test(str)) {
      return new Response(JSON.stringify({ error: "Invalid table number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const num = Number(str);
    if (!Number.isInteger(num) || num < 1 || num > 999) {
      return new Response(JSON.stringify({ error: "Invalid table number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get table
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", num)
      .single();

    if (tableError || !table) {
      return new Response(JSON.stringify({ order: null, items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get open order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, created_at")
      .eq("table_id", table.id)
      .eq("status", "open")
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ order: null, items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order items - only return non-sensitive fields
    const { data: items } = await supabase
      .from("order_items")
      .select("id, quantity, unit_cost, status, drinks(name, brand, item_number)")
      .eq("order_id", order.id);

    return new Response(
      JSON.stringify({ order, items: items || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
