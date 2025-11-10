import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, DollarSign, Package, ShoppingCart } from "lucide-react";

interface DailySales {
  drink_name: string;
  drink_brand: string;
  total_quantity: number;
  total_cost: number;
}

export default function Reports() {
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyReport();
  }, []);

  const fetchDailyReport = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: salesData, error } = await supabase
        .from("sales")
        .select(
          `
          quantity,
          total_cost,
          drinks (
            name,
            brand
          )
        `
        )
        .gte("created_at", today.toISOString());

      if (error) throw error;

      // Group by drink
      const grouped = salesData.reduce((acc: any, sale: any) => {
        const key = `${sale.drinks.name}-${sale.drinks.brand}`;
        if (!acc[key]) {
          acc[key] = {
            drink_name: sale.drinks.name,
            drink_brand: sale.drinks.brand,
            total_quantity: 0,
            total_cost: 0,
          };
        }
        acc[key].total_quantity += sale.quantity || 1;
        acc[key].total_cost += sale.total_cost || 0;
        return acc;
      }, {});

      const salesArray = Object.values(grouped) as DailySales[];
      setDailySales(salesArray);

      const total = salesArray.reduce((sum, item) => sum + item.total_quantity, 0);
      const cost = salesArray.reduce((sum, item) => sum + item.total_cost, 0);

      setTotalSales(total);
      setTotalCost(cost);
    } catch (error) {
      console.error("Error fetching daily report:", error);
      toast.error("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatório Diário</h2>
          <p className="text-muted-foreground">Resumo de vendas de hoje</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-primary">
            <CardContent className="p-4 text-center">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-primary-foreground" />
              <p className="text-sm text-primary-foreground/80">Total de Vendas</p>
              <p className="text-3xl font-bold text-primary-foreground">{totalSales}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-dark">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary-foreground" />
              <p className="text-sm text-primary-foreground/80">Custo Total</p>
              <p className="text-3xl font-bold text-primary-foreground">R$ {totalCost.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Sales by Drink */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Vendas por Drink
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySales.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma venda registrada hoje</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailySales.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{item.drink_name}</h4>
                      <p className="text-sm text-muted-foreground">{item.drink_brand}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold text-foreground">{item.total_quantity}x</p>
                      <p className="text-sm text-muted-foreground">R$ {item.total_cost.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
