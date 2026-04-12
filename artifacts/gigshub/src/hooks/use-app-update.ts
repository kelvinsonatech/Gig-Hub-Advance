import { useState, useEffect, useCallback, useRef } from "react";

declare const __APP_VERSION__: string;

const currentVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;
const isDev = import.meta.env.DEV;

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const dismissed = useRef(false);
  const hasCheckedOnLoad = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (!currentVersion || isDev || dismissed.current || updateAvailable) return;
    try {
      const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.version && data.version !== currentVersion) {
        setUpdateAvailable(true);
      }
    } catch {}
  }, [updateAvailable]);

  useEffect(() => {
    if (!currentVersion || isDev || hasCheckedOnLoad.current) return;
    hasCheckedOnLoad.current = true;
    const timeout = setTimeout(checkForUpdate, 5_000);
    return () => clearTimeout(timeout);
  }, [checkForUpdate]);

  useEffect(() => {
    if (!currentVersion || isDev) return;
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

  const dismiss = useCallback(() => {
    dismissed.current = true;
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, applyUpdate, dismiss };
}
