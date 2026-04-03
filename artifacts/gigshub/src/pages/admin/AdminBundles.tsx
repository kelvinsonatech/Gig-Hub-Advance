import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star, X, Loader2, Wifi, Package, Clock, Tag, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API } from "@/lib/api";


const TYPE_COLORS: Record<string, string> = {
  "expiry":     "bg-blue-50  text-blue-600  border border-blue-200",
  "non-expiry": "bg-green-50 text-green-600 border border-green-200",
};
const TYPE_LABELS: Record<string, string> = {
  "expiry":     "Expiry",
  "non-expiry": "No Expiry",
};
const TYPES = ["expiry", "non-expiry"];

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

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

type Network = {
  id: string;
  name: string;
  code: string;
  color: string;
  logoUrl?: string | null;
  tagline?: string | null;
};
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
type NetForm = { name: string; code: string; tagline: string; logoUrl: string; color: string };

const emptyBundleForm = (net?: Network): BundleForm => ({
  networkId: net?.id ?? "",
  networkName: net?.name ?? "",
  name: "",
  data: "",
  validity: "",
  price: 0,
  type: "expiry",
  popular: false,
});

const emptyNetForm = (): NetForm => ({ name: "", code: "", tagline: "", logoUrl: "", color: "#E91E8C" });

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-100 focus:border-[#E91E8C] transition-colors";

export default function AdminBundles() {
  const qc = useQueryClient();
  const { toast } = useToast();

  /* ── networks (dynamic from API) ── */
  const { data: networks = [], isLoading: networksLoading } = useQuery<Network[]>({
    queryKey: ["admin-networks"],
    queryFn: () => apiFetch("/networks"),
  });

  const [activeNetwork, setActiveNetwork] = useState<string>("");

  useEffect(() => {
    if (networks.length > 0 && !activeNetwork) setActiveNetwork(networks[0].id);
  }, [networks, activeNetwork]);

  const activeNet = networks.find(n => n.id === activeNetwork) ?? networks[0];

  /* ── bundles ── */
  const { data: bundles = [], isLoading: bundlesLoading } = useQuery<Bundle[]>({
    queryKey: ["admin-bundles"],
    queryFn: () => apiFetch("/bundles"),
  });

  const filtered = bundles.filter(b => b.networkId === activeNetwork);
  const isLoading = networksLoading || (!!activeNetwork && bundlesLoading);

  /* ── bundle form state ── */
  const [showForm, setShowForm] = useState(false);
  const [editBundle, setEditBundle] = useState<Bundle | null>(null);
  const [form, setForm] = useState<BundleForm>(emptyBundleForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── add/edit-network form state ── */
  const [showNetForm, setShowNetForm] = useState(false);
  const [editNet, setEditNet] = useState<Network | null>(null);
  const [netForm, setNetForm] = useState<NetForm>(emptyNetForm());
  const [deleteNetId, setDeleteNetId] = useState<string | null>(null);
  /* ── mutations ── */
  const createBundle = useMutation({
    mutationFn: (d: BundleForm) => apiFetch("/bundles", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bundles"] });
      qc.invalidateQueries({ queryKey: ["bundles"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Bundle added" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Failed to add bundle", description: e.message, variant: "destructive" }),
  });

  const updateBundle = useMutation({
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

  const deleteBundle = useMutation({
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

  const createNetwork = useMutation({
    mutationFn: (d: NetForm) => apiFetch("/networks", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: (net: Network) => {
      qc.invalidateQueries({ queryKey: ["admin-networks"] });
      qc.invalidateQueries({ queryKey: ["networks"] });
      toast({ title: `"${net.name}" network added` });
      setActiveNetwork(net.id);
      closeNetForm();
    },
    onError: (e: Error) => toast({ title: "Failed to add network", description: e.message, variant: "destructive" }),
  });

  const updateNetwork = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NetForm }) =>
      apiFetch(`/networks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-networks"] });
      qc.invalidateQueries({ queryKey: ["networks"] });
      toast({ title: "Network updated" });
      closeNetForm();
    },
    onError: (e: Error) => toast({ title: "Failed to update network", description: e.message, variant: "destructive" }),
  });

  const deleteNetwork = useMutation({
    mutationFn: (id: string) => apiFetch(`/networks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-networks"] });
      qc.invalidateQueries({ queryKey: ["networks"] });
      toast({ title: "Network deleted" });
      setDeleteNetId(null);
      setActiveNetwork(null);
    },
    onError: (e: Error) => toast({ title: "Failed to delete network", description: e.message, variant: "destructive" }),
  });

  /* ── handlers ── */
  function openAdd() {
    setForm(emptyBundleForm(activeNet));
    setEditBundle(null);
    setShowForm(true);
  }
  function openEdit(b: Bundle) {
    setForm({ networkId: b.networkId, networkName: b.networkName, name: b.name, data: b.data, validity: b.validity, price: b.price, type: b.type, popular: b.popular });
    setEditBundle(b);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditBundle(null); setForm(emptyBundleForm(activeNet)); }

  function openEditNet(net: Network) {
    setEditNet(net);
    setNetForm({ name: net.name, code: net.code, tagline: net.tagline ?? "", logoUrl: net.logoUrl ?? "", color: net.color });
    setShowNetForm(true);
  }

  function closeNetForm() {
    setShowNetForm(false);
    setEditNet(null);
    setNetForm(emptyNetForm());
  }

  function handleNetworkChange(id: string) {
    const net = networks.find(n => n.id === id);
    if (net) setForm(f => ({ ...f, networkId: net.id, networkName: net.name }));
  }

  function handleBundleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editBundle) updateBundle.mutate({ id: editBundle.id, data: form });
    else createBundle.mutate(form);
  }

  function handleNetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { ...netForm, code: netForm.code.toUpperCase() };
    if (editNet) updateNetwork.mutate({ id: editNet.id, data });
    else createNetwork.mutate(data);
  }

  const isSaving = createBundle.isPending || updateBundle.isPending;
  const accentColor = activeNet?.color ?? "#E91E8C";
  const accentLight = isLightColor(accentColor);
  const accentText = accentLight ? "#111827" : "#ffffff";

  return (
    <div className="p-4 sm:p-8 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Bundles</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage packages across all networks</p>
        </div>
        <button
          onClick={openAdd}
          disabled={!activeNet}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-[#d4197f] text-white text-sm font-semibold shadow-lg shadow-pink-200 transition-all active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Add Bundle
        </button>
      </div>

      {/* ── Network tabs ── */}
      {networksLoading ? (
        <div className="flex gap-3 mb-8">
          {[1, 2, 3].map(i => <div key={i} className="h-12 w-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="flex gap-3 mb-8 flex-wrap items-center">
          {networks.map(net => {
            const count = bundles.filter(b => b.networkId === net.id).length;
            const isActive = activeNetwork === net.id;
            const light = isLightColor(net.color);
            return (
              <div key={net.id} className="relative group/tab">
                <button
                  onClick={() => setActiveNetwork(net.id)}
                  className={`relative flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold transition-all border ${
                    isActive
                      ? "border-transparent shadow-md"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  style={isActive
                    ? { background: `linear-gradient(135deg, ${net.color}, ${net.color}cc)`, color: light ? "#111827" : "#fff" }
                    : {}}
                >
                  {net.logoUrl && (
                    <img src={net.logoUrl} alt="" className="w-4 h-4 object-contain rounded" />
                  )}
                  <span>{net.name}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/30 text-current" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                </button>
                {/* Edit pencil — appears on tab hover */}
                <button
                  onClick={e => { e.stopPropagation(); openEditNet(net); }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-[#E91E8C] hover:border-[#E91E8C] flex items-center justify-center opacity-0 group-hover/tab:opacity-100 transition-all z-10"
                  title="Edit network"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}

          {/* ── "+" Add Network tab ── */}
          <button
            onClick={() => { setShowNetForm(true); }}
            className="flex items-center justify-center w-11 h-11 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#E91E8C] hover:text-[#E91E8C] transition-all hover:bg-pink-50"
            title="Add a new network"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Bundle grid ── */}
      {!activeNet ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <Wifi className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">No networks yet.</p>
          <button
            onClick={() => setShowNetForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add first network
          </button>
        </div>
      ) : isLoading ? (
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
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />

              <div className="p-5">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl font-black leading-none tracking-tight" style={{ color: accentLight ? accentColor : accentColor }}>
                    {b.data}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-gray-800 mb-3 leading-tight">{b.name}</p>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{b.validity}</span>
                  <span className="text-gray-200">•</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[b.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {TYPE_LABELS[b.type] ?? b.type}
                  </span>
                  {b.popular && (
                    <>
                      <span className="text-gray-200">•</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    </>
                  )}
                </div>

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

      {/* ── Add Network modal ── */}
      {showNetForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${netForm.color}, ${netForm.color}88)` }} />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editNet ? "Edit Network" : "Add Network"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editNet ? `Editing "${editNet.name}"` : "New network tab on the Services page"}</p>
              </div>
              <button onClick={closeNetForm} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleNetSubmit} className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Network Name</label>
                <input required placeholder="e.g. Vodafone Ghana" value={netForm.name} onChange={e => setNetForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">URL Path / Code</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">/bundles?network=</span>
                  <input
                    required
                    placeholder="VODA"
                    value={netForm.code}
                    onChange={e => setNetForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                    className={inputCls + " pl-[140px] font-mono font-bold"}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Tapping "View Bundles" on the Services page goes to this URL.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Logo URL <span className="normal-case text-gray-400 font-normal">(optional)</span></label>
                <input type="url" placeholder="https://example.com/logo.png" value={netForm.logoUrl} onChange={e => setNetForm(f => ({ ...f, logoUrl: e.target.value }))} className={inputCls} />
                {netForm.logoUrl && <img src={netForm.logoUrl} alt="preview" className="mt-2 h-9 w-9 rounded-xl object-contain border border-gray-100" />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Brand Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={netForm.color}
                    onChange={e => setNetForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0"
                  />
                  {/* Live preview tab */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${netForm.color}, ${netForm.color}cc)`, color: isLightColor(netForm.color) ? "#111827" : "#fff" }}
                  >
                    {netForm.logoUrl ? (
                      <img src={netForm.logoUrl} alt="" className="w-4 h-4 object-contain rounded" />
                    ) : (
                      <Radio className="w-4 h-4 opacity-70" />
                    )}
                    <span>{netForm.name || "Network"}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeNetForm} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createNetwork.isPending || updateNetwork.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-[#d4197f] text-white text-sm font-semibold shadow-lg shadow-pink-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {(createNetwork.isPending || updateNetwork.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editNet ? "Save Changes" : "Add Network"}
                </button>
              </div>

              {editNet && (
                <div className="pt-1 border-t border-gray-100 mt-1">
                  <button
                    type="button"
                    onClick={() => { closeNetForm(); setDeleteNetId(editNet.id); }}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete this network
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit Bundle modal ── */}
      {showForm && activeNet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${form.networkId ? (networks.find(n => n.id === form.networkId)?.color ?? accentColor) : accentColor}, transparent)` }} />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editBundle ? "Edit Bundle" : "New Bundle"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editBundle ? "Update bundle details" : "Add a new data package"}</p>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBundleSubmit} className="px-6 py-5 space-y-4">

              {/* Network picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {networks.map(n => {
                    const light = isLightColor(n.color);
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNetworkChange(n.id)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          form.networkId === n.id ? "border-transparent shadow-md" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}
                        style={form.networkId === n.id ? { backgroundColor: n.color, color: light ? "#1a1a1a" : "#fff" } : {}}
                      >
                        {n.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name + Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Package className="w-3 h-3 inline mr-1" />Bundle Name
                  </label>
                  <input required placeholder="e.g. MTN 1GB Daily" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Data Size</label>
                  <input required placeholder="e.g. 1GB" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={inputCls} />
                </div>
              </div>

              {/* Validity + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Clock className="w-3 h-3 inline mr-1" />Validity
                  </label>
                  <input required placeholder="e.g. 1 Day" value={form.validity} onChange={e => setForm(f => ({ ...f, validity: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                    <Tag className="w-3 h-3 inline mr-1" />Price (GHS)
                  </label>
                  <input required type="number" min="0" step="0.01" placeholder="0.00" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className={inputCls} />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        form.type === t ? TYPE_COLORS[t] + " border-current shadow-sm" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={`w-9 h-5 rounded-full transition-colors relative ${form.popular ? "bg-[#E91E8C]" : "bg-gray-200"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.popular ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Mark as popular</p>
                  <p className="text-xs text-gray-400">Shows a star badge on the bundle card</p>
                </div>
                <input type="checkbox" checked={form.popular} onChange={e => setForm(f => ({ ...f, popular: e.target.checked }))} className="sr-only" />
              </label>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-[#E91E8C] hover:bg-[#d4197f] text-white text-sm font-semibold shadow-lg shadow-pink-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editBundle ? "Save Changes" : "Add Bundle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete bundle confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Delete bundle?</h3>
            <p className="text-sm text-gray-400 mb-6">This action cannot be undone. The bundle will be removed immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button disabled={deleteBundle.isPending} onClick={() => deleteBundle.mutate(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteBundle.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete network confirm ── */}
      {deleteNetId && (() => {
        const net = networks.find(n => n.id === deleteNetId);
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Delete "{net?.name}"?</h3>
              <p className="text-sm text-gray-400 mb-6">This will permanently remove the network and all its bundles. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteNetId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  disabled={deleteNetwork.isPending}
                  onClick={() => deleteNetwork.mutate(deleteNetId)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {deleteNetwork.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Network"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
