import { useState, useEffect, useCallback } from "react";

declare const __APP_VERSION__: string;

const POLL_INTERVAL = 60_000;
const currentVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (!currentVersion) return;
    try {
      const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== currentVersion) {
        setUpdateAvailable(true);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const id = setInterval(checkForUpdate, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkForUpdate]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [checkForUpdate]);

  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  return { updateAvailable, applyUpdate };
}
