import { useGetServices } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatGHS } from "@/lib/utils";
import { ShieldCheck, Wifi, UserPlus, PhoneCall, Zap, Smartphone, ArrowRight } from "lucide-react";

const getIcon = (category: string) => {
  switch (category) {
    case 'data': return <Wifi className="w-6 h-6" />;
    case 'airtime': return <PhoneCall className="w-6 h-6" />;
    case 'utility': return <Zap className="w-6 h-6" />;
    case 'registration': return <ShieldCheck className="w-6 h-6" />;
    default: return <Smartphone className="w-6 h-6" />;
  }
};

const STATIC_SERVICES = [
  {
    href: "/bundles",
    icon: <Wifi className="w-6 h-6" />,
    color: "bg-orange-100 text-orange-600",
    title: "Data Bundles",
    desc: "Instant data top-ups for MTN, AirtelTigo, and Telecel at discounted rates.",
  },
  {
    href: "/afa-registration",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "bg-indigo-100 text-indigo-600",
    title: "AFA / Ghana Card Registration",
    desc: "Register your SIM card with your Ghana Card quickly and securely.",
  },
  {
    href: "/agent-registration",
    icon: <UserPlus className="w-6 h-6" />,
    color: "bg-emerald-100 text-emerald-600",
    title: "Become an Agent",
    desc: "Start your own business selling TurboGH services and earn commissions.",
  },
  {
    href: "/wallet",
    icon: <Smartphone className="w-6 h-6" />,
    color: "bg-blue-100 text-blue-600",
    title: "Wallet & Top-Up",
    desc: "Fund your TurboGH wallet using MoMo, Telecel Cash, or AT Money.",
  },
];

export default function Services() {
  const { data: services, isLoading } = useGetServices();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-28 md:pb-12">

        {/* Header */}
        <div className="mb-10">
          <p className="text-primary font-semibold text-sm mb-2 uppercase tracking-widest">What We Offer</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">All Services</h1>
          <p className="text-gray-500 text-lg max-w-xl">Everything you need to stay connected and compliant in Ghana — all in one place.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-44 bg-gray-200 rounded-2xl animate-pulse" />
            ))
          ) : services && services.length > 0 ? (
            services.map((service) => (
              <div key={service.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-shadow group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {getIcon(service.category)}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{service.description}</p>
                <div className="font-semibold text-primary text-sm">From {formatGHS(service.price)}</div>
              </div>
            ))
          ) : (
            STATIC_SERVICES.map((s) => (
              <Link key={s.href} href={s.href}>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-shadow group cursor-pointer h-full">
                  <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{s.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{s.desc}</p>
                  <span className="text-primary font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
