import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, X, Check, ArrowLeft, Send, CreditCard, Banknote, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Table {
  id: string;
  table_number: number;
  status: string;
}

interface Drink {
  id: string;
  name: string;
  brand: string;
  item_number: number | null;
}

interface Order {
  id: string;
  table_id: string;
  status: string;
  total_cost: number;
  created_at: string;
}

interface OrderItem {
  id: string;
  drink_id: string;
  quantity: number;
  unit_cost: number;
  status: string;
  drinks: Drink;
}

export default function Sales() {
  const [tables, setTables] = useState<Table[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [itemNumber, setItemNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tablesRes, drinksRes] = await Promise.all([
        supabase.from("tables").select("*").order("table_number"),
        supabase.from("drinks").select("*").eq("active", true).order("item_number"),
      ]);

      if (tablesRes.error) throw tablesRes.error;
      if (drinksRes.error) throw drinksRes.error;

      setTables(tablesRes.data || []);
      setDrinks(drinksRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const openTable = async (table: Table) => {
    setSelectedTable(table);
    
    // Check if table has an open order
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("table_id", table.id)
      .eq("status", "open")
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching order:", error);
      toast.error("Erro ao carregar comanda");
      return;
    }

    if (orders) {
      setCurrentOrder(orders);
      await fetchOrderItems(orders.id);
      
      // Update table status to occupied if it's available
      if (table.status === 'available') {
        await supabase
          .from("tables")
          .update({ status: 'occupied' })
          .eq("id", table.id);
        fetchData();
      }
    } else {
      // Create new order
      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert({ table_id: table.id })
        .select()
        .single();

      if (createError) {
        console.error("Error creating order:", error);
        toast.error("Erro ao criar comanda");
        return;
      }

      setCurrentOrder(newOrder);
      setOrderItems([]);
      
      // Update table status to occupied
      await supabase
        .from("tables")
        .update({ status: 'occupied' })
        .eq("id", table.id);
      fetchData();
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from("order_items")
      .select("*, drinks(*)")
      .eq("order_id", orderId);

    if (error) {
      console.error("Error fetching order items:", error);
      return;
    }

    setOrderItems(data || []);
  };

  const addItemToOrder = async () => {
    if (!currentOrder || !itemNumber) return;

    const num = parseInt(itemNumber);
    const qty = parseInt(quantity) || 1;

    const drink = drinks.find(d => d.item_number === num);
    if (!drink) {
      toast.error(`Item ${num} não encontrado`);
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("add_item_to_order", {
        p_order_id: currentOrder.id,
        p_drink_id: drink.id,
        p_quantity: qty,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        toast.error(result.error || "Erro ao adicionar item");
      } else {
        toast.success(`${qty}x ${drink.name} adicionado`);
        await fetchOrderItems(currentOrder.id);
        setItemNumber("");
        setQuantity("1");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Erro ao adicionar item");
    } finally {
      setProcessing(false);
    }
  };

  const removeOrderItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Item removido");
      await fetchOrderItems(currentOrder!.id);
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Erro ao remover item");
    }
  };

  const handleCloseOrderClick = () => {
    if (!currentOrder) return;
    if (orderItems.length === 0) {
      toast.error("Adicione itens à comanda antes de fechar");
      return;
    }
    setShowPaymentDialog(true);
  };

  const closeOrder = async (paymentMethod: string) => {
    if (!currentOrder) return;

    const bartenderName = localStorage.getItem("bartender_name");
    if (!bartenderName) {
      toast.error("Bartender não identificado");
      return;
    }

    setProcessing(true);
    setShowPaymentDialog(false);
    try {
      // Save payment method
      await supabase
        .from("orders")
        .update({ payment_method: paymentMethod })
        .eq("id", currentOrder.id);

      const { data, error } = await supabase.rpc("close_order", {
        p_order_id: currentOrder.id,
        p_bartender_name: bartenderName,
      });

      if (error) throw error;

      const result = data as { success: boolean; total_cost?: number };
      
      if (result.success) {
        toast.success(`Comanda fechada! Total: R$ ${result.total_cost?.toFixed(2)}`);
        setSelectedTable(null);
        setCurrentOrder(null);
        setOrderItems([]);
        fetchData();
      }
    } catch (error) {
      console.error("Error closing order:", error);
      toast.error("Erro ao fechar comanda");
    } finally {
      setProcessing(false);
    }
  };

  const getTotalCost = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mesas</h2>
          <p className="text-muted-foreground">Selecione uma mesa para abrir comanda</p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {tables.map((table) => (
            <Card
              key={table.id}
              className={`cursor-pointer transition-all duration-200 active:scale-95 ${
                table.status === 'occupied' ? 'border-primary' : ''
              }`}
              onClick={() => openTable(table)}
            >
              <CardContent className="p-6 text-center">
                <Users className={`h-8 w-8 mx-auto mb-2 ${
                  table.status === 'occupied' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className="font-bold text-lg">Mesa {table.table_number}</p>
                <Badge variant={table.status === 'occupied' ? 'default' : 'secondary'} className="mt-2">
                  {table.status === 'occupied' ? 'Ocupada' : 'Livre'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedTable} onOpenChange={() => {
        setSelectedTable(null);
        setCurrentOrder(null);
        setOrderItems([]);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => {
                setSelectedTable(null);
                setCurrentOrder(null);
                setOrderItems([]);
              }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Comanda - Mesa {selectedTable?.table_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Número do item"
                value={itemNumber}
                onChange={(e) => setItemNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItemToOrder()}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Qtd"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20"
                min="1"
              />
              <Button onClick={addItemToOrder} disabled={processing}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-md p-4">
              {orderItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum item na comanda
                </p>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{item.drinks.item_number}</Badge>
                              <span className="font-semibold">{item.drinks.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity}x R$ {item.unit_cost.toFixed(2)} = R$ {(item.unit_cost * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOrderItem(item.id)}
                            disabled={item.status !== 'pending'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 justify-between">
                          <Badge
                            className={
                              item.status === "delivered"
                                ? "bg-success text-primary-foreground"
                                : item.status === "ready"
                                ? "bg-primary text-primary-foreground"
                                : item.status === "preparing"
                                ? "bg-warning text-warning-foreground"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {item.status === "pending"
                              ? "Pendente"
                              : item.status === "preparing"
                              ? "Preparando"
                              : item.status === "ready"
                              ? "Pronto"
                              : "Entregue"}
                          </Badge>
                          <div className="flex gap-1">
                            {item.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from("order_items")
                                      .update({ status: "preparing" })
                                      .eq("id", item.id);
                                    if (error) throw error;
                                    toast.success("Item em preparação");
                                    await fetchOrderItems(currentOrder!.id);
                                  } catch (error) {
                                    toast.error("Erro ao atualizar");
                                  }
                                }}
                              >
                                Preparar
                              </Button>
                            )}
                            {item.status === "preparing" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from("order_items")
                                      .update({ status: "ready" })
                                      .eq("id", item.id);
                                    if (error) throw error;
                                    toast.success("Item pronto");
                                    await fetchOrderItems(currentOrder!.id);
                                  } catch (error) {
                                    toast.error("Erro ao atualizar");
                                  }
                                }}
                              >
                                Finalizar
                              </Button>
                            )}
                            {item.status === "ready" && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from("order_items")
                                      .update({ status: "delivered" })
                                      .eq("id", item.id);
                                    if (error) throw error;
                                    toast.success("Item entregue");
                                    await fetchOrderItems(currentOrder!.id);
                                  } catch (error) {
                                    toast.error("Erro ao atualizar");
                                  }
                                }}
                              >
                                Entregar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>R$ {getTotalCost().toFixed(2)}</span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={handleCloseOrderClick}
                  disabled={processing || orderItems.length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Fechar Comanda
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  disabled={processing || orderItems.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar ao Bar
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-semibold mb-2">Referência Rápida:</p>
            <ScrollArea className="h-32">
              <div className="grid grid-cols-2 gap-1 text-xs">
                {drinks.filter(d => d.item_number).map((drink) => (
                  <div key={drink.id} className="flex gap-1">
                    <Badge variant="outline" className="text-xs">{drink.item_number}</Badge>
                    <span className="truncate">{drink.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              onClick={() => closeOrder("pix")}
              disabled={processing}
            >
              <Smartphone className="h-6 w-6 text-primary" />
              PIX
            </Button>
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              onClick={() => closeOrder("card_debit")}
              disabled={processing}
            >
              <CreditCard className="h-6 w-6 text-primary" />
              Cartão Débito
            </Button>
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              onClick={() => closeOrder("card_credit")}
              disabled={processing}
            >
              <CreditCard className="h-6 w-6 text-primary" />
              Cartão Crédito
            </Button>
            <Button
              variant="outline"
              className="h-16 text-lg justify-start gap-4"
              onClick={() => closeOrder("cash")}
              disabled={processing}
            >
              <Banknote className="h-6 w-6 text-primary" />
              Dinheiro
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Total: <span className="font-bold text-foreground">R$ {getTotalCost().toFixed(2)}</span>
          </p>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
