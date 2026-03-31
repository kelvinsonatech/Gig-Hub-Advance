import { useGetServices } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatGHS } from "@/lib/utils";
import { ShieldCheck, UserPlus, Smartphone, ArrowRight, ChevronRight, Wifi, Package } from "lucide-react";
import { motion } from "framer-motion";

const NETWORKS = [
  {
    id: "mtn",
    name: "MTN",
    tagline: "Ghana's Largest Network",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.jpg/500px-New-mtn-logo.jpg",
    gradient: "linear-gradient(135deg, #e6a800 0%, #FFCC00 55%, #ffe066 100%)",
    glowHex: "#f59e0b",
    dark: true,
    btnBg: "rgba(0,0,0,0.18)",
    btnText: "#1a1a1a",
    btnHoverBg: "rgba(0,0,0,0.28)",
    pkgBg: "rgba(0,0,0,0.10)",
    pkgBorder: "rgba(0,0,0,0.10)",
    pkgText: "text-black/80",
    priceColor: "text-black/90",
    titleText: "text-gray-900",
    taglineText: "text-black/60",
  },
  {
    id: "airteltigo",
    name: "AirtelTigo",
    tagline: "Connecting Communities",
    logoUrl: "https://recharge-prd.asset.akeneo.cloud/product_assets/media/recharge_com_airteltigo_product_card.png",
    gradient: "linear-gradient(135deg, #002f5c 0%, #004b87 55%, #0077cc 100%)",
    glowHex: "#60a5fa",
    dark: false,
    btnBg: "rgba(255,255,255,0.18)",
    btnText: "#ffffff",
    btnHoverBg: "rgba(255,255,255,0.28)",
    pkgBg: "rgba(255,255,255,0.12)",
    pkgBorder: "rgba(255,255,255,0.15)",
    pkgText: "text-white/80",
    priceColor: "text-white",
    titleText: "text-white",
    taglineText: "text-white/60",
  },
  {
    id: "telecel",
    name: "Telecel",
    tagline: "Fast & Reliable Data",
    logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJQ6fNzCpMhlyaxWqlXYqmY7Bb5KZBIQt_1Q&s",
    gradient: "linear-gradient(135deg, #7f1d1d 0%, #CC0000 55%, #ef4444 100%)",
    glowHex: "#f87171",
    dark: false,
    btnBg: "rgba(255,255,255,0.18)",
    btnText: "#ffffff",
    btnHoverBg: "rgba(255,255,255,0.28)",
    pkgBg: "rgba(255,255,255,0.12)",
    pkgBorder: "rgba(255,255,255,0.15)",
    pkgText: "text-white/80",
    priceColor: "text-white",
    titleText: "text-white",
    taglineText: "text-white/60",
  },
];

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
  {
    href: "/wallet",
    icon: Smartphone,
    color: "bg-blue-100 text-blue-600",
    glow: "group-hover:shadow-blue-100",
    title: "Wallet & Top-Up",
    desc: "Fund your TurboGH wallet using MoMo, Telecel Cash, or AT Money.",
  },
];

export default function Services() {
  const { data: services = [], isLoading } = useGetServices();

  const getNetworkPackages = (networkId: string) =>
    services.filter(s => s.category === networkId);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-primary font-semibold text-sm mb-2 uppercase tracking-widest">What We Offer</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">All Services</h1>
          <p className="text-gray-500 text-base max-w-xl">
            Stay connected and compliant in Ghana — data bundles, registrations and more, all in one place.
          </p>
        </motion.div>

        {/* ── Network Provider Cards ── */}
        <section className="mb-14">
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-widest mb-5">Data Bundles by Network</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {NETWORKS.map((net, i) => {
              const packages = getNetworkPackages(net.id);
              return (
                <motion.div
                  key={net.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 220, damping: 22 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="relative overflow-hidden rounded-3xl shadow-lg flex flex-col cursor-default"
                  style={{ background: net.gradient }}
                >
                  {/* Ambient glow blob top-left */}
                  <div
                    className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-3xl opacity-40 pointer-events-none"
                    style={{ background: net.glowHex }}
                  />

                  {/* BLURRED LOGO WATERMARK — large, bottom-right */}
                  <div className="absolute -right-6 -bottom-6 w-44 h-44 opacity-25 blur-xl pointer-events-none select-none">
                    <img
                      src={net.logoUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Subtle grid/noise overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{
                      backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,#fff 24px,#fff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#fff 24px,#fff 25px)",
                    }}
                  />

                  {/* Content */}
                  <div className="relative z-10 p-6 flex flex-col">

                    {/* Logo pill + name */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/50">
                        <img
                          src={net.logoUrl}
                          alt={net.name}
                          className="w-full h-full object-contain p-1.5"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div>
                        <h3 className={`font-black text-xl tracking-tight ${net.titleText}`}>{net.name}</h3>
                        <p className={`text-xs font-medium ${net.taglineText}`}>{net.tagline}</p>
                      </div>
                    </div>

                    {/* Packages */}
                    <div className="mb-5">
                      {isLoading ? (
                        <div className="space-y-2">
                          {[1, 2].map(j => (
                            <div key={j} className="h-9 rounded-xl animate-pulse" style={{ background: net.pkgBg }} />
                          ))}
                        </div>
                      ) : packages.length > 0 ? (
                        <div className="space-y-2">
                          {packages.slice(0, 3).map(pkg => (
                            <div
                              key={pkg.id}
                              className="flex items-center justify-between rounded-xl px-3 py-2.5 backdrop-blur-sm"
                              style={{
                                background: net.pkgBg,
                                border: `1px solid ${net.pkgBorder}`,
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Wifi className={`w-3.5 h-3.5 shrink-0 ${net.pkgText}`} />
                                <span className={`text-xs font-semibold truncate ${net.pkgText}`}>{pkg.name}</span>
                              </div>
                              <span className={`text-xs font-black shrink-0 ml-2 ${net.priceColor}`}>
                                {formatGHS(pkg.price)}
                              </span>
                            </div>
                          ))}
                          {packages.length > 3 && (
                            <p className={`text-[11px] text-center ${net.taglineText}`}>
                              +{packages.length - 3} more
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* CTA button */}
                    <Link href="/bundles">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="w-full h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 backdrop-blur-sm transition-all"
                        style={{
                          background: net.dark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
                          color: net.dark ? "#1a1a1a" : "#ffffff",
                          border: net.dark ? "1.5px solid rgba(0,0,0,0.15)" : "1.5px solid rgba(255,255,255,0.35)",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = net.dark
                            ? "rgba(0,0,0,0.25)"
                            : "rgba(255,255,255,0.32)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = net.dark
                            ? "rgba(0,0,0,0.15)"
                            : "rgba(255,255,255,0.2)";
                        }}
                      >
                        View All Packages <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
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

            {/* Admin-added non-network services */}
            {!isLoading && services
              .filter(s => !["mtn", "airteltigo", "telecel"].includes(s.category))
              .map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.54 + i * 0.08, type: "spring", stiffness: 220, damping: 22 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 h-full hover:shadow-md transition-all">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <Package className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{s.name}</h3>
                    <p className="text-gray-500 text-xs mb-3 leading-relaxed line-clamp-2">{s.description}</p>
                    <span className="text-primary font-bold text-xs">From {formatGHS(s.price)}</span>
                  </div>
                </motion.div>
              ))}
          </div>
        </section>

      </div>
    </div>
  );
}
