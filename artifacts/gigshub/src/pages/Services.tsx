import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetServices } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatGHS } from "@/lib/utils";
import { ShieldCheck, Wifi, UserPlus, PhoneCall, Zap, Smartphone } from "lucide-react";

export default function Services() {
  const { data: services, isLoading } = useGetServices();

  const getIcon = (category: string) => {
    switch (category) {
      case 'data': return <Wifi className="w-6 h-6" />;
      case 'airtime': return <PhoneCall className="w-6 h-6" />;
      case 'utility': return <Zap className="w-6 h-6" />;
      case 'registration': return <ShieldCheck className="w-6 h-6" />;
      default: return <Smartphone className="w-6 h-6" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">All Services</h1>
          <p className="text-muted-foreground mt-1">Explore all digital services available on GigsHub.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)
          ) : services && services.length > 0 ? (
            services.map((service) => (
              <div key={service.id} className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {getIcon(service.category)}
                </div>
                <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{service.description}</p>
                <div className="font-medium text-primary">From {formatGHS(service.price)}</div>
              </div>
            ))
          ) : (
            <>
              {/* Fallback Static Cards if API doesn't return anything */}
              <Link href="/bundles">
                <div className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg transition-all group cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Data Bundles</h3>
                  <p className="text-muted-foreground text-sm mb-4">Instant data top-ups for MTN, AT, and Telecel at discounted rates.</p>
                  <div className="font-medium text-primary hover:underline">Purchase &rarr;</div>
                </div>
              </Link>

              <Link href="/afa-registration">
                <div className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg transition-all group cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">AFA Registration</h3>
                  <p className="text-muted-foreground text-sm mb-4">Register your SIM card with your Ghana Card easily.</p>
                  <div className="font-medium text-primary hover:underline">Register &rarr;</div>
                </div>
              </Link>

              <Link href="/agent-registration">
                <div className="bg-white border border-border rounded-2xl p-6 hover:shadow-lg transition-all group cursor-pointer h-full">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Agent Registration</h3>
                  <p className="text-muted-foreground text-sm mb-4">Start your own business selling GigsHub services for commission.</p>
                  <div className="font-medium text-primary hover:underline">Apply &rarr;</div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
