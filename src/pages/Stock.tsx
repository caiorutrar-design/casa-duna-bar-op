import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, AlertTriangle, Plus, Pencil } from "lucide-react";

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
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    unit: "",
    current_stock: 0,
    min_stock: 0,
    cost_per_unit: 0,
  });

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

  const handleAddIngredient = async () => {
    try {
      const { error } = await supabase.from("ingredients").insert([formData]);
      if (error) throw error;
      toast.success("Ingrediente adicionado com sucesso");
      setIsAddDialogOpen(false);
      setFormData({ name: "", brand: "", unit: "", current_stock: 0, min_stock: 0, cost_per_unit: 0 });
      fetchIngredients();
    } catch (error) {
      console.error("Error adding ingredient:", error);
      toast.error("Erro ao adicionar ingrediente");
    }
  };

  const handleEditIngredient = async () => {
    if (!editingIngredient) return;
    try {
      const { error } = await supabase
        .from("ingredients")
        .update(formData)
        .eq("id", editingIngredient.id);
      if (error) throw error;
      toast.success("Ingrediente atualizado com sucesso");
      setIsEditDialogOpen(false);
      setEditingIngredient(null);
      fetchIngredients();
    } catch (error) {
      console.error("Error updating ingredient:", error);
      toast.error("Erro ao atualizar ingrediente");
    }
  };

  const openEditDialog = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      brand: ingredient.brand || "",
      unit: ingredient.unit,
      current_stock: ingredient.current_stock,
      min_stock: ingredient.min_stock,
      cost_per_unit: ingredient.cost_per_unit,
    });
    setIsEditDialogOpen(true);
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
          <div className="flex items-center gap-2">
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-4 w-4" />
                {lowStockCount} abaixo do mínimo
              </Badge>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Ingrediente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Ingrediente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unidade</Label>
                    <Input
                      id="unit"
                      placeholder="ml, g, un"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="current_stock">Estoque Atual</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_stock">Estoque Mínimo</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost_per_unit">Custo por Unidade (R$)</Label>
                    <Input
                      id="cost_per_unit"
                      type="number"
                      step="0.01"
                      value={formData.cost_per_unit}
                      onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleAddIngredient} className="w-full">
                    Adicionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                      <div className="flex items-center gap-2">
                        <Badge className={status.className}>{status.label}</Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(ingredient)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Ingrediente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-brand">Marca</Label>
                <Input
                  id="edit-brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-unit">Unidade</Label>
                <Input
                  id="edit-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-current_stock">Estoque Atual</Label>
                <Input
                  id="edit-current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit-min_stock">Estoque Mínimo</Label>
                <Input
                  id="edit-min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit-cost_per_unit">Custo por Unidade (R$)</Label>
                <Input
                  id="edit-cost_per_unit"
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) })}
                />
              </div>
              <Button onClick={handleEditIngredient} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
