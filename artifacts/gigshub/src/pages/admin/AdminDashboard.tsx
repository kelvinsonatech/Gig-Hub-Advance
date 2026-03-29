import { useQuery } from "@tanstack/react-query";
import { Package, Wrench, ShoppingBag, Users } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchStats() {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

const statCards = [
  { key: "bundles", label: "Data Bundles", icon: Package, color: "bg-blue-500" },
  { key: "services", label: "Services", icon: Wrench, color: "bg-green-500" },
  { key: "orders", label: "Total Orders", icon: ShoppingBag, color: "bg-orange-500" },
  { key: "users", label: "Users", icon: Users, color: "bg-purple-500" },
];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your GigsHub platform</p>
      </div>

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

      <div className="mt-10 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Quick Tips</h2>
        <ul className="space-y-2 text-sm text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-[#0077C7] font-bold mt-0.5">•</span>
            Go to <strong className="text-gray-700">Data Bundles</strong> to add, edit or remove packages for each network.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#0077C7] font-bold mt-0.5">•</span>
            Go to <strong className="text-gray-700">Services</strong> to manage AFA registration and other digital services.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#0077C7] font-bold mt-0.5">•</span>
            Changes take effect immediately on the site.
          </li>
        </ul>
      </div>
    </div>
  );
}
