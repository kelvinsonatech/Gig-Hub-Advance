import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  ShieldCheck,
  RefreshCw,
  Mail,
  Phone,
} from "lucide-react";
import { formatGHS } from "@/lib/utils";
import { API } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  balance: number;
  createdAt: string;
}

function getToken() {
  return localStorage.getItem("gigshub_token") ?? "";
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: users = [], isLoading, refetch, isFetching } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/admin/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ userId, type, amount, note }: { userId: string; type: string; amount: string; note: string }) => {
      const res = await fetch(`${API}/api/admin/users/${userId}/wallet/adjust`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type, amount: parseFloat(amount), note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Adjustment failed");
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<AdminUser[]>(["/api/admin/users"], old =>
        old?.map(u => u.id === variables.userId ? { ...u, balance: data.balance } : u)
      );
      toast({
        title: variables.type === "credit" ? "Wallet credited" : "Wallet debited",
        description: `${formatGHS(parseFloat(variables.amount))} ${variables.type === "credit" ? "added to" : "removed from"} ${selected?.name}'s wallet.`,
      });
      setDialogOpen(false);
      setAmount("");
      setNote("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    },
  });

  const openDialog = (user: AdminUser, type: "credit" | "debit") => {
    setSelected(user);
    setAdjustType(type);
    setAmount("");
    setNote("");
    setDialogOpen(true);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#E91E8C]" /> Users
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage user accounts and wallet balances</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Wallet Funds</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatGHS(totalBalance)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Admins</p>
          <p className="text-2xl font-bold text-[#E91E8C] mt-1">{users.filter(u => u.role === "admin").length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          className="pl-9 rounded-xl border-gray-200"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* User cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm animate-pulse h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">No users found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => (
            <div
              key={user.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              {/* Avatar + name + role */}
              <div className="flex items-center gap-3">
                <UserAvatar name={user.name} seed={user.email} size={56} className="ring-2 ring-white shadow-md shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                    {user.role === "admin" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-pink-50 text-[10px] font-semibold text-[#E91E8C] uppercase shrink-0">
                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                </div>
              </div>

              {/* Live balance */}
              <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-emerald-50/40 border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-medium">Wallet Balance</span>
                </div>
                <p className="text-base font-extrabold text-emerald-600">{formatGHS(user.balance)}</p>
              </div>

              {/* Credit / Debit buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 text-xs font-semibold"
                  onClick={() => openDialog(user, "credit")}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Credit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-1.5 text-xs font-semibold"
                  onClick={() => openDialog(user, "debit")}
                >
                  <TrendingDown className="w-3.5 h-3.5" /> Debit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust wallet dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustType === "credit"
                ? <TrendingUp className="w-5 h-5 text-emerald-500" />
                : <TrendingDown className="w-5 h-5 text-red-500" />}
              {adjustType === "credit" ? "Credit Wallet" : "Debit Wallet"}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                <UserAvatar name={selected.name} seed={selected.email} size={40} />
                <div>
                  <p className="font-semibold text-sm text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-400">Current: {formatGHS(selected.balance)}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Amount (GHS)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Note <span className="font-normal text-gray-400">(optional)</span></Label>
                <Input
                  placeholder="e.g. Bonus credit, refund…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className={`rounded-2xl px-4 py-3 text-sm font-semibold flex justify-between ${
                  adjustType === "credit"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  <span>New balance</span>
                  <span>{formatGHS(
                    adjustType === "credit"
                      ? selected.balance + parseFloat(amount)
                      : selected.balance - parseFloat(amount)
                  )}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!amount || parseFloat(amount) <= 0 || adjustMutation.isPending}
              onClick={() => {
                if (!selected) return;
                adjustMutation.mutate({ userId: selected.id, type: adjustType, amount, note });
              }}
              className={adjustType === "credit"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                : "bg-red-500 hover:bg-red-600 text-white rounded-xl"}
            >
              {adjustMutation.isPending ? "Processing…" : adjustType === "credit" ? "Credit" : "Debit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
