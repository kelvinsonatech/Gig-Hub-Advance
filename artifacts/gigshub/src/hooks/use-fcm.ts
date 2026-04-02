import { useEffect, useRef } from "react";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase";
import { useAuthStore } from "./use-auth";
import { toast } from "sonner";

import { API } from "@/lib/api";
const STORAGE_KEY = "fcm_token_registered";

async function registerToken(token: string) {
  const storedToken = localStorage.getItem(STORAGE_KEY);
  if (storedToken === token) return;

  const authToken = useAuthStore.getState().token;
  if (!authToken) return;

  try {
    await fetch(`${API}/api/notifications/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // silent — retry next session
  }
}

export function useFcm() {
  const token = useAuthStore((s) => s.token);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      const fcmToken = await requestFcmToken();
      if (cancelled || !fcmToken) return;
      await registerToken(fcmToken);

      unsubRef.current = onForegroundMessage((payload) => {
        const title = payload.notification?.title || "TurboGH";
        const body = payload.notification?.body || "";
        toast(title, { description: body });
      });
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
  }, [token]);
}
