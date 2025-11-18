import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Calendar, User, TrendingDown, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailySales {
  total: number;
  count: number;
}

interface PreviousClosure {
  id: string;
  closure_date: string;
  bartender_name: string;
  total_sales: number;
  total_difference: number;
  created_at: string;
}

export default function CashClosure() {
  const [dailySales, setDailySales] = useState<DailySales>({ total: 0, count: 0 });
  const [bartenderName, setBartenderName] = useState("");
  const [cashActual, setCashActual] = useState("");
  const [cardActual, setCardActual] = useState("");
  const [pixActual, setPixActual] = useState("");
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previousClosures, setPreviousClosures] = useState<PreviousClosure[]>([]);
  const [alreadyClosed, setAlreadyClosed] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchDailySales();
    fetchPreviousClosures();
    checkIfAlreadyClosed();
  }, []);

  const checkIfAlreadyClosed = async () => {
    try {
      const { data, error } = await supabase
        .from("cash_closures")
        .select("id")
        .eq("closure_date", today)
        .maybeSingle();

      if (error) throw error;
      setAlreadyClosed(!!data);
    } catch (error) {
      console.error("Error checking closure:", error);
    }
  };

  const fetchDailySales = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("sales")
        .select("total_cost, quantity")
        .gte("created_at", startOfDay.toISOString());

      if (error) throw error;

      const total = data?.reduce((sum, sale) => sum + (sale.total_cost || 0), 0) || 0;
      const count = data?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;

      setDailySales({ total, count });
    } catch (error) {
      console.error("Error fetching daily sales:", error);
      toast.error("Erro ao carregar vendas do dia");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousClosures = async () => {
    try {
      const { data, error } = await supabase
        .from("cash_closures")
        .select("*")
        .order("closure_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      setPreviousClosures(data || []);
    } catch (error) {
      console.error("Error fetching closures:", error);
    }
  };

  const calculateExpected = (percentage: number) => {
    return (dailySales.total * percentage).toFixed(2);
  };

  const getTotalActual = () => {
    return (
      parseFloat(cashActual || "0") +
      parseFloat(cardActual || "0") +
      parseFloat(pixActual || "0")
    );
  };

  const getTotalDifference = () => {
    return getTotalActual() - dailySales.total;
  };

  const handleCloseCash = async () => {
    if (!bartenderName.trim()) {
      toast.error("Informe o nome do responsável");
      return;
    }

    if (alreadyClosed) {
      toast.error("O caixa já foi fechado hoje");
      return;
    }

    setProcessing(true);

    try {
      const cashExp = parseFloat(calculateExpected(0.3));
      const cardExp = parseFloat(calculateExpected(0.5));
      const pixExp = parseFloat(calculateExpected(0.2));

      const { error } = await supabase.from("cash_closures").insert({
        closure_date: today,
        bartender_name: bartenderName,
        total_sales: dailySales.total,
        cash_expected: cashExp,
        cash_actual: parseFloat(cashActual || "0"),
        card_expected: cardExp,
        card_actual: parseFloat(cardActual || "0"),
        pix_expected: pixExp,
        pix_actual: parseFloat(pixActual || "0"),
        total_difference: getTotalDifference(),
        observations: observations.trim() || null,
      });

      if (error) throw error;

      toast.success("Fechamento de caixa realizado com sucesso!");
      
      // Reset form
      setBartenderName("");
      setCashActual("");
      setCardActual("");
      setPixActual("");
      setObservations("");
      setAlreadyClosed(true);
      fetchPreviousClosures();
    } catch (error) {
      console.error("Error closing cash:", error);
      toast.error("Erro ao fechar caixa");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground mt-4">Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  const difference = getTotalDifference();
  const differenceColor = difference > 0 ? "text-success" : difference < 0 ? "text-danger" : "text-muted-foreground";

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-primary rounded-lg p-6 text-white shadow-strong">
          <h2 className="text-3xl font-bold">Fechamento de Caixa</h2>
          <p className="text-white/90 mt-1">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {alreadyClosed && (
          <Card className="border-l-4 border-l-success">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-success" />
                <div>
                  <p className="font-semibold text-foreground">Caixa já fechado</p>
                  <p className="text-sm text-muted-foreground">
                    O fechamento de hoje já foi realizado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-primary hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas do Dia
              </CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                R$ {dailySales.total.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dailySales.count} drinks vendidos
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Diferença
              </CardTitle>
              {difference > 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : difference < 0 ? (
                <TrendingDown className="h-5 w-5 text-danger" />
              ) : (
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${differenceColor}`}>
                R$ {Math.abs(difference).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {difference > 0 ? "Sobra" : difference < 0 ? "Falta" : "Exato"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-accent">
          <CardHeader>
            <CardTitle>Registro de Fechamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bartender" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Responsável pelo Fechamento
              </Label>
              <Input
                id="bartender"
                value={bartenderName}
                onChange={(e) => setBartenderName(e.target.value)}
                placeholder="Nome do bartender ou gerente"
                disabled={alreadyClosed}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cash">
                  Dinheiro (Esperado: R$ {calculateExpected(0.3)})
                </Label>
                <Input
                  id="cash"
                  type="number"
                  step="0.01"
                  value={cashActual}
                  onChange={(e) => setCashActual(e.target.value)}
                  placeholder="0.00"
                  disabled={alreadyClosed}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="card">
                  Cartão (Esperado: R$ {calculateExpected(0.5)})
                </Label>
                <Input
                  id="card"
                  type="number"
                  step="0.01"
                  value={cardActual}
                  onChange={(e) => setCardActual(e.target.value)}
                  placeholder="0.00"
                  disabled={alreadyClosed}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pix">
                  PIX (Esperado: R$ {calculateExpected(0.2)})
                </Label>
                <Input
                  id="pix"
                  type="number"
                  step="0.01"
                  value={pixActual}
                  onChange={(e) => setPixActual(e.target.value)}
                  placeholder="0.00"
                  disabled={alreadyClosed}
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Informado:</span>
                <span className="text-xl font-bold">
                  R$ {getTotalActual().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Adicione observações sobre o fechamento (opcional)"
                rows={3}
                disabled={alreadyClosed}
              />
            </div>

            <Button
              onClick={handleCloseCash}
              disabled={processing || alreadyClosed}
              className="w-full"
              size="lg"
            >
              {processing ? "Processando..." : "Fechar Caixa"}
            </Button>
          </CardContent>
        </Card>

        {previousClosures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Fechamentos Anteriores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {previousClosures.map((closure) => (
                  <div
                    key={closure.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {format(new Date(closure.closure_date), "dd/MM/yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {closure.bartender_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        R$ {closure.total_sales.toFixed(2)}
                      </p>
                      <Badge
                        variant={
                          closure.total_difference > 0
                            ? "default"
                            : closure.total_difference < 0
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {closure.total_difference > 0 ? "+" : ""}
                        {closure.total_difference.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
