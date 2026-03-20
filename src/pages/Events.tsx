import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/use-user-role";
import { useEvents, useEventMutations } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Users, DollarSign, ChevronLeft, ChevronRight, ArrowLeft, Calculator, Search, UserCheck, FileDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EventFinancialPlanner } from "@/components/events/EventFinancialPlanner";
import { EventAttendees } from "@/components/events/EventAttendees";
import { PageSkeleton } from "@/components/PageSkeleton";

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
  estimated_attendance: number | null;
  average_ticket_price: number | null;
  average_bar_spend_per_person: number | null;
  estimated_sponsor_revenue: number | null;
  estimated_vip_revenue: number | null;
  estimated_other_revenue: number | null;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  festa: "Festa", show: "Show", happy_hour: "Happy Hour", corporativo: "Corporativo", privado: "Privado", outro: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planejado", in_progress: "Em Andamento", completed: "Concluído", cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-secondary/15 text-secondary border-secondary/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const emptyForm = {
  name: "", description: "", location: "", event_type: "outro" as EventType,
  max_capacity: "", estimated_budget: "", start_date: "", end_date: "", status: "planned",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const Events = () => {
  const { canAccessPage, loading: roleLoading } = useUserRole();
  const { data: events = [], isLoading } = useEvents(canAccessPage("/events"));
  const { saveMutation, deleteMutation } = useEventMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); };

  const openEdit = (ev: EventRow) => {
    setEditingId(ev.id);
    setForm({
      name: ev.name, description: ev.description || "", location: ev.location || "",
      event_type: ev.event_type, max_capacity: ev.max_capacity?.toString() || "",
      estimated_budget: ev.estimated_budget?.toString() || "",
      start_date: ev.start_date ? ev.start_date.slice(0, 16) : "",
      end_date: ev.end_date ? ev.end_date.slice(0, 16) : "", status: ev.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.start_date || !form.end_date) { toast.error("Datas são obrigatórias"); return; }
    if (new Date(form.end_date) <= new Date(form.start_date)) { toast.error("Data fim deve ser posterior ao início"); return; }
    saveMutation.mutate({
      payload: {
        name: form.name.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        event_type: form.event_type,
        max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
        estimated_budget: form.estimated_budget ? parseFloat(form.estimated_budget) : 0,
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
      },
      id: editingId || undefined,
    }, { onSuccess: closeDialog });
  };

  const filteredEvents = (events as EventRow[]).filter((ev) => {
    if (searchTerm && !ev.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== "all" && ev.event_type !== filterType) return false;
    if (filterStatus !== "all" && ev.status !== filterStatus) return false;
    return true;
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const getEventsForDay = (day: Date) =>
    (events as EventRow[]).filter((ev) => {
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
    });

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  if (roleLoading) return <Layout><PageSkeleton /></Layout>;
  if (!canAccessPage("/events")) return <Layout><div className="text-center py-20 text-muted-foreground font-body">Acesso restrito.</div></Layout>;

  // Detail view with tabs
  if (selectedEvent) {
    const freshEvent = (events as EventRow[]).find((e) => e.id === selectedEvent.id) || selectedEvent;
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)} className="active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-2xl font-display font-bold text-foreground">{freshEvent.name}</h2>
            <Badge className={STATUS_COLORS[freshEvent.status] || ""}>{STATUS_LABELS[freshEvent.status] || freshEvent.status}</Badge>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-1">
                <Calculator className="h-3.5 w-3.5" /> Financeiro
              </TabsTrigger>
              <TabsTrigger value="attendees" className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" /> Presenças
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <EventCard ev={freshEvent} onEdit={openEdit} onDelete={(id) => { deleteMutation.mutate(id); setSelectedEvent(null); }} />
            </TabsContent>

            <TabsContent value="financial">
              <EventFinancialPlanner event={freshEvent} />
            </TabsContent>

            <TabsContent value="attendees">
              <EventAttendees eventId={freshEvent.id} />
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">{editingId ? "Editar Evento" : "Criar Evento"}</DialogTitle></DialogHeader>
            <EventForm form={form} setForm={setForm} onSubmit={handleSubmit} isPending={saveMutation.isPending} />
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-foreground">Eventos</h2>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="active:scale-95">
                <Plus className="h-4 w-4 mr-2" /> Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">{editingId ? "Editar Evento" : "Criar Evento"}</DialogTitle></DialogHeader>
              <EventForm form={form} setForm={setForm} onSubmit={handleSubmit} isPending={saveMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar evento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="active:scale-95"><ChevronLeft className="h-5 w-5" /></Button>
                  <CardTitle className="text-lg font-display capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="active:scale-95"><ChevronRight className="h-5 w-5" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((d) => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 font-body">{d}</div>)}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
                  {daysInMonth.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDay && isSameDay(day, selectedDay);
                    return (
                      <button key={day.toISOString()} onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`relative p-1 min-h-[48px] rounded-lg text-sm transition-all font-body active:scale-95 ${isSelected ? "bg-primary text-primary-foreground shadow-accent" : isToday ? "bg-accent text-accent-foreground ring-1 ring-primary/30" : "hover:bg-muted"}`}>
                        <span className="block">{format(day, "d")}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {dayEvents.slice(0, 3).map((ev) => (
                              <div key={ev.id} className={`w-1.5 h-1.5 rounded-full ${ev.status === "completed" ? "bg-success" : ev.status === "cancelled" ? "bg-destructive" : ev.status === "in_progress" ? "bg-warning" : "bg-secondary"}`} />
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
                <h3 className="font-semibold font-display text-foreground">Eventos em {format(selectedDay, "dd/MM/yyyy", { locale: ptBR })}</h3>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body">Nenhum evento nesta data.</p>
                ) : selectedDayEvents.map((ev) => (
                  <EventCard key={ev.id} ev={ev as EventRow} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} onSelect={setSelectedEvent} />
                ))}
              </div>
            )}

            {/* All events */}
            {!selectedDay && (
              filteredEvents.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-muted-foreground font-body">Nenhum evento encontrado.</CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredEvents.map((ev) => <EventCard key={ev.id} ev={ev} onEdit={openEdit} onDelete={(id) => deleteMutation.mutate(id)} onSelect={setSelectedEvent} />)}
                </div>
              )
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

function EventForm({ form, setForm, onSubmit, isPending }: { form: typeof emptyForm; setForm: (f: typeof emptyForm) => void; onSubmit: (e: React.FormEvent) => void; isPending: boolean }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label className="font-body">Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-body">Tipo *</Label>
          <Select value={form.event_type} onValueChange={(v: EventType) => setForm({ ...form, event_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-2">
          <Label className="font-body">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className="space-y-2"><Label className="font-body">Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} rows={3} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label className="font-body">Início *</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required /></div>
        <div className="space-y-2"><Label className="font-body">Fim *</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required /></div>
      </div>
      <div className="space-y-2"><Label className="font-body">Local</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label className="font-body">Capacidade Máx.</Label><Input type="number" min={0} value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} /></div>
        <div className="space-y-2"><Label className="font-body">Orçamento (R$)</Label><Input type="number" min={0} step="0.01" value={form.estimated_budget} onChange={(e) => setForm({ ...form, estimated_budget: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="outline" type="button">Cancelar</Button></DialogClose>
        <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </form>
  );
}

function EventCard({ ev, onEdit, onDelete, onSelect }: { ev: EventRow; onEdit: (ev: EventRow) => void; onDelete: (id: string) => void; onSelect?: (ev: EventRow) => void }) {
  return (
    <Card className="hover:shadow-strong transition-all cursor-pointer active:scale-[0.98] border-border" onClick={() => onSelect?.(ev)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-display">{ev.name}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="font-body text-xs">{EVENT_TYPE_LABELS[ev.event_type]}</Badge>
              <Badge className={`${STATUS_COLORS[ev.status] || ""} font-body text-xs`}>{STATUS_LABELS[ev.status] || ev.status}</Badge>
            </div>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" onClick={() => onEdit(ev)} className="active:scale-95"><Pencil className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive active:scale-95"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">Excluir evento?</AlertDialogTitle>
                  <AlertDialogDescription className="font-body">Essa ação é irreversível.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(ev.id)}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2 font-body">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{format(new Date(ev.start_date), "dd/MM/yyyy HH:mm", { locale: ptBR })} — {format(new Date(ev.end_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
        </div>
        {ev.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span>{ev.location}</span></div>}
        {ev.max_capacity && <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-3.5 w-3.5" /><span>Até {ev.max_capacity} pessoas</span></div>}
        {ev.estimated_budget && ev.estimated_budget > 0 && <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /><span>R$ {Number(ev.estimated_budget).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>}
      </CardContent>
    </Card>
  );
}

export default Events;
