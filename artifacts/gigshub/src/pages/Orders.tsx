import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetOrders } from "@workspace/api-client-react";
import { formatGHS } from "@/lib/utils";
import { History, ShieldCheck, Wifi, UserPlus } from "lucide-react";
import { format } from "date-fns";

export default function Orders() {
  const { data: orders, isLoading } = useGetOrders();

  const getOrderIcon = (type: string) => {
    switch (type) {
      case 'bundle': return <Wifi className="w-5 h-5" />;
      case 'afa_registration': return <ShieldCheck className="w-5 h-5" />;
      case 'agent_registration': return <UserPlus className="w-5 h-5" />;
      default: return <History className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
      pending: "bg-orange-100 text-orange-700 border-orange-200",
      processing: "bg-blue-100 text-blue-700 border-blue-200",
      failed: "bg-red-100 text-red-700 border-red-200",
    }[status] || "bg-secondary text-secondary-foreground border-border";

    return (
      <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${styles}`}>
        {status}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <History className="w-8 h-8 text-primary" /> Order History
          </h1>
          <p className="text-muted-foreground mt-1">Track all your purchases and registrations.</p>
        </header>

        <div className="bg-white border border-border rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                      Loading your orders...
                    </td>
                  </tr>
                ) : !orders || orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            {getOrderIcon(order.type)}
                          </div>
                          <span className="font-bold capitalize">{order.type.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {formatGHS(order.amount)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        {order.id.slice(0, 8)}...
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
