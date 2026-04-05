import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import logoUrl from "@/assets/logo.png";

const STORAGE_KEY = "gigshub_install_dismissed_at";
const SNOOZE_DAYS = 30;

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function wasRecentlyDismissed() {
  const ts = localStorage.getItem(STORAGE_KEY);
  if (!ts) return false;
  const days = (Date.now() - Number(ts)) / 86_400_000;
  return days < SNOOZE_DAYS;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!isMobile()) return;
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
    }
  };

  const hint = isIOS()
    ? "Tap Share then "Add to Home Screen" to install."
    : "Tap ⋮ then "Add to Home Screen" to install.";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
          className="fixed bottom-4 left-3 right-3 z-[70] max-w-sm mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-gray-100 px-4 py-3 flex items-center gap-3">
            {/* App icon */}
            <div className="w-11 h-11 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
              <img src={logoUrl} alt="TurboGH" className="w-8 h-auto" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900 leading-tight">Install TurboGH</p>
              <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{hint}</p>
            </div>

            {/* Install button — only shown when native prompt is ready */}
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 rounded-full bg-[#FF3C00] hover:bg-[#e03500] text-white text-[13px] font-semibold transition-colors shrink-0"
              >
                Install
              </button>
            )}

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
