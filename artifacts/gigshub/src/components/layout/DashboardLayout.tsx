import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, Redirect } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  CreditCard,
  History,
  Wifi,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function SidebarLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
  const [isActive] = useRoute(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors group",
        isActive
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
      )}
    >
      <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
      {children}
    </Link>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="mx-auto px-3 sm:px-4 py-4 md:py-8 max-w-7xl flex flex-col md:flex-row gap-6 md:gap-8 min-h-[calc(100vh-4rem)] pb-24 md:pb-8">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:block md:w-64 shrink-0 space-y-6">
        <nav className="space-y-2">
          <SidebarLink href="/dashboard" icon={Home}>Overview</SidebarLink>
          <SidebarLink href="/bundles" icon={Wifi}>Buy Data</SidebarLink>
          <SidebarLink href="/wallet" icon={CreditCard}>Wallet & Top-up</SidebarLink>
          <SidebarLink href="/orders" icon={History}>Order History</SidebarLink>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="md:bg-white md:rounded-3xl md:p-8 md:shadow-sm md:border md:border-border/50 min-h-[600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
