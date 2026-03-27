import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
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

function BottomTabItem({
  href, icon: Icon, label, isActive,
}: { href: string; icon: any; label: string; isActive: boolean }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative z-10">
      <motion.div
        animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      >
        <Icon className={cn("w-5 h-5", isActive ? "text-[#0077C7]" : "text-gray-700")} />
      </motion.div>
      <motion.span
        animate={{ color: isActive ? "#0077C7" : "#374151" }}
        transition={{ duration: 0.18 }}
        className="text-[11px] font-semibold leading-none"
      >
        {label}
      </motion.span>
    </Link>
  );
}

function BottomNav() {
  const [location] = useLocation();
  const activeIndex = bottomTabs.findIndex(t => t.href === location);
  const prevIndexRef = useRef(activeIndex);
  const blobControls = useAnimationControls();

  // Trigger water-blob morph every time the active tab changes
  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev === activeIndex) return;

    const direction = activeIndex > prev ? 1 : -1;
    const distance = Math.abs(activeIndex - prev);
    prevIndexRef.current = activeIndex;

    blobControls.start({
      // Stretch → squish → overshoot → settle (like water hitting a wall)
      scaleX: [1, 1 + 0.55 * distance, 0.82, 1.08, 0.97, 1],
      scaleY: [1, 0.72, 1.22, 0.92, 1.04, 1],
      borderRadius: [
        "50%",
        direction > 0 ? "38% 62% 62% 38%" : "62% 38% 38% 62%",
        "58% 42% 42% 58%",
        "46% 54% 54% 46%",
        "50%",
        "50%",
      ],
      transition: {
        duration: 0.62,
        times: [0, 0.22, 0.5, 0.72, 0.88, 1],
        ease: "easeOut",
      },
    });
  }, [activeIndex, blobControls]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center pb-3 px-4">
      <div className="relative w-full max-w-sm bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg rounded-full h-[4.25rem] overflow-hidden">

        {/* ── OUTER: slides left/right with spring ── */}
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none"
            style={{ width: "25%" }}
            animate={{ left: `${activeIndex * 25}%` }}
            transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.55 }}
          >
            {/* ── INNER: water-blob morph ── */}
            <motion.div
              animate={blobControls}
              initial={{ scaleX: 1, scaleY: 1, borderRadius: "50%" }}
              style={{
                width: "68%",
                height: "68%",
                background:
                  "radial-gradient(ellipse at 35% 30%, rgba(120,200,255,0.75) 0%, rgba(0,119,199,0.55) 50%, rgba(0,70,160,0.35) 100%)",
                boxShadow:
                  "0 0 16px rgba(0,149,255,0.45), 0 2px 8px rgba(0,100,200,0.3), inset 0 1px 3px rgba(255,255,255,0.6)",
              }}
            />
          </motion.div>
        )}

        {/* ── Tab items ── */}
        <div className="absolute inset-0 flex items-center px-1">
          {bottomTabs.map((tab) => (
            <BottomTabItem
              key={tab.href}
              href={tab.href}
              icon={tab.icon}
              label={tab.label}
              isActive={location === tab.href}
            />
          ))}
        </div>
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

      <BottomNav />
    </>
  );
}
