import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type EventRow = Tables<"events">;

export function useEvents(enabled = true) {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled,
  });
}

export function useEventMutations() {
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: TablesInsert<"events"> }) => {
      if (id) {
        const { error } = await supabase.from("events").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("events").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(variables.id ? "Evento atualizado!" : "Evento criado!");
    },
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
  });

  return { saveMutation, deleteMutation };
}
