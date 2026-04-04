import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
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
  const { isAuthenticated } = useAuth();
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
    if (!isAuthenticated) return;
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;
    if (!ios && !deferredPrompt) return;

    const t = setTimeout(() => setVisible(true), 1600);
    return () => clearTimeout(t);
  }, [isAuthenticated, deferredPrompt, ios]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-w-lg mx-auto rounded-t-3xl overflow-hidden shadow-2xl"
          >
            {/* ── Blue header ── */}
            <div className="bg-gradient-to-br from-[#0077C7] via-[#0088e0] to-[#00AAFF] px-6 pt-7 pb-5 text-white relative">
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-black/10 pointer-events-none" />

              <button
                onClick={dismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center z-10"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="flex items-center gap-4 mb-3 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0">
                  <img src={logoUrl} alt="TurboGh" className="w-11 h-auto" />
                </div>
                <div>
                  <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-0.5">TurboGh</p>
                  <h2 className="text-xl font-extrabold leading-tight">Add to Home Screen</h2>
                </div>
              </div>

              <p className="text-white/80 text-sm leading-relaxed relative z-10">
                Install TurboGh for instant access to data bundles, your wallet, and all services — straight from your home screen.
              </p>
            </div>

            {/* ── White body ── */}
            <div className="bg-white px-6 pt-5 pb-8 space-y-3">
              {ios ? (
                /* iOS: Manual steps since Safari doesn't support beforeinstallprompt */
                <div className="space-y-3 mb-2">
                  <p className="text-sm font-bold text-gray-800">To install on iPhone / iPad:</p>
                  {[
                    { n: "1", icon: Share2,   text: 'Tap the Share button at the bottom of Safari' },
                    { n: "2", icon: Plus,     text: 'Scroll down and tap "Add to Home Screen"' },
                    { n: "3", icon: Smartphone, text: 'Tap "Add" — done! TurboGh is now on your home screen.' },
                  ].map(({ n, icon: Icon, text }) => (
                    <div key={n} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#0077C7] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {n}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                        <p className="text-sm text-gray-600 leading-snug">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Android / Chrome: native prompt */
                <Button
                  onClick={install}
                  className="w-full h-12 rounded-2xl bg-[#0077C7] hover:bg-[#0066aa] text-white font-bold text-base shadow-lg shadow-blue-200"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Install App
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={dismiss}
                className="w-full h-10 rounded-2xl text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Maybe Later
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
