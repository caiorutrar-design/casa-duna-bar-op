import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Check, ChefHat, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderItem {
  id: string;
  quantity: number;
  unit_cost: number;
  status: string;
  created_at: string;
  drinks: {
    name: string;
    brand: string;
    item_number: number | null;
  };
  orders: {
    id: string;
    tables: {
      table_number: number;
    };
  };
}

export default function BarNotifications() {
  const [pendingItems, setPendingItems] = useState<OrderItem[]>([]);
  const [preparingItems, setPreparingItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    setupRealtimeSubscription();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          drinks(name, brand, item_number),
          orders!inner(
            id,
            tables(table_number)
          )
        `)
        .in("status", ["pending", "preparing"])
        .order("created_at", { ascending: true });

      if (error) throw error;

      const pending = (data || []).filter((item) => item.status === "pending");
      const preparing = (data || []).filter((item) => item.status === "preparing");

      setPendingItems(pending);
      setPreparingItems(preparing);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("bar-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_items",
        },
        async (payload) => {
          console.log("New order item:", payload);
          
          // Fetch the complete item with relations
          const { data, error } = await supabase
            .from("order_items")
            .select(`
              *,
              drinks(name, brand, item_number),
              orders!inner(
                id,
                tables(table_number)
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (!error && data) {
            // Show notification
            const tableNumber = data.orders.tables.table_number;
            toast.success(
              `🔔 Novo pedido - Mesa ${tableNumber}`,
              {
                description: `${data.quantity}x ${data.drinks.name}`,
                duration: 5000,
              }
            );

            // Play notification sound (optional)
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => console.log("Audio play failed"));

            // Refresh the list
            fetchOrders();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_items",
        },
        () => {
          // Refresh when status changes
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({ status: newStatus })
        .eq("id", itemId);

      if (error) throw error;

      toast.success(
        newStatus === "preparing"
          ? "Item em preparação"
          : newStatus === "ready"
          ? "Item pronto para entrega"
          : "Status atualizado"
      );

      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

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
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ChefHat className="h-6 w-6" />
              Painel do Bar
            </h2>
            <p className="text-muted-foreground">Pedidos em tempo real</p>
          </div>
          {pendingItems.length > 0 && (
            <Badge variant="destructive" className="gap-1 text-lg px-3 py-1">
              <Bell className="h-5 w-5 animate-pulse" />
              {pendingItems.length} pendentes
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Orders */}
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Clock className="h-5 w-5" />
                Pedidos Pendentes ({pendingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {pendingItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum pedido pendente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingItems.map((item) => (
                      <Card key={item.id} className="border-warning/50 bg-warning/5">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="bg-background">
                                    Mesa {item.orders.tables.table_number}
                                  </Badge>
                                  {item.drinks.item_number && (
                                    <Badge variant="secondary">#{item.drinks.item_number}</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-lg">{item.drinks.name}</h3>
                                <p className="text-sm text-muted-foreground">{item.drinks.brand}</p>
                                <p className="text-sm font-medium mt-1">
                                  Quantidade: {item.quantity}x
                                </p>
                              </div>
                            </div>
                            <Button
                              className="w-full"
                              onClick={() => updateItemStatus(item.id, "preparing")}
                            >
                              <ChefHat className="h-4 w-4 mr-2" />
                              Começar a Preparar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Preparing Orders */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ChefHat className="h-5 w-5" />
                Em Preparação ({preparingItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {preparingItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum pedido em preparação</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {preparingItems.map((item) => (
                      <Card key={item.id} className="border-primary/50 bg-primary/5">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="bg-background">
                                    Mesa {item.orders.tables.table_number}
                                  </Badge>
                                  {item.drinks.item_number && (
                                    <Badge variant="secondary">#{item.drinks.item_number}</Badge>
                                  )}
                                </div>
                                <h3 className="font-bold text-lg">{item.drinks.name}</h3>
                                <p className="text-sm text-muted-foreground">{item.drinks.brand}</p>
                                <p className="text-sm font-medium mt-1">
                                  Quantidade: {item.quantity}x
                                </p>
                              </div>
                            </div>
                            <Button
                              className="w-full"
                              variant="default"
                              onClick={() => updateItemStatus(item.id, "ready")}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como Pronto
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
