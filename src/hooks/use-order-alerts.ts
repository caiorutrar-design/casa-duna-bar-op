import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playAlertSound, showSystemNotification } from "@/lib/notify";

interface ReadyAlert {
  itemId: string;
  tableNumber: number | null;
  drinkName: string;
  quantity: number;
}

/**
 * Escuta em tempo real os itens que a cozinha marcou como "pronto"
 * e dispara som + notificação do sistema para o garçom.
 */
export function useOrderAlerts(enabled: boolean, onReady?: (alert: ReadyAlert) => void) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("waiter-ready-alerts")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_items" },
        async (payload) => {
          const next = payload.new as { id: string; status: string };
          const prev = payload.old as { status?: string } | null;
          if (next?.status !== "ready" || prev?.status === "ready") return;
          if (seen.current.has(next.id)) return;
          seen.current.add(next.id);

          const { data } = await supabase
            .from("order_items")
            .select("id, quantity, drinks(name), orders!inner(tables(table_number))")
            .eq("id", next.id)
            .maybeSingle();

          const tableNumber =
            (data as any)?.orders?.tables?.table_number ?? null;
          const drinkName = (data as any)?.drinks?.name ?? "Item";
          const quantity = (data as any)?.quantity ?? 1;

          playAlertSound();
          showSystemNotification(
            tableNumber ? `Mesa ${tableNumber} — pedido pronto` : "Pedido pronto",
            `${quantity}x ${drinkName} pronto para entrega`,
            next.id
          );
          onReadyRef.current?.({ itemId: next.id, tableNumber, drinkName, quantity });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
