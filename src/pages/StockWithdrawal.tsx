import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PackageMinus, Search } from "lucide-react";

const REASONS = [
  "Quebra/Avaria",
  "Desperdício",
  "Consumo interno",
  "Validade vencida",
  "Outro",
];

export default function StockWithdrawal() {
  const { canAccessPage, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Outro");
  const [customReason, setCustomReason] = useState("");
  const [search, setSearch] = useState("");

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ["ingredients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name, brand, unit, current_stock")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const qty = parseFloat(quantity);
      if (!selectedIngredient || !qty || qty <= 0) throw new Error("Dados inválidos");

      const ingredient = ingredients.find((i) => i.id === selectedIngredient);
      if (!ingredient) throw new Error("Ingrediente não encontrado");
      if (ingredient.current_stock < qty) throw new Error("Estoque insuficiente");

      const finalReason = reason === "Outro" ? customReason.trim() || "Retirada manual" : reason;

      // Update stock
      const { error: updateError } = await supabase
        .from("ingredients")
        .update({ current_stock: ingredient.current_stock - qty })
        .eq("id", selectedIngredient);
      if (updateError) throw updateError;

      // Register movement
      const { error: movError } = await supabase.from("stock_movements").insert({
        ingredient_id: selectedIngredient,
        type: "exit",
        quantity: qty,
        reason: `Retirada: ${finalReason}`,
      });
      if (movError) throw movError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      toast.success("Retirada registrada com sucesso!");
      setSelectedIngredient("");
      setQuantity("");
      setReason("Outro");
      setCustomReason("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao registrar retirada");
    },
  });

  if (roleLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!canAccessPage("/stock-withdrawal")) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          Acesso restrito.
        </div>
      </Layout>
    );
  }

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.brand && i.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedIng = ingredients.find((i) => i.id === selectedIngredient);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Retirada de Estoque</h2>
          <p className="text-muted-foreground">Registre saídas manuais do estoque</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-5 w-5" />
              Nova Retirada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ingrediente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ingrediente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {search && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredIngredients.map((ing) => (
                    <button
                      key={ing.id}
                      className={`w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center ${
                        selectedIngredient === ing.id ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        setSelectedIngredient(ing.id);
                        setSearch(ing.name + (ing.brand ? ` (${ing.brand})` : ""));
                      }}
                    >
                      <span>{ing.name} {ing.brand && <span className="text-muted-foreground">({ing.brand})</span>}</span>
                      <Badge variant="outline">{ing.current_stock} {ing.unit}</Badge>
                    </button>
                  ))}
                  {filteredIngredients.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum ingrediente encontrado</p>
                  )}
                </div>
              )}
              {selectedIng && (
                <p className="text-sm text-muted-foreground">
                  Estoque atual: <span className="font-medium">{selectedIng.current_stock} {selectedIng.unit}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {reason === "Outro" && (
              <div className="space-y-2">
                <Label>Descrição do motivo</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Descreva o motivo da retirada..."
                  maxLength={500}
                />
              </div>
            )}

            <Button
              onClick={() => withdrawMutation.mutate()}
              disabled={!selectedIngredient || !quantity || withdrawMutation.isPending}
              className="w-full"
            >
              {withdrawMutation.isPending ? "Registrando..." : "Registrar Retirada"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
