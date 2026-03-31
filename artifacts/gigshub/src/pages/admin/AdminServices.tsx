import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("gigshub_token");
  const res = await fetch(`${API}api/admin${path}`, {
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

const CATEGORIES = [
  { value: "mtn",        label: "MTN – Data Package",       color: "bg-yellow-100 text-yellow-700" },
  { value: "airteltigo", label: "AirtelTigo – Data Package", color: "bg-blue-100 text-blue-700" },
  { value: "telecel",    label: "Telecel – Data Package",    color: "bg-red-100 text-red-700" },
  { value: "registration", label: "Registration",           color: "bg-indigo-100 text-indigo-700" },
  { value: "wallet",     label: "Wallet / Payment",          color: "bg-emerald-100 text-emerald-700" },
  { value: "other",      label: "Other",                     color: "bg-gray-100 text-gray-600" },
];

function getCategoryMeta(value: string) {
  return CATEGORIES.find(c => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  iconUrl?: string | null;
};

type ServiceForm = Omit<Service, "id">;

const emptyForm = (): ServiceForm => ({
  name: "",
  description: "",
  category: "mtn",
  price: 0,
  iconUrl: "",
});

export default function AdminServices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  function openAdd() { setForm(emptyForm()); setEditService(null); setShowForm(true); }
  function openEdit(s: Service) {
    setForm({ name: s.name, description: s.description, category: s.category, price: s.price, iconUrl: s.iconUrl ?? "" });
    setEditService(s);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditService(null); setForm(emptyForm()); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editService) {
      updateMutation.mutate({ id: editService.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Services & Packages</h1>
          <p className="text-gray-500 text-sm mt-1">Packages shown on the All Services page, grouped by network</p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(s => {
            const cat = getCategoryMeta(s.category);
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cat.color}`}>
                    {cat.label}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mt-2">{s.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>
                <div className="mt-3">
                  <span className="text-sm font-bold text-primary">GHS {s.price.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editService ? "Edit Package" : "Add New Package"}</h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Network / Category</label>
                <select
                  required
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  MTN/AirtelTigo/Telecel packages appear on the Services page under that network.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Package Name</label>
                <input
                  required
                  placeholder="e.g. 5GB Monthly Bundle"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Brief description of the package"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="flex-1">
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
