import { useQuery } from "@tanstack/react-query";
import { useGetServices } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatGHS } from "@/lib/utils";
import { ShieldCheck, UserPlus, ArrowRight, ChevronRight, Wifi, Radio } from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const OTHER_SERVICES = [
  {
    href: "/afa-registration",
    icon: ShieldCheck,
    color: "bg-indigo-100 text-indigo-600",
    glow: "group-hover:shadow-indigo-100",
    title: "AFA / Ghana Card Registration",
    desc: "Register your SIM card with your Ghana Card quickly and securely.",
  },
  {
    href: "/agent-registration",
    icon: UserPlus,
    color: "bg-emerald-100 text-emerald-600",
    glow: "group-hover:shadow-emerald-100",
    title: "Become an Agent",
    desc: "Start your own business selling TurboGH services and earn commissions.",
  },
];

type Network = {
  id: string;
  name: string;
  code: string;
  color: string;
  logoUrl?: string | null;
  tagline?: string | null;
};

export default function Services() {
  const { data: services = [], isLoading: servicesLoading } = useGetServices();

  const { data: networks = [], isLoading: networksLoading } = useQuery<Network[]>({
    queryKey: ["networks"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/networks`);
      if (!res.ok) throw new Error("Failed to fetch networks");
      return res.json();
    },
    staleTime: 60_000,
  });

  const getNetworkPackages = (net: Network) => {
    const byCode = net.code.toLowerCase();
    const byName = net.name.toLowerCase().split(" ")[0];
    return (services as any[]).filter(s => {
      const cat = (s.category ?? "").toLowerCase();
      return cat === byCode || cat === byName;
    });
  };

  const isLoading = servicesLoading || networksLoading;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-primary font-semibold text-sm mb-2 uppercase tracking-widest">What We Offer</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">All Services</h1>
          <p className="text-gray-500 text-base max-w-xl">
            Stay connected and compliant in Ghana — data bundles, registrations and more, all in one place.
          </p>
        </motion.div>

        {/* ── Network Provider Cards ── */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5">Data Bundles by Network</h2>

          {networksLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-52 rounded-3xl bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {networks.map((net, i) => {
                const color = net.color || "#6366f1";
                const light = isLightColor(color);
                const gradient = `linear-gradient(135deg, ${hexAdjust(color, -45)} 0%, ${color} 55%, ${hexAdjust(color, +30)} 100%)`;
                const textColor = light ? "text-gray-900" : "text-white";
                const taglineColor = light ? "text-black/60" : "text-white/60";
                const pkgBg = light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)";
                const pkgBorder = light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.15)";
                const pkgText = light ? "text-black/80" : "text-white/80";
                const priceColor = light ? "text-black/90" : "text-white";
                const btnBg = light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)";
                const btnBgHover = light ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.32)";
                const btnBorder = light ? "1.5px solid rgba(0,0,0,0.15)" : "1.5px solid rgba(255,255,255,0.35)";
                const btnColor = light ? "#1a1a1a" : "#ffffff";
                const packages = getNetworkPackages(net);

                return (
                  <motion.div
                    key={net.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 220, damping: 22 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className="relative overflow-hidden rounded-3xl shadow-lg flex flex-col cursor-default"
                    style={{ background: gradient }}
                  >
                    {/* Ambient glow */}
                    <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: color }} />

                    {/* Blurred logo watermark */}
                    {net.logoUrl && (
                      <div className="absolute -right-6 -bottom-6 w-44 h-44 opacity-25 blur-xl pointer-events-none select-none">
                        <img src={net.logoUrl} alt="" className="w-full h-full object-contain" />
                      </div>
                    )}

                    {/* Grid overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-[0.04]"
                      style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,#fff 24px,#fff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#fff 24px,#fff 25px)" }}
                    />

                    {/* Content */}
                    <div className="relative z-10 p-6 flex flex-col sm:flex-col">
                      <div className="flex items-center gap-5 sm:flex-col sm:items-start sm:gap-0">

                        {/* Logo + name */}
                        <div className="flex items-center gap-5 sm:mb-5 flex-1 min-w-0">
                          <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/50">
                            {net.logoUrl ? (
                              <img src={net.logoUrl} alt={net.name} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <Radio className="w-7 h-7" style={{ color }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className={`font-black text-xl tracking-tight ${textColor}`}>{net.name}</h3>
                            <p className={`text-sm font-medium truncate ${taglineColor}`}>{net.tagline}</p>
                          </div>
                        </div>

                        {/* Packages list (desktop only) */}
                        {packages.length > 0 && (
                          <div className="hidden sm:block w-full mb-5 space-y-2">
                            {isLoading ? (
                              [1, 2].map(j => <div key={j} className="h-9 rounded-xl animate-pulse" style={{ background: pkgBg }} />)
                            ) : (
                              packages.slice(0, 3).map((pkg: any) => (
                                <div key={pkg.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 backdrop-blur-sm" style={{ background: pkgBg, border: `1px solid ${pkgBorder}` }}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Wifi className={`w-3.5 h-3.5 shrink-0 ${pkgText}`} />
                                    <span className={`text-xs font-semibold truncate ${pkgText}`}>{pkg.name}</span>
                                  </div>
                                  <span className={`text-xs font-black shrink-0 ml-2 ${priceColor}`}>{formatGHS(pkg.price)}</span>
                                </div>
                              ))
                            )}
                            {packages.length > 3 && <p className={`text-[11px] text-center ${taglineColor}`}>+{packages.length - 3} more</p>}
                          </div>
                        )}

                        {/* CTA */}
                        <Link href={`/bundles?network=${net.code}`} className="shrink-0 sm:w-full">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="h-9 sm:h-11 px-4 sm:px-0 sm:w-full rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 backdrop-blur-sm transition-all whitespace-nowrap"
                            style={{ background: btnBg, color: btnColor, border: btnBorder }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = btnBgHover; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = btnBg; }}
                          >
                            View All <ChevronRight className="w-3.5 h-3.5" />
                          </motion.button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Other Services ── */}
        <section>
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5">Other Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {OTHER_SERVICES.map((s, i) => (
              <motion.div
                key={s.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 220, damping: 22 }}
                whileHover={{ y: -4 }}
              >
                <Link href={s.href}>
                  <div className={`bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg ${s.glow} transition-all cursor-pointer h-full group`}>
                    <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-primary transition-colors">{s.title}</h3>
                    <p className="text-gray-500 text-xs mb-4 leading-relaxed">{s.desc}</p>
                    <span className="text-primary font-semibold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                      Get Started <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
