import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Package, AlertTriangle, ShoppingCart, ArrowRight } from "lucide-react";
import { AuditReport } from "@/components/AuditReport";
import { SwipeableCard } from "@/components/SwipeableCard";

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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Carregando relatórios...</p>
        </div>
      </Layout>
    );
  }

  const totalReorderCost = stockAlerts.reduce((sum, item) => sum + calculateReorderCost(item), 0);

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-primary rounded-lg p-6 text-white shadow-strong">
          <h2 className="text-3xl font-bold">Relatórios</h2>
          <p className="text-white/90 mt-1">Resumo de vendas e estoque para auditoria</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SwipeableCard>
            <Card className="border-l-4 border-l-primary hover:shadow-soft transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita Total
                </CardTitle>
                <DollarSign className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  R$ {totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Total de vendas acumuladas
                </p>
              </CardContent>
            </Card>
          </SwipeableCard>

          <SwipeableCard>
            <Card className="border-l-4 border-l-accent hover:shadow-soft transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vendas Totais
                </CardTitle>
                <Package className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {totalSales}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Drinks vendidos no total
                </p>
              </CardContent>
            </Card>
          </SwipeableCard>
        </div>

        <AuditReport />

        {stockAlerts.length > 0 && (
          <Card className="border-l-4 border-l-danger shadow-accent">
            <CardHeader>
              <CardTitle className="flex items-center text-danger">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Alertas de Estoque Crítico
                <Badge variant="destructive" className="ml-auto">
                  {stockAlerts.length} {stockAlerts.length === 1 ? 'item' : 'itens'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stockAlerts.map((ingredient) => (
                  <SwipeableCard 
                    key={ingredient.id}
                    onSwipeLeft={() => toast.info(`Arraste para a direita para mais ações`)}
                  >
                    <div className="p-4 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {ingredient.name}
                          </h4>
                          {ingredient.brand && (
                            <p className="text-sm text-muted-foreground">
                              {ingredient.brand}
                            </p>
                          )}
                        </div>
                        <Badge variant="destructive">Crítico</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="bg-background p-2 rounded">
                          <p className="text-muted-foreground">Estoque Atual</p>
                          <p className="font-semibold text-danger">
                            {ingredient.current_stock} {ingredient.unit}
                          </p>
                        </div>
                        <div className="bg-background p-2 rounded">
                          <p className="text-muted-foreground">Estoque Mínimo</p>
                          <p className="font-semibold">
                            {ingredient.min_stock} {ingredient.unit}
                          </p>
                        </div>
                      </div>

                      <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-accent">
                            Recomendação de Compra
                          </span>
                          <ArrowRight className="h-4 w-4 text-accent" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Quantidade</p>
                            <p className="font-bold text-foreground">
                              {calculateReorderAmount(ingredient)} {ingredient.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Custo Estimado</p>
                            <p className="font-bold text-primary">
                              R$ {calculateReorderCost(ingredient).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                ))}

                <div className="bg-gradient-dark text-white p-4 rounded-lg shadow-strong">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Custo Total de Reabastecimento
                    </span>
                    <span className="text-2xl font-bold">
                      R$ {totalReorderCost.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-2">
                    Valor necessário para normalizar o estoque de todos os itens críticos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stockAlerts.length === 0 && (
          <Card className="border-l-4 border-l-success">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Estoque em Ordem
                </h3>
                <p className="text-muted-foreground">
                  Não há alertas de estoque no momento. Todos os ingredientes estão acima do nível mínimo.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>💡 Dica: Arraste os cards para os lados em dispositivos touch</p>
        </div>
      </div>
    </Layout>
  );
}