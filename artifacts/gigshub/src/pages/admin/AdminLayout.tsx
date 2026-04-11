import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShieldCheck,
  Bell,
  Menu,
  X,
  Radio,
  ShoppingBag,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar, AVATAR_STYLES, getAvatarSrc } from "@/components/ui/UserAvatar";
import logoUrl from "@/assets/logo.png";
import { API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Palette } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/networks", label: "Networks", icon: Radio },
  { href: "/admin/bundles", label: "Data Bundles", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

// ── Password strength helper ─────────────────────────────────────────────────
function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}
const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-green-500"];

// ── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const strength = getStrength(next);
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm && !loading;

  const reset = () => {
    setCurrent(""); setNext(""); setConfirm("");
    setShowCurrent(false); setShowNext(false); setShowConfirm(false);
    setLoading(false); setDone(false); setServerError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setServerError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message || "Something went wrong.");
        setLoading(false);
        return;
      }
      setDone(true);
      setLoading(false);
      toast({ title: "Password updated", description: "Your admin password has been changed." });
      setTimeout(() => { handleClose(); }, 1800);
    } catch {
      setServerError("Network error — please try again.");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#E91E8C]" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {done ? (
          <div className="px-6 py-12 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Password changed!</p>
            <p className="text-xs text-gray-500 text-center">Your admin password has been updated successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Current password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={current}
                  onChange={e => { setCurrent(e.target.value); setServerError(""); }}
                  placeholder="Enter current password"
                  className="w-full px-3.5 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C] transition-colors"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {serverError && (
                <p className="text-xs text-red-500">{serverError}</p>
              )}
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">New password</label>
              <div className="relative">
                <input
                  type={showNext ? "text" : "password"}
                  value={next}
                  onChange={e => setNext(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C] transition-colors"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNext(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {next.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor[strength] : "bg-gray-100"}`} />
                    ))}
                  </div>
                  <p className={`text-[10px] font-medium ${strength <= 1 ? "text-red-400" : strength === 2 ? "text-amber-500" : strength === 3 ? "text-blue-500" : "text-green-600"}`}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full px-3.5 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    mismatch
                      ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                      : "border-gray-200 focus:ring-[#E91E8C]/30 focus:border-[#E91E8C]"
                  }`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mismatch && <p className="text-xs text-red-500">Passwords do not match</p>}
              {!mismatch && confirm.length > 0 && next === confirm && (
                <p className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Passwords match</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={handleClose}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!canSubmit}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: canSubmit ? "linear-gradient(135deg,#E91E8C,#9C27B0)" : undefined, backgroundColor: !canSubmit ? "#d1d5db" : undefined }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AvatarPickerModal({ open, onClose, currentStyle, seed }: {
  open: boolean;
  onClose: () => void;
  currentStyle: string;
  seed: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(currentStyle);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (selected === currentStyle) { onClose(); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem("gigshub_token");
      const res = await fetch(`${API}/api/auth/avatar-style`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarStyle: selected }),
      });
      if (!res.ok) throw new Error("Failed");
      const updatedUser = await res.json();
      queryClient.setQueryData(["/api/auth/me"], updatedUser);
      try { localStorage.setItem("gigshub_user_cache", JSON.stringify(updatedUser)); } catch {}
      toast({ title: "Avatar updated", description: "Your new avatar is live everywhere." });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not update avatar." });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
              <Palette className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Choose Avatar Style</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50 bg-gray-50/50">
          <img
            src={getAvatarSrc(seed, selected)}
            alt="Preview"
            className="w-16 h-16 rounded-full ring-2 ring-white shadow-lg bg-orange-50"
          />
          <div>
            <p className="text-sm font-semibold text-gray-900">Preview</p>
            <p className="text-xs text-gray-500">{AVATAR_STYLES.find(s => s.id === selected)?.label || selected}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-3">
            {AVATAR_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelected(style.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                  selected === style.id
                    ? "border-[#E91E8C] bg-pink-50/50 shadow-sm"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <img
                  src={getAvatarSrc(seed, style.id)}
                  alt={style.label}
                  className="w-12 h-12 rounded-full bg-orange-50"
                />
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">
                  {style.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#E91E8C,#9C27B0)" }}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Avatar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const SidebarLink = ({ href, label, icon: Icon, active, onClick }: {
  href: string; label: string; icon: any; active: boolean; onClick: () => void;
}) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
      active
        ? "bg-[#E91E8C] text-white shadow-sm"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
    }`}
    onClick={onClick}
  >
    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
    {label}
  </Link>
);

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 font-medium">Admin access required</p>
          <Button variant="outline" onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <img src={logoUrl} alt="TurboGH" className="h-20 w-auto" />
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <SidebarLink
            key={href}
            href={href}
            label={label}
            icon={Icon}
            active={location === href}
            onClick={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      {/* Profile + logout at bottom */}
      <div className="px-3 pb-5 border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <UserAvatar name={user.name} seed={user.email} size={40} avatarStyle={user.avatarStyle} className="ring-2 ring-white shadow-md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full bg-pink-50 text-[10px] font-semibold text-[#E91E8C] uppercase tracking-wide">
              <ShieldCheck className="w-2.5 h-2.5" /> Admin
            </span>
          </div>
        </div>

        <button
          onClick={() => { setSidebarOpen(false); setAvatarOpen(true); }}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors"
        >
          <Palette className="w-4 h-4" />
          Change avatar
        </button>

        <button
          onClick={() => { setSidebarOpen(false); setPwOpen(true); }}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          Change password
        </button>

        <button
          onClick={() => { logout(); navigate("/"); }}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <AvatarPickerModal open={avatarOpen} onClose={() => setAvatarOpen(false)} currentStyle={user.avatarStyle || "adventurer"} seed={user.email} />

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 md:w-60 bg-white border-r border-gray-100 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-5 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-1.5 inline-flex items-center">
              <img src={logoUrl} alt="TurboGH" className="h-16 w-auto" />
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(true)}
            className="shrink-0"
            aria-label="Open menu"
          >
            <UserAvatar name={user.name} seed={user.email} size={32} avatarStyle={user.avatarStyle} className="ring-2 ring-white shadow-md" />
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
