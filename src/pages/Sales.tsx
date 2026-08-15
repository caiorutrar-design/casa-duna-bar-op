import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Minus,
  Trash2,
  Check,
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
  Timer,
  Search,
  BellRing,
  ChefHat,
  Send,
  UtensilsCrossed,
  Receipt,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ElapsedTimer } from "@/components/ElapsedTimer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrderAlerts } from "@/hooks/use-order-alerts";
import {
  notificationPermission,
  requestNotificationPermission,
  unlockAudio,
} from "@/lib/notify";

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
  price?: number;
  description?: string | null;
  station?: string | null;
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
  created_at?: string;
  drinks: Drink;
}

const MENU_URL = "https://cafe.dunaclub.com";

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Na mesa", className: "bg-secondary text-secondary-foreground" },
  pending: { label: "Enviado", className: "bg-muted text-muted-foreground" },
  preparing: { label: "Preparando", className: "bg-warning text-warning-foreground" },
  ready: { label: "Pronto", className: "bg-primary text-primary-foreground" },
  delivered: { label: "Entregue", className: "bg-success text-primary-foreground" },
};

export default function Sales() {
  const [tables, setTables] = useState<Table[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [openOrders, setOpenOrders] = useState<Record<string, { id: string; created_at: string }>>({});
  const [readyByTable, setReadyByTable] = useState<Record<string, number>>({});
  const [totalsByTable, setTotalsByTable] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [quickNumber, setQuickNumber] = useState("");
  const [tab, setTab] = useState("menu");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [permission, setPermission] = useState(notificationPermission());

  const fetchTableState = useCallback(async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, table_id, created_at, order_items(quantity, unit_cost, status)")
      .eq("status", "open")
      .limit(1000);

    const openMap: Record<string, { id: string; created_at: string }> = {};
    const ready: Record<string, number> = {};
    const totals: Record<string, number> = {};

    (orders || []).forEach((o: any) => {
      openMap[o.table_id] = { id: o.id, created_at: o.created_at };
      const items = (o.order_items || []) as { quantity: number; unit_cost: number; status: string }[];
      ready[o.table_id] = items.filter((i) => i.status === "ready").length;
      totals[o.table_id] = items.reduce((s, i) => s + i.unit_cost * i.quantity, 0);
    });

    setOpenOrders(openMap);
    setReadyByTable(ready);
    setTotalsByTable(totals);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, drinksRes] = await Promise.all([
        supabase.from("tables").select("*").order("table_number"),
        supabase.from("drinks").select("*").eq("active", true).order("item_number"),
      ]);

      if (tablesRes.error) throw tablesRes.error;
      if (drinksRes.error) throw drinksRes.error;

      setTables(tablesRes.data || []);
      setDrinks(drinksRes.data || []);
      await fetchTableState();
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [fetchTableState]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Alerta sonoro + notificação quando a cozinha marca um item como pronto
  useOrderAlerts(true, (alert) => {
    toast.success(
      alert.tableNumber ? `Mesa ${alert.tableNumber} — pedido pronto!` : "Pedido pronto!",
      { description: `${alert.quantity}x ${alert.drinkName} pronto para entrega`, duration: 10000 }
    );
    fetchTableState();
    if (currentOrder) fetchOrderItems(currentOrder.id);
  });

  const enableAlerts = async () => {
    unlockAudio();
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") toast.success("Alertas ativados neste aparelho");
    else if (result === "denied") toast.error("Notificações bloqueadas — o alerta sonoro continua ativo");
  };

  const openTable = async (table: Table) => {
    unlockAudio();
    setSelectedTable(table);
    setTab("menu");
    setSearch("");
    setCategory("all");

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("table_id", table.id)
      .eq("status", "open")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching order:", error);
      toast.error("Erro ao carregar comanda");
      return;
    }

    if (orders) {
      setCurrentOrder(orders);
      await fetchOrderItems(orders.id);
      if (table.status === "available") {
        await supabase.from("tables").update({ status: "occupied" }).eq("id", table.id);
        setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status: "occupied" } : t)));
      }
    } else {
      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert({ table_id: table.id })
        .select()
        .single();

      if (createError) {
        console.error("Error creating order:", createError);
        toast.error("Erro ao criar comanda");
        return;
      }

      setCurrentOrder(newOrder);
      setOrderItems([]);
      await supabase.from("tables").update({ status: "occupied" }).eq("id", table.id);
      setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status: "occupied" } : t)));
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from("order_items")
      .select("*, drinks(*)")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching order items:", error);
      return;
    }
    setOrderItems(data || []);
  };

  const addDrink = async (drink: Drink, qty = 1) => {
    if (!currentOrder) return;
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
        toast.success(`${qty}x ${drink.name} enviado à cozinha`);
        await fetchOrderItems(currentOrder.id);
        await fetchTableState();
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Erro ao adicionar item");
    } finally {
      setProcessing(false);
    }
  };

  const addByNumber = async () => {
    const num = parseInt(quickNumber);
    if (!num) return;
    const drink = drinks.find((d) => d.item_number === num);
    if (!drink) {
      toast.error(`Item ${num} não encontrado`);
      return;
    }
    setQuickNumber("");
    await addDrink(drink, 1);
  };

  const changeQuantity = async (item: OrderItem, delta: number) => {
    if (item.status !== "pending") {
      toast.error("Item já está em preparo na cozinha");
      return;
    }
    const next = item.quantity + delta;
    if (next < 1) {
      await removeOrderItem(item);
      return;
    }
    const { error } = await supabase.from("order_items").update({ quantity: next }).eq("id", item.id);
    if (error) {
      toast.error("Erro ao atualizar quantidade");
      return;
    }
    setOrderItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)));
    fetchTableState();
  };

  const removeOrderItem = async (item: OrderItem) => {
    try {
      const { error } = await supabase.from("order_items").delete().eq("id", item.id);
      if (error) throw error;
      setOrderItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(`${item.drinks.name} removido da comanda`);
      fetchTableState();
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Erro ao remover item");
    }
  };

  const markDelivered = async (item: OrderItem) => {
    const { error } = await supabase.from("order_items").update({ status: "delivered" }).eq("id", item.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    setOrderItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "delivered" } : i)));
    toast.success("Item entregue");
    fetchTableState();
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

    const VALID_METHODS = ["cash", "card_debit", "card_credit", "pix"];
    if (!VALID_METHODS.includes(paymentMethod)) {
      toast.error("Forma de pagamento inválida");
      return;
    }

    let bartenderName: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("bartender_name")
          .eq("user_id", user.id)
          .single();
        bartenderName = profile?.bartender_name || user.email || null;
      }
    } catch {
      // fall through
    }
    if (!bartenderName) {
      toast.error("Usuário não identificado. Faça login novamente.");
      return;
    }

    setProcessing(true);
    setShowPaymentDialog(false);
    try {
      await supabase.from("orders").update({ payment_method: paymentMethod }).eq("id", currentOrder.id);

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

  const closeSheet = () => {
    setSelectedTable(null);
    setCurrentOrder(null);
    setOrderItems([]);
    fetchTableState();
  };

  const totalCost = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.unit_cost * item.quantity, 0),
    [orderItems]
  );
  const itemCount = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.quantity, 0),
    [orderItems]
  );
  const readyCount = useMemo(
    () => Object.values(readyByTable).reduce((s, n) => s + n, 0),
    [readyByTable]
  );

  const categories = useMemo(
    () => Array.from(new Set(drinks.map((d) => d.brand || "Outros"))),
    [drinks]
  );

  const filteredDrinks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return drinks.filter((d) => {
      const inCat = category === "all" || (d.brand || "Outros") === category;
      if (!inCat) return false;
      if (!term) return true;
      return (
        d.name.toLowerCase().includes(term) ||
        String(d.item_number ?? "").includes(term)
      );
    });
  }, [drinks, search, category]);

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
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Mesas</h2>
            <p className="text-muted-foreground text-sm">Toque numa mesa para abrir a comanda</p>
          </div>
          <div className="flex items-center gap-2">
            {readyCount > 0 && (
              <Badge className="gap-1.5 bg-primary text-primary-foreground animate-pulse">
                <BellRing className="h-4 w-4" />
                {readyCount} pronto{readyCount > 1 ? "s" : ""}
              </Badge>
            )}
            {permission !== "granted" && (
              <Button size="sm" variant="outline" onClick={enableAlerts} className="gap-1.5">
                <BellRing className="h-4 w-4" />
                Ativar alertas
              </Button>
            )}
          </div>
        </div>

        <Card className="border-primary/30 overflow-hidden">
          <CardContent className="flex flex-col items-center gap-3 p-5 sm:flex-row sm:gap-6">
            <div className="rounded-lg bg-card p-2 border border-border">
              <QRCodeSVG value={MENU_URL} size={100} level="M" />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-display font-bold text-foreground flex items-center justify-center gap-2 sm:justify-start">
                <QrCode className="h-5 w-5 text-primary" /> Cardápio digital
              </p>
              <p className="text-sm text-muted-foreground font-body">
                Mostre este QR code ao cliente para abrir o cardápio.
              </p>
              <a
                href={MENU_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary underline underline-offset-4"
              >
                cafe.dunaclub.com
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tables.map((table) => {
            const open = openOrders[table.id];
            const ready = readyByTable[table.id] || 0;
            const total = totalsByTable[table.id] || 0;
            const occupied = !!open;
            return (
              <Card
                key={table.id}
                className={`relative cursor-pointer transition-all duration-200 active:scale-95 overflow-hidden ${
                  occupied ? "border-primary shadow-md" : "border-border"
                }`}
                onClick={() => openTable(table)}
              >
                {ready > 0 && (
                  <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground animate-pulse">
                    {ready}
                  </span>
                )}
                <CardContent className="p-4 text-center space-y-1">
                  <Users
                    className={`h-7 w-7 mx-auto ${occupied ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <p className="font-display font-bold text-lg leading-tight">Mesa {table.table_number}</p>
                  {occupied ? (
                    <>
                      <p className="text-sm font-semibold text-primary">R$ {total.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 font-mono">
                        <Timer className="h-3 w-3" />
                        <ElapsedTimer start={open.created_at} />
                      </p>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-[11px]">Livre</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Comanda */}
      <Dialog open={!!selectedTable} onOpenChange={(o) => !o && closeSheet()}>
        <DialogContent className="max-w-xl p-0 gap-0 h-[100dvh] sm:h-[88vh] w-full sm:rounded-lg rounded-none flex flex-col">
          <DialogHeader className="shrink-0 border-b px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-left">
              <Button variant="ghost" size="icon" className="-ml-2" onClick={closeSheet}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="font-display">Mesa {selectedTable?.table_number}</span>
              {currentOrder && (
                <Badge variant="secondary" className="ml-auto gap-1.5 font-mono">
                  <Timer className="h-3.5 w-3.5" />
                  <ElapsedTimer start={currentOrder.created_at} />
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 pt-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="menu" className="gap-1.5">
                  <UtensilsCrossed className="h-4 w-4" /> Cardápio
                </TabsTrigger>
                <TabsTrigger value="items" className="gap-1.5">
                  <Receipt className="h-4 w-4" /> Itens
                  {itemCount > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[11px]">{itemCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Cardápio */}
            <TabsContent value="menu" className="flex-1 overflow-hidden m-0 flex flex-col data-[state=inactive]:hidden">
              <div className="shrink-0 space-y-2 px-4 py-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar item ou número"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-11"
                    />
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Nº"
                    value={quickNumber}
                    onChange={(e) => setQuickNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addByNumber()}
                    className="w-16 h-11 text-center"
                  />
                  <Button className="h-11 w-11 p-0" onClick={addByNumber} disabled={processing || !quickNumber}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-2">
                    <Button
                      size="sm"
                      variant={category === "all" ? "default" : "outline"}
                      className="rounded-full shrink-0"
                      onClick={() => setCategory("all")}
                    >
                      Todos
                    </Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={category === cat ? "default" : "outline"}
                        className="rounded-full shrink-0"
                        onClick={() => setCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <ScrollArea className="flex-1 px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-4">
                  {filteredDrinks.map((drink) => (
                    <button
                      key={drink.id}
                      type="button"
                      disabled={processing || !currentOrder}
                      onClick={() => addDrink(drink, 1)}
                      className="text-left rounded-lg border border-border bg-card p-3 transition-all active:scale-[0.98] hover:border-primary disabled:opacity-60"
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 font-mono">{drink.item_number}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold leading-tight truncate">{drink.name}</p>
                          {drink.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{drink.description}</p>
                          )}
                        </div>
                        <span className="font-bold text-primary whitespace-nowrap">
                          R$ {Number(drink.price ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {filteredDrinks.length === 0 && (
                    <p className="col-span-full py-10 text-center text-muted-foreground">
                      Nenhum item encontrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Itens da comanda */}
            <TabsContent value="items" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full px-4 py-3">
                {orderItems.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <ChefHat className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum item na comanda</p>
                    <Button variant="outline" size="sm" onClick={() => setTab("menu")}>
                      Abrir cardápio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {orderItems.map((item) => {
                      const meta = STATUS_META[item.status] ?? STATUS_META.pending;
                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg border p-3 ${
                            item.status === "ready" ? "border-primary bg-primary/5" : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="font-mono shrink-0">
                              {item.drinks.item_number}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold leading-tight">{item.drinks.name}</p>
                              <p className="text-sm text-muted-foreground">
                                R$ {item.unit_cost.toFixed(2)} un ·{" "}
                                <span className="font-semibold text-foreground">
                                  R$ {(item.unit_cost * item.quantity).toFixed(2)}
                                </span>
                              </p>
                            </div>
                            <Badge className={meta.className}>{meta.label}</Badge>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                disabled={item.status !== "pending"}
                                onClick={() => changeQuantity(item, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-bold">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                disabled={item.status !== "pending"}
                                onClick={() => changeQuantity(item, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.status === "ready" && (
                                <Button size="sm" className="h-9" onClick={() => markDelivered(item)}>
                                  <Check className="h-4 w-4 mr-1" /> Entregar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive"
                                disabled={item.status !== "pending"}
                                onClick={() => removeOrderItem(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="shrink-0 border-t bg-card px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {itemCount} item{itemCount === 1 ? "" : "s"} · enviados à cozinha automaticamente
              </span>
              <span className="text-xl font-display font-bold">R$ {totalCost.toFixed(2)}</span>
            </div>
            <Button
              className="w-full h-12 text-base"
              onClick={handleCloseOrderClick}
              disabled={processing || orderItems.length === 0}
            >
              <Check className="h-5 w-5 mr-2" />
              Fechar comanda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            <Button variant="outline" className="h-14 text-base justify-start gap-4" onClick={() => closeOrder("pix")} disabled={processing}>
              <Smartphone className="h-6 w-6 text-primary" /> PIX
            </Button>
            <Button variant="outline" className="h-14 text-base justify-start gap-4" onClick={() => closeOrder("card_debit")} disabled={processing}>
              <CreditCard className="h-6 w-6 text-primary" /> Cartão Débito
            </Button>
            <Button variant="outline" className="h-14 text-base justify-start gap-4" onClick={() => closeOrder("card_credit")} disabled={processing}>
              <CreditCard className="h-6 w-6 text-primary" /> Cartão Crédito
            </Button>
            <Button variant="outline" className="h-14 text-base justify-start gap-4" onClick={() => closeOrder("cash")} disabled={processing}>
              <Banknote className="h-6 w-6 text-primary" /> Dinheiro
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Total: <span className="font-bold text-foreground">R$ {totalCost.toFixed(2)}</span>
          </p>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
