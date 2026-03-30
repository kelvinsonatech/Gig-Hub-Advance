import React from "react";
import { Link, useRoute } from "wouter";
import { motion, LayoutGroup } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Wallet, Sun, Users, Menu, LogOut, X, LayoutDashboard, ShoppingBag, Bell } from "lucide-react";
import { useGetWallet } from "@workspace/api-client-react";
import { formatGHS, cn } from "@/lib/utils";
import logoUrl from "@assets/logo.png";
import { useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [isActive] = useRoute(href);
  return (
    <Link
      href={href}
      className={cn(
        "relative text-sm font-semibold px-4 py-1.5 rounded-full transition-colors",
        isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId="nav-capsule"
          className="absolute inset-0 bg-primary rounded-full shadow-md shadow-primary/40"
          style={{ borderRadius: 9999 }}
          transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.4 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: wallet } = useGetWallet({ query: { enabled: isAuthenticated } });

  return (
    <>
      {/* Floating pill navbar */}
      <header className="sticky top-0 z-50 w-full flex justify-center pt-3 pb-2 px-4">
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur-md border border-gray-200 shadow-md rounded-full pl-2 pr-5 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center flex-shrink-0 group">
            <img src={logoUrl} alt="TurboGH" className="w-36 h-auto group-hover:scale-105 transition-transform" />
          </Link>

          {/* Center Nav Links */}
          <LayoutGroup id="navbar">
            <nav className="hidden md:flex items-center gap-1">
              {isAuthenticated ? (
                <>
                  <NavLink href="/bundles">Data Bundles</NavLink>
                  <NavLink href="/services">Services</NavLink>
                  <NavLink href="/dashboard">Dashboard</NavLink>
                </>
              ) : (
                <>
                  <NavLink href="/bundles">Data Bundles</NavLink>
                  <NavLink href="/services">Services</NavLink>
                </>
              )}
            </nav>
          </LayoutGroup>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Wallet balance */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-sm font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{formatGHS(wallet?.balance)}</span>
                </div>

                {/* Bell */}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </Button>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ring-2 ring-transparent hover:ring-primary/30 rounded-full transition-all focus:outline-none focus:ring-primary/50">
                      <UserAvatar name={user?.name} size={34} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 p-2 rounded-xl mt-2">
                    <div className="flex items-center gap-3 p-2">
                      <UserAvatar name={user?.name} size={40} />
                      <div className="flex flex-col space-y-0.5 leading-none min-w-0">
                        <p className="font-semibold text-sm truncate">{user?.name}</p>
                        <p className="w-[160px] truncate text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                      <Link href="/wallet">
                        <Wallet className="mr-2 h-4 w-4" /> Wallet & Top Up
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                      <Link href="/orders">
                        <ShoppingBag className="mr-2 h-4 w-4" /> Order History
                      </Link>
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
              <div className="hidden sm:flex items-center gap-2">
                {/* Theme / settings icon */}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                  <Sun className="w-4 h-4" />
                </Button>

                {/* Join Community */}
                <Button
                  variant="outline"
                  asChild
                  className="h-8 rounded-full text-xs font-medium px-3 border-gray-300 hover:border-primary hover:text-primary gap-1.5"
                >
                  <Link href="/register">
                    <Users className="w-3.5 h-3.5" />
                    Join Community
                  </Link>
                </Button>

                {/* Sign In */}
                <Button
                  asChild
                  className="h-8 rounded-full text-xs font-medium px-4 bg-primary hover:bg-primary/90 shadow-sm"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 rounded-full"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-[68px] left-4 right-4 max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-3 z-40">
            <nav className="flex flex-col gap-1">
              <Link href="/bundles" className="text-foreground font-medium p-2 hover:bg-muted rounded-xl text-sm" onClick={() => setIsMobileMenuOpen(false)}>Data Bundles</Link>
              <Link href="/services" className="text-foreground font-medium p-2 hover:bg-muted rounded-xl text-sm" onClick={() => setIsMobileMenuOpen(false)}>Services</Link>
              {isAuthenticated && (
                <Link href="/dashboard" className="text-primary font-semibold p-2 bg-primary/5 rounded-xl text-sm" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
              )}
            </nav>

            {!isAuthenticated ? (
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <Button variant="outline" asChild className="w-full rounded-xl justify-center">
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Users className="mr-2 w-4 h-4" /> Join Community
                  </Link>
                </Button>
                <Button asChild className="w-full rounded-xl justify-center">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-semibold">
                  <Wallet className="w-4 h-4" />
                  <span>{formatGHS(wallet?.balance)}</span>
                </div>
                <Button variant="outline" asChild className="w-full rounded-xl justify-center">
                  <Link href="/wallet" onClick={() => setIsMobileMenuOpen(false)}>Wallet & Top Up</Link>
                </Button>
                <Button variant="ghost" className="w-full rounded-xl justify-center text-destructive" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </Button>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}
