import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, ShoppingBag } from "lucide-react";
import { formatElapsed } from "@/components/ElapsedTimer";

const since = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const UserHistory = ({ name }: { name: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["user-history", name],
    enabled: !!name,
    queryFn: async () => {
      const [salesRes, ordersRes] = await Promise.all([
        supabase
          .from("sales")
          .select("id, quantity, total_cost, created_at, drinks(name)")
          .eq("bartender_name", name)
          .gte("created_at", since())
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("orders")
          .select("id, created_at, closed_at, total_cost, tables(table_number), order_items(quantity, drinks(name))")
          .eq("bartender_name", name)
          .eq("status", "closed")
          .gte("created_at", since())
          .order("closed_at", { ascending: false })
          .limit(100),
      ]);
      if (salesRes.error) throw salesRes.error;
      if (ordersRes.error) throw ordersRes.error;
      return { sales: salesRes.data ?? [], orders: ordersRes.data ?? [] };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground font-body">Carregando histórico...</p>;

  const totalSales = (data?.sales ?? []).reduce((s: number, r: any) => s + Number(r.total_cost ?? 0), 0);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" /> Vendas (30 dias) — R$ {totalSales.toFixed(2)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {!data?.sales.length && <p className="text-sm text-muted-foreground font-body">Nenhuma venda registrada.</p>}
          {(data?.sales ?? []).map((s: any) => (
            <div key={s.id} className="flex items-center gap-2 text-sm border-b border-border/60 pb-1.5">
              <span className="flex-1 truncate">{s.quantity}x {s.drinks?.name ?? "Item"}</span>
              <span className="text-xs text-muted-foreground">{fmt(s.created_at)}</span>
              <span className="font-semibold text-primary">R$ {Number(s.total_cost ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-primary" /> Saídas da cozinha (comandas fechadas)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!data?.orders.length && <p className="text-sm text-muted-foreground font-body">Nenhuma comanda fechada.</p>}
          {(data?.orders ?? []).map((o: any) => (
            <div key={o.id} className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">Mesa {o.tables?.table_number ?? "-"}</Badge>
                <span className="text-xs text-muted-foreground">{fmt(o.created_at)}</span>
                {o.closed_at && (
                  <Badge variant="secondary" className="ml-auto font-mono">
                    {formatElapsed(new Date(o.closed_at).getTime() - new Date(o.created_at).getTime())}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {(o.order_items ?? []).map((i: any, idx: number) => (
                  <span key={idx}>{idx > 0 ? ", " : ""}{i.quantity}x {i.drinks?.name ?? "Item"}</span>
                ))}
              </div>
              <p className="text-sm font-semibold text-primary">Total: R$ {Number(o.total_cost ?? 0).toFixed(2)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
