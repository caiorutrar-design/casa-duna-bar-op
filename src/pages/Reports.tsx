import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Package, AlertTriangle, ShoppingCart } from "lucide-react";

interface StockAlert {
  id: string;
  name: string;
  brand: string | null;
  current_stock: number;
  min_stock: number;
  unit: string;
  cost_per_unit: number;
}

export default function Reports() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("total_cost, quantity");

      if (salesError) throw salesError;

      const revenue = salesData?.reduce((sum, sale) => sum + (sale.total_cost || 0), 0) || 0;
      const sales = salesData?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;

      setTotalRevenue(revenue);
      setTotalSales(sales);

      // Fetch stock alerts - ingredients below minimum stock
      const { data: stockData, error: stockError } = await supabase
        .from("ingredients")
        .select("*")
        .order("current_stock", { ascending: true });

      if (stockError) throw stockError;
      
      // Filter to show only items at or below minimum stock
      const alerts = (stockData || []).filter(item => item.current_stock <= item.min_stock);
      setStockAlerts(alerts);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const calculateReorderAmount = (ingredient: StockAlert) => {
    // Recommend ordering double the minimum minus current stock
    const needed = ingredient.min_stock * 2 - ingredient.current_stock;
    return Math.max(0, needed);
  };

  const calculateReorderCost = (ingredient: StockAlert) => {
    const amount = calculateReorderAmount(ingredient);
    return amount * ingredient.cost_per_unit;
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
          <p className="text-muted-foreground">Resumo de vendas e estoque</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total de vendas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales}</div>
              <p className="text-xs text-muted-foreground">Drinks vendidos</p>
            </CardContent>
          </Card>
        </div>

        {stockAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alertas de Estoque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stockAlerts.map((ingredient) => {
                  const reorderAmount = calculateReorderAmount(ingredient);
                  const reorderCost = calculateReorderCost(ingredient);
                  const percentage = (ingredient.current_stock / ingredient.min_stock) * 100;

                  return (
                    <Card key={ingredient.id} className="border-warning">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-foreground">{ingredient.name}</h3>
                              {ingredient.brand && (
                                <Badge variant="outline" className="text-xs">
                                  {ingredient.brand}
                                </Badge>
                              )}
                              <Badge
                                className={
                                  ingredient.current_stock === 0
                                    ? "bg-danger text-danger-foreground"
                                    : percentage < 10
                                    ? "bg-danger text-danger-foreground"
                                    : "bg-warning text-warning-foreground"
                                }
                              >
                                {ingredient.current_stock === 0
                                  ? "ZERADO"
                                  : percentage < 10
                                  ? "CRÍTICO"
                                  : "BAIXO"}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>
                                Estoque atual: <span className="font-medium">{ingredient.current_stock} {ingredient.unit}</span>
                              </p>
                              <p>
                                Estoque mínimo: <span className="font-medium">{ingredient.min_stock} {ingredient.unit}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                                <ShoppingCart className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="font-medium text-foreground">
                                    Recomendado comprar: {reorderAmount.toFixed(1)} {ingredient.unit}
                                  </p>
                                  <p className="text-xs">
                                    Custo estimado: <span className="font-medium">R$ {reorderCost.toFixed(2)}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Custo Total de Reposição:</span>
                    <span className="text-xl font-bold text-primary">
                      R${" "}
                      {stockAlerts
                        .reduce((sum, ing) => sum + calculateReorderCost(ing), 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}