import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ShoppingBag, Clock, Wifi, Package, UserCheck,
  Copy, Check, Phone, ChevronDown,
  CircleDot, CircleCheck, CircleX, Timer,
  Trash2, AlertTriangle, X,
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

const ALL_STATUSES: StatusKey[] = ["pending", "processing", "completed"];

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
  current, isPending, onSelect,
}: {
  current: StatusKey;
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
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all disabled:opacity-60 select-none hover:shadow-md active:scale-95 ${meta.bg} ${meta.color} ${meta.border}`}
      >
        {isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Icon className="w-3.5 h-3.5" />
        }
        {meta.label}
        <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2.5 z-50 w-52 bg-white rounded-2xl border border-gray-100 shadow-2xl">
          {/* Header */}
          <div className="px-4 pt-3.5 pb-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update Status</p>
          </div>

          <div className="px-2 pb-2 flex flex-col gap-0.5">
            {ALL_STATUSES.map(s => {
              const m = STATUS_META[s];
              const SIcon = m.icon;
              const isActive = s === current;
              return (
                <button
                  key={s}
                  disabled={isActive}
                  onClick={() => { onSelect(s); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left group
                    ${isActive
                      ? `${m.bg} ${m.color} cursor-default`
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                >
                  {/* Icon bubble */}
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${isActive ? `${m.bg} ${m.color}` : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"}`}
                  >
                    <SIcon className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 leading-none">{m.label}</span>
                  {isActive
                    ? <span className={`w-5 h-5 rounded-full flex items-center justify-center ${m.bg} ${m.color}`}>
                        <Check className="w-3 h-3" />
                      </span>
                    : <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-0 group-hover:opacity-40 transition-opacity" />
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clear Delivered Modal ───────────────────────────────────────────────────
type ClearResult = { deleted: number; usersAffected: number; totalValue: number };

function ClearDeliveredModal({
  deliveredCount,
  onClose,
  onSuccess,
}: {
  deliveredCount: number;
  onClose: () => void;
  onSuccess: (result: ClearResult) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [phase, setPhase] = useState<"confirm" | "deleting" | "done">("confirm");
  const [result, setResult] = useState<ClearResult | null>(null);

  const canConfirm = confirmText === "CLEAR";

  async function handleClear() {
    setPhase("deleting");
    try {
      const token = localStorage.getItem("gigshub_token");
      const res = await fetch(`${API}/api/admin/orders/completed`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setResult(data);
      setPhase("done");
      setTimeout(() => onSuccess(data), 1800);
    } catch (err: any) {
      setPhase("confirm");
      alert(err.message);
    }
  }

  // Close on outside click
  const backdropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (backdropRef.current === e.target) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Confirm phase ── */}
        {phase !== "done" && (
          <>
            {/* Header stripe */}
            <div className="relative bg-gradient-to-br from-red-500 to-rose-600 px-6 pt-8 pb-10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Animated icon */}
              <div className="relative flex items-center justify-center mb-4">
                <div className="absolute w-20 h-20 rounded-full bg-white/10 animate-ping" />
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <Trash2 className="w-8 h-8 text-white" />
                </div>
              </div>

              <h2 className="text-center text-xl font-black text-white">Clear Delivered Orders</h2>
              <p className="text-center text-sm text-red-100 mt-1">This action is permanent and cannot be undone.</p>
            </div>

            {/* Stats cards */}
            <div className="px-6 -mt-5 grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <CircleCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-0.5">Delivered</p>
                  <p className="text-xl font-black text-gray-900 leading-none">{deliveredCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-0.5">Will Delete</p>
                  <p className="text-xl font-black text-red-600 leading-none">{deliveredCount}</p>
                </div>
              </div>
            </div>

            {/* Warning banner */}
            <div className="mx-6 mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                All <strong>{deliveredCount}</strong> delivered order{deliveredCount !== 1 ? "s" : ""} will be permanently removed from the database. Client purchase history for these orders will be lost.
              </p>
            </div>

            {/* Confirmation input */}
            <div className="mx-6 mb-6">
              <p className="text-xs text-gray-500 font-semibold mb-2">
                Type <span className="font-black text-gray-900 tracking-widest">CLEAR</span> to confirm
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Type CLEAR"
                autoFocus
                disabled={phase === "deleting"}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-400 outline-none text-sm font-mono font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-300 transition-colors"
              />
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={phase === "deleting"}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={!canConfirm || phase === "deleting"}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95 shadow-lg shadow-red-200
                  flex items-center justify-center gap-2"
              >
                {phase === "deleting"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Clearing…</>
                  : <><Trash2 className="w-4 h-4" /> Clear Storage</>
                }
              </button>
            </div>
          </>
        )}

        {/* ── Done phase ── */}
        {phase === "done" && result && (
          <div className="px-8 py-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5 shadow-inner">
              <Check className="w-10 h-10 text-emerald-500 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Storage Cleared</h3>
            <p className="text-sm text-gray-400 mb-8">Delivered orders have been permanently removed.</p>

            <div className="w-full grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-4">
                <p className="text-2xl font-black text-emerald-600">{result.deleted}</p>
                <p className="text-[10px] text-emerald-600/70 font-semibold uppercase tracking-wide mt-0.5">Cleared</p>
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-100 px-3 py-4">
                <p className="text-2xl font-black text-blue-600">{result.usersAffected}</p>
                <p className="text-[10px] text-blue-600/70 font-semibold uppercase tracking-wide mt-0.5">Clients</p>
              </div>
              <div className="rounded-2xl bg-purple-50 border border-purple-100 px-3 py-4">
                <p className="text-lg font-black text-purple-600">{result.totalValue.toFixed(0)}</p>
                <p className="text-[10px] text-purple-600/70 font-semibold uppercase tracking-wide mt-0.5">GHS Vol.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [clearOpen, setClearOpen] = useState(false);

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

  const deliveredCount = orders.filter(o => o.status === "completed").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage and track all customer orders</p>
        </div>

        {/* Clear delivered button */}
        <button
          onClick={() => setClearOpen(true)}
          disabled={deliveredCount === 0}
          title={deliveredCount === 0 ? "No delivered orders to clear" : `Clear ${deliveredCount} delivered order${deliveredCount !== 1 ? "s" : ""}`}
          className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0
            ${deliveredCount > 0
              ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
        >
          {/* Pulse ring when there are delivered orders */}
          {deliveredCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
          <Trash2 className="w-4 h-4" />
          <span>Clear Storage</span>
          {deliveredCount > 0 && (
            <span className="ml-0.5 bg-white/20 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full">
              {deliveredCount}
            </span>
          )}
        </button>
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
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                {/* Network colour stripe */}
                <div className="h-1 w-full rounded-t-2xl" style={{ backgroundColor: netColor }} />

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
                    <UserAvatar name={order.user.name} seed={order.user.email} size={28} className="ring-1 ring-white shadow" />
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

      {/* Clear delivered modal */}
      {clearOpen && (
        <ClearDeliveredModal
          deliveredCount={deliveredCount}
          onClose={() => setClearOpen(false)}
          onSuccess={(result) => {
            setClearOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-orders"] });
            toast({
              title: `Storage cleared — ${result.deleted} order${result.deleted !== 1 ? "s" : ""} removed`,
              description: `${result.usersAffected} client${result.usersAffected !== 1 ? "s" : ""} affected · GHS ${result.totalValue.toFixed(2)} total volume`,
            });
          }}
        />
      )}
    </div>
  );
}
