import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, DollarSign, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PAYMENT_METHODS: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  transfer: "Transferência",
  other: "Outro",
};

interface Props {
  collaborator: { id: string; full_name: string };
  onBack: () => void;
}

export function CollaboratorPayments({ collaborator, onBack }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    event_id: "",
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "pix",
    description: "",
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id, name").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["collaborator-payments", collaborator.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborator_payments")
        .select("*, events(name)")
        .eq("collaborator_id", collaborator.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalPaid = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("collaborator_payments").insert({
        collaborator_id: collaborator.id,
        event_id: values.event_id || null,
        amount: parseFloat(values.amount),
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        description: values.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborator-payments", collaborator.id] });
      toast.success("Pagamento registrado!");
      setDialogOpen(false);
      setForm({ event_id: "", amount: "", payment_date: format(new Date(), "yyyy-MM-dd"), payment_method: "pix", description: "" });
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Valor é obrigatório e deve ser positivo");
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pagamentos</h2>
          <p className="text-muted-foreground">{collaborator.full_name}</p>
        </div>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Registrar Pagamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Método</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Evento (opcional)</Label>
                    <Select value={form.event_id} onValueChange={(v) => setForm({ ...form, event_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        {events.map((ev: any) => (
                          <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline" type="button">Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Total */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="py-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total pago</span>
          <span className="text-xl font-bold text-primary">R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : payments.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum pagamento registrado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-semibold">R$ {Number(p.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    <Badge variant="outline">{PAYMENT_METHODS[p.payment_method] || p.payment_method}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(p.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {p.events?.name && <span>Evento: {p.events.name}</span>}
                    {p.description && <span>• {p.description}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
