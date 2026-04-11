import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Settings, Zap, Hand, Loader2, CheckCircle2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const token = () => localStorage.getItem("gigshub_token");
const authHeaders = () => ({
  Authorization: `Bearer ${token()}`,
  "Content-Type": "application/json",
});

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fulfillment-mode"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/admin/settings/fulfillment`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ mode: "manual" | "api" }>;
    },
  });

  const modeMutation = useMutation({
    mutationFn: async (mode: "manual" | "api") => {
      const res = await fetch(`${API}/api/admin/settings/fulfillment`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, mode) => {
      qc.setQueryData(["admin-fulfillment-mode"], { mode });
      toast({
        title: mode === "api" ? "API Mode Activated" : "Manual Mode Activated",
        description: mode === "api"
          ? "New bundle orders will be sent to JessCo automatically."
          : "You will process all bundle orders manually.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update fulfillment mode.", variant: "destructive" });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (orderId: number) => {
      setRetryingId(orderId);
      const res = await fetch(`${API}/api/admin/orders/${orderId}/retry-fulfillment`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      setRetryingId(null);
      if (data.success) {
        toast({ title: "Sent!", description: `Order sent to JessCo (ref: ${data.providerRef})` });
      } else {
        toast({ title: "Failed", description: data.message || "Could not send to JessCo", variant: "destructive" });
      }
    },
    onError: () => {
      setRetryingId(null);
      toast({ title: "Error", description: "Failed to retry fulfillment.", variant: "destructive" });
    },
  });

  const currentMode = data?.mode ?? "manual";

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">Settings</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">
          Fulfillment Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Choose how data bundle orders are processed after payment.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => modeMutation.mutate("manual")}
            disabled={modeMutation.isPending}
            className={`w-full text-left rounded-2xl border-2 p-5 sm:p-6 transition-all ${
              currentMode === "manual"
                ? "border-[#E91E8C] bg-pink-50/50 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                currentMode === "manual" ? "bg-[#E91E8C]" : "bg-gray-100"
              }`}>
                <Hand className={`w-6 h-6 ${currentMode === "manual" ? "text-white" : "text-gray-400"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Manual Mode</h3>
                  {currentMode === "manual" && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#E91E8C] bg-pink-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  You manually process each order from the Orders page. Update the status to "Delivered" after
                  fulfilling the bundle yourself. Best for when you want full control over every transaction.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => modeMutation.mutate("api")}
            disabled={modeMutation.isPending}
            className={`w-full text-left rounded-2xl border-2 p-5 sm:p-6 transition-all ${
              currentMode === "api"
                ? "border-[#E91E8C] bg-pink-50/50 shadow-md"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                currentMode === "api" ? "bg-[#E91E8C]" : "bg-gray-100"
              }`}>
                <Zap className={`w-6 h-6 ${currentMode === "api" ? "text-white" : "text-gray-400"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">API Mode (JessCo)</h3>
                  {currentMode === "api" && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#E91E8C] bg-pink-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Bundle orders are automatically sent to JessCo for instant fulfillment after payment is confirmed.
                  JessCo delivers the data bundle directly to the customer's phone. Status updates come back via webhook.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Webhook: <code className="text-gray-500">/api/webhooks/jessco</code></span>
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">How it works</h2>
        <p className="text-xs text-gray-400 mb-4">The fulfillment flow based on your current mode</p>

        <div className="space-y-3">
          {currentMode === "manual" ? (
            <>
              <Step num={1} text="Customer pays for a data bundle (MoMo or Wallet)" />
              <Step num={2} text="Order appears in your Orders page with status 'Processing'" />
              <Step num={3} text="You manually send the data to the customer's phone" />
              <Step num={4} text="You update the order status to 'Delivered' in the admin panel" />
            </>
          ) : (
            <>
              <Step num={1} text="Customer pays for a data bundle (MoMo or Wallet)" />
              <Step num={2} text="Order is automatically sent to JessCo for fulfillment" />
              <Step num={3} text="JessCo delivers data to the customer's phone" />
              <Step num={4} text="Webhook callback updates the order status automatically" />
            </>
          )}
        </div>
      </div>

      {currentMode === "api" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Make sure your JessCo account has sufficient balance.</p>
            <p className="text-amber-600 mt-0.5">
              If a fulfillment fails, the order stays in "Processing" — you can retry it manually from the Orders page
              or switch back to Manual mode.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[#E91E8C]">{num}</span>
      </div>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}
