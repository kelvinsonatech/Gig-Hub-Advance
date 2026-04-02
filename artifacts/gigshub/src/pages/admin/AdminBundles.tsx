import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star, X, Loader2, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const NETWORKS = [
  { id: "1", name: "MTN", color: "#FFCC00", bg: "bg-yellow-50" },
  { id: "2", name: "AirtelTigo", color: "#004b87", bg: "bg-blue-50" },
  { id: "3", name: "Telecel", color: "#CC0000", bg: "bg-red-50" },
];

const TYPES = ["daily", "weekly", "monthly", "special"];

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}/api/admin${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

type Bundle = {
  id: string;
  networkId: string;
  networkName: string;
  name: string;
  data: string;
  validity: string;
  price: number;
  type: string;
  popular: boolean;
};

type BundleForm = Omit<Bundle, "id">;

const emptyForm = (): BundleForm => ({
  networkId: "1",
  networkName: "MTN",
  name: "",
  data: "",
  validity: "",
  price: 0,
  type: "daily",
  popular: false,
});

export default function AdminBundles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeNetwork, setActiveNetwork] = useState("1");
  const [showForm, setShowForm] = useState(false);
  const [editBundle, setEditBundle] = useState<Bundle | null>(null);
  const [form, setForm] = useState<BundleForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ id: string; value: string } | null>(null);

  const { data: bundles = [], isLoading } = useQuery<Bundle[]>({
    queryKey: ["admin-bundles"],
    queryFn: () => apiFetch("/bundles"),
  });

  const filtered = bundles.filter(b => b.networkId === activeNetwork);

  const createMutation = useMutation({
    mutationFn: (data: BundleForm) => apiFetch("/bundles", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
      qc.invalidateQueries({ queryKey: ["bundles"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Bundle added successfully" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Failed to add bundle", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BundleForm }) =>
      apiFetch(`/bundles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
      qc.invalidateQueries({ queryKey: ["bundles"] });
      toast({ title: "Bundle updated successfully" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Failed to update bundle", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/bundles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
      qc.invalidateQueries({ queryKey: ["bundles"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Bundle deleted" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ title: "Failed to delete bundle", description: e.message, variant: "destructive" }),
  });

  function openAdd() {
    const net = NETWORKS.find(n => n.id === activeNetwork)!;
    setForm({ ...emptyForm(), networkId: net.id, networkName: net.name });
    setEditBundle(null);
    setShowForm(true);
  }

  function openEdit(b: Bundle) {
    setForm({ networkId: b.networkId, networkName: b.networkName, name: b.name, data: b.data, validity: b.validity, price: b.price, type: b.type, popular: b.popular });
    setEditBundle(b);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditBundle(null);
    setForm(emptyForm());
  }

  function commitPrice(b: Bundle) {
    if (!editingPrice || editingPrice.id !== b.id) return;
    const newPrice = parseFloat(editingPrice.value);
    if (!isNaN(newPrice) && newPrice > 0 && newPrice !== b.price) {
      updateMutation.mutate({
        id: b.id,
        data: { networkId: b.networkId, networkName: b.networkName, name: b.name, data: b.data, validity: b.validity, price: newPrice, type: b.type, popular: b.popular },
      });
    }
    setEditingPrice(null);
  }

  function handleNetworkChange(id: string) {
    const net = NETWORKS.find(n => n.id === id)!;
    setForm(f => ({ ...f, networkId: id, networkName: net.name }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editBundle) {
      updateMutation.mutate({ id: editBundle.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Data Bundles</h1>
          <p className="text-gray-500 text-sm mt-1">Manage data packages for each network</p>
        </div>
        <Button onClick={openAdd} className="bg-[#E91E8C] hover:bg-[#d4197f] gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Bundle
        </Button>
      </div>

      {/* Network tabs */}
      <div className="flex gap-2 mb-6">
        {NETWORKS.map(net => (
          <button
            key={net.id}
            onClick={() => setActiveNetwork(net.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              activeNetwork === net.id
                ? "text-white border-transparent shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
            style={activeNetwork === net.id ? { backgroundColor: net.color, borderColor: net.color } : {}}
          >
            {net.name}
          </button>
        ))}
      </div>

      {/* Bundle list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Wifi className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No bundles yet for this network</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>Add first bundle</Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Validity</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Popular</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{b.name}</td>
                  <td className="px-5 py-3.5 text-gray-700">{b.data}</td>
                  <td className="px-5 py-3.5 text-gray-500">{b.validity}</td>
                  <td className="px-5 py-3.5">
                    {editingPrice?.id === b.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 font-medium">GHS</span>
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingPrice.value}
                          onChange={e => setEditingPrice({ id: b.id, value: e.target.value })}
                          onBlur={() => commitPrice(b)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.preventDefault(); commitPrice(b); }
                            if (e.key === "Escape") setEditingPrice(null);
                          }}
                          className="w-20 border border-[#E91E8C] rounded-lg px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#fce7f3]"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingPrice({ id: b.id, value: b.price.toFixed(2) })}
                        className="group flex items-center gap-1 rounded-lg px-2 py-1 -mx-2 hover:bg-pink-50 transition-colors"
                        title="Click to edit price"
                      >
                        <span className="font-semibold text-gray-900">GHS {b.price.toFixed(2)}</span>
                        <Pencil className="w-3 h-3 text-gray-300 group-hover:text-[#E91E8C] transition-colors" />
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{b.type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {b.popular && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editBundle ? "Edit Bundle" : "Add New Bundle"}</h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Network</label>
                <select
                  value={form.networkId}
                  onChange={e => handleNetworkChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]"
                >
                  {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bundle Name</label>
                  <input
                    required
                    placeholder="e.g. MTN 1GB Daily"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data Size</label>
                  <input
                    required
                    placeholder="e.g. 1GB"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Validity</label>
                  <input
                    required
                    placeholder="e.g. 1 Day"
                    value={form.validity}
                    onChange={e => setForm(f => ({ ...f, validity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price (GHS)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.price || ""}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]"
                >
                  {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#E91E8C]"
                />
                <span className="text-sm text-gray-700">Mark as popular</span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="flex-1 bg-[#E91E8C] hover:bg-[#d4197f]">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editBundle ? "Save Changes" : "Add Bundle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Delete bundle?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
