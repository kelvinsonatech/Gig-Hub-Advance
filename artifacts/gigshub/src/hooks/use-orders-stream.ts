import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "./use-auth";
import { API } from "@/lib/api";
import type { Order } from "@workspace/api-client-react";

export function useOrdersStream() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const retryDelayRef = useRef(1_000);
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const url = `${API}/api/orders/stream?token=${encodeURIComponent(token!)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("order_status_updated", (e: MessageEvent) => {
        const { id, status } = JSON.parse(e.data) as { id: string; status: string };

        // Surgically update only the changed order in the existing cache
        queryClient.setQueriesData<Order[]>(
          { queryKey: ["/api/orders"] },
          (old) => {
            if (!Array.isArray(old)) return old;
            return old.map((order) =>
              order.id === id ? { ...order, status } : order
            );
          }
        );

        // Reset backoff on successful event
        retryDelayRef.current = 1_000;
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (cancelled) return;
        // Exponential backoff: 1s → 2s → 4s → … up to 30s
        retryTimerRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30_000);
          connect();
        }, retryDelayRef.current);
      };
    }

    connect();

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [token, queryClient]);
}
