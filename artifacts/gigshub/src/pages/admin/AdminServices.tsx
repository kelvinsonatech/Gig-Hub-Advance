import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Loader2, Wrench, Package, ChevronRight, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/* ── colour helpers ── */
function hexAdjust(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = Math.min(255, Math.max(0, parseInt(clean.slice(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(clean.slice(2, 4), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(clean.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

import { API } from "@/lib/api";

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

/* Non-network static categories */
const STATIC_CATEGORIES = [
  { value: "registration", label: "Registration",    badge: "bg-indigo-100 text-indigo-700" },
  { value: "wallet",       label: "Wallet / Payment", badge: "bg-emerald-100 text-emerald-700" },
  { value: "other",        label: "Other",             badge: "bg-gray-100 text-gray-600" },
];

type Network = { id: string; name: string; code: string; color: string; logoUrl?: string | null };

type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  iconUrl?: string | null;
  brandColor?: string | null;
};
type ServiceForm = Omit<Service, "id">;

const emptyForm = (firstNetCode = "other"): ServiceForm => ({
  name: "",
  description: "",
  category: firstNetCode,
  price: 0,
  iconUrl: "",
  brandColor: "#6366f1",
});

export default function AdminServices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ── fetch networks for dropdown ── */
  const { data: networks = [] } = useQuery<Network[]>({
    queryKey: ["admin-networks"],
    queryFn: () => apiFetch("/networks"),
  });

  /* ── build merged category list ── */
  const categories = useMemo(() => [
    ...networks.map(n => ({
      value: n.code.toLowerCase(),
      label: `${n.name} – Data Package`,
      badge: "bg-yellow-100 text-yellow-800",
      isNetwork: true,
      networkObj: n,
    })),
    ...STATIC_CATEGORIES.map(s => ({ ...s, isNetwork: false, networkObj: null })),
  ], [networks]);

  const networkCodes = useMemo(() => new Set(networks.map(n => n.code.toLowerCase())), [networks]);

  function getCatMeta(value: string) {
    return categories.find(c => c.value === value) ?? { label: value, badge: "bg-gray-100 text-gray-600", isNetwork: false, networkObj: null };
  }

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["admin-services"],
    queryFn: () => apiFetch("/services"),
  });

  const createMutation = useMutation({
    mutationFn: (data: ServiceForm) => apiFetch("/services", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Package added successfully" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Failed to add package", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServiceForm }) =>
      apiFetch(`/services/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Package updated successfully" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Failed to update package", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/services/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Package deleted" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ title: "Failed to delete package", description: e.message, variant: "destructive" }),
  });

  function openAdd() {
    const firstCode = networks[0]?.code.toLowerCase() ?? "other";
    setForm(emptyForm(firstCode));
    setEditService(null);
    setShowForm(true);
  }
  function openEdit(s: Service) {
    setForm({ name: s.name, description: s.description, category: s.category, price: s.price, iconUrl: s.iconUrl ?? "", brandColor: s.brandColor ?? "#6366f1" });
    setEditService(s);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditService(null); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editService) updateMutation.mutate({ id: editService.id, data: form });
    else createMutation.mutate(form);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]";

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Services & Packages</h1>
          <p className="text-gray-500 text-sm mt-1">Packages shown on the Services page, grouped by network</p>
        </div>
        <Button onClick={openAdd} className="bg-[#E91E8C] hover:bg-[#d4197f] gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Package
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Wrench className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No packages yet. Add one to feature it on the Services page.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>Add first package</Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(s => {
            const cat = getCatMeta(s.category);
            const isNet = networkCodes.has(s.category.toLowerCase());
            const color = s.brandColor || "#6366f1";

            if (isNet) {
              /* ── Network package ── */
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative group">
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-white shadow border border-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg bg-white shadow border border-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block mb-3 ${cat.badge}`}>{cat.label}</span>
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-gray-50 border border-gray-100 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Wifi className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-xs font-semibold text-gray-700 truncate">{s.name}</span>
                    </div>
                    <span className="text-xs font-black text-gray-900 shrink-0 ml-2">GHS {s.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{s.description}</p>
                </div>
              );
            }

            /* ── Non-network — gradient card preview ── */
            const gradient = `linear-gradient(135deg, ${hexAdjust(color, -45)} 0%, ${color} 55%, ${hexAdjust(color, +30)} 100%)`;
            const light = isLightColor(color);
            const textColor = light ? "#111827" : "#ffffff";
            const subColor = light ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)";
            const btnBg = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)";
            const btnBorder = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.3)";

            return (
              <div key={s.id} className="relative overflow-hidden rounded-3xl shadow-lg group" style={{ background: gradient }}>
                <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: color }} />
                {s.iconUrl && (
                  <div className="absolute -right-6 -bottom-6 w-44 h-44 opacity-20 blur-xl pointer-events-none">
                    <img src={s.iconUrl} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,#fff 24px,#fff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#fff 24px,#fff 25px)" }} />
                <div className="absolute top-3 right-3 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg backdrop-blur-sm text-white/80 hover:text-white" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg backdrop-blur-sm text-white/80 hover:text-red-300" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute top-3 left-3 z-20">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm" style={{ background: light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)", color: light ? "#1a1a1a" : "#fff" }}>
                    {cat.label}
                  </span>
                </div>
                <div className="relative z-10 p-6 pt-11 flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/50">
                      {s.iconUrl ? <img src={s.iconUrl} alt={s.name} className="w-full h-full object-contain p-1.5" /> : <Package className="w-6 h-6" style={{ color }} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg tracking-tight leading-tight" style={{ color: textColor }}>{s.name}</h3>
                      <p className="text-xs font-bold mt-0.5" style={{ color: subColor }}>From GHS {s.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: subColor }}>{s.description}</p>
                  <div className="w-full h-10 rounded-2xl text-sm font-bold flex items-center justify-center gap-1" style={{ background: btnBg, color: light ? "#1a1a1a" : "#ffffff", border: `1.5px solid ${btnBorder}` }}>
                    Get Started <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">{editService ? "Edit Package" : "Add New Package"}</h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Category — built from live networks + static */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Network / Category</label>
                <select
                  required
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className={inputCls + " bg-white"}
                >
                  {networks.length > 0 && (
                    <optgroup label="Network Data Packages">
                      {networks.map(n => (
                        <option key={n.id} value={n.code.toLowerCase()}>{n.name} – Data Package</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Other">
                    {STATIC_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Network packages appear as items inside that network's card on the Services page.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Package Name</label>
                <input required placeholder="e.g. 5GB Monthly Bundle" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea required rows={2} placeholder="Brief description of the package" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls + " resize-none"} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Price (GHS)</label>
                <input required type="number" min="0" step="0.01" placeholder="0.00" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Logo / Icon URL</label>
                <input type="url" placeholder="https://example.com/logo.png" value={form.iconUrl ?? ""} onChange={e => setForm(f => ({ ...f, iconUrl: e.target.value }))} className={inputCls} />
                <p className="text-[11px] text-gray-400 mt-1">Paste an image URL — it will appear as the package logo.</p>
                {form.iconUrl && <img src={form.iconUrl} alt="Preview" className="mt-2 h-10 w-10 rounded-xl object-contain border border-gray-100" />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Brand Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.brandColor ?? "#6366f1"}
                    onChange={e => setForm(f => ({ ...f, brandColor: e.target.value }))}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100" style={{ backgroundColor: (form.brandColor ?? "#6366f1") + "15" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (form.brandColor ?? "#6366f1") + "25" }}>
                      {form.iconUrl
                        ? <img src={form.iconUrl} alt="" className="w-5 h-5 object-contain rounded" />
                        : <Package className="w-4 h-4" style={{ color: form.brandColor ?? "#6366f1" }} />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{form.name || "Package name"}</p>
                      <p className="text-[11px] font-bold" style={{ color: form.brandColor ?? "#6366f1" }}>GHS {(form.price || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Used for non-network (Other) packages only.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="flex-1 bg-[#E91E8C] hover:bg-[#d4197f]">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editService ? "Save Changes" : "Add Package"}
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
            <h3 className="font-bold text-gray-900 mb-1">Delete package?</h3>
            <p className="text-sm text-gray-500 mb-5">This will remove it from the Services page immediately.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
