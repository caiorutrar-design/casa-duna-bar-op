import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, AlertTriangle } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
}

export default function Stock() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      toast.error("Erro ao carregar estoque");
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current: number, min: number) => {
    const percentage = (current / min) * 100;
    if (current === 0) return { label: "Zerado", color: "danger", className: "bg-danger text-danger-foreground" };
    if (percentage < 10) return { label: "Crítico", color: "danger", className: "bg-danger text-danger-foreground" };
    if (percentage < 30) return { label: "Baixo", color: "warning", className: "bg-warning text-warning-foreground" };
    return { label: "OK", color: "success", className: "bg-success text-primary-foreground" };
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando estoque...</p>
        </div>
      </Layout>
    );
  }

  const lowStockCount = ingredients.filter((i) => i.current_stock < i.min_stock).length;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Estoque</h2>
            <p className="text-muted-foreground">Controle de ingredientes</p>
          </div>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-4 w-4" />
              {lowStockCount} abaixo do mínimo
            </Badge>
          )}
        </div>

        {ingredients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum ingrediente cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {ingredients.map((ingredient) => {
              const status = getStockStatus(ingredient.current_stock, ingredient.min_stock);
              return (
                <Card key={ingredient.id} className="hover:shadow-soft transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{ingredient.name}</h3>
                          {ingredient.brand && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {ingredient.brand}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Estoque: {ingredient.current_stock} {ingredient.unit} | Mínimo: {ingredient.min_stock}{" "}
                          {ingredient.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Custo: R$ {ingredient.cost_per_unit.toFixed(2)}/{ingredient.unit}
                        </p>
                      </div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
