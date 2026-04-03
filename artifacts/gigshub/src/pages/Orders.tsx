import { useState } from "react";
import type { ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetOrders, useGetNetworks } from "@workspace/api-client-react";
import { formatGHS } from "@/lib/utils";
import {
  History, ShieldCheck, Wifi, UserPlus, Package,
  Copy, Check, Phone, Clock
} from "lucide-react";
import { format } from "date-fns";

type OrderDetails = {
  phoneNumber?: string;
  bundleName?: string;
  data?: string;
  validity?: string;
  networkName?: string;
  networkId?: string;
  paymentMethod?: string;
  [key: string]: unknown;
};

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  pending:    { label: "Pending",    dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { label: "Processing", dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  completed:  { label: "Delivered",  dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed:     { label: "Failed",     dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200" },
};

// Convert numeric order ID → short alphanumeric reference (e.g. 2 → "GH-2A3K5")
function toOrderRef(id: string): string {
  const num = parseInt(id, 10);
  if (isNaN(num)) return id.slice(0, 8).toUpperCase();
  // Add large offset so even ID=1 gives a 5-char base-36 string, then prefix
  const code = (num + 916132832).toString(36).toUpperCase().slice(-5);
  return `GH-${code}`;
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const ref = toOrderRef(id);
  const copy = () => {
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors group/copy"
      title="Copy order reference"
    >
      <span className="tracking-widest">{ref}</span>
      {copied
        ? <Check className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
      }
    </button>
  );
}

function CopyText({ value, children }: { value: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors group/cp"
      title="Copy"
    >
      {children}
      {copied
        ? <Check className="w-3 h-3 text-emerald-500 ml-0.5" />
        : <Copy className="w-3 h-3 ml-0.5 opacity-0 group-hover/cp:opacity-100 transition-opacity" />
      }
    </button>
  );
}

export default function Orders() {
  const { data: orders, isLoading } = useGetOrders();
  const { data: networks } = useGetNetworks();

  const networkMap = (networks ?? []).reduce<Record<string, { logoUrl?: string; color: string }>>((acc, n) => {
    acc[n.name] = { logoUrl: n.logoUrl ?? undefined, color: n.color };
    return acc;
  }, {});

  function getOrderTitle(type: string, details: OrderDetails): string {
    if (type === "bundle") {
      const parts = [details.networkName, details.bundleName ?? details.data].filter(Boolean);
      return parts.length > 0 ? parts.join(" – ") : "Data Bundle";
    }
    if (type === "afa_registration") return "AFA Registration";
    if (type === "agent_registration") return "Agent Registration";
    return "Order";
  }

  function getSubtitle(type: string, details: OrderDetails): string | null {
    if (details.data && details.validity) return `${details.data} • Valid ${details.validity}`;
    if (details.data) return details.data;
    return null;
  }

  function NetworkLogo({ networkName, size = 40 }: { networkName?: string; size?: number }) {
    const net = networkName ? networkMap[networkName] : undefined;
    if (net?.logoUrl) {
      return (
        <img
          src={net.logoUrl}
          alt={networkName}
          style={{ width: size, height: size }}
          className="rounded-xl object-contain bg-white border border-gray-100 p-0.5 shadow-sm"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      );
    }
    const color = net?.color ?? "#6366f1";
    return (
      <div
        style={{ width: size, height: size, backgroundColor: color + "20", color }}
        className="rounded-xl flex items-center justify-center border border-gray-100 shadow-sm"
      >
        <Wifi className="w-5 h-5" />
      </div>
    );
  }

  function ServiceIcon({ type }: { type: string }) {
    const icons: Record<string, { icon: any; color: string; bg: string }> = {
      afa_registration:   { icon: ShieldCheck, color: "text-purple-600", bg: "bg-purple-50 border-purple-100" },
      agent_registration: { icon: UserPlus,    color: "text-pink-600",   bg: "bg-pink-50 border-pink-100" },
    };
    const meta = icons[type] ?? { icon: Package, color: "text-gray-500", bg: "bg-gray-50 border-gray-100" };
    const Icon = meta.icon;
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${meta.bg}`}>
        <Icon className={`w-5 h-5 ${meta.color}`} />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-primary" /> Order History
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Track all your purchases and registrations.</p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No orders yet.</p>
            <p className="text-gray-300 text-xs mt-1">Your purchases will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const details = (order.details ?? {}) as OrderDetails;
              const status = STATUS_META[order.status] ?? STATUS_META.pending;
              const title = getOrderTitle(order.type, details);
              const subtitle = getSubtitle(order.type, details);
              const isBundle = order.type === "bundle";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Colored status stripe */}
                  <div className={`h-0.5 w-full ${status.dot}`} />

                  <div className="p-4 flex items-start gap-4">
                    {/* Logo / Icon */}
                    <div className="shrink-0 mt-0.5">
                      {isBundle
                        ? <NetworkLogo networkName={details.networkName} />
                        : <ServiceIcon type={order.type} />
                      }
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: title + amount */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{title}</p>
                          {subtitle && (
                            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                          )}
                        </div>
                        <span className="font-black text-gray-900 text-base shrink-0 ml-2">
                          {formatGHS(order.amount)}
                        </span>
                      </div>

                      {/* Middle row: phone + date */}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {details.phoneNumber && (
                          <CopyText value={details.phoneNumber}>
                            <Phone className="w-3 h-3" />
                            {details.phoneNumber}
                          </CopyText>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}
                        </span>
                      </div>

                      {/* Bottom row: status + order ID */}
                      <div className="flex items-center justify-between mt-2.5 gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${status.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Order ID</span>
                          <span className="w-px h-3 bg-gray-200" />
                          <CopyId id={order.id} />
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
    </DashboardLayout>
  );
}
