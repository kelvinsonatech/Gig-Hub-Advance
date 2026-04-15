import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Gift, Plus, Trash2, X, Loader2, ChevronDown, ChevronUp, Users, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface Voucher {
  id: number;
  code: string;
  amount: string;
  maxRedemptions: number;
  currentRedemptions: number;
  isActive: boolean;
  createdAt: string;
}

interface Redemption {
  id: number;
  amount: string;
  redeemedAt: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAvatarStyle: string | null;
}

function getToken() {
  return localStorage.getItem("gigshub_token") || "";
}

export default function AdminVouchers() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmPurgeId, setConfirmPurgeId] = useState<number | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());

  const toggleReveal = (id: number) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const maskCode = (code: string) => {
    if (code.length <= 2) return "••••";
    return code[0] + "•".repeat(code.length - 2) + code[code.length - 1];
  };

  const { data: vouchers = [], isLoading } = useQuery<Voucher[]>({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/admin/vouchers`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/admin/vouchers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ code, amount: parseFloat(amount), maxRedemptions: parseInt(maxRedemptions) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setCode("");
      setAmount("");
      setMaxRedemptions("1");
      setShowCreate(false);
    },
  });

  const deactivateMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/api/admin/vouchers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-vouchers"] }),
  });

  const purgeMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/api/admin/vouchers/${id}/purge`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
      setExpandedId(null);
    },
  });

  const { data: redemptions = [], isLoading: loadingRedemptions } = useQuery<Redemption[]>({
    queryKey: ["admin-voucher-redemptions", expandedId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/admin/vouchers/${expandedId}/redemptions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: expandedId !== null,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Vouchers</h1>
            <p className="text-sm text-muted-foreground">{vouchers.length} voucher{vouchers.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(v => !v)} className="rounded-xl gap-2">
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? "Cancel" : "Create"}
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={e => { e.preventDefault(); createMut.mutate(); }}
          className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Voucher Code</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME50"
                className="w-full px-3 py-2 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Amount (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="5.00"
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Max Redemptions</label>
              <input
                type="number"
                min="1"
                value={maxRedemptions}
                onChange={e => setMaxRedemptions(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
          </div>

          {createMut.isError && (
            <p className="text-sm text-red-600">{(createMut.error as Error).message}</p>
          )}

          <Button type="submit" disabled={createMut.isPending} className="rounded-xl gap-2">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Voucher
          </Button>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No vouchers yet</p>
          <p className="text-sm">Create one to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vouchers.map(v => (
            <div key={v.id} className={cn("bg-white border rounded-2xl shadow-sm overflow-hidden", !v.isActive && "opacity-60")}>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-lg font-bold tracking-wider text-primary">
                      {v.isActive && !revealedIds.has(v.id) ? maskCode(v.code) : v.code}
                    </span>
                    {v.isActive && (
                      <button
                        onClick={() => toggleReveal(v.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {revealedIds.has(v.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">GHS {parseFloat(v.amount).toFixed(2)}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {v.currentRedemptions}/{v.maxRedemptions} used
                    </span>
                    {!v.isActive && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl gap-1 text-xs"
                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {expandedId === v.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                  {v.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deactivateMut.mutate(v.id)}
                      disabled={deactivateMut.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : confirmPurgeId === v.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-red-600 hover:bg-red-50 gap-1 text-xs font-bold"
                        onClick={() => { purgeMut.mutate(v.id); setConfirmPurgeId(null); }}
                        disabled={purgeMut.isPending}
                      >
                        {purgeMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, clear"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-gray-500 hover:bg-gray-100 text-xs"
                        onClick={() => setConfirmPurgeId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 text-xs"
                      onClick={() => setConfirmPurgeId(v.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="sm:hidden px-4 pb-3 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">GHS {parseFloat(v.amount).toFixed(2)}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {v.currentRedemptions}/{v.maxRedemptions} used
                </span>
                {!v.isActive && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
                )}
              </div>

              {expandedId === v.id && (
                <div className="border-t bg-gray-50 px-4 py-3">
                  {loadingRedemptions ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : redemptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No redemptions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {redemptions.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border">
                          <div className="flex items-center gap-2">
                            <UserAvatar name={r.userName} seed={r.userEmail} size={28} avatarStyle={r.userAvatarStyle || undefined} />
                            <div>
                              <p className="text-sm font-medium">{r.userName}</p>
                              <p className="text-xs text-muted-foreground">{r.userPhone || r.userEmail}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-600">GHS {parseFloat(r.amount).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(r.redeemedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
