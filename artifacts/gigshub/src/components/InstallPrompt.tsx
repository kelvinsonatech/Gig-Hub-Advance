import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import logoUrl from "@/assets/logo.png";

const STORAGE_KEY = "gigshub_install_dismissed_at";
const SNOOZE_DAYS = 30;

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
  const ios = isIOS();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;
    if (!ios && !deferredPrompt) return;

    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, [deferredPrompt, ios]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const install = async () => {
    if (ios) {
      dismiss();
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
  };

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
            <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
              <img src={logoUrl} alt="TurboGh" className="w-9 h-auto" />
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900 leading-tight truncate">
                Install TurboGH
              </p>
              {ios && (
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                  Tap Share → Add to Home Screen
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={install}
                className="px-4 py-1.5 rounded-full bg-[#0077C7] hover:bg-[#0066b0] text-white text-[13px] font-semibold transition-colors"
              >
                Install
              </button>
              <button
                onClick={dismiss}
                className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 text-[13px] font-medium transition-colors"
              >
                Not Now
              </button>
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
