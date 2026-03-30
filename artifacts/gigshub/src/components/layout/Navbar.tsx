import React, { useRef, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Wallet, Sun, Users, Menu, LogOut, X, LayoutDashboard, ShoppingBag, Bell, CheckCheck, ImageIcon } from "lucide-react";
import { useGetWallet } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatGHS, cn } from "@/lib/utils";
import logoUrl from "@assets/logo.png";
import { useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

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

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  const [isActive] = useRoute(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "p-2 rounded-xl text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-foreground hover:bg-muted"
      )}
    >
      {children}
    </Link>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(`${API}api/notifications`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Array<{
        id: string; title: string; message: string; imageUrl: string | null;
        isRead: boolean; createdAt: string;
      }>>;
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API}api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API}api/notifications/read-all`, { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const unread = notifications.filter(n => !n.isRead);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-[68px] right-4 w-[340px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-gray-900">Notifications</span>
          {unread.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline"
          >
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-0.5">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
                className={cn(
                  "flex gap-3 px-4 py-3 cursor-pointer transition-colors",
                  n.isRead ? "bg-white hover:bg-gray-50/50" : "bg-orange-50/60 hover:bg-orange-50"
                )}
              >
                {/* Image or icon */}
                {n.imageUrl ? (
                  <img
                    src={n.imageUrl}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-100"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className={cn("text-sm leading-tight", n.isRead ? "font-medium text-gray-700" : "font-bold text-gray-900")}>
                      {n.title}
                    </p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{format(new Date(n.createdAt), "MMM d · h:mm a")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: wallet } = useGetWallet({ query: { enabled: isAuthenticated } });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch(`${API}api/notifications`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Array<{ id: string; isRead: boolean; [key: string]: any }>>;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const close = () => setIsMobileMenuOpen(false);

  return (
    <>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={close} />
      )}

      <header className="sticky top-0 z-50 w-full flex justify-center pt-3 pb-2 px-4">
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur-md border border-gray-200 shadow-md rounded-full pl-2 pr-5 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center flex-shrink-0 group">
            <img src={logoUrl} alt="TurboGH" className="w-36 h-auto group-hover:scale-105 transition-transform" />
          </Link>

          {/* Center Nav */}
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

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Wallet balance */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-sm font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{formatGHS(wallet?.balance)}</span>
                </div>

                {/* Bell — notification toggle */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full relative",
                      showNotifications ? "text-primary bg-orange-50" : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => setShowNotifications(v => !v)}
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                    )}
                  </Button>

                  <AnimatePresence>
                    {showNotifications && (
                      <NotificationsPanel onClose={() => setShowNotifications(false)} />
                    )}
                  </AnimatePresence>
                </div>

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
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                  <Sun className="w-4 h-4" />
                </Button>
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

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-[68px] left-4 right-4 max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-3 z-40">
            <nav className="flex flex-col gap-1">
              <MobileNavLink href="/bundles" onClick={close}>Data Bundles</MobileNavLink>
              <MobileNavLink href="/services" onClick={close}>Services</MobileNavLink>
              {isAuthenticated && (
                <MobileNavLink href="/dashboard" onClick={close}>Dashboard</MobileNavLink>
              )}
            </nav>

            {!isAuthenticated ? (
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <Button variant="outline" asChild className="w-full rounded-xl justify-center">
                  <Link href="/register" onClick={close}>
                    <Users className="mr-2 w-4 h-4" /> Join Community
                  </Link>
                </Button>
                <Button asChild className="w-full rounded-xl justify-center">
                  <Link href="/login" onClick={close}>Sign In</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-semibold">
                  <Wallet className="w-4 h-4" />
                  <span>{formatGHS(wallet?.balance)}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-xl justify-between"
                  onClick={() => { setIsMobileMenuOpen(false); setShowNotifications(true); }}
                >
                  <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </Button>
                <Button variant="outline" asChild className="w-full rounded-xl justify-center">
                  <Link href="/wallet" onClick={close}>Wallet & Top Up</Link>
                </Button>
                <Button variant="ghost" className="w-full rounded-xl justify-center text-destructive" onClick={() => { logout(); close(); }}>
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
