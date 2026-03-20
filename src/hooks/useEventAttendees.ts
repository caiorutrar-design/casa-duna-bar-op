import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EventAttendee {
  id: string;
  event_id: string;
  name: string;
  status: string;
  ticket_price: number;
  created_at: string;
}

export function useEventAttendees(eventId: string) {
  const queryClient = useQueryClient();

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["event_attendees", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_attendees")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EventAttendee[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (attendee: { name: string; status: string; ticket_price: number }) => {
      const { error } = await supabase.from("event_attendees").insert({
        event_id: eventId,
        ...attendee,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_attendees", eventId] });
      toast.success("Presença adicionada!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("event_attendees").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_attendees", eventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_attendees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_attendees", eventId] });
      toast.success("Presença removida!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const counts = {
    confirmed: attendees.filter((a) => a.status === "confirmed").length,
    pending: attendees.filter((a) => a.status === "pending").length,
    no_show: attendees.filter((a) => a.status === "no_show").length,
    total: attendees.length,
  };

  return { attendees, isLoading, addMutation, updateMutation, deleteMutation, counts };
}
