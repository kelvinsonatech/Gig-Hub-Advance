import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { useGetWallet, useGetOrders } from "@workspace/api-client-react";
import { formatGHS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wifi, ShieldCheck, Plus, History, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: wallet, isLoading: isLoadingWallet } = useGetWallet();
  const { data: orders, isLoading: isLoadingOrders } = useGetOrders();

  const recentOrders = orders?.slice(0, 3) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your account today.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wallet Card */}
          <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-primary-foreground/80 font-medium mb-1">Available Balance</p>
                {isLoadingWallet ? (
                  <div className="h-10 w-48 bg-white/20 animate-pulse rounded-lg" />
                ) : (
                  <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    {formatGHS(wallet?.balance)}
                  </h2>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <Button variant="secondary" asChild className="rounded-xl px-6">
                  <Link href="/wallet"><Plus className="w-4 h-4 mr-2" /> Top Up Wallet</Link>
                </Button>
                <Button variant="outline" className="rounded-xl border-white/20 text-white hover:bg-white/10" asChild>
                  <Link href="/bundles">Buy Data</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-rows-2 gap-4">
            <Link href="/bundles">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 hover:bg-orange-100 transition-colors h-full flex flex-col justify-center cursor-pointer group">
                <div className="w-10 h-10 bg-orange-200 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Wifi className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-orange-900">Buy Data</h3>
                <p className="text-sm text-orange-700/80">MTN, AT, Telecel</p>
              </div>
            </Link>
            
            <Link href="/afa-registration">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 hover:bg-indigo-100 transition-colors h-full flex flex-col justify-center cursor-pointer group">
                <div className="w-10 h-10 bg-indigo-200 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-indigo-900">AFA Register</h3>
                <p className="text-sm text-indigo-700/80">Ghana Card Link</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Recent Orders
            </h2>
            <Link href="/orders" className="text-sm font-medium text-primary hover:underline flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
            {isLoadingOrders ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Loading orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">No orders yet</h3>
                <p className="text-muted-foreground mb-6">You haven't made any purchases yet.</p>
                <Button asChild className="rounded-xl">
                  <Link href="/bundles">Browse Bundles</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                        {order.type === 'bundle' ? <Wifi className="w-5 h-5 text-primary" /> : <ShieldCheck className="w-5 h-5 text-indigo-600" />}
                      </div>
                      <div>
                        <p className="font-bold capitalize">{order.type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{formatGHS(order.amount)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'pending' || order.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
