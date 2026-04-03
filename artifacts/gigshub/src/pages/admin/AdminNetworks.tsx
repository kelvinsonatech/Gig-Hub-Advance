import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Loader2, Radio, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

type Network = {
  id: string;
  name: string;
  code: string;
  color: string;
  logoUrl?: string | null;
  tagline?: string | null;
};
type NetworkForm = Omit<Network, "id">;

const emptyForm = (): NetworkForm => ({
  name: "",
  code: "",
  color: "#004b87",
  logoUrl: "",
  tagline: "",
});

/* ── Live card preview ── */
function CardPreview({ form }: { form: NetworkForm }) {
  const color = form.color || "#004b87";
  const light = isLightColor(color);
  const gradient = `linear-gradient(135deg, ${hexAdjust(color, -45)} 0%, ${color} 55%, ${hexAdjust(color, +30)} 100%)`;
  const textColor = light ? "#111827" : "#ffffff";
  const subColor = light ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)";
  const btnBg = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)";
  const btnBorder = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.35)";

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-md" style={{ background: gradient }}>
      {/* Glow */}
      <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: color }} />
      {/* Watermark */}
      {form.logoUrl && (
        <div className="absolute -right-4 -bottom-4 w-28 h-28 opacity-20 blur-xl pointer-events-none">
          <img src={form.logoUrl} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,#fff 24px,#fff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#fff 24px,#fff 25px)" }} />
      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/90 shadow flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/50">
            {form.logoUrl
              ? <img src={form.logoUrl} alt="" className="w-full h-full object-contain p-1" />
              : <Radio className="w-5 h-5" style={{ color }} />
            }
          </div>
          <div>
            <p className="font-black text-base leading-tight" style={{ color: textColor }}>{form.name || "Network Name"}</p>
            <p className="text-xs" style={{ color: subColor }}>{form.tagline || "Tagline"}</p>
          </div>
        </div>
        <div className="h-8 rounded-xl flex items-center justify-center gap-1 text-xs font-bold" style={{ background: btnBg, color: textColor, border: `1.5px solid ${btnBorder}` }}>
          View All <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

export default function AdminNetworks() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editNetwork, setEditNetwork] = useState<Network | null>(null);
  const [form, setForm] = useState<NetworkForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: networks = [], isLoading } = useQuery<Network[]>({
    queryKey: ["admin-networks"],
    queryFn: () => apiFetch("/networks"),
  });

  const createMutation = useMutation({
    mutationFn: (data: NetworkForm) => apiFetch("/networks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-networks"] });
      qc.invalidateQueries({ queryKey: ["networks"] });
      toast({ title: "Network card added" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Failed to add network", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NetworkForm }) =>
      apiFetch(`/networks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-networks"] });
      qc.invalidateQueries({ queryKey: ["networks"] });
      toast({ title: "Network updated" });
      closeForm();
    },
    onError: (e: Error) => toast({ title: "Failed to update network", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/networks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-networks"] });
      qc.invalidateQueries({ queryKey: ["networks"] });
      toast({ title: "Network removed" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ title: "Failed to remove network", description: e.message, variant: "destructive" }),
  });

  function openAdd() { setForm(emptyForm()); setEditNetwork(null); setShowForm(true); setColorAuto(false); }
  function openEdit(n: Network) {
    setForm({ name: n.name, code: n.code, color: n.color, logoUrl: n.logoUrl ?? "", tagline: n.tagline ?? "" });
    setEditNetwork(n);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditNetwork(null); setForm(emptyForm()); }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editNetwork) updateMutation.mutate({ id: editNetwork.id, data: form });
    else createMutation.mutate(form);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fce7f3] focus:border-[#E91E8C]";

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Network Cards</h1>
          <p className="text-gray-500 text-sm mt-1">
            These cards appear on the Services page under "Data Bundles by Network"
          </p>
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-pink-200 transition-all duration-200 hover:scale-105 hover:shadow-pink-300 active:scale-95"
          style={{ background: "linear-gradient(135deg, #f72585 0%, #E91E8C 55%, #c2185b 100%)" }}
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-white/20">
            <Plus className="w-3.5 h-3.5" />
          </span>
          Add Network
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : networks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <Radio className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No network cards yet.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}>Add first network</Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {networks.map(n => {
            const color = n.color || "#004b87";
            const light = isLightColor(color);
            const gradient = `linear-gradient(135deg, ${hexAdjust(color, -45)} 0%, ${color} 55%, ${hexAdjust(color, +30)} 100%)`;
            const textColor = light ? "#111827" : "#ffffff";
            const subColor = light ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)";
            const btnBg = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)";
            const btnBorder = light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.35)";

            return (
              <div key={n.id} className="relative overflow-hidden rounded-3xl shadow-lg group" style={{ background: gradient }}>
                {/* Glow */}
                <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: color }} />
                {/* Watermark */}
                {n.logoUrl && (
                  <div className="absolute -right-6 -bottom-6 w-44 h-44 opacity-20 blur-xl pointer-events-none">
                    <img src={n.logoUrl} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                {/* Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,#fff 24px,#fff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#fff 24px,#fff 25px)" }} />

                {/* Admin controls */}
                <div className="absolute top-3 right-3 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg backdrop-blur-sm text-white/80 hover:text-white" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(n.id)} className="p-1.5 rounded-lg backdrop-blur-sm text-white/80 hover:text-red-300" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Code badge */}
                <div className="absolute top-3 left-3 z-20">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm" style={{ background: light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)", color: light ? "#1a1a1a" : "#fff" }}>
                    {n.code}
                  </span>
                </div>

                {/* Content */}
                <div className="relative z-10 p-6 pt-11 flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/50">
                      {n.logoUrl ? <img src={n.logoUrl} alt={n.name} className="w-full h-full object-contain p-1" /> : <Radio className="w-6 h-6" style={{ color }} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-xl tracking-tight" style={{ color: textColor }}>{n.name}</h3>
                      <p className="text-sm font-medium" style={{ color: subColor }}>{n.tagline}</p>
                    </div>
                  </div>
                  <div className="h-11 rounded-2xl flex items-center justify-center gap-1 text-sm font-bold backdrop-blur-sm" style={{ background: btnBg, color: light ? "#1a1a1a" : "#fff", border: `1.5px solid ${btnBorder}` }}>
                    View All <ChevronRight className="w-3.5 h-3.5" />
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
              <h2 className="font-bold text-gray-900">{editNetwork ? "Edit Network" : "Add Network Card"}</h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Network Name</label>
                <input required placeholder="e.g. MTN Ghana" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Code</label>
                <input required placeholder="e.g. MTN" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inputCls} />
                <p className="text-[11px] text-gray-400 mt-1">Uppercase short code — used to link data bundles to this network.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tagline</label>
                <input placeholder="e.g. Ghana's Largest Network" value={form.tagline ?? ""} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Logo URL</label>
                <input type="url" placeholder="https://example.com/logo.png" value={form.logoUrl ?? ""} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} className={inputCls} />
                {form.logoUrl && <img src={form.logoUrl} alt="Preview" className="mt-2 h-10 w-10 rounded-xl object-contain border border-gray-100" />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Brand Colour</label>
                <div className="flex items-start gap-3">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0" />
                  <div className="flex-1">
                    <CardPreview form={form} />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Live preview — this is exactly how the card will appear on the Services page.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="flex-1 bg-[#E91E8C] hover:bg-[#d4197f]">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editNetwork ? "Save Changes" : "Add Network"}
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
            <h3 className="font-bold text-gray-900 mb-1">Remove network card?</h3>
            <p className="text-sm text-gray-500 mb-5">This will remove it from the Services page immediately.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteId)}>
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
