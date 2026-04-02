import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star, X, Loader2, Wifi, Package, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const NETWORKS = [
  { id: "1", name: "MTN",        color: "#FFCC00", text: "#9a7c00", bg: "from-yellow-400 to-amber-300",   ring: "ring-yellow-300" },
  { id: "2", name: "AirtelTigo", color: "#004b87", text: "#004b87", bg: "from-blue-700  to-blue-500",     ring: "ring-blue-300"   },
  { id: "3", name: "Telecel",    color: "#CC0000", text: "#CC0000", bg: "from-red-600   to-rose-500",     ring: "ring-red-300"    },
];

const TYPE_COLORS: Record<string, string> = {
  daily:   "bg-orange-50  text-orange-600  border border-orange-200",
  weekly:  "bg-blue-50    text-blue-600    border border-blue-200",
  monthly: "bg-purple-50  text-purple-600  border border-purple-200",
  special: "bg-emerald-50 text-emerald-600 border border-emerald-200",
};

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

  const { data: bundles = [], isLoading } = useQuery<Bundle[]>({
    queryKey: ["admin-bundles"],
    queryFn: () => apiFetch("/bundles"),
  });

  const filtered = bundles.filter(b => b.networkId === activeNetwork);
  const activeNet = NETWORKS.find(n => n.id === activeNetwork)!;

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
      toast({ title: "Bundle updated" });
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
    <div className="p-4 sm:p-8 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Bundles</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage packages across all networks</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-[#d4197f] text-white text-sm font-semibold shadow-lg shadow-pink-200 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Bundle
        </button>
      </div>

      {/* ── Network tabs ────────────────────────────────────────── */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {NETWORKS.map(net => {
          const count = bundles.filter(b => b.networkId === net.id).length;
          const isActive = activeNetwork === net.id;
          return (
            <button
              key={net.id}
              onClick={() => setActiveNetwork(net.id)}
              className={`relative flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold transition-all border ${
                isActive
                  ? "text-white border-transparent shadow-md"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }`}
              style={isActive ? { background: `linear-gradient(135deg, ${net.color}, ${net.color}cc)` } : {}}
            >
              <span>{net.name}</span>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-white/30 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Bundle grid ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <Wifi className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">No bundles yet for {activeNet.name}</p>
          <button
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add first bundle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => (
            <div
              key={b.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden"
            >
              {/* Card top band */}
              <div
                className={`h-1.5 w-full bg-gradient-to-r ${activeNet.bg}`}
              />

              <div className="p-5">
                {/* Top row: data size + actions */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="text-4xl font-black leading-none tracking-tight"
                    style={{ color: activeNet.color === "#FFCC00" ? activeNet.text : activeNet.color }}
                  >
                    {b.data}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(b.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bundle name */}
                <p className="text-sm font-semibold text-gray-800 mb-3 leading-tight">{b.name}</p>

                {/* Meta row */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{b.validity}</span>
                  <span className="text-gray-200">•</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[b.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {b.type}
                  </span>
                  {b.popular && (
                    <>
                      <span className="text-gray-200">•</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    </>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-semibold text-gray-400">GHS</span>
                  <span className="text-2xl font-black text-gray-900">{b.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Add card */}
          <button
            onClick={openAdd}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#E91E8C] hover:text-[#E91E8C] transition-colors min-h-[160px] group"
          >
            <div className="w-9 h-9 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:bg-pink-50 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">Add bundle</span>
          </button>
        </div>
      )}

      {/* ── Add / Edit modal ────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Modal header strip */}
            <div
              className="h-1.5 w-full"
              style={{ background: `linear-gradient(90deg, ${NETWORKS.find(n => n.id === form.networkId)?.color}, ${NETWORKS.find(n => n.id === form.networkId)?.color}88)` }}
            />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editBundle ? "Edit Bundle" : "New Bundle"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editBundle ? "Update bundle details" : "Add a new data package"}</p>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Network */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {NETWORKS.map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNetworkChange(n.id)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.networkId === n.id
                          ? "text-white border-transparent shadow-md"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      }`}
                      style={form.networkId === n.id ? { backgroundColor: n.color, borderColor: n.color, color: n.id === "1" ? "#7a5c00" : "white" } : {}}
                    >
                      {n.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Package className="w-3 h-3 inline mr-1" />Bundle Name
                  </label>
                  <input
                    required
                    placeholder="e.g. MTN 1GB Daily"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-[#E91E8C] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Data Size</label>
                  <input
                    required
                    placeholder="e.g. 1GB"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-[#E91E8C] transition-colors"
                  />
                </div>
              </div>

              {/* Validity + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Clock className="w-3 h-3 inline mr-1" />Validity
                  </label>
                  <input
                    required
                    placeholder="e.g. 1 Day"
                    value={form.validity}
                    onChange={e => setForm(f => ({ ...f, validity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-[#E91E8C] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Tag className="w-3 h-3 inline mr-1" />Price (GHS)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.price || ""}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-[#E91E8C] transition-colors"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                        form.type === t
                          ? TYPE_COLORS[t] + " border-current shadow-sm"
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={`w-9 h-5 rounded-full transition-colors relative ${form.popular ? "bg-[#E91E8C]" : "bg-gray-200"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.popular ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Mark as popular</p>
                  <p className="text-xs text-gray-400">Shows a star badge on the bundle card</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))}
                  className="sr-only"
                />
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-[#d4197f] text-white text-sm font-semibold shadow-lg shadow-pink-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editBundle ? "Save Changes" : "Add Bundle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ──────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Delete bundle?</h3>
            <p className="text-sm text-gray-400 mb-6">This action cannot be undone. The bundle will be removed immediately.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
