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
import { useAdminOrdersStream } from "@/hooks/use-admin-orders-stream";

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
type ClearResult = { cleared: number; usersAffected: number; totalValue: number };
type TimeRange   = "today" | "yesterday" | "7days" | "30days" | "all";

const TIME_RANGES: { id: TimeRange; label: string; sub: string }[] = [
  { id: "today",     label: "Today",         sub: "Orders delivered today" },
  { id: "yesterday", label: "Yesterday",     sub: "Orders delivered yesterday" },
  { id: "7days",     label: "Past 7 days",   sub: "Last week of deliveries" },
  { id: "30days",    label: "Past 30 days",  sub: "Last month of deliveries" },
  { id: "all",       label: "All time",      sub: "Every delivered order in the panel" },
];

function countInRange(orders: Order[], range: TimeRange): number {
  const delivered = orders.filter(o => o.status === "completed");
  const now = new Date();
  const todayStart     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const sevenDaysAgo   = new Date(todayStart.getTime() - 7  * 86_400_000);
  const thirtyDaysAgo  = new Date(todayStart.getTime() - 30 * 86_400_000);

  return delivered.filter(o => {
    const d = new Date(o.createdAt);
    switch (range) {
      case "today":     return d >= todayStart;
      case "yesterday": return d >= yesterdayStart && d < todayStart;
      case "7days":     return d >= sevenDaysAgo;
      case "30days":    return d >= thirtyDaysAgo;
      case "all":       return true;
    }
  }).length;
}

