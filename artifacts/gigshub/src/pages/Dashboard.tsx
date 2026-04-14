import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useGetWallet, useGetOrders, useGetNetworks } from "@workspace/api-client-react";
import { formatGHS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Wifi, ShieldCheck, Plus, ArrowRight, Users, Eye, EyeOff,
  TrendingUp, Package, CheckCircle2, Clock, XCircle, ChevronRight, Phone,
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserAvatar, getAvatarSrc } from "@/components/ui/UserAvatar";

const ADMIN_AVATAR_URL = getAvatarSrc("mablequartey04@gmail.com", "adventurer");
import { FadeImage } from "@/components/ui/FadeImage";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "Completed", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-100", icon: Clock },
  processing: { label: "Processing", color: "text-orange-600 bg-orange-50 border-orange-100", icon: Clock },
  failed: { label: "Failed", color: "text-red-600 bg-red-50 border-red-100", icon: XCircle },
};

const quickActions = [
  {
    href: "/bundles",
    label: "Buy Data",
    sublabel: "MTN · AT · Telecel",
    icon: Wifi,
    gradient: "from-[#0077C7] to-[#0099FF]",
    shadow: "shadow-blue-200",
  },
  {
    href: "/orders",
    label: "Orders",
    sublabel: "View history",
    icon: Package,
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-purple-200",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: wallet, isLoading: isLoadingWallet } = useGetWallet();
  const { data: orders, isLoading: isLoadingOrders } = useGetOrders();
  const [balanceHidden, setBalanceHidden] = useState(false);

  const { data: networks } = useGetNetworks();
  const networkMap = (networks ?? []).reduce<Record<string, { logoUrl?: string; color: string }>>((acc, n) => {
    acc[n.name] = { logoUrl: n.logoUrl ?? undefined, color: n.color };
    return acc;
  }, {});

  useEffect(() => {
    (networks ?? []).forEach(n => {
      if (n.logoUrl) {
        const img = new Image();
        img.src = n.logoUrl;
      }
    });
  }, [networks]);

  const recentOrders = orders?.slice(0, 5) || [];
  const completedCount = orders?.filter(o => o.status === "completed").length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">

        {/* ── Greeting ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Good day,</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
              {user?.name?.split(" ")[0]} 👋
            </h1>
          </div>
          <div className="ring-2 ring-white shadow-lg shadow-orange-100 rounded-full overflow-hidden">
            {user?.role === "admin" ? (
              <img src={ADMIN_AVATAR_URL} alt={user?.name} className="w-[40px] h-[40px] rounded-full object-cover" />
            ) : (
              <UserAvatar name={user?.name} seed={user?.email} size={40} avatarStyle={user?.avatarStyle} />
            )}
          </div>
        </div>

        {/* ── Wallet Card ── */}
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-2xl isolate">
          {/* Background image — fetchPriority high so browser loads it immediately */}
          <img
            src={`${import.meta.env.BASE_URL}wallet-bg.jpg`}
            alt=""
            fetchPriority="high"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-orange-950/60" />
          {/* Orange glow orb */}
          <div className="absolute bottom-0 right-0 w-56 h-56 bg-primary/30 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm font-medium">TurboGH Wallet</span>
              </div>
              <button
                onClick={() => setBalanceHidden(v => !v)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="mb-5">
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">Available Balance</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {balanceHidden ? "GHS ••••••" : isLoadingWallet ? "GHS —" : formatGHS(wallet?.balance)}
              </h2>
              {user?.phone && (
                <p className="text-white/50 text-xs mt-1 font-mono">
                  {user.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}
                </p>
              )}
            </div>

            <div className="flex gap-2.5">
              <Button
                asChild
                className="flex-1 h-10 rounded-xl bg-white text-primary font-bold hover:bg-gray-50 shadow-lg border-0 text-sm"
              >
                <Link href="/wallet">
                  <Plus className="w-4 h-4 mr-1" /> Top Up
                </Link>
              </Button>
              <Button
                asChild
                className="flex-1 h-10 rounded-xl bg-white/15 text-white font-bold hover:bg-white/25 border border-white/20 shadow-none text-sm"
              >
                <Link href="/bundles">
                  <Wifi className="w-4 h-4 mr-1" /> Buy Data
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Orders</p>
            <p className="text-2xl font-extrabold text-gray-900">{orders?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All time</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-muted-foreground font-medium mb-1">Completed</p>
            <p className="text-2xl font-extrabold text-emerald-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Successful</p>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -2 }}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md ${action.shadow} flex items-center justify-center shrink-0`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight truncate">{action.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">{action.sublabel}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent Orders ── */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your last {recentOrders.length} purchases</p>
          </div>

          {isLoadingOrders ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 text-center shadow-sm">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No transactions yet</h3>
              <p className="text-muted-foreground text-sm mb-5">Make your first purchase to see it here.</p>
              <Button asChild className="rounded-2xl px-6">
                <Link href="/bundles">Buy Data Bundle</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order) => {
                const status = statusConfig[order.status] ?? statusConfig.pending;
                const StatusIcon = status.icon;
                const det = (order.details ?? {}) as Record<string, unknown>;
                const networkName = det.networkName as string | undefined;
                const bundleName = det.bundleName as string | undefined;
                const dataSize = det.data as string | undefined;
                const phoneNumber = det.phoneNumber as string | undefined;
                const net = networkName ? networkMap[networkName] : undefined;
                const netColor = net?.color ?? "#6366f1";
                const isBundle = order.type === "bundle";
                const timestamp = parseISO(order.createdAt);
                const timeLabel = isToday(timestamp)
                  ? format(timestamp, "h:mm a")
                  : format(timestamp, "MMM d · h:mm a");

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Network colour stripe */}
                    <div
                      className="h-0.5 w-full"
                      style={{ backgroundColor: isBundle ? netColor : "#f3f4f6" }}
                    />

                    <div className="flex items-center gap-3 px-3 py-3">
                      {/* Logo / icon */}
                      <div className="shrink-0">
                        {isBundle ? (
                          net?.logoUrl ? (
                            <FadeImage
                              src={net.logoUrl}
                              alt={networkName}
                              className="w-11 h-11 rounded-xl object-contain border border-gray-100 shadow-sm bg-white p-0.5"
                              fallback={
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                                  style={{ backgroundColor: netColor + "20" }}>
                                  <Wifi className="w-5 h-5" style={{ color: netColor }} />
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: netColor + "20" }}>
                              <Wifi className="w-5 h-5" style={{ color: netColor }} />
                            </div>
                          )
                        ) : (
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
                            order.type === "afa_registration" ? "bg-amber-50" : "bg-emerald-50"
                          }`}>
                            {order.type === "afa_registration"
                              ? <ShieldCheck className="w-5 h-5 text-amber-600" />
                              : <Users className="w-5 h-5 text-emerald-600" />
                            }
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                          {isBundle
                            ? (networkName && bundleName ? `${networkName} – ${bundleName}` : networkName ?? bundleName ?? "Data Bundle")
                            : order.type === "afa_registration" ? "AFA Registration" : "Agent Registration"
                          }
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {dataSize && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                              {dataSize}
                            </span>
                          )}
                          {phoneNumber && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium">
                              <Phone className="w-2.5 h-2.5" />{phoneNumber}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{timeLabel}
                          </span>
                        </div>
                      </div>

                      {/* Amount + status */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="font-extrabold text-gray-900 text-sm tabular-nums">{formatGHS(order.amount)}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <Link href="/orders">
                <div className="flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  View all orders <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
