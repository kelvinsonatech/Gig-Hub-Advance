import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Settings, Zap, Hand, Loader2, CheckCircle2, AlertTriangle, Rocket,
} from "lucide-react";
import { API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Mode = "manual" | "api" | "xpress_gh";

const token = () => localStorage.getItem("gigshub_token");
const authHeaders = () => ({
  Authorization: `Bearer ${token()}`,
  "Content-Type": "application/json",
});

const PROVIDER_LABEL: Record<Mode, string> = {
  manual: "Manual",
  api: "JessCo",
  xpress_gh: "Xpress-gh",
};

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [_, setRetryingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fulfillment-mode"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/admin/settings/fulfillment`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ mode: Mode }>;
    },
  });

  const currentMode: Mode = data?.mode ?? "manual";

  const { data: xpressBalance } = useQuery({
    queryKey: ["admin-xpress-gh-balance"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/admin/settings/xpress-gh/balance`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ ok: boolean; balance?: number; error?: string }>;
    },
    enabled: currentMode === "xpress_gh",
    refetchInterval: 60_000,
  });

  const modeMutation = useMutation({
    mutationFn: async (mode: Mode) => {
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
      const description =
        mode === "manual"
          ? "You will process all bundle orders manually."
          : `New bundle orders will be sent to ${PROVIDER_LABEL[mode]} automatically.`;
      toast({ title: `${PROVIDER_LABEL[mode]} mode activated`, description });
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
      const provider = data.provider === "xpress_gh" ? "Xpress-gh" : "JessCo";
      if (data.success) {
        toast({ title: "Sent!", description: `Order sent to ${provider} (ref: ${data.providerRef})` });
      } else {
        toast({ title: "Failed", description: data.message || `Could not send to ${provider}`, variant: "destructive" });
      }
    },
    onError: () => {
      setRetryingId(null);
      toast({ title: "Error", description: "Failed to retry fulfillment.", variant: "destructive" });
    },
  });
  void retryMutation;

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
          <ModeCard
            active={currentMode === "manual"}
            disabled={modeMutation.isPending}
            onClick={() => modeMutation.mutate("manual")}
            icon={<Hand className="w-6 h-6" />}
            title="Manual Mode"
            description="You manually process each order from the Orders page. Update the status to 'Delivered' after fulfilling the bundle yourself. Best when you want full control over every transaction."
          />

          <ModeCard
            active={currentMode === "api"}
            disabled={modeMutation.isPending}
            onClick={() => modeMutation.mutate("api")}
            icon={<Zap className="w-6 h-6" />}
            title="API Mode (JessCo)"
            description="Bundle orders are automatically sent to JessCo for instant fulfillment after payment. Status updates come back via webhook."
            footer={
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <Settings className="w-3.5 h-3.5" />
                <span>Webhook: <code className="text-gray-500">/api/webhooks/jessco</code></span>
              </div>
            }
          />

          <ModeCard
            active={currentMode === "xpress_gh"}
            disabled={modeMutation.isPending}
            onClick={() => modeMutation.mutate("xpress_gh")}
            icon={<Rocket className="w-6 h-6" />}
            title="API Mode (Xpress-gh)"
            description="Bundle orders are automatically sent to Xpress-gh for instant fulfillment. Only whole-GB bundles for MTN, AirtelTigo, and Telecel are supported. Failed items are auto-refunded by Xpress-gh."
            footer={
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Webhook: <code className="text-gray-500">/api/webhooks/xpress-gh</code></span>
                </div>
                {currentMode === "xpress_gh" && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Wallet balance:</span>
                    {xpressBalance?.ok ? (
                      <span className="font-semibold text-emerald-700">
                        GHS {Number(xpressBalance.balance ?? 0).toFixed(2)}
                      </span>
                    ) : xpressBalance ? (
                      <span className="text-red-600">{xpressBalance.error || "unavailable"}</span>
                    ) : (
                      <span className="text-gray-400">checking…</span>
                    )}
                  </div>
                )}
              </div>
            }
          />
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
              <Step num={2} text={`Order is automatically sent to ${PROVIDER_LABEL[currentMode]} for fulfillment`} />
              <Step num={3} text="Provider delivers data to the customer's phone" />
              <Step num={4} text="Webhook callback updates the order status automatically" />
            </>
          )}
        </div>
      </div>

      {currentMode !== "manual" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">
              Make sure your {PROVIDER_LABEL[currentMode]} account has sufficient balance.
            </p>
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

function ModeCard({
  active, disabled, onClick, icon, title, description, footer,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left rounded-2xl border-2 p-5 sm:p-6 transition-all ${
        active
          ? "border-[#E91E8C] bg-pink-50/50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          active ? "bg-[#E91E8C] text-white" : "bg-gray-100 text-gray-400"
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {active && (
              <span className="flex items-center gap-1 text-xs font-semibold text-[#E91E8C] bg-pink-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
          {footer}
        </div>
      </div>
    </button>
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