function ClearDeliveredModal({
  orders,
  onClose,
  onSuccess,
}: {
  orders: Order[];
  onClose: () => void;
  onSuccess: (result: ClearResult) => void;
}) {
  const [range, setRange]   = useState<TimeRange>("7days");
  const [phase, setPhase]   = useState<"pick" | "confirm" | "clearing" | "done">("pick");
  const [result, setResult] = useState<ClearResult | null>(null);

  const rangeCount = countInRange(orders, range);

  async function handleClear() {
    setPhase("clearing");
    try {
      const token = localStorage.getItem("gigshub_token");
      const res = await fetch(`${API}/api/admin/orders/completed?range=${range}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setResult(data);
      setPhase("done");
      setTimeout(() => onSuccess(data), 2000);
    } catch (err: any) {
      setPhase("confirm");
      alert(err.message);
    }
  }

  // Close on backdrop click (only in pick/confirm phase)
  const backdropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === "clearing" || phase === "done") return;
    const handler = (e: MouseEvent) => {
      if (backdropRef.current === e.target) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, phase]);

  const selectedMeta = TIME_RANGES.find(r => r.id === range)!;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ══ STEP 1: Time range picker ══ */}
        {(phase === "pick" || phase === "confirm") && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-4.5 h-4.5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Clear Storage</h2>
                  <p className="text-[11px] text-gray-400">Admin panel only · users keep their history</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Time range label */}
            <div className="px-6 pt-5 pb-2">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Time range</p>
              <div className="flex flex-col gap-1">
                {TIME_RANGES.map(({ id, label, sub }) => {
                  const n = countInRange(orders, id);
                  const active = range === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { setRange(id); if (phase === "confirm") setPhase("pick"); }}
                      className={`group flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left transition-all
                        ${active
                          ? "bg-red-50 border-2 border-red-200"
                          : "border-2 border-transparent hover:bg-gray-50"
                        }`}
                    >
                      {/* Custom radio */}
                      <span className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${active ? "border-red-500 bg-red-500" : "border-gray-300 group-hover:border-gray-400"}`}
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold leading-tight ${active ? "text-red-700" : "text-gray-700"}`}>{label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                      </div>

                      {/* Count badge */}
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 transition-colors
                        ${active
                          ? n > 0 ? "bg-red-500 text-white" : "bg-red-100 text-red-400"
                          : n > 0 ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-300"
                        }`}
                      >
                        {n} order{n !== 1 ? "s" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info strip */}
            <div className="mx-6 my-4 flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <CircleCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-600 leading-relaxed">
                Archived orders are <strong>hidden from this panel only</strong>. Customers can still view their full order history in their account.
              </p>
            </div>

            {/* ── Confirm sub-section ── */}
            {phase === "confirm" && (
              <div className="mx-6 mb-2 p-4 rounded-2xl bg-red-50 border-2 border-red-200">
                <p className="text-xs font-bold text-red-700 mb-1">
                  This will archive <strong>{rangeCount}</strong> delivered order{rangeCount !== 1 ? "s" : ""} ({selectedMeta.label.toLowerCase()}) from the panel.
                </p>
                <p className="text-[11px] text-red-500">Customers keep their data. This cannot be undone.</p>
              </div>
            )}

            {/* Actions */}
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {phase === "pick" ? (
                <button
                  onClick={() => setPhase("confirm")}
                  disabled={rangeCount === 0}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed
                    bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95
                    shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                >
                  Review →
                </button>
              ) : (
                <button
                  onClick={handleClear}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all
                    bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95
                    shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear {rangeCount} order{rangeCount !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </>
        )}

        {/* ══ STEP 2: Clearing in progress ══ */}
        {phase === "clearing" && (
          <div className="px-8 py-16 flex flex-col items-center text-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-red-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-red-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1">Clearing storage…</h3>
            <p className="text-sm text-gray-400">Archiving {rangeCount} delivered order{rangeCount !== 1 ? "s" : ""}</p>
          </div>
        )}

        {/* ══ STEP 3: Done ══ */}
        {phase === "done" && result && (
          <div className="px-8 py-12 flex flex-col items-center text-center">
            {/* Animated checkmark */}
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-50" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-9 h-9 text-emerald-500 stroke-[2.5]" />
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-1">Storage Cleared</h3>
            <p className="text-sm text-gray-400 mb-2">
              Archived <strong className="text-gray-600">{selectedMeta.label.toLowerCase()}</strong>
            </p>
            <p className="text-[11px] text-blue-500 mb-8 bg-blue-50 rounded-full px-3 py-1">
              Customer order history is untouched
            </p>

            <div className="w-full grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-4">
                <p className="text-2xl font-black text-emerald-600">{result.cleared}</p>
                <p className="text-[10px] text-emerald-600/70 font-semibold uppercase tracking-wide mt-0.5">Archived</p>
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

  // SSE hook gives instant push updates; polling is just a fallback
  useAdminOrdersStream();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: () => apiFetch("/orders"),
    refetchInterval: 60_000,
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
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage and track all customer orders</p>
        </div>

        {/* Clear delivered button — text hidden on mobile, icon + badge only */}
        <button
          onClick={() => setClearOpen(true)}
          disabled={deliveredCount === 0}
          title={deliveredCount === 0 ? "No delivered orders to clear" : `Clear ${deliveredCount} delivered order${deliveredCount !== 1 ? "s" : ""}`}
          className={`group relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0
            ${deliveredCount > 0
              ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
        >
          {deliveredCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
          <Trash2 className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Clear Storage</span>
          {deliveredCount > 0 && (
            <span className="bg-white/20 text-white text-[11px] font-black px-1.5 py-0.5 rounded-full">
              {deliveredCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter tabs — horizontally scrollable on mobile */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {FILTER_STATUSES.map(s => {
          const meta = s === "all" ? null : STATUS_META[s as StatusKey];
          const isActive = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all shrink-0 ${
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
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            {filter === "all" ? "No orders yet." : `No ${STATUS_META[filter as StatusKey]?.label.toLowerCase()} orders.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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

                <div className="p-3 sm:p-5 flex gap-3 sm:gap-4">

                  {/* ── Left: network logo + user avatar ── */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div
                      className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden"
                      style={{ backgroundColor: netColor }}
                    >
                      {netLogo
                        ? <img src={netLogo} alt={details.networkName ?? "network"} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                        : <Wifi className={`w-5 h-5 sm:w-6 sm:h-6 ${logoText}`} />
                      }
                    </div>
                    <UserAvatar name={order.user.name} seed={order.user.email} size={26} className="ring-1 ring-white shadow" />
                  </div>

                  {/* ── Right: all details ── */}
                  <div className="flex-1 min-w-0">

                    {/* Row 1: user info + status dropdown */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{order.user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{order.user.email}</p>
                      </div>
                      <div className="shrink-0">
                        <StatusDropdown
                          current={order.status as StatusKey}
                          isPending={isPending}
                          onSelect={status => updateStatus.mutate({ id: order.id, status })}
                        />
                      </div>
                    </div>

                    {/* Row 2: bundle name + data size */}
                    {(details.networkName || details.bundleName) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        {details.networkName && (
                          <span className="font-bold text-gray-800 text-xs sm:text-sm">{details.networkName}</span>
                        )}
                        {details.networkName && details.bundleName && (
                          <span className="text-gray-300 text-xs sm:text-sm">·</span>
                        )}
                        {details.bundleName && (
                          <span className="text-xs sm:text-sm text-gray-700 font-medium">{details.bundleName}</span>
                        )}
                        {details.data && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                            {details.data}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Row 3: order type tag */}
                    <div className="mt-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${typeMeta.color}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeMeta.label}
                      </span>
                    </div>

                    {/* Row 4: phone + date — stack on very narrow, row on wider */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {details.phoneNumber && (
                        <CopyBtn value={details.phoneNumber}>
                          <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5">
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
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-gray-900">GHS {order.amount.toFixed(2)}</span>
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
          orders={orders}
          onClose={() => setClearOpen(false)}
          onSuccess={(result) => {
            setClearOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-orders"] });
            toast({
              title: `Storage cleared — ${result.cleared} order${result.cleared !== 1 ? "s" : ""} archived`,
              description: `${result.usersAffected} client${result.usersAffected !== 1 ? "s" : ""} affected · GHS ${result.totalValue.toFixed(2)} total volume`,
            });
          }}
        />
      )}
    </div>
  );
}
