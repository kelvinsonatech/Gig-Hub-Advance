import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  Wrench,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bundles", label: "Data Bundles", icon: Package },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 font-medium">Admin access required</p>
          <Button variant="outline" onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0077C7] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">TurboGH</p>
              <p className="text-[10px] text-[#0077C7] font-semibold uppercase tracking-wide">Admin Panel</p>
            </div>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#0077C7] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile card at bottom */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <UserAvatar name={user.name} size={44} className="ring-2 ring-white shadow-md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full bg-[#0077C7]/10 text-[10px] font-semibold text-[#0077C7] uppercase tracking-wide">
              <ShieldCheck className="w-2.5 h-2.5" /> Admin
            </span>
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate("/"); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 md:w-60 bg-white border-r border-gray-100 flex flex-col shadow-sm
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg bg-[#0077C7] flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Admin Panel</span>
          </div>

          <button
            onClick={() => setSidebarOpen(true)}
            className="shrink-0"
            aria-label="Open menu"
          >
            <UserAvatar name={user.name} size={32} className="ring-2 ring-white shadow-md" />
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
