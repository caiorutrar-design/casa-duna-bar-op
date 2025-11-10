import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Drink {
  id: string;
  name: string;
  brand: string;
  description: string | null;
  active: boolean;
}

export default function Sales() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    fetchDrinks();
  }, []);

  const fetchDrinks = async () => {
    try {
      const { data, error } = await supabase
        .from("drinks")
        .select("*")
        .eq("active", true)
        .order("brand", { ascending: true });

      if (error) throw error;
      setDrinks(data || []);
    } catch (error) {
      console.error("Error fetching drinks:", error);
      toast.error("Erro ao carregar drinks");
    } finally {
      setLoading(false);
    }
  };

  const handleSaleConfirm = async () => {
    if (!selectedDrink) return;

    const bartenderName = localStorage.getItem("bartender_name");
    if (!bartenderName) {
      toast.error("Bartender não identificado");
      return;
    }

    setSelling(true);
    try {
      const { data, error } = await supabase.rpc("process_sale", {
        p_drink_id: selectedDrink.id,
        p_bartender_name: bartenderName,
        p_quantity: 1,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; total_cost?: number };

      if (!result.success) {
        toast.error(result.error || "Erro ao processar venda");
      } else {
        toast.success(
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Venda registrada! Custo: R$ {result.total_cost?.toFixed(2)}</span>
          </div>
        );
      }
    } catch (error) {
      console.error("Error processing sale:", error);
      toast.error("Erro ao processar venda");
    } finally {
      setSelling(false);
      setSelectedDrink(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando drinks...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Venda Rápida</h2>
          <p className="text-muted-foreground">Toque em um drink para registrar venda</p>
        </div>

        {drinks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum drink disponível</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {drinks.map((drink) => (
              <Card
                key={drink.id}
                className="cursor-pointer hover:shadow-strong transition-all duration-200 active:scale-95"
                onClick={() => setSelectedDrink(drink)}
              >
                <CardContent className="p-4 space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    {drink.brand}
                  </Badge>
                  <h3 className="font-semibold text-foreground line-clamp-2">{drink.name}</h3>
                  {drink.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{drink.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!selectedDrink} onOpenChange={() => setSelectedDrink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja registrar a venda de <strong>{selectedDrink?.name}</strong> ({selectedDrink?.brand})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={selling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaleConfirm} disabled={selling}>
              {selling ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
