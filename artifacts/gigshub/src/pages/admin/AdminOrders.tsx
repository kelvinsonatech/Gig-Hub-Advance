import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ShoppingBag, Clock, Wifi, Package, UserCheck,
  Copy, Check, Phone, ChevronDown,
  CircleDot, CircleCheck, CircleX, Timer,
} from "lucide-react";
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
  networkLogoUrl?: string | null;
  networkColor?: string | null;
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

type StatusKey = "pending" | "processing" | "completed" | "failed";

const STATUS_META: Record<StatusKey, {
  label: string; color: string; bg: string; border: string;
  dot: string; stripe: string; icon: any;
}> = {
  pending:    { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  dot: "bg-amber-400",   stripe: "bg-amber-400",   icon: Timer },
  processing: { label: "Processing", color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   dot: "bg-blue-500",    stripe: "bg-blue-500",    icon: CircleDot },
  completed:  { label: "Delivered",  color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200",dot: "bg-emerald-500", stripe: "bg-emerald-500", icon: CircleCheck },
  failed:     { label: "Failed",     color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200",    dot: "bg-red-500",     stripe: "bg-red-500",     icon: CircleX },
};

const ALL_STATUSES: StatusKey[] = ["pending", "processing", "completed", "failed"];

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  bundle:             { label: "Data Bundle",        icon: Wifi,        color: "text-blue-600 bg-blue-50 border-blue-200" },
  afa_registration:   { label: "AFA Registration",   icon: UserCheck,   color: "text-purple-600 bg-purple-50 border-purple-200" },
  agent_registration: { label: "Agent Registration", icon: ShoppingBag, color: "text-pink-600 bg-pink-50 border-pink-200" },
};

const FILTER_STATUSES = ["all", "pending", "processing", "completed", "failed"] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toOrderRef(id: string) {
  const n = parseInt(id, 10);
  return isNaN(n) ? id : "GH-" + (n + 916132832).toString(36).toUpperCase().slice(-5);
}

function isLight(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

function CopyBtn({ value, children }: { value: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  return (
    <button onClick={copy} title="Copy" className="flex items-center gap-1 group/c transition-colors hover:text-gray-800">
      {children}
      {copied
        ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        : <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover/c:opacity-100 transition-opacity" />
      }
    </button>
  );
}

function StatusDropdown({
  current, orderId, isPending, onSelect,
}: {
  current: StatusKey;
  orderId: string;
  isPending: boolean;
  onSelect: (status: StatusKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[current];
  const Icon = meta.icon;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all disabled:opacity-60 select-none cursor-pointer hover:shadow-sm active:scale-95 ${meta.bg} ${meta.color} ${meta.border}`}
      >
        {isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Icon className="w-3.5 h-3.5" />
        }
        {meta.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-3 pb-1.5">
            Set status
          </p>
          {ALL_STATUSES.map(s => {
            const m = STATUS_META[s];
            const SIcon = m.icon;
            const isActive = s === current;
            return (
              <button
                key={s}
                disabled={isActive}
                onClick={() => { onSelect(s); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors text-left
                  ${isActive
                    ? `${m.bg} ${m.color} cursor-default`
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${m.bg} ${m.color}`}>
                  <SIcon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1">{m.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
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
      toast({ title: `Order updated to ${STATUS_META[vars.status as StatusKey]?.label ?? vars.status}` });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" }),
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
          const meta = s === "all" ? null : STATUS_META[s as StatusKey];
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
            {filter === "all" ? "No orders yet." : `No ${STATUS_META[filter as StatusKey]?.label.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const statusMeta = STATUS_META[order.status];
            const typeMeta   = TYPE_META[order.type] ?? TYPE_META.bundle;
            const TypeIcon   = typeMeta.icon;
            const details    = order.details ?? {};
            const isPending  = updateStatus.isPending && (updateStatus.variables as any)?.id === order.id;

            const netColor = details.networkColor ?? "#6366f1";
            const netLogo  = details.networkLogoUrl;
            const logoText = isLight(netColor) ? "text-gray-800" : "text-white";

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Network colour stripe */}
                <div className="h-1 w-full" style={{ backgroundColor: netColor }} />

                <div className="p-5 flex gap-4">

                  {/* ── Left: network logo + user avatar ── */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden"
                      style={{ backgroundColor: netColor }}
                    >
                      {netLogo
                        ? <img src={netLogo} alt={details.networkName ?? "network"} className="w-10 h-10 object-contain" />
                        : <Wifi className={`w-6 h-6 ${logoText}`} />
                      }
                    </div>
                    <UserAvatar name={order.user.name} size={28} className="ring-1 ring-white shadow" />
                  </div>

                  {/* ── Right: all details ── */}
                  <div className="flex-1 min-w-0">

                    {/* Row 1: user info + status dropdown */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{order.user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{order.user.email}</p>
                      </div>
                      <StatusDropdown
                        current={order.status as StatusKey}
                        orderId={order.id}
                        isPending={isPending}
                        onSelect={status => updateStatus.mutate({ id: order.id, status })}
                      />
                    </div>

                    {/* Row 2: bundle name + data size */}
                    {(details.networkName || details.bundleName) && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        {details.networkName && (
                          <span className="font-bold text-gray-800 text-sm">{details.networkName}</span>
                        )}
                        {details.networkName && details.bundleName && (
                          <span className="text-gray-300 text-sm">·</span>
                        )}
                        {details.bundleName && (
                          <span className="text-sm text-gray-700 font-medium">{details.bundleName}</span>
                        )}
                        {details.data && (
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                            {details.data}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Row 3: order type tag */}
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${typeMeta.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeMeta.label}
                      </span>
                    </div>

                    {/* Row 4: phone + date */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      {details.phoneNumber && (
                        <CopyBtn value={details.phoneNumber}>
                          <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {details.phoneNumber}
                          </span>
                        </CopyBtn>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    {/* Row 5: amount + order ref */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <span className="text-base font-black text-gray-900">GHS {order.amount.toFixed(2)}</span>
                      <CopyBtn value={toOrderRef(order.id)}>
                        <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">
                          {toOrderRef(order.id)}
                        </span>
                      </CopyBtn>
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
