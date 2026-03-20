import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Users, Target, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Legend,
} from "recharts";

interface EventRow {
  id: string;
  name: string;
  estimated_attendance: number | null;
  average_ticket_price: number | null;
  average_bar_spend_per_person: number | null;
  estimated_sponsor_revenue: number | null;
  estimated_vip_revenue: number | null;
  estimated_other_revenue: number | null;
  estimated_budget: number | null;
}

interface Expense {
  id: string;
  event_id: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "pessoal", label: "Pessoal" },
  { value: "marketing", label: "Marketing" },
  { value: "bebidas", label: "Bebidas" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "geral", label: "Geral" },
];

const CHART_COLORS = [
  "hsl(18, 90%, 40%)",
  "hsl(199, 89%, 48%)",
  "hsl(38, 92%, 50%)",
  "hsl(145, 45%, 35%)",
  "hsl(280, 60%, 50%)",
  "hsl(340, 70%, 50%)",
];

export function EventFinancialPlanner({ event }: { event: EventRow }) {
  const queryClient = useQueryClient();

  const [sim, setSim] = useState({
    attendance: event.estimated_attendance || 0,
    ticketPrice: event.average_ticket_price || 0,
    barSpend: event.average_bar_spend_per_person || 0,
    sponsorRevenue: event.estimated_sponsor_revenue || 0,
    vipRevenue: event.estimated_vip_revenue || 0,
    otherRevenue: event.estimated_other_revenue || 0,
  });

  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "geral" });

  const { data: expenses = [] } = useQuery({
    queryKey: ["event_expenses", event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_expenses")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").update({
        estimated_attendance: sim.attendance,
        average_ticket_price: sim.ticketPrice,
        average_bar_spend_per_person: sim.barSpend,
        estimated_sponsor_revenue: sim.sponsorRevenue,
        estimated_vip_revenue: sim.vipRevenue,
        estimated_other_revenue: sim.otherRevenue,
      }).eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Simulação salva!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addExpenseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("event_expenses").insert({
        event_id: event.id,
        description: newExpense.description.trim(),
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_expenses", event.id] });
      setNewExpense({ description: "", amount: "", category: "geral" });
      toast.success("Despesa adicionada!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_expenses", event.id] });
      toast.success("Despesa removida!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const metrics = useMemo(() => {
    const ticketRevenue = sim.attendance * sim.ticketPrice;
    const barRevenue = sim.attendance * sim.barSpend;
    const totalRevenue = ticketRevenue + barRevenue + sim.sponsorRevenue + sim.vipRevenue + sim.otherRevenue;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const profit = totalRevenue - totalExpenses;
    const roi = totalExpenses > 0 ? (profit / totalExpenses) * 100 : 0;
    const nonTicketRevenue = barRevenue + sim.sponsorRevenue + sim.vipRevenue + sim.otherRevenue;
    const breakEven = sim.ticketPrice > 0 ? Math.ceil((totalExpenses - nonTicketRevenue) / sim.ticketPrice) : 0;

    return { ticketRevenue, barRevenue, totalRevenue, totalExpenses, profit, roi, breakEven };
  }, [sim, expenses]);

  // Revenue breakdown for pie chart
  const revenueBreakdown = [
    { name: "Ingressos", value: metrics.ticketRevenue },
    { name: "Bar", value: metrics.barRevenue },
    { name: "Patrocínio", value: sim.sponsorRevenue },
    { name: "VIP", value: sim.vipRevenue },
    { name: "Outras", value: sim.otherRevenue },
  ].filter((r) => r.value > 0);

  // Expense by category for pie chart
  const expenseByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((e) => e.value > 0);

  // Comparison bar chart
  const comparisonData = [
    { name: "Receita Prevista", value: metrics.totalRevenue },
    { name: "Custo Total", value: metrics.totalExpenses },
    { name: "Lucro", value: Math.max(0, metrics.profit) },
  ];

  const numInput = (label: string, value: number, key: keyof typeof sim, prefix?: string) => (
    <div className="space-y-1">
      <Label className="text-xs font-body">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          min={0}
          step={key === "attendance" ? 1 : 0.01}
          value={value || ""}
          onChange={(e) => setSim({ ...sim, [key]: parseFloat(e.target.value) || 0 })}
          className={prefix ? "pl-8" : ""}
        />
      </div>
    </div>
  );

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Simulator */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Target className="h-4 w-4" /> Simulador Interativo
            </CardTitle>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {numInput("Público Esperado", sim.attendance, "attendance")}
            {numInput("Preço Médio Ingresso", sim.ticketPrice, "ticketPrice", "R$")}
            {numInput("Gasto Médio Bar/Pessoa", sim.barSpend, "barSpend", "R$")}
            {numInput("Receita Patrocínio", sim.sponsorRevenue, "sponsorRevenue", "R$")}
            {numInput("Receita VIP/Camarote", sim.vipRevenue, "vipRevenue", "R$")}
            {numInput("Outras Receitas", sim.otherRevenue, "otherRevenue", "R$")}
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={DollarSign} label="Receita Prevista" value={fmt(metrics.totalRevenue)} />
        <MetricCard icon={TrendingDown} label="Despesa Total" value={fmt(metrics.totalExpenses)} variant="destructive" />
        <MetricCard icon={TrendingUp} label="Lucro Estimado" value={fmt(metrics.profit)} variant={metrics.profit >= 0 ? "success" : "destructive"} />
        <MetricCard icon={BarChart3} label="ROI" value={`${metrics.roi.toFixed(1)}%`} variant={metrics.roi >= 0 ? "success" : "destructive"} />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Break-even: <strong className="text-foreground">{metrics.breakEven > 0 ? `${metrics.breakEven} ingressos` : "N/A"}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue vs Cost Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Receita vs Custo vs Lucro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    <Cell fill="hsl(199, 89%, 48%)" />
                    <Cell fill="hsl(4, 80%, 45%)" />
                    <Cell fill="hsl(145, 45%, 35%)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Composição da Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {revenueBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {revenueBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-16">Sem dados de receita</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense by category pie */}
      {expenseByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses CRUD */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Despesas do Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Descrição" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="flex-1 min-w-[140px]" />
            <Input type="number" placeholder="Valor" min={0} step={0.01} value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="w-28" />
            <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" onClick={() => {
              if (!newExpense.description.trim() || !newExpense.amount) { toast.error("Preencha descrição e valor"); return; }
              addExpenseMutation.mutate();
            }} disabled={addExpenseMutation.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm truncate">{exp.description}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label || exp.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium tabular-nums">{fmt(Number(exp.amount))}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExpenseMutation.mutate(exp.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, variant }: { icon: typeof DollarSign; label: string; value: string; variant?: "success" | "destructive" }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${variant === "destructive" ? "text-destructive" : variant === "success" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground font-body">{label}</span>
        </div>
        <p className={`text-lg font-bold tabular-nums ${variant === "destructive" ? "text-destructive" : variant === "success" ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
