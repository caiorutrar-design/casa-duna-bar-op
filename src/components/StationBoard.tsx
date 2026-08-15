import { useEffect, useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Check, Clock, Timer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ElapsedTimer } from "@/components/ElapsedTimer";
import { playAlertSound, unlockAudio } from "@/lib/notify";

export type Station = "cozinha" | "bar";

interface OrderItem {
  id: string;
  quantity: number;
  unit_cost: number;
  status: string;
  created_at: string;
  drinks: { name: string; brand: string; item_number: number | null; station: string };
  orders: { id: string; tables: { table_number: number } };
}

const SELECT = `
  *,
  drinks!inner(name, brand, item_number, station),
  orders!inner(id, tables(table_number))
`;

interface Props {
  station: Station;
  title: string;
  icon: React.ReactNode;
}

export function StationBoard({ station, title, icon }: Props) {
  const [pendingItems, setPendingItems] = useState<OrderItem[]>([]);
  const [preparingItems, setPreparingItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(SELECT)
        .eq("drinks.station", station)
        .in("status", ["pending", "preparing"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      const list = (data || []) as unknown as OrderItem[];
      setPendingItems(list.filter((i) => i.status === "pending"));
      setPreparingItems(list.filter((i) => i.status === "preparing"));
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [station]);

  useEffect(() => {
    fetchOrders();

    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });

    const channel = supabase
      .channel(`station-${station}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        async (payload) => {
          const next = payload.new as { id?: string; status?: string } | null;
          const removedId = (payload.old as { id?: string } | null)?.id;

          if (payload.eventType === "DELETE" && removedId) {
            setPendingItems((p) => p.filter((i) => i.id !== removedId));
            setPreparingItems((p) => p.filter((i) => i.id !== removedId));
            return;
          }
          if (!next?.id) return;

          if (next.status === "ready" || next.status === "delivered" || next.status === "draft") {
            setPendingItems((p) => p.filter((i) => i.id !== next.id));
            setPreparingItems((p) => p.filter((i) => i.id !== next.id));
            return;
          }

          const { data } = await supabase
            .from("order_items")
            .select(SELECT)
            .eq("drinks.station", station)
            .eq("id", next.id)
            .maybeSingle();
          if (!data) return;
          const item = data as unknown as OrderItem;

          if (item.status === "pending") {
            setPreparingItems((p) => p.filter((i) => i.id !== item.id));
            setPendingItems((p) => (p.some((i) => i.id === item.id) ? p : [...p, item]));
            toast.success(`🔔 Novo pedido - Mesa ${item.orders.tables.table_number}`, {
              description: `${item.quantity}x ${item.drinks.name}`,
              duration: 5000,
            });
            playAlertSound();
          } else if (item.status === "preparing") {
            setPendingItems((p) => p.filter((i) => i.id !== item.id));
            setPreparingItems((p) => (p.some((i) => i.id === item.id) ? p : [...p, item]));
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("pointerdown", unlock);
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, station]);

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    const { error } = await supabase.from("order_items").update({ status: newStatus }).eq("id", itemId);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(newStatus === "preparing" ? "Item em preparação" : "Item pronto para entrega");
  };

  const renderCard = (item: OrderItem, action: () => void, label: string, actionIcon: React.ReactNode, tone: string) => (
    <Card key={item.id} className={tone}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background">Mesa {item.orders.tables.table_number}</Badge>
          {item.drinks.item_number && <Badge variant="secondary">#{item.drinks.item_number}</Badge>}
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">{item.drinks.name}</h3>
          <p className="text-sm text-muted-foreground">{item.drinks.brand}</p>
          <p className="text-sm font-medium mt-1">Quantidade: {item.quantity}x</p>
          <p className="text-sm font-semibold mt-1 flex items-center gap-1.5 text-primary">
            <Timer className="h-4 w-4" />
            <ElapsedTimer start={item.created_at} />
          </p>
        </div>
        <Button className="w-full" onClick={action}>
          {actionIcon}
          {label}
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              {icon}
              {title}
            </h2>
            <p className="text-muted-foreground text-sm">Pedidos em tempo real</p>
          </div>
          {pendingItems.length > 0 && (
            <Badge variant="destructive" className="gap-1 text-lg px-3 py-1">
              <Bell className="h-5 w-5 animate-pulse" />
              {pendingItems.length}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Clock className="h-5 w-5" />
                Pendentes ({pendingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[520px] pr-4">
                {pendingItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">Nenhum pedido pendente</p>
                ) : (
                  <div className="space-y-3">
                    {pendingItems.map((item) =>
                      renderCard(item, () => updateItemStatus(item.id, "preparing"), "Começar a Preparar", <Clock className="h-4 w-4 mr-2" />, "border-warning/50 bg-warning/5")
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                Em Preparação ({preparingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[520px] pr-4">
                {preparingItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">Nenhum pedido em preparação</p>
                ) : (
                  <div className="space-y-3">
                    {preparingItems.map((item) =>
                      renderCard(item, () => updateItemStatus(item.id, "ready"), "Marcar como Pronto", <Check className="h-4 w-4 mr-2" />, "border-primary/50 bg-primary/5")
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
