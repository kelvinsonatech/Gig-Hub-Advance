import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wifi,
  CreditCard,
  ShoppingBag,
  History,
  UserPlus,
  ShieldCheck,
  Settings,
  Grid2x2,
} from "lucide-react";
import { Redirect } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const bottomTabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/bundles",   icon: Wifi,             label: "Data"   },
  { href: "/orders",    icon: ShoppingBag,      label: "Orders" },
  { href: "/wallet",    icon: Grid2x2,          label: "Wallet" },
];

function BottomTab({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5">
      {/* Icon circle */}
      <div className="relative flex items-center justify-center w-12 h-7">
        {isActive && (
          <motion.div
            layoutId="liquid-pill"
            className="absolute inset-x-0 inset-y-0 rounded-full bg-gray-100"
            transition={{ type: "spring", stiffness: 500, damping: 32, mass: 0.6 }}
          />
        )}
        <motion.div
          animate={{ scale: isActive ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className="relative z-10"
        >
          <Icon
            className={cn(
              "w-5 h-5 transition-colors duration-150",
              isActive ? "text-[#0077C7]" : "text-gray-800"
            )}
          />
        </motion.div>
      </div>

      {/* Label */}
      <span className={cn(
        "text-[11px] font-semibold leading-none transition-colors duration-150",
        isActive ? "text-[#0077C7]" : "text-gray-800"
      )}>
        {label}
      </span>
    </Link>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

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

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl flex flex-col md:flex-row gap-8 min-h-[calc(100vh-4rem)] pb-20 md:pb-8">
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
        <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border border-gray-200 shadow-md rounded-full h-[4.25rem] flex items-center justify-around px-4">
          {bottomTabs.map((tab) => (
            <BottomTab key={tab.href} href={tab.href} icon={tab.icon} label={tab.label} />
          ))}
        </div>
      </nav>
    </>
  );
}
