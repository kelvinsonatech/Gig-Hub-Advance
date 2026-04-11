import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
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

function getNetworkInitials(name: string): string {
  if (!name) return "?";
  return name.toUpperCase().slice(0, 3);
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
  const [dismissed, setDismissed] = useState(false);
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
    if (!mountedRef.current || showingRef.current || dismissed) return;
    showingRef.current = true;
    setVisible(true);

    const hideTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      setVisible(false);
      const advanceTimer = setTimeout(() => {
        if (!mountedRef.current) return;
        setCurrentIndex((i) => (i + 1) % (purchases.length || 1));
        showingRef.current = false;
      }, 600);
      timersRef.current.push(advanceTimer);
    }, 5000);
    timersRef.current.push(hideTimer);
  }, [purchases.length, dismissed]);

  useEffect(() => {
    if (purchases.length === 0 || dismissed) return;

    const initialDelay = 3000 + Math.random() * 4000;
    const timer = setTimeout(() => showNext(), initialDelay);
    timersRef.current.push(timer);

    return () => clearTimers();
  }, [purchases, dismissed, showNext, clearTimers]);

  useEffect(() => {
    if (purchases.length === 0 || dismissed || visible || showingRef.current) return;

    const interval = 8000 + Math.random() * 7000;
    const timer = setTimeout(() => showNext(), interval);
    timersRef.current.push(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [currentIndex, visible, purchases, dismissed, showNext]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    showingRef.current = false;
    clearTimers();
  }, [clearTimers]);

  if (purchases.length === 0 || dismissed) return null;

  const purchase = purchases[currentIndex];
  if (!purchase) return null;

  const colors = getNetworkColor(purchase.networkName);

  return (
    <div
      className={`fixed bottom-20 left-2 right-2 sm:left-4 sm:right-auto z-50 transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0 pointer-events-none"
      }`}
      style={{ maxWidth: 340 }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />

        <div className="pl-3 pr-2 pt-2.5 pb-2.5 sm:pl-4 sm:pr-3 sm:pt-3 sm:pb-3">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-red-500">
                Live Purchase
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <UserAvatar name={purchase.firstName} size={38} className="sm:!w-11 sm:!h-11 sm:!min-w-[44px]" />

            <div className="flex-1 min-w-0">
              <p className="text-[13px] sm:text-sm font-bold text-gray-900 leading-tight">
                {purchase.firstName} just bought
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[8px] sm:text-[9px] font-black shrink-0"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {getNetworkInitials(purchase.networkName)}
                </span>
                <span className="text-[13px] sm:text-sm font-bold truncate" style={{ color: colors.bg === "#FFCC00" ? "#b8860b" : colors.bg }}>
                  {purchase.data}{" "}
                  <span className="text-gray-600 font-semibold">
                    {purchase.networkName} bundle
                  </span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                {timeAgo(purchase.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
