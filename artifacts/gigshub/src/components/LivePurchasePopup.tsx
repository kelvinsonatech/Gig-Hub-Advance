import { useState, useEffect, useRef, useCallback } from "react";
import { API } from "../lib/api";
import { UserAvatar } from "./ui/UserAvatar";

interface LivePurchase {
  firstName: string;
  bundleName: string;
  data: string;
  networkName: string;
  createdAt: string;
}

function getNetworkColor(name: string): { bg: string; text: string } {
  const n = name.toUpperCase();
  if (n.includes("MTN")) return { bg: "#FFCC00", text: "#000" };
  if (n.includes("AT") || n.includes("AIRTEL") || n.includes("TIGO")) return { bg: "#004b87", text: "#fff" };
  if (n.includes("TELECEL") || n.includes("VODAFONE")) return { bg: "#CC0000", text: "#fff" };
  return { bg: "#6366f1", text: "#fff" };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "a few seconds ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return "today";
}

export default function LivePurchasePopup() {
  const [purchases, setPurchases] = useState<LivePurchase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const showingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPurchases() {
      try {
        const res = await fetch(`${API}/api/purchases/live`);
        if (!res.ok) return;
        const data: LivePurchase[] = await res.json();
        if (!cancelled && data.length > 0) {
          setPurchases(data);
        }
      } catch { /* silent */ }
    }

    fetchPurchases();
    const interval = setInterval(fetchPurchases, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const showNext = useCallback(() => {
    if (!mountedRef.current || showingRef.current) return;
    showingRef.current = true;
    setVisible(true);

    const hideTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      setVisible(false);
      const advanceTimer = setTimeout(() => {
        if (!mountedRef.current) return;
        setCurrentIndex((i) => (i + 1) % (purchases.length || 1));
        showingRef.current = false;
      }, 500);
      timersRef.current.push(advanceTimer);
    }, 4000);
    timersRef.current.push(hideTimer);
  }, [purchases.length]);

  useEffect(() => {
    if (purchases.length === 0) return;

    const initialDelay = 3000 + Math.random() * 3000;
    const timer = setTimeout(() => showNext(), initialDelay);
    timersRef.current.push(timer);

    return () => clearTimers();
  }, [purchases, showNext, clearTimers]);

  useEffect(() => {
    if (purchases.length === 0 || visible || showingRef.current) return;

    const gap = 8000 + Math.random() * 7000;
    const timer = setTimeout(() => showNext(), gap);
    timersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [currentIndex, visible, purchases, showNext]);

  if (purchases.length === 0) return null;

  const purchase = purchases[currentIndex];
  if (!purchase) return null;

  const colors = getNetworkColor(purchase.networkName);

  return (
    <div
      className={`fixed bottom-20 left-2 sm:left-4 z-50 transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-4 opacity-0 scale-95 pointer-events-none"
      }`}
      style={{ maxWidth: 280 }}
    >
      <div className="relative bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500" />

        <div className="pl-2.5 pr-2 py-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-widest text-red-500">
              Live Purchase
            </span>
          </div>

          <div className="flex items-center gap-2">
            <UserAvatar name={purchase.firstName} size={30} />

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-900 leading-tight">
                {purchase.firstName} just bought{" "}
                <span style={{ color: colors.bg === "#FFCC00" ? "#b8860b" : colors.bg }}>
                  {purchase.data}
                </span>{" "}
                <span className="text-gray-500 font-semibold">
                  {purchase.networkName}
                </span>
              </p>
              <p className="text-[9px] text-gray-400 mt-0.5">
                {timeAgo(purchase.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
