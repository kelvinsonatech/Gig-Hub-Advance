import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";

export function useAdminOrdersStream() {
  const queryClient = useQueryClient();
  const retryDelayRef = useRef(1_000);
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("gigshub_token");
    if (!token) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const url = `${API}/api/admin/stream?token=${encodeURIComponent(token!)}`;
      const es = new EventSource(url);
      esRef.current = es;

      // A new order arrived — prepend it to the cached list instantly
      es.addEventListener("new_order", (e: MessageEvent) => {
        const order = JSON.parse(e.data);
        queryClient.setQueryData<unknown[]>(["admin-orders"], (old) => {
          if (!Array.isArray(old)) return old;
          // Avoid duplicates (e.g. if polling also picked it up)
          const exists = old.some((o: any) => o.id === order.id);
          return exists ? old : [order, ...old];
        });
        retryDelayRef.current = 1_000;
      });

      // Admin updated a status from another tab/browser — keep list in sync
      es.addEventListener("order_status_updated", (e: MessageEvent) => {
        const { id, status } = JSON.parse(e.data) as { id: string; status: string };
        queryClient.setQueryData<unknown[]>(["admin-orders"], (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((o: any) => o.id === id ? { ...o, status } : o);
        });
        retryDelayRef.current = 1_000;
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (cancelled) return;
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
  }, [queryClient]);
}
