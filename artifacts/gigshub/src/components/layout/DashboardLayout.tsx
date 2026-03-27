import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
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
  { href: "/dashboard", icon: LayoutDashboard },
  { href: "/bundles",   icon: Wifi },
  { href: "/orders",    icon: ShoppingBag },
  { href: "/wallet",    icon: Grid2x2 },
];

function BottomTab({ href, icon: Icon }: { href: string; icon: any }) {
  const [isActive] = useRoute(href);
  return (
    <Link href={href} className="flex-1 flex items-center justify-center py-3">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
        isActive
          ? "bg-[#e8f3fc] shadow-sm"
          : "hover:bg-gray-50"
      )}>
        <Icon className={cn(
          "w-5 h-5 transition-colors duration-200",
          isActive ? "text-[#0077C7]" : "text-gray-400"
        )} />
      </div>
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
          {bottomTabs.map((tab) => (
            <BottomTab key={tab.href} href={tab.href} icon={tab.icon} />
          ))}
        </div>
        {/* safe-area bottom padding for notch phones */}
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </>
  );
}
