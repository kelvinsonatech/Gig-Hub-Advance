import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingBag, Clock, Wifi, Package, UserCheck, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { API } from "@/lib/api";

async function apiFetch(path: string, opts?: RequestInit) {
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
  return data;
}

type OrderDetails = {
  phoneNumber?: string;
  bundleName?: string;
  data?: string;
  networkName?: string;
  [key: string]: unknown;
};

type Order = {
  id: string;
  type: "bundle" | "afa_registration" | "agent_registration";
  status: "pending" | "processing" | "completed" | "failed";
  amount: number;
  details: OrderDetails | null;
  createdAt: string;
  user: { name: string; email: string; phone: string };
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending:    { label: "Pending",    color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-400" },
  processing: { label: "Processing", color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",  dot: "bg-blue-500" },
  completed:  { label: "Delivered",  color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",dot: "bg-emerald-500" },
  failed:     { label: "Failed",     color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500" },
};

const STATUS_FLOW: Record<string, string> = {
  pending: "processing",
  processing: "completed",
};

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  bundle:             { label: "Data Bundle",       icon: Wifi,        color: "text-blue-600 bg-blue-50 border-blue-200" },
  afa_registration:   { label: "AFA Registration",  icon: UserCheck,   color: "text-purple-600 bg-purple-50 border-purple-200" },
  agent_registration: { label: "Agent Registration",icon: ShoppingBag, color: "text-pink-600 bg-pink-50 border-pink-200" },
};

const FILTER_STATUSES = ["all", "pending", "processing", "completed", "failed"] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: () => apiFetch("/orders"),
    refetchInterval: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      const label = STATUS_META[vars.status]?.label ?? vars.status;
      toast({ title: `Order marked as ${label}` });
    },
    onError: (e: Error) => toast({ title: "Failed to update status", description: e.message, variant: "destructive" }),
  });

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const counts = FILTER_STATUSES.reduce((acc, s) => {
    acc[s] = s === "all" ? orders.length : orders.filter(o => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage and track all customer orders</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_STATUSES.map(s => {
          const meta = s === "all" ? null : STATUS_META[s];
          const isActive = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                isActive
                  ? s === "all"
                    ? "bg-gray-900 text-white border-gray-900"
                    : `${meta!.bg} ${meta!.color} ${meta!.border}`
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
              {s === "all" ? "All" : meta!.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-black/10" : "bg-gray-100 text-gray-500"}`}>
                {counts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            {filter === "all" ? "No orders yet." : `No ${STATUS_META[filter]?.label.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const statusMeta = STATUS_META[order.status];
            const typeMeta = TYPE_META[order.type] ?? TYPE_META.bundle;
            const TypeIcon = typeMeta.icon;
            const nextStatus = STATUS_FLOW[order.status];
            const nextMeta = nextStatus ? STATUS_META[nextStatus] : null;
            const details = order.details ?? {};
            const isPending = updateStatus.isPending && (updateStatus.variables as any)?.id === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Status stripe */}
                <div className={`h-1 w-full ${statusMeta.dot}`} />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="shrink-0">
                      <UserAvatar name={order.user.name} size={52} className="ring-2 ring-white shadow-md" />
                    </div>

                    {/* Middle content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{order.user.name}</p>
                          <p className="text-xs text-gray-400">{order.user.email}</p>
                          <p className="text-xs text-gray-400">{order.user.phone}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status badge */}
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>

                      {/* Order type + details */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${typeMeta.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeMeta.label}
                        </span>
                        {details.networkName && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            {details.networkName}
                          </span>
                        )}
                        {details.bundleName && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                            {details.bundleName}
                            {details.data ? ` · ${details.data}` : ""}
                          </span>
                        )}
                        {details.phoneNumber && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                            📱 {details.phoneNumber}
                          </span>
                        )}
                      </div>

                      {/* Bottom row — amount, date, action */}
                      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-black text-gray-900">GHS {order.amount.toFixed(2)}</span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="text-xs text-gray-300 font-mono">#{order.id}</span>
                        </div>

                        {/* Status action button */}
                        {nextMeta && (
                          <button
                            disabled={isPending}
                            onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-60 ${nextMeta.bg} ${nextMeta.color} ${nextMeta.border} hover:opacity-80`}
                          >
                            {isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                Mark as {nextMeta.label}
                                <ChevronRight className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
