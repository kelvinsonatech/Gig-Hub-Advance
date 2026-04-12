import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { getAvatarSrc } from "@/components/ui/UserAvatar";
import { useAuth } from "@/hooks/use-auth";

const STATIC_IMAGES = [
  `${import.meta.env.BASE_URL}wallet-bg.jpg`,
  "https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABUV_jDjJ4_X_PSYgTJthNlfoStaN1fqwW1vcTx8bKIwYizu5-VL1365SJPeFB1FIig2dpPVvYdgfODQ9DEKR8t9Ak3G5NIa1HeWv.jpg?r=513",
  "https://www.myjoyonline.com/wp-content/uploads/2021/02/Momo.jpg",
];

const preloaded = new Set<string>();

function preloadUrls(urls: string[]) {
  urls.forEach(url => {
    if (!url || preloaded.has(url)) return;
    preloaded.add(url);
    const img = new Image();
    img.src = url;
  });
}

export function useImagePreloader() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    preloadUrls(STATIC_IMAGES);

    fetch(`${API}/api/networks`)
      .then(r => r.ok ? r.json() : [])
      .then((networks: Array<{ logoUrl?: string | null }>) => {
        const logos = networks.map(n => n.logoUrl ?? "").filter(Boolean);
        preloadUrls(logos);

        qc.setQueryData(["/api/networks"], (old: any) => old ?? networks);
      })
      .catch(() => {});
  }, [qc]);

  useEffect(() => {
    if (user?.email) {
      const avatarUrl = getAvatarSrc(user.email, user.avatarStyle ?? "adventurer");
      preloadUrls([avatarUrl]);
    }
  }, [user?.email, user?.avatarStyle]);
}
