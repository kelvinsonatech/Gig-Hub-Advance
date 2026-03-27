import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Wifi,
  CreditCard,
  History,
  UserPlus,
  ShieldCheck,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import { Redirect } from "wouter";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isLoading && !isAuthenticated) {
    return <Redirect to="/login" />;
  }

  const SidebarLink = ({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) => {
    const [isActive] = useRoute(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group",
          isActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
        )}
      >
        <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
        {children}
      </Link>
    );
  };

  const BottomNavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const [isActive] = useRoute(href);
    return (
      <Link
        href={href}
        className="flex flex-col items-center gap-1 flex-1 py-2 relative"
        onClick={() => setMoreOpen(false)}
      >
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
          isActive ? "bg-primary shadow-md shadow-primary/30" : "bg-transparent"
        )}>
          <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-400")} />
        </div>
        <span className={cn("text-[10px] font-semibold leading-none", isActive ? "text-primary" : "text-gray-400")}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl flex flex-col md:flex-row gap-8 min-h-[calc(100vh-4rem)] pb-24 md:pb-8">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block md:w-64 shrink-0 space-y-6">
          <nav className="space-y-2">
            <SidebarLink href="/dashboard" icon={LayoutDashboard}>Overview</SidebarLink>
            <SidebarLink href="/bundles" icon={Wifi}>Buy Data</SidebarLink>
            <SidebarLink href="/wallet" icon={CreditCard}>Wallet & Top-up</SidebarLink>
            <SidebarLink href="/orders" icon={History}>Order History</SidebarLink>
            <SidebarLink href="/afa-registration" icon={ShieldCheck}>AFA Registration</SidebarLink>
            <SidebarLink href="/agent-registration" icon={UserPlus}>Become an Agent</SidebarLink>
          </nav>

          <div className="pt-6 border-t border-border">
            <nav className="space-y-2">
              <SidebarLink href="/settings" icon={Settings}>Settings</SidebarLink>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border/50 min-h-[600px]">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* "More" tray — slides up above the nav bar */}
        {moreOpen && (
          <>
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-100 shadow-2xl rounded-t-3xl px-6 py-5 space-y-1 animate-in slide-in-from-bottom-2 duration-200">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">More Options</p>
              {[
                { href: "/afa-registration", icon: ShieldCheck, label: "AFA Registration" },
                { href: "/agent-registration", icon: UserPlus, label: "Become an Agent" },
                { href: "/settings", icon: Settings, label: "Settings" },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-gray-700 text-sm">{label}</span>
                </Link>
              ))}
            </div>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bottom-16 bg-black/20 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
          </>
        )}

        {/* The actual bottom bar */}
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-2 pb-safe">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            <BottomNavItem href="/dashboard" icon={LayoutDashboard} label="Home" />
            <BottomNavItem href="/bundles" icon={Wifi} label="Data" />
            <BottomNavItem href="/wallet" icon={CreditCard} label="Wallet" />
            <BottomNavItem href="/orders" icon={History} label="Orders" />

            {/* More button */}
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="flex flex-col items-center gap-1 flex-1 py-2"
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                moreOpen ? "bg-primary shadow-md shadow-primary/30" : "bg-transparent"
              )}>
                <MoreHorizontal className={cn("w-5 h-5", moreOpen ? "text-white" : "text-gray-400")} />
              </div>
              <span className={cn("text-[10px] font-semibold leading-none", moreOpen ? "text-primary" : "text-gray-400")}>
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
