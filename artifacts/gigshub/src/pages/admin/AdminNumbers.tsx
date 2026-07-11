import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, Plus, Trash2, Loader2, Search, ShieldCheck, ShieldOff, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AllowedNumber {
  id: number;
  phoneNumber: string;
  addedBy: string;
  note: string | null;
  createdAt: string;
}

interface NumbersResponse {
  numbers: AllowedNumber[];
  total: number;
  page: number;
  pageSize: number;
}

function getToken() {
  return localStorage.getItem("gigshub_token") || "";
}

const NETWORK_LABELS: Record<string, string> = {
  mtn: "MTN",
  airteltigo: "AirtelTigo",
  telecel: "Telecel",
};
const ALL_NETWORK_KEYS = ["mtn", "airteltigo", "telecel"];

export default function AdminNumbers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newNote, setNewNote] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: restriction } = useQuery<{ enabled: boolean; networks: string[] }>({
    queryKey: ["admin-number-restriction"],
    queryFn: async () => {
      const res = await fetch(`${API}/api/admin/settings/number-restriction`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (body: { enabled?: boolean; networks?: string[] }) => {
      const res = await fetch(`${API}/api/admin/settings/number-restriction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-number-restriction"] });
      toast({
        title: "Settings saved",
        description: data.enabled
          ? data.networks.length === 0
            ? "Restriction is on, but no networks are selected — all numbers can order."
            : `New numbers are blocked on: ${data.networks.map((n: string) => NETWORK_LABELS[n] || n).join(", ")}.`
          : "Restriction is off — all numbers can order.",
      });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const { data, isLoading } = useQuery<NumbersResponse>({
    queryKey: ["admin-allowed-numbers", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`${API}/api/admin/allowed-numbers?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/admin/allowed-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ phoneNumber: newPhone, note: newNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-allowed-numbers"] });
      setNewPhone("");
      setNewNote("");
      setShowAdd(false);
      toast({ title: "Number added", description: "This number can now place orders." });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Could not add number", description: err.message }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/api/admin/allowed-numbers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-allowed-numbers"] });
      setConfirmDeleteId(null);
      toast({ title: "Number removed", description: "This number can no longer order in JessCo mode." });
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const enabled = restriction?.enabled ?? true;
  const restrictedNetworks = restriction?.networks ?? ["mtn"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Allowed Numbers</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total.toLocaleString()} number{total === 1 ? "" : "s"} on the system
          </p>
        </div>
        <Button onClick={() => setShowAdd(v => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Add number
        </Button>
      </div>

      {/* Restriction toggle card */}
      <div
        className={cn(
          "rounded-xl border p-4 space-y-4",
          enabled ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
        )}
      >
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-start gap-3">
            {enabled ? (
              <ShieldCheck className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldOff className="h-6 w-6 text-gray-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-gray-900">
                New-number restriction {enabled ? "is ON" : "is OFF"}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">
                {enabled
                  ? "While JessCo fulfillment is active, bundle orders on the selected networks are denied for numbers not on this list — before payment."
                  : "All numbers can place orders on every network. Turn this on if JessCo stops accepting new numbers."}
              </p>
            </div>
          </div>
          <Button
            variant={enabled ? "outline" : "default"}
            disabled={toggleMut.isPending}
            onClick={() => toggleMut.mutate({ enabled: !enabled })}
            className="shrink-0"
          >
            {toggleMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : enabled ? (
              "Turn off"
            ) : (
              "Turn on"
            )}
          </Button>
        </div>

        {enabled && (
          <div className="border-t border-amber-200 pt-3">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Networks that do NOT accept new numbers:
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_NETWORK_KEYS.map(key => {
                const active = restrictedNetworks.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={toggleMut.isPending}
                    onClick={() => {
                      const next = active
                        ? restrictedNetworks.filter(n => n !== key)
                        : [...restrictedNetworks, key];
                      toggleMut.mutate({ networks: next });
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                      active
                        ? "bg-amber-600 border-amber-600 text-white"
                        : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                    )}
                  >
                    {NETWORK_LABELS[key]}
                    <span className="ml-1.5 text-xs opacity-80">
                      {active ? "· blocked" : "· open"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Blocked = only numbers on this list can order. Open = any number can order.
            </p>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="font-semibold text-gray-900">Add a number to the system</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="tel"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              placeholder="e.g. 0594811692"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="text"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button
              onClick={() => addMut.mutate()}
              disabled={addMut.isPending || !newPhone.trim()}
              className="gap-2"
            >
              {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search numbers…"
          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (data?.numbers.length ?? 0) === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Phone className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            {search ? "No numbers match your search." : "No numbers on the system yet."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data!.numbers.map(n => (
              <li key={n.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{n.phoneNumber}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {n.addedBy === "admin" ? "Added by admin" : "From order history"}
                    {n.note ? ` — ${n.note}` : ""}
                    {" · "}
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {confirmDeleteId === n.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteMut.isPending}
                      onClick={() => deleteMut.mutate(n.id)}
                    >
                      {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-red-600 shrink-0"
                    onClick={() => setConfirmDeleteId(n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
