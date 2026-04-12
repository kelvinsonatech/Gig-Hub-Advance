import { useAppUpdate } from "@/hooks/use-app-update";
import { RefreshCw, X } from "lucide-react";

export function UpdateBanner() {
  const { updateAvailable, applyUpdate, dismiss } = useAppUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-4 sm:w-auto z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="flex items-center gap-3 bg-gray-900 text-white rounded-xl sm:rounded-2xl shadow-2xl px-4 py-3 sm:px-5 sm:py-3.5">
        <RefreshCw className="w-4 h-4 shrink-0 text-orange-400 animate-spin" style={{ animationDuration: "3s" }} />
        <p className="text-sm font-medium flex-1">A new version is available</p>
        <button
          onClick={applyUpdate}
          className="shrink-0 text-xs font-bold bg-orange-500 hover:bg-orange-400 text-white rounded-lg px-3 py-1.5 transition-colors active:scale-95"
        >
          Refresh
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>
    </div>
  );
}
