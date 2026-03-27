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
  Settings
} from "lucide-react";
import { Redirect } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
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
    <div className="container mx-auto px-4 py-8 max-w-7xl flex flex-col md:flex-row gap-8 min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0 space-y-6">
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
  );
}
