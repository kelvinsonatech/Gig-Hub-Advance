import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
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

// Each tab slot = 46px wide + 12px margin = 58px stride; container has px-3 (12px) left padding
const TAB_SIZE = 46;
const TAB_STRIDE = 58;
const NAV_PAD = 12;

function tabLeft(index: number) {
  return NAV_PAD + index * TAB_STRIDE;
}

function BottomNav() {
  const [location] = useLocation();
  const activeIndex = bottomTabs.findIndex(t => t.href === location);
  const prevIndexRef = useRef(activeIndex);
  const controls = useAnimationControls();

  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev === activeIndex || prev < 0) return;

    const dir = activeIndex > prev ? 1 : -1;
    const srcLeft = tabLeft(prev);
    const dstLeft = tabLeft(activeIndex);
    const stretchWidth = Math.abs(dstLeft - srcLeft) + TAB_SIZE;
    prevIndexRef.current = activeIndex;

    if (dir > 0) {
      // Moving right — right edge shoots forward, then left edge catches up
      controls.start({
        left:         [srcLeft,      srcLeft,      dstLeft],
        width:        [TAB_SIZE,     stretchWidth, TAB_SIZE],
        borderRadius: ["23px", "12px", "23px"],
        transition: { duration: 0.44, times: [0, 0.46, 1], ease: "easeInOut" },
      });
    } else {
      // Moving left — left edge shoots back, right edge catches up
      controls.start({
        left:         [srcLeft,      dstLeft,      dstLeft],
        width:        [TAB_SIZE,     stretchWidth, TAB_SIZE],
        borderRadius: ["23px", "12px", "23px"],
        transition: { duration: 0.44, times: [0, 0.46, 1], ease: "easeInOut" },
      });
    }
  }, [activeIndex]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-6">
      <div className="relative flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-3 h-[62px]">

        {/* Liquid blob — stretches width to bridge tabs, then snaps back to circle */}
        {activeIndex >= 0 && (
          <motion.div
            animate={controls}
            initial={{ left: tabLeft(activeIndex), width: TAB_SIZE }}
            className="absolute bg-[#0077C7]/15 rounded-full"
            style={{ height: TAB_SIZE, top: 8 }}
          />
        )}

        {/* Tab icons */}
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
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors duration-150",
                    isActive ? "text-[#0077C7]" : "text-gray-400"
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
      <div className="container mx-auto px-4 py-8 max-w-7xl flex flex-col md:flex-row gap-8 min-h-[calc(100vh-4rem)] pb-24">
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
