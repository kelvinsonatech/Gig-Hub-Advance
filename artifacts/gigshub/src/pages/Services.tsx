import { useGetServices } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatGHS } from "@/lib/utils";
import { ShieldCheck, UserPlus, Smartphone, ArrowRight, ChevronRight, Wifi, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const NETWORKS = [
  {
    id: "mtn",
    name: "MTN",
    tagline: "Ghana's Largest Network",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.jpg/500px-New-mtn-logo.jpg",
    bg: "from-yellow-400 to-yellow-500",
    badge: "bg-yellow-100 text-yellow-800",
    ring: "ring-yellow-200",
    accent: "text-yellow-600",
    cardBg: "bg-gradient-to-br from-yellow-50 to-white",
  },
  {
    id: "airteltigo",
    name: "AirtelTigo",
    tagline: "Connecting Communities",
    logoUrl: "https://recharge-prd.asset.akeneo.cloud/product_assets/media/recharge_com_airteltigo_product_card.png",
    bg: "from-[#004b87] to-[#0069b4]",
    badge: "bg-blue-100 text-blue-800",
    ring: "ring-blue-200",
    accent: "text-[#004b87]",
    cardBg: "bg-gradient-to-br from-blue-50 to-white",
  },
  {
    id: "telecel",
    name: "Telecel",
    tagline: "Fast & Reliable Data",
    logoUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJQ6fNzCpMhlyaxWqlXYqmY7Bb5KZBIQt_1Q&s",
    bg: "from-red-600 to-red-700",
    badge: "bg-red-100 text-red-800",
    ring: "ring-red-200",
    accent: "text-red-600",
    cardBg: "bg-gradient-to-br from-red-50 to-white",
  },
];

const OTHER_SERVICES = [
  {
    href: "/afa-registration",
    icon: ShieldCheck,
    color: "bg-indigo-100 text-indigo-600",
    title: "AFA / Ghana Card Registration",
    desc: "Register your SIM card with your Ghana Card quickly and securely.",
  },
  {
    href: "/agent-registration",
    icon: UserPlus,
    color: "bg-emerald-100 text-emerald-600",
    title: "Become an Agent",
    desc: "Start your own business selling TurboGH services and earn commissions.",
  },
  {
    href: "/wallet",
    icon: Smartphone,
    color: "bg-blue-100 text-blue-600",
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
        <div className="mb-10">
          <p className="text-primary font-semibold text-sm mb-2 uppercase tracking-widest">What We Offer</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">All Services</h1>
          <p className="text-gray-500 text-base max-w-xl">
            Stay connected and compliant in Ghana — data bundles, registrations and more, all in one place.
          </p>
        </div>

        {/* ── Network Provider Cards ── */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Data Bundles by Network</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {NETWORKS.map((net, i) => {
              const packages = getNetworkPackages(net.id);
              return (
                <motion.div
                  key={net.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={`relative overflow-hidden rounded-2xl border ${net.cardBg} ring-1 ${net.ring} shadow-sm flex flex-col`}
                >
                  {/* Top band */}
                  <div className={`bg-gradient-to-r ${net.bg} h-1.5 w-full`} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Logo + label */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-white shadow-sm ring-1 ring-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={net.logoUrl}
                          alt={net.name}
                          className="w-full h-full object-contain p-1"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-base">{net.name}</h3>
                        <p className="text-xs text-gray-500">{net.tagline}</p>
                      </div>
                    </div>

                    {/* Featured packages from admin */}
                    {isLoading ? (
                      <div className="space-y-2 mb-4">
                        {[1, 2].map(i => (
                          <div key={i} className="h-10 bg-white/60 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : packages.length > 0 ? (
                      <div className="space-y-2 mb-4 flex-1">
                        {packages.slice(0, 3).map(pkg => (
                          <div
                            key={pkg.id}
                            className="flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Wifi className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-xs font-semibold text-gray-800 truncate">{pkg.name}</span>
                            </div>
                            <span className={`text-xs font-bold ${net.accent} shrink-0 ml-2`}>
                              {formatGHS(pkg.price)}
                            </span>
                          </div>
                        ))}
                        {packages.length > 3 && (
                          <p className="text-xs text-gray-400 text-center">+{packages.length - 3} more packages</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-3 mb-4">
                        <p className="text-xs text-gray-400 text-center">Bundle packages available in-app</p>
                      </div>
                    )}

                    {/* CTA */}
                    <Link href="/bundles">
                      <Button
                        className="w-full h-9 text-xs font-bold rounded-xl"
                        style={
                          net.id === "mtn"
                            ? { background: "#FFCC00", color: "#1a1a1a" }
                            : net.id === "airteltigo"
                            ? { background: "#004b87", color: "#fff" }
                            : { background: "#CC0000", color: "#fff" }
                        }
                      >
                        View All Packages <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Other Services ── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Other Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {OTHER_SERVICES.map((s, i) => (
              <motion.div
                key={s.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.21 + i * 0.07 }}
              >
                <Link href={s.href}>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer h-full group">
                    <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-primary transition-colors">{s.title}</h3>
                    <p className="text-gray-500 text-xs mb-3 leading-relaxed">{s.desc}</p>
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
                  transition={{ delay: 0.42 + i * 0.07 }}
                >
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 h-full">
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
