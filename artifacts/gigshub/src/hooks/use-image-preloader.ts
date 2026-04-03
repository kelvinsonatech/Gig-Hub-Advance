import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";

const BG_IMAGE =
  "https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABUV_jDjJ4_X_PSYgTJthNlfoStaN1fqwW1vcTx8bKIwYizu5-VL1365SJPeFB1FIig2dpPVvYdgfODQ9DEKR8t9Ak3G5NIa1HeWv.jpg?r=513";

function preloadUrls(urls: string[]) {
  urls.forEach(url => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}

export function useImagePreloader() {
  const qc = useQueryClient();

  useEffect(() => {
    preloadUrls([BG_IMAGE]);

    fetch(`${API}/api/networks`)
      .then(r => r.ok ? r.json() : [])
      .then((networks: Array<{ logoUrl?: string | null }>) => {
        const logos = networks.map(n => n.logoUrl ?? "").filter(Boolean);
        preloadUrls(logos);

        qc.setQueryData(["networks"], (old: any) => old ?? networks);
      })
      .catch(() => {});
  }, [qc]);
}
