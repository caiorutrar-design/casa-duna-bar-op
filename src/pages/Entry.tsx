import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  current_stock: number;
}

export default function Entry() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name, brand, unit, current_stock")
        .order("name", { ascending: true });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      toast.error("Erro ao carregar ingredientes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedIngredient || !quantity || parseFloat(quantity) <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    setLoading(true);
    try {
      const quantityNum = parseFloat(quantity);

      // Update stock
      const { error: updateError } = await supabase.rpc("update_ingredient_stock", {
        p_ingredient_id: selectedIngredient,
        p_quantity: quantityNum,
      });

      if (updateError) throw updateError;

      // Record movement
      const { error: movementError } = await supabase.from("stock_movements").insert({
        ingredient_id: selectedIngredient,
        type: "entry",
        quantity: quantityNum,
        reason: reason || "Entrada manual",
      });

      if (movementError) throw movementError;

      toast.success("Entrada registrada com sucesso!");
      setSelectedIngredient("");
      setQuantity("");
      setReason("");
      fetchIngredients();
    } catch (error) {
      console.error("Error recording entry:", error);
      toast.error("Erro ao registrar entrada");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Entrada de Mercadoria</h2>
          <p className="text-muted-foreground">Registre a entrada de ingredientes no estoque</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova Entrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ingredient">Ingrediente</Label>
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger id="ingredient">
                    <SelectValue placeholder="Selecione um ingrediente" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients.map((ingredient) => (
                      <SelectItem key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} {ingredient.brand ? `(${ingredient.brand})` : ""} - Estoque atual:{" "}
                        {ingredient.current_stock} {ingredient.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Digite a quantidade"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Input
                  id="reason"
                  type="text"
                  placeholder="Ex: Compra, doação..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Registrar Entrada"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
