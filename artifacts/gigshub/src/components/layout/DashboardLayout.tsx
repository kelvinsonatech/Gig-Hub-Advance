import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Home,
  Store,
  ShoppingCart,
  LayoutGrid,
  CreditCard,
  History,
  UserPlus,
  ShieldCheck,
  Settings,
  Wifi,
} from "lucide-react";
import { Redirect } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const bottomTabs = [
  { href: "/dashboard", icon: Home        },
  { href: "/bundles",   icon: Store       },
  { href: "/orders",    icon: ShoppingCart },
  { href: "/wallet",    icon: LayoutGrid  },
];

function BottomNav() {
  const [location] = useLocation();
  const activeIndex = bottomTabs.findIndex(t => t.href === location);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center pb-4 px-6">
      <div className="relative flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-3 h-[62px]">

        {/* Sliding circle indicator — starts at px-3 offset, moves 58px per tab */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute rounded-full bg-gray-100"
            style={{ width: 46, height: 46, top: 8, left: 12 }}
            animate={{ x: activeIndex * 58 }}
            initial={false}
            transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.5 }}
          />
        )}

        {/* Tab items */}
        {bottomTabs.map(({ href, icon: Icon }, i) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative z-10 w-[46px] h-[46px] flex items-center justify-center rounded-full"
              style={{ marginLeft: i === 0 ? 0 : 12 }}
            >
              <motion.div
                animate={{ scale: isActive ? 1.12 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors duration-150",
                    isActive ? "text-gray-900" : "text-gray-400"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
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
            <SidebarLink href="/dashboard" icon={Home}>Overview</SidebarLink>
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

      <BottomNav />
    </>
  );
}
