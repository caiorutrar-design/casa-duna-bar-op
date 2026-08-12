import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/PageSkeleton";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  brand: z.string().trim().min(2, "Informe a categoria").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.number().min(0, "Preço inválido").max(100000),
  item_number: z.number().int().min(1, "Número inválido").max(9999),
  active: z.boolean(),
});

type Drink = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  item_number: number | null;
  active: boolean | null;
};

type FormState = {
  id?: string;
  name: string;
  brand: string;
  description: string;
  price: string;
  item_number: string;
  active: boolean;
};

const emptyForm: FormState = { name: "", brand: "", description: "", price: "", item_number: "", active: true };

export default function MenuEditor() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: drinks, isLoading } = useQuery({
    queryKey: ["menu-drinks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drinks")
        .select("id, name, brand, description, price, item_number, active")
        .order("item_number", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Drink[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["menu-drinks"] });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({
        name: form.name,
        brand: form.brand,
        description: form.description,
        price: Number(form.price),
        item_number: Number(form.item_number),
        active: form.active,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const payload = { ...parsed.data, description: parsed.data.description || null };
      if (form.id) {
        const { error } = await supabase.from("drinks").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("drinks").insert([{ ...payload, name: parsed.data.name }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Item atualizado" : "Item adicionado ao cardápio");
      setOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drinks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Item removido"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (d: Drink) => {
    setForm({
      id: d.id,
      name: d.name,
      brand: d.brand ?? "",
      description: d.description ?? "",
      price: String(d.price ?? ""),
      item_number: String(d.item_number ?? ""),
      active: d.active !== false,
    });
    setOpen(true);
  };

  const categories = Array.from(new Set((drinks ?? []).map((d) => d.brand || "Outros")));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" /> Cardápio
            </h1>
            <p className="text-sm text-muted-foreground font-body">Edite os itens existentes ou cadastre novos</p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo item
          </Button>
        </div>

        {isLoading && <PageSkeleton />}

        {categories.map((cat) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-lg font-display">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(drinks ?? []).filter((d) => (d.brand || "Outros") === cat).map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Badge variant="outline">{d.item_number ?? "-"}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold font-body truncate">
                      {d.name}{" "}
                      {d.active === false && <Badge variant="secondary" className="ml-1">inativo</Badge>}
                    </p>
                    {d.description && (
                      <p className="text-xs text-muted-foreground truncate">{d.description}</p>
                    )}
                  </div>
                  <span className="font-semibold text-primary whitespace-nowrap">
                    R$ {Number(d.price ?? 0).toFixed(2)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { if (confirm(`Remover ${d.name} do cardápio?`)) remove.mutate(d.id); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {!isLoading && !drinks?.length && (
          <Card><CardContent className="py-10 text-center text-muted-foreground font-body">
            Nenhum item cadastrado ainda.
          </CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{form.id ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={form.name} maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Categoria</Label>
              <Input id="brand" value={form.brand} maxLength={60} placeholder="Lanches, Bebidas..."
                onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item_number">Número do item</Label>
              <Input id="item_number" type="number" min={1} value={form.item_number}
                onChange={(e) => setForm({ ...form, item_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" type="number" min={0} step="0.01" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch id="active" checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label htmlFor="active">Ativo no cardápio</Label>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={form.description} maxLength={300}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
