import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { API } from "@/lib/api";

type StuckIntent = {
  reference: string;
  userId: number;
  type: string;
  amountGHS: string;
  phoneNumber: string | null;
  bundleId: number | null;
  createdAt: string;
  minutesOld: number;
};

type PaymentHealth = {
  pendingIntents: number;
  stalePendingIntents: number;
  intentsLast24h: number;
  processedLast24h: number;
  failedLast24h: number;
  ordersAwaitingManualLast24h: number;
  reconcilerActive: boolean;
  stuckIntents: StuckIntent[];
};

type ReconcileResult = {
  ok: boolean;
  status: string;
  message: string;
  orderId?: number;
  paystackStatus?: string;
};

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}/api/admin${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data as T;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  tone: "blue" | "amber" | "green" | "red" | "gray";
  hint?: string;
}) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="text-xs mt-1 opacity-70">{hint}</div>}
    </div>
  );
}

export default function AdminPayments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [manualRef, setManualRef] = useState("");
  const [lastResult, setLastResult] = useState<ReconcileResult | null>(null);

  const { data: health, isLoading, refetch, isFetching } = useQuery<PaymentHealth>({
    queryKey: ["/api/admin/payment-health"],
    queryFn: () => apiFetch<PaymentHealth>("/payment-health"),
    refetchInterval: 15_000,
  });

  const reconcileMutation = useMutation({
    mutationFn: (reference: string) =>
      apiFetch<ReconcileResult>(
        `/payment-intents/${encodeURIComponent(reference)}/reconcile`,
        { method: "POST" }
      ),
    onSuccess: (result, reference) => {
      setLastResult(result);
      if (result.ok) {
        toast({
          title: "Payment verified",
          description: `${reference} → ${result.status}`,
        });
      } else {
        toast({
          title: "Could not recover",
          description: result.message,
          variant: "destructive",
        });
      }
      qc.invalidateQueries({ queryKey: ["/api/admin/payment-health"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Reconcile failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-6 text-gray-500">Could not load payment health.</div>
    );
  }

  const recoveryRate =
    health.intentsLast24h > 0
      ? Math.round((health.processedLast24h / health.intentsLast24h) * 100)
      : 100;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-500" />
            Payment System Health
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Live status of Paystack intents, missed-webhook recoveries, and
            stuck payments. Auto-refreshes every 15 seconds.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Reconciler heartbeat */}
      <div
        className={`rounded-2xl border p-4 flex items-center gap-3 ${
          health.reconcilerActive
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}
      >
        {health.reconcilerActive ? (
          <ShieldCheck className="w-5 h-5" />
        ) : (
          <AlertTriangle className="w-5 h-5" />
        )}
        <div className="text-sm">
          <span className="font-semibold">
            {health.reconcilerActive
              ? "Reconciler is running"
              : "Reconciler is OFFLINE"}
          </span>
          <span className="opacity-70 ml-2">
            {health.reconcilerActive
              ? "— Pending payments are auto-verified with Paystack every 45s if the webhook misses them."
              : "— Restart the API server to bring it back online."}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Pending Now"
          value={health.pendingIntents}
          icon={Clock}
          tone="blue"
          hint="In-flight Paystack sessions"
        />
        <StatCard
          label="Stuck >5min"
          value={health.stalePendingIntents}
          icon={AlertTriangle}
          tone={health.stalePendingIntents > 0 ? "amber" : "gray"}
          hint="Will be auto-verified soon"
        />
        <StatCard
          label="Last 24h Success"
          value={`${recoveryRate}%`}
          icon={CheckCircle2}
          tone={recoveryRate >= 80 ? "green" : recoveryRate >= 50 ? "amber" : "red"}
          hint={`${health.processedLast24h}/${health.intentsLast24h} processed`}
        />
        <StatCard
          label="Manual Delivery"
          value={health.ordersAwaitingManualLast24h}
          icon={AlertTriangle}
          tone={health.ordersAwaitingManualLast24h > 0 ? "amber" : "gray"}
          hint="Orders waiting on JessCo"
        />
      </div>

      {/* Manual reconcile */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-orange-500" />
          <h2 className="font-bold text-gray-900">Force-verify a payment</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Customer says they paid but no order appeared? Paste the Paystack
          reference here. We'll ask Paystack directly and create the order if
          the payment is real.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualRef.trim()) reconcileMutation.mutate(manualRef.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={manualRef}
            onChange={(e) => setManualRef(e.target.value)}
            placeholder="Paystack reference (e.g. T123456789)"
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="submit"
            disabled={!manualRef.trim() || reconcileMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {reconcileMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>
        </form>

        {lastResult && (
          <div
            className={`mt-3 p-3 rounded-xl text-sm ${
              lastResult.ok
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <div className="font-semibold flex items-center gap-2">
              {lastResult.ok ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {lastResult.status.replace(/_/g, " ")}
            </div>
            <div className="text-xs mt-1 opacity-90">{lastResult.message}</div>
            {lastResult.orderId && (
              <div className="text-xs mt-1 font-mono">
                Order ID: #{lastResult.orderId}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stuck intents list */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-gray-900">
              Stuck Payments ({health.stuckIntents.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            Pending for more than 5 minutes
          </span>
        </div>

        {health.stuckIntents.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              All clear. No payments are stuck.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {health.stuckIntents.map((intent) => (
              <div
                key={intent.reference}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-700 truncate">
                      {intent.reference}
                    </code>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                      {intent.minutesOld}m old
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                    <span>User #{intent.userId}</span>
                    <span>·</span>
                    <span className="font-semibold">
                      GHS {parseFloat(intent.amountGHS).toFixed(2)}
                    </span>
                    {intent.phoneNumber && (
                      <>
                        <span>·</span>
                        <span>{intent.phoneNumber}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="capitalize">
                      {intent.type.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reconcileMutation.mutate(intent.reference)}
                  disabled={reconcileMutation.isPending}
                  className="flex-shrink-0"
                >
                  {reconcileMutation.isPending &&
                  reconcileMutation.variables === intent.reference ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
