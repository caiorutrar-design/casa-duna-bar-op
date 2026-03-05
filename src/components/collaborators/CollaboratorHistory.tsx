import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, CalendarDays, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  collaborator: { id: string; full_name: string };
  onBack: () => void;
}

export function CollaboratorHistory({ collaborator, onBack }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    event_id: "",
    start_time: "",
    end_time: "",
    performance_rating: "",
    efficiency_metric: "",
    notes: "",
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id, name, start_date").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["collaborator-history", collaborator.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborator_event_history")
        .select("*, events(name, start_date)")
        .eq("collaborator_id", collaborator.id)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("collaborator_event_history").insert({
        collaborator_id: collaborator.id,
        event_id: values.event_id,
        start_time: values.start_time,
        end_time: values.end_time || null,
        performance_rating: values.performance_rating ? parseInt(values.performance_rating) : null,
        efficiency_metric: values.efficiency_metric ? parseFloat(values.efficiency_metric) : null,
        notes: values.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborator-history", collaborator.id] });
      toast.success("Histórico registrado!");
      setDialogOpen(false);
      setForm({ event_id: "", start_time: "", end_time: "", performance_rating: "", efficiency_metric: "", notes: "" });
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_id || !form.start_time) {
      toast({ title: "Evento e horário de início são obrigatórios", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Histórico de Trabalho</h2>
          <p className="text-muted-foreground">{collaborator.full_name}</p>
        </div>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Registrar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Trabalho em Evento</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Evento *</Label>
                  <Select value={form.event_id} onValueChange={(v) => setForm({ ...form, event_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar evento..." /></SelectTrigger>
                    <SelectContent>
                      {events.map((ev: any) => (
                        <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início *</Label>
                    <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Avaliação (1-5)</Label>
                    <Select value={form.performance_rating} onValueChange={(v) => setForm({ ...form, performance_rating: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{"★".repeat(n)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Eficiência</Label>
                    <Input type="number" min={0} step="0.1" value={form.efficiency_metric} onChange={(e) => setForm({ ...form, efficiency_metric: e.target.value })} placeholder="Ex: vendas, drinks..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} rows={2} />
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

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : history.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum histórico registrado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {history.map((h: any) => (
            <Card key={h.id}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{h.events?.name || "Evento removido"}</span>
                  {h.performance_rating && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="h-3 w-3" /> {h.performance_rating}/5
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(h.start_time), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(h.start_time), "HH:mm")}
                    {h.end_time && ` — ${format(new Date(h.end_time), "HH:mm")}`}
                  </span>
                  {h.hours_worked != null && (
                    <Badge variant="secondary">{Number(h.hours_worked).toFixed(1)}h</Badge>
                  )}
                </div>
                {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
