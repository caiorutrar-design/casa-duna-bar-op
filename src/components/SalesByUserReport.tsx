import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, UserCheck } from "lucide-react";
import { toast } from "sonner";

const PERIODS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

interface Row {
  name: string;
  quantity: number;
  total: number;
  items: Record<string, number>;
}

export function SalesByUserReport() {
  const [days, setDays] = useState(30);

  const since = useMemo(
    () => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    [days]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["sales-by-user", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("bartender_name, quantity, total_cost, drinks(name)")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const map = new Map<string, Row>();
      (data ?? []).forEach((s: any) => {
        const name = s.bartender_name || "Sem identificação";
        const row = map.get(name) ?? { name, quantity: 0, total: 0, items: {} };
        row.quantity += s.quantity ?? 0;
        row.total += Number(s.total_cost ?? 0);
        const drink = s.drinks?.name ?? "Item";
        row.items[drink] = (row.items[drink] ?? 0) + (s.quantity ?? 0);
        map.set(name, row);
      });
      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
  });

  const exportCSV = () => {
    if (!data?.length) {
      toast.error("Nada para exportar");
      return;
    }
    let csv = `RELATORIO DE VENDAS POR USUARIO (${days} dias)\nUsuario,Itens,Total\n`;
    data.forEach((r) => {
      csv += `${r.name},${r.quantity},${r.total.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `vendas-por-usuario-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Relatório exportado");
  };

  const grandTotal = (data ?? []).reduce((s, r) => s + r.total, 0);

  return (
    <Card className="shadow-accent">
      <CardHeader className="gap-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-display">
            <UserCheck className="h-5 w-5 text-primary" /> Vendas por usuário
          </span>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
          </Button>
        </CardTitle>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && !data?.length && (
          <p className="text-sm text-muted-foreground">Nenhuma venda no período.</p>
        )}
        {(data ?? []).map((r) => {
          const top = Object.entries(r.items).sort((a, b) => b[1] - a[1]).slice(0, 3);
          return (
            <div key={r.name} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold truncate">{r.name}</span>
                <span className="font-bold text-primary whitespace-nowrap">R$ {r.total.toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary">{r.quantity} itens</Badge>
                {top.map(([name, qty]) => (
                  <Badge key={name} variant="outline">{qty}x {name}</Badge>
                ))}
              </div>
            </div>
          );
        })}
        {!!data?.length && (
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total do período</span>
            <span className="text-lg font-bold">R$ {grandTotal.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
