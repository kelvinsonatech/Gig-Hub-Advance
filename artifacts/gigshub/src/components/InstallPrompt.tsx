import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, MoreVertical, PlusSquare } from "lucide-react";
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
  const [showGuide, setShowGuide] = useState(false);
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
    if (!isMobile()) return;
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowGuide(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Android native install dialog
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
    } else {
      // No native prompt available — show manual steps
      setShowGuide(true);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Main banner */}
          {!showGuide && (
            <motion.div
              key="install-banner"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="fixed bottom-4 left-3 right-3 z-[70] max-w-sm mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={logoUrl} alt="TurboGh" className="w-9 h-auto" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 leading-tight truncate">Install TurboGH</p>
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">Add to your home screen</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleInstall}
                    className="px-4 py-1.5 rounded-full bg-[#FF3C00] hover:bg-[#e03500] text-white text-[13px] font-semibold transition-colors"
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

          {/* Manual install guide */}
          {showGuide && (
            <motion.div
              key="install-guide"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[70] max-w-lg mx-auto"
            >
              <div className="bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] border-t border-gray-100 px-6 pt-5 pb-8">
                {/* Handle */}
                <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />

                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden">
                      <img src={logoUrl} alt="TurboGH" className="w-7 h-auto" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Install TurboGH</p>
                      <p className="text-xs text-gray-400">Follow the steps below</p>
                    </div>
                  </div>
                  <button onClick={dismiss} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {ios ? (
                  <div className="space-y-3">
                    {[
                      { icon: Share,       step: "1", text: "Tap the Share button at the bottom of Safari" },
                      { icon: PlusSquare,  step: "2", text: 'Scroll down and tap "Add to Home Screen"' },
                      { icon: PlusSquare,  step: "3", text: 'Tap "Add" to confirm' },
                    ].map(({ icon: Icon, step, text }) => (
                      <div key={step} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#FF3C00] text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          <p className="text-sm text-gray-600 leading-snug">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { icon: MoreVertical, step: "1", text: 'Tap the menu (⋮) at the top-right of Chrome' },
                      { icon: PlusSquare,   step: "2", text: 'Tap "Add to Home Screen"' },
                      { icon: PlusSquare,   step: "3", text: 'Tap "Add" to confirm' },
                    ].map(({ icon: Icon, step, text }) => (
                      <div key={step} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#FF3C00] text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</div>
                        <div className="flex items-center gap-2 pt-0.5">
                          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          <p className="text-sm text-gray-600 leading-snug">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={dismiss}
                  className="mt-5 w-full py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm font-medium"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
