import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  quantity: number;
  unit_cost: number;
  status: string;
  drinks: {
    name: string;
    brand: string;
    item_number: number | null;
  };
}

interface Order {
  id: string;
  status: string;
  created_at: string;
  tables: {
    table_number: number;
  };
}

export default function CustomerOrder() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get("mesa");
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tableNumber) {
      fetchOrder();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('order-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_items'
          },
          () => {
            fetchOrder();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tableNumber]);

  const fetchOrder = async () => {
    if (!tableNumber) return;

    setLoading(true);
    try {
      // Get table
      const { data: table, error: tableError } = await supabase
        .from("tables")
        .select("id")
        .eq("table_number", parseInt(tableNumber))
        .single();

      if (tableError) throw tableError;

      // Get open order for table
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*, tables(table_number)")
        .eq("table_id", table.id)
        .eq("status", "open")
        .maybeSingle();

      if (orderError && orderError.code !== 'PGRST116') throw orderError;

      setOrder(orderData);

      if (orderData) {
        // Get order items
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("*, drinks(*)")
          .eq("order_id", orderData.id);

        if (itemsError) throw itemsError;
        setOrderItems(items || []);
      } else {
        setOrderItems([]);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'preparing':
        return 'bg-blue-500';
      case 'ready':
        return 'bg-green-500';
      case 'delivered':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'preparing':
        return 'Preparando';
      case 'ready':
        return 'Pronto';
      case 'delivered':
        return 'Entregue';
      default:
        return status;
    }
  };

  const getTotalCost = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
  };

  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Comanda Digital</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Use o QR code da sua mesa para acessar a comanda
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando comanda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mesa {tableNumber} - Casa Duna</CardTitle>
              <Button variant="ghost" size="icon" onClick={fetchOrder}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!order ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma comanda aberta para esta mesa
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {orderItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Sua comanda está vazia
                    </p>
                  ) : (
                    orderItems.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {item.drinks.item_number && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.drinks.item_number}
                                  </Badge>
                                )}
                                <span className="font-semibold">{item.drinks.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {item.drinks.brand}
                              </p>
                              <p className="text-sm">
                                {item.quantity}x R$ {item.unit_cost.toFixed(2)} = R$ {(item.unit_cost * item.quantity).toFixed(2)}
                              </p>
                            </div>
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusText(item.status)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {orderItems.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total:</span>
                      <span>R$ {getTotalCost().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <p>Comanda digital atualizada em tempo real</p>
            <p className="mt-1">Chame um garçom para fechar a conta</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
