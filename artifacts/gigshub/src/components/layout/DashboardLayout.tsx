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
        className="flex flex-col items-center gap-1 flex-1 py-1"
        onClick={() => setMoreOpen(false)}
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all",
          isActive ? "bg-primary/10" : "bg-transparent"
        )}>
          <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-gray-400")} />
        </div>
        <span className={cn(
          "text-[10px] font-semibold leading-none transition-colors",
          isActive ? "text-primary" : "text-gray-400"
        )}>
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center pb-3 px-4">
        {/* "More" tray — floats above the pill bar */}
        {moreOpen && (
          <>
            <div className="absolute bottom-full mb-2 left-4 right-4 bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl px-4 py-4 space-y-1 animate-in slide-in-from-bottom-2 duration-200">
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold text-gray-700 text-sm">{label}</span>
                </Link>
              ))}
            </div>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-[1px]"
              onClick={() => setMoreOpen(false)}
            />
          </>
        )}

        {/* Floating pill bar — matches the top navbar style */}
        <div className="relative z-10 w-full max-w-sm bg-white/90 backdrop-blur-md border border-gray-200 shadow-md rounded-2xl px-3 h-14 flex items-center justify-around">
          <BottomNavItem href="/dashboard" icon={LayoutDashboard} label="Home" />
          <BottomNavItem href="/bundles" icon={Wifi} label="Data" />
          <BottomNavItem href="/wallet" icon={CreditCard} label="Wallet" />
          <BottomNavItem href="/orders" icon={History} label="Orders" />

          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="flex flex-col items-center gap-1 flex-1 py-1"
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              moreOpen ? "bg-primary shadow-sm shadow-primary/30" : "bg-transparent"
            )}>
              <MoreHorizontal className={cn("w-4 h-4", moreOpen ? "text-white" : "text-gray-400")} />
            </div>
            <span className={cn("text-[10px] font-semibold leading-none", moreOpen ? "text-primary" : "text-gray-400")}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
