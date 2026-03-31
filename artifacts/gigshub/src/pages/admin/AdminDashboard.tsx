import { useQuery } from "@tanstack/react-query";
import { Package, Wrench, ShoppingBag, Users, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchStats() {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function fetchChartData() {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}/api/admin/chart-data`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch chart data");
  return res.json();
}

const statCards = [
  { key: "bundles", label: "Data Bundles", icon: Package, color: "bg-orange-500" },
  { key: "services", label: "Services", icon: Wrench, color: "bg-green-500" },
  { key: "orders", label: "Total Orders", icon: ShoppingBag, color: "bg-orange-500" },
  { key: "users", label: "Users", icon: Users, color: "bg-purple-500" },
];

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
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });
  const { data: chartData } = useQuery({ queryKey: ["admin-chart"], queryFn: fetchChartData });

  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  return (
    <div className="p-4 sm:p-8 space-y-6">

      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">Overview</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-0.5">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening on TurboGH today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
          <TrendingUp className="w-4 h-4 text-pink-500" />
          <span className="text-xs font-semibold text-pink-600">Live Data</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map(({ key, label, icon: Icon, color }) => (
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

      {/* Chart */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Orders & User Growth</h2>
            <p className="text-xs text-gray-400 mt-0.5">Monthly activity this year</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
              Orders
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
              Users
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData ?? []} barSize={10} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#fdf2f8", radius: 6 }} />
            <Bar dataKey="orders" name="Orders" fill="#EC4899" radius={[4, 4, 0, 0]} />
            <Bar dataKey="users" name="Users" fill="#c084fc" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick tips */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h2>
        <ul className="space-y-2 text-sm text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-pink-500 font-bold mt-0.5">•</span>
            Go to <strong className="text-gray-700">Data Bundles</strong> to add, edit or remove packages for each network.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-500 font-bold mt-0.5">•</span>
            Go to <strong className="text-gray-700">Services</strong> to manage AFA registration and other digital services.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-500 font-bold mt-0.5">•</span>
            Use <strong className="text-gray-700">Notifications</strong> to broadcast push messages to all users instantly.
          </li>
        </ul>
      </div>
    </div>
  );
}
