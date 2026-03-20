import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEventAttendees } from "@/hooks/useEventAttendees";
import { Plus, Trash2, Users, UserCheck, UserX, Clock } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmado", icon: UserCheck, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "pending", label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "no_show", label: "Não Compareceu", icon: UserX, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
];

export function EventAttendees({ eventId }: { eventId: string }) {
  const { attendees, counts, addMutation, updateMutation, deleteMutation } = useEventAttendees(eventId);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStatus, setNewStatus] = useState("pending");

  const handleAdd = () => {
    if (!newName.trim()) return;
    addMutation.mutate({
      name: newName.trim(),
      status: newStatus,
      ticket_price: parseFloat(newPrice) || 0,
    });
    setNewName("");
    setNewPrice("");
    setNewStatus("pending");
  };

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", count: counts.total, icon: Users, color: "text-foreground" },
          { label: "Confirmados", count: counts.confirmed, icon: UserCheck, color: "text-green-600" },
          { label: "Pendentes", count: counts.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Ausentes", count: counts.no_show, icon: UserX, color: "text-red-600" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-3 px-3 text-center">
              <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
              <p className={`text-xl font-bold tabular-nums ${item.color}`}>{item.count}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Adicionar Presença</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 min-w-[140px]" />
            <Input type="number" placeholder="Ingresso R$" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-28" min={0} step={0.01} />
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" onClick={handleAdd} disabled={addMutation.isPending}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="pt-4">
          {attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma presença registrada.</p>
          ) : (
            <div className="space-y-2">
              {attendees.map((a) => {
                const statusInfo = STATUS_OPTIONS.find((s) => s.value === a.status);
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{a.name}</span>
                      <Badge className={statusInfo?.color || ""} variant="outline">{statusInfo?.label || a.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.ticket_price > 0 && <span className="text-xs text-muted-foreground tabular-nums">R$ {Number(a.ticket_price).toFixed(2)}</span>}
                      <Select value={a.status} onValueChange={(v) => updateMutation.mutate({ id: a.id, status: v })}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
