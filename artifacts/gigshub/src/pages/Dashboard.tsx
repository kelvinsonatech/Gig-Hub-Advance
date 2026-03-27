import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useGetWallet, useGetOrders } from "@workspace/api-client-react";
import { formatGHS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Wifi, ShieldCheck, Plus, ArrowRight, Users, Eye, EyeOff,
  TrendingUp, Package, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { motion } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: "Completed", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-100", icon: Clock },
  processing: { label: "Processing", color: "text-blue-600 bg-blue-50 border-blue-100", icon: Clock },
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
    href: "/afa-registration",
    label: "AFA Reg",
    sublabel: "Ghana Card",
    icon: ShieldCheck,
    gradient: "from-amber-400 to-orange-400",
    shadow: "shadow-orange-200",
  },
  {
    href: "/agent-registration",
    label: "Agent Reg",
    sublabel: "Earn commissions",
    icon: Users,
    gradient: "from-emerald-400 to-teal-500",
    shadow: "shadow-emerald-200",
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

  const recentOrders = orders?.slice(0, 5) || [];
  const completedCount = orders?.filter(o => o.status === "completed").length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Greeting ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Good day,</p>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              {user?.name?.split(" ")[0]} 👋
            </h1>
          </div>
          <div className="ring-2 ring-white shadow-lg shadow-blue-100 rounded-full">
            <UserAvatar name={user?.name} size={44} />
          </div>
        </div>

        {/* ── Wallet Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0077C7] via-[#0088e0] to-[#00AAFF] p-6 text-white shadow-2xl shadow-blue-300/40"
        >
          {/* decorative circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-black/10" />
          <div className="absolute top-4 right-20 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm font-medium">GigsHub Wallet</span>
              </div>
              <button
                onClick={() => setBalanceHidden(v => !v)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="mb-6">
              <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1">Available Balance</p>
              {isLoadingWallet ? (
                <div className="h-10 w-44 bg-white/20 animate-pulse rounded-xl" />
              ) : (
                <h2 className="text-4xl font-extrabold tracking-tight">
                  {balanceHidden ? "GHS ••••••" : formatGHS(wallet?.balance)}
                </h2>
              )}
              {user?.phone && (
                <p className="text-white/50 text-sm mt-1 font-mono">
                  {user.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                asChild
                className="flex-1 h-11 rounded-2xl bg-white text-[#0077C7] font-bold hover:bg-gray-50 shadow-lg border-0 text-sm"
              >
                <Link href="/wallet">
                  <Plus className="w-4 h-4 mr-1.5" /> Top Up
                </Link>
              </Button>
              <Button
                asChild
                className="flex-1 h-11 rounded-2xl bg-white/15 text-white font-bold hover:bg-white/25 border border-white/20 shadow-none text-sm"
              >
                <Link href="/bundles">
                  <Wifi className="w-4 h-4 mr-1.5" /> Buy Data
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

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
          <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ y: -3 }}
                  className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg ${action.shadow} flex items-center justify-center mb-3`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{action.sublabel}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
            <Link href="/orders" className="text-sm font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingOrders ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">No transactions yet</h3>
              <p className="text-muted-foreground text-sm mb-5">Make your first purchase to see it here.</p>
              <Button asChild className="rounded-2xl px-6">
                <Link href="/bundles">Buy Data Bundle</Link>
              </Button>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm divide-y divide-gray-50">
              {recentOrders.map((order) => {
                const status = statusConfig[order.status] ?? statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      order.type === "bundle"
                        ? "bg-blue-50"
                        : order.type === "afa"
                        ? "bg-amber-50"
                        : "bg-emerald-50"
                    }`}>
                      {order.type === "bundle" ? (
                        <Wifi className="w-5 h-5 text-primary" />
                      ) : order.type === "afa" ? (
                        <ShieldCheck className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Users className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm capitalize leading-tight">
                        {order.type === "bundle" ? "Data Bundle" : order.type === "afa" ? "AFA Registration" : "Agent Registration"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>

                    {/* Amount + status */}
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-gray-900 text-sm">{formatGHS(order.amount)}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
