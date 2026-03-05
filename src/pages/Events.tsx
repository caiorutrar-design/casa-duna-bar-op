import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Users, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type EventType = "festa" | "show" | "happy_hour" | "corporativo" | "privado" | "outro";

interface EventRow {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_type: EventType;
  max_capacity: number | null;
  estimated_budget: number | null;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  festa: "Festa",
  show: "Show",
  happy_hour: "Happy Hour",
  corporativo: "Corporativo",
  privado: "Privado",
  outro: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const emptyForm = {
  name: "",
  description: "",
  location: "",
  event_type: "outro" as EventType,
  max_capacity: "",
  estimated_budget: "",
  start_date: "",
  end_date: "",
  status: "planned",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const Events = () => {
  const { canAccessPage, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as EventRow[];
    },
    enabled: canAccessPage("/events"),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || null,
        location: values.location.trim() || null,
        event_type: values.event_type,
        max_capacity: values.max_capacity ? parseInt(values.max_capacity) : null,
        estimated_budget: values.estimated_budget ? parseFloat(values.estimated_budget) : 0,
        start_date: values.start_date,
        end_date: values.end_date,
        status: values.status,
      };
      if (editingId) {
        const { error } = await supabase.from("events").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("events").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(editingId ? "Evento atualizado!" : "Evento criado!");
      closeDialog();
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Evento excluído!");
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (ev: EventRow) => {
    setEditingId(ev.id);
    setForm({
      name: ev.name,
      description: ev.description || "",
      location: ev.location || "",
      event_type: ev.event_type,
      max_capacity: ev.max_capacity?.toString() || "",
      estimated_budget: ev.estimated_budget?.toString() || "",
      start_date: ev.start_date ? ev.start_date.slice(0, 16) : "",
      end_date: ev.end_date ? ev.end_date.slice(0, 16) : "",
      status: ev.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!form.start_date || !form.end_date) { toast({ title: "Datas são obrigatórias", variant: "destructive" }); return; }
    if (new Date(form.end_date) <= new Date(form.start_date)) { toast({ title: "Data fim deve ser posterior ao início", variant: "destructive" }); return; }
    saveMutation.mutate(form);
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getEventsForDay = (day: Date) => {
    return events.filter((ev) => {
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
    });
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  if (roleLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!canAccessPage("/events")) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">Acesso restrito.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Eventos</h2>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Evento" : "Criar Evento"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v as EventType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início *</Label>
                    <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim *</Label>
                    <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacidade Máx.</Label>
                    <Input type="number" min={0} value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Orçamento (R$)</Label>
                    <Input type="number" min={0} step="0.01" value={form.estimated_budget} onChange={(e) => setForm({ ...form, estimated_budget: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Calendar View */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle className="text-lg capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {daysInMonth.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`relative p-1 min-h-[48px] rounded-lg text-sm transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground" :
                          isToday ? "bg-accent text-accent-foreground" :
                          "hover:bg-muted"
                        }`}
                      >
                        <span className="block">{format(day, "d")}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {dayEvents.slice(0, 3).map((ev) => (
                              <div
                                key={ev.id}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ev.status === "completed" ? "bg-green-500" :
                                  ev.status === "cancelled" ? "bg-red-500" :
                                  ev.status === "in_progress" ? "bg-yellow-500" :
                                  "bg-blue-500"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected day events */}
            {selectedDay && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">
                  Eventos em {format(selectedDay, "dd/MM/yyyy", { locale: ptBR })}
                </h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento nesta data.</p>
                ) : (
                  selectedDayEvents.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                  ))
                )}
              </div>
            )}

            {/* All events list */}
            {!selectedDay && (
              events.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    Nenhum evento cadastrado. Clique em "Novo Evento" para começar.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {events.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

function EventCard({ ev, onEdit, onDelete }: { ev: EventRow; onEdit: (ev: EventRow) => void; onDelete: (id: string) => void }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{ev.name}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{EVENT_TYPE_LABELS[ev.event_type]}</Badge>
              <Badge className={STATUS_COLORS[ev.status] || ""}>{STATUS_LABELS[ev.status] || ev.status}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(ev)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O evento "{ev.name}" será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(ev.id)} className="bg-destructive text-destructive-foreground">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {ev.description && <p className="text-muted-foreground">{ev.description}</p>}
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>
            {format(new Date(ev.start_date), "dd/MM/yyyy HH:mm", { locale: ptBR })} — {format(new Date(ev.end_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </span>
        </div>
        {ev.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{ev.location}</span>
          </div>
        )}
        {ev.max_capacity && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>{ev.max_capacity} pessoas</span>
          </div>
        )}
        {ev.estimated_budget != null && ev.estimated_budget > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>R$ {Number(ev.estimated_budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Events;
