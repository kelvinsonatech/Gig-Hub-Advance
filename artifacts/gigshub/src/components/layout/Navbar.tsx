import { Link, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Wallet, Bell, Menu, UserCircle, LogOut } from "lucide-react";
import { useGetWallet } from "@workspace/api-client-react";
import { formatGHS, cn } from "@/lib/utils";
import logoUrl from "@assets/logo.png";
import { useState } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: wallet } = useGetWallet({ query: { enabled: isAuthenticated } });

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const [isActive] = useRoute(href);
    return (
      <Link 
        href={href} 
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary relative py-2",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {children}
        {isActive && (
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <img src={logoUrl} alt="GigsHub Logo" className="h-8 group-hover:scale-105 transition-transform" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/bundles">Data Bundles</NavLink>
            <NavLink href="/services">Services</NavLink>
            {isAuthenticated && <NavLink href="/dashboard">Dashboard</NavLink>}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-inner">
                <Wallet className="w-4 h-4" />
                <span className="font-bold text-sm tracking-tight">{formatGHS(wallet?.balance)}</span>
              </div>
              
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5 leading-none">
                      <p className="font-medium text-sm">{user?.name}</p>
                      <p className="w-[200px] truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href="/wallet">Wallet & Top Up</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                    <Link href="/orders">Order History</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive rounded-lg" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Button variant="ghost" asChild className="rounded-xl font-medium hover:bg-primary/5 hover:text-primary">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="rounded-xl font-medium shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:-translate-y-0.5">
                <Link href="/register">Sign Up Free</Link>
              </Button>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white p-4 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-3">
            <Link href="/" className="text-foreground font-medium p-2 hover:bg-muted rounded-lg">Home</Link>
            <Link href="/bundles" className="text-foreground font-medium p-2 hover:bg-muted rounded-lg">Data Bundles</Link>
            <Link href="/services" className="text-foreground font-medium p-2 hover:bg-muted rounded-lg">Services</Link>
            {isAuthenticated && (
              <Link href="/dashboard" className="text-primary font-medium p-2 bg-primary/5 rounded-lg">Dashboard</Link>
            )}
          </nav>
          
          {!isAuthenticated && (
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <Button variant="outline" asChild className="w-full justify-center">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="w-full justify-center">
                <Link href="/register">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
