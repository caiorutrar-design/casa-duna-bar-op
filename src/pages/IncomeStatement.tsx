import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  Download, Calendar, BarChart3
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface DREData {
  grossRevenue: number;
  cogs: number; // Cost of Goods Sold (CMV)
  grossProfit: number;
  grossMargin: number;
  cashDifferences: number;
  netProfit: number;
  netMargin: number;
}

interface DailyMetric {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
}

export default function IncomeStatement() {
  const [loading, setLoading] = useState(true);
  const [dreData, setDreData] = useState<DREData>({
    grossRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    cashDifferences: 0,
    netProfit: 0,
    netMargin: 0,
  });
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  useEffect(() => {
    fetchDREData();
  }, [startDate, endDate]);

  const fetchDREData = async () => {
    setLoading(true);
    try {
      // Fetch sales data with drink information
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          total_cost,
          quantity,
          created_at,
          drink_id,
          drinks (
            name,
            recipes (
              quantity,
              ingredients (
                cost_per_unit
              )
            )
          )
        `)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .order("created_at", { ascending: true });

      if (salesError) throw salesError;

      // Fetch cash closures for the period
      const { data: closuresData, error: closuresError } = await supabase
        .from("cash_closures")
        .select("total_difference")
        .gte("closure_date", startDate)
        .lte("closure_date", endDate);

      if (closuresError) throw closuresError;

      // Calculate metrics
      let grossRevenue = 0;
      let totalCOGS = 0;
      const dailyMap = new Map<string, { revenue: number; cogs: number }>();
      const drinkSalesMap = new Map<string, number>();

      salesData?.forEach((sale: any) => {
        const saleRevenue = sale.total_cost || 0;
        grossRevenue += saleRevenue;

        // Calculate COGS for this sale
        let saleCOGS = 0;
        if (sale.drinks?.recipes) {
          sale.drinks.recipes.forEach((recipe: any) => {
            const ingredientCost = recipe.ingredients?.cost_per_unit || 0;
            saleCOGS += recipe.quantity * ingredientCost * sale.quantity;
          });
        }
        totalCOGS += saleCOGS;

        // Track by day
        const day = format(new Date(sale.created_at), "yyyy-MM-dd");
        const current = dailyMap.get(day) || { revenue: 0, cogs: 0 };
        dailyMap.set(day, {
          revenue: current.revenue + saleRevenue,
          cogs: current.cogs + saleCOGS,
        });

        // Track by drink
        const drinkName = sale.drinks?.name || "Sem nome";
        drinkSalesMap.set(drinkName, (drinkSalesMap.get(drinkName) || 0) + saleRevenue);
      });

      const cashDifferences = closuresData?.reduce((sum, c) => sum + (c.total_difference || 0), 0) || 0;
      const grossProfit = grossRevenue - totalCOGS;
      const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
      const netProfit = grossProfit + cashDifferences;
      const netMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

      setDreData({
        grossRevenue,
        cogs: totalCOGS,
        grossProfit,
        grossMargin,
        cashDifferences,
        netProfit,
        netMargin,
      });

      // Convert daily map to array for charts
      const daily: DailyMetric[] = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date: format(new Date(date), "dd/MM"),
        revenue: data.revenue,
        cogs: data.cogs,
        profit: data.revenue - data.cogs,
        margin: data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0,
      }));
      setDailyMetrics(daily);

      // Top drinks for pie chart
      const topDrinks: CategoryBreakdown[] = Array.from(drinkSalesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
      setCategoryBreakdown(topDrinks);

    } catch (error) {
      console.error("Error fetching DRE data:", error);
      toast.error("Erro ao carregar DRE");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Descrição,Valor (R$),Percentual (%)"
    ];
    
    const rows = [
      `Receita Bruta,${dreData.grossRevenue.toFixed(2)},100.00`,
      `(-) CMV,${dreData.cogs.toFixed(2)},${((dreData.cogs / dreData.grossRevenue) * 100).toFixed(2)}`,
      `Lucro Bruto,${dreData.grossProfit.toFixed(2)},${dreData.grossMargin.toFixed(2)}`,
      `Diferenças de Caixa,${dreData.cashDifferences.toFixed(2)},${((dreData.cashDifferences / dreData.grossRevenue) * 100).toFixed(2)}`,
      `Lucro Líquido,${dreData.netProfit.toFixed(2)},${dreData.netMargin.toFixed(2)}`,
    ];

    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DRE_${startDate}_${endDate}.csv`;
    link.click();
    toast.success("DRE exportada com sucesso");
  };

  const COLORS = ["hsl(24, 100%, 50%)", "hsl(4, 100%, 36%)", "hsl(172, 50%, 60%)", "hsl(180, 67%, 23%)", "hsl(0, 0%, 60%)"];

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Carregando DRE...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="bg-gradient-primary rounded-lg p-6 text-white shadow-strong">
          <h2 className="text-3xl font-bold">DRE - Demonstração do Resultado</h2>
          <p className="text-white/90 mt-1">Análise financeira completa do período</p>
        </div>

        {/* Period Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Período de Análise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={fetchDREData} className="flex-1">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                }}
              >
                Últimos 7 dias
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setStartDate(format(subDays(new Date(), 30), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                }}
              >
                Últimos 30 dias
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                  setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                }}
              >
                Mês Atual
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Bruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {dreData.grossRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                CMV (Custo)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {dreData.cogs.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((dreData.cogs / dreData.grossRevenue) * 100 || 0).toFixed(1)}% da receita
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Lucro Bruto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                R$ {dreData.grossProfit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem: {dreData.grossMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${dreData.netProfit >= 0 ? 'border-l-accent' : 'border-l-destructive'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {dreData.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                Lucro Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dreData.netProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                R$ {dreData.netProfit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem: {dreData.netMargin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DRE Table */}
        <Card>
          <CardHeader>
            <CardTitle>Demonstração Estruturada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="font-semibold">Receita Bruta de Vendas</span>
                <span className="font-bold text-primary">R$ {dreData.grossRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 pl-4">
                <span className="text-muted-foreground">(-) Custo das Mercadorias Vendidas (CMV)</span>
                <span className="text-destructive">R$ {dreData.cogs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-t border-border bg-muted/30">
                <span className="font-semibold">= Lucro Bruto</span>
                <span className="font-bold text-accent">R$ {dreData.grossProfit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 pl-4 text-sm">
                <span className="text-muted-foreground">Margem Bruta</span>
                <span className="text-muted-foreground">{dreData.grossMargin.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center py-2 pl-4 mt-4">
                <span className="text-muted-foreground">(+/-) Diferenças de Caixa</span>
                <span className={dreData.cashDifferences >= 0 ? 'text-accent' : 'text-destructive'}>
                  R$ {dreData.cashDifferences.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-t-2 border-border bg-muted/50">
                <span className="font-bold text-lg">= Lucro Líquido do Período</span>
                <span className={`font-bold text-lg ${dreData.netProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  R$ {dreData.netProfit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 pl-4 text-sm">
                <span className="text-muted-foreground">Margem Líquida</span>
                <span className="text-muted-foreground">{dreData.netMargin.toFixed(2)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Evolution */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Diária - Receita vs Custo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(24, 100%, 50%)" name="Receita" />
                  <Bar dataKey="cogs" fill="hsl(4, 100%, 36%)" name="CMV" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit Evolution */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Lucro e Margem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(172, 50%, 60%)" 
                    name="Lucro (R$)" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="margin" 
                    stroke="hsl(180, 67%, 23%)" 
                    name="Margem (%)" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Drinks */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Bebidas - Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Indicadores do Período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Ticket Médio</span>
                  <span className="font-semibold">
                    R$ {dailyMetrics.length > 0 ? (dreData.grossRevenue / dailyMetrics.reduce((sum, d) => sum + 1, 0)).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">CMV Médio/Dia</span>
                  <span className="font-semibold">
                    R$ {dailyMetrics.length > 0 ? (dreData.cogs / dailyMetrics.length).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Lucro Médio/Dia</span>
                  <span className="font-semibold text-accent">
                    R$ {dailyMetrics.length > 0 ? (dreData.grossProfit / dailyMetrics.length).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Dias Analisados</span>
                  <span className="font-semibold">{dailyMetrics.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
