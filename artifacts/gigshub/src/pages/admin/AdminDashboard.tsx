import { useQuery } from "@tanstack/react-query";
import {
  Package, Wrench, ShoppingBag, Users, TrendingUp, CalendarDays,
  DollarSign, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/api";

const token = () => localStorage.getItem("gigshub_token");
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

async function fetchStats() {
  const res = await fetch(`${API}/api/admin/stats`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function fetchChartData() {
  const res = await fetch(`${API}/api/admin/chart-data`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch chart data");
  return res.json();
}

async function fetchSalesStats() {
  const res = await fetch(`${API}/api/admin/sales-stats`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch sales stats");
  return res.json();
}

function formatGHS(amount: number) {
  return `GH₵ ${amount.toFixed(2)}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  processing: "bg-yellow-100 text-yellow-700",
  pending: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-700",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="capitalize">
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading, isError: statsError } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });
  const { data: chartData, isError: chartError } = useQuery({ queryKey: ["admin-chart"], queryFn: fetchChartData });
  const { data: sales, isLoading: salesLoading, isError: salesError } = useQuery({
    queryKey: ["admin-sales-stats"],
    queryFn: fetchSalesStats,
    refetchInterval: 60000,
  });

  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  const todayVsYesterday = sales
    ? sales.yesterday.revenue > 0
      ? ((sales.today.revenue - sales.yesterday.revenue) / sales.yesterday.revenue) * 100
      : sales.today.revenue > 0 ? 100 : 0
    : 0;

  const hasError = statsError || chartError || salesError;

  return (
    <div className="p-4 sm:p-8 space-y-6">

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Some dashboard data failed to load. Numbers may be incomplete — try refreshing.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">Overview</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening on TurboGH today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
          <TrendingUp className="w-4 h-4 text-[#E91E8C]" />
          <span className="text-xs font-semibold text-[#E91E8C]">Live Data</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { key: "bundles", label: "Data Bundles", icon: Package, color: "bg-orange-500" },
          { key: "services", label: "Services", icon: Wrench, color: "bg-green-500" },
          { key: "orders", label: "Total Orders", icon: ShoppingBag, color: "bg-[#E91E8C]" },
          { key: "users", label: "Users", icon: Users, color: "bg-purple-500" },
        ].map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {isLoading ? "—" : (stats?.[key] ?? 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-[#E91E8C] to-[#d6187f] rounded-2xl p-5 sm:p-6 text-white shadow-md col-span-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-pink-100">Today's Revenue</p>
            <DollarSign className="w-5 h-5 text-pink-200" />
          </div>
          <p className="text-3xl sm:text-4xl font-bold mt-2">
            {salesLoading ? "—" : formatGHS(sales?.today?.revenue ?? 0)}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm font-semibold text-pink-100">
              {salesLoading ? "—" : `${sales?.today?.count ?? 0} orders`}
            </span>
            {!salesLoading && sales && (
              <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${todayVsYesterday >= 0 ? "bg-white/20 text-white" : "bg-red-200/30 text-red-100"}`}>
                {todayVsYesterday >= 0
                  ? <ArrowUpRight className="w-3 h-3" />
                  : <ArrowDownRight className="w-3 h-3" />
                }
                {Math.abs(todayVsYesterday).toFixed(0)}% vs yesterday
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-400">Yesterday</p>
            <CalendarDays className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {salesLoading ? "—" : formatGHS(sales?.yesterday?.revenue ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {salesLoading ? "—" : `${sales?.yesterday?.count ?? 0} orders`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-xs font-medium text-gray-400">Pending</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {salesLoading ? "—" : (sales?.pendingCount ?? 0)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-xs font-medium text-gray-400">Failed Today</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {salesLoading ? "—" : (sales?.failedTodayCount ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "This Week", data: sales?.thisWeek },
          { label: "This Month", data: sales?.thisMonth },
          { label: "All Time Revenue", data: sales?.allTime },
          { label: "All Time Orders", data: sales?.allTime, showCount: true },
        ].map(({ label, data, showCount }) => (
          <div key={label} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {salesLoading ? "—" : showCount ? (data?.count ?? 0) : formatGHS(data?.revenue ?? 0)}
            </p>
            {!showCount && (
              <p className="text-xs text-gray-400 mt-0.5">
                {salesLoading ? "" : `${data?.count ?? 0} orders`}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Orders & User Growth</h2>
              <p className="text-xs text-gray-400 mt-0.5">Monthly activity this year</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E91E8C] inline-block" />
                Orders
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                Users
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData ?? []} barSize={4} barGap={2} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fdf2f8" }} />
              <Bar dataKey="orders" name="Orders" fill="#E91E8C" radius={[4, 4, 0, 0]} />
              <Bar dataKey="users" name="Users" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-1">Recent Orders</h2>
          <p className="text-xs text-gray-400 mb-4">Latest 10 transactions</p>
          {salesLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {(sales?.recentOrders ?? []).map((order: any) => {
                const details = order.details as any;
                return (
                  <div key={order.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {details?.bundleName || details?.serviceName || order.type}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {order.userName ?? "Unknown"} · {details?.phoneNumber ?? ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatGHS(order.amount)}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {order.status}
                        </span>
                        <span className="text-[10px] text-gray-400">{timeAgo(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(sales?.recentOrders ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No orders yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h2>
        <ul className="space-y-2 text-sm text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-[#E91E8C] font-bold mt-0.5">•</span>
            Go to <strong className="text-gray-700">Data Bundles</strong> to add, edit or remove packages for each network.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#E91E8C] font-bold mt-0.5">•</span>
            Go to <strong className="text-gray-700">Services</strong> to manage AFA registration and other digital services.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#E91E8C] font-bold mt-0.5">•</span>
            Use <strong className="text-gray-700">Notifications</strong> to broadcast push messages to all users instantly.
          </li>
        </ul>
      </div>
    </div>
  );
}
