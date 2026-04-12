import { useAppUpdate } from "@/hooks/use-app-update";
import { RefreshCw } from "lucide-react";

export function UpdateBanner() {
  const { updateAvailable, applyUpdate } = useAppUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <button
        onClick={applyUpdate}
        className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all"
      >
        <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: "3s" }} />
        <span className="text-sm font-bold">New update available</span>
        <span className="text-xs bg-white/20 rounded-lg px-2 py-0.5 font-semibold">Tap to refresh</span>
      </button>
    </div>
  );
}
