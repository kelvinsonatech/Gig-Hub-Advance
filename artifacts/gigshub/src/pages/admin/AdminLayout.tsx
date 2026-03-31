import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  Wrench,
  LogOut,
  ShieldCheck,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import logoUrl from "@assets/logo.png";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bundles", label: "Data Bundles", icon: Package },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

const SidebarLink = ({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: any; active: boolean; onClick: () => void;
}) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
      active
        ? "bg-[#E91E8C] text-white shadow-sm"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
    }`}
    onClick={onClick}
  >
    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
    {label}
  </Link>
);

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
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <img src={logoUrl} alt="TurboGH" className="h-8 w-auto" />
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <SidebarLink
            key={href}
            href={href}
            label={label}
            icon={Icon}
            active={location === href}
            onClick={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      {/* Profile + logout at bottom */}
      <div className="px-3 pb-5 border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <UserAvatar name={user.name} size={40} className="ring-2 ring-white shadow-md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full bg-pink-50 text-[10px] font-semibold text-[#E91E8C] uppercase tracking-wide">
              <ShieldCheck className="w-2.5 h-2.5" /> Admin
            </span>
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate("/"); }}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors"
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
          w-64 md:w-60 bg-white border-r border-gray-100 flex flex-col
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
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <img src={logoUrl} alt="TurboGH" className="h-6 w-auto" />
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
