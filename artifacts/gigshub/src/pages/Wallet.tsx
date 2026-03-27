import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetWallet, useTopupWallet, type TopupRequestPaymentMethod } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/utils";
import { CreditCard, Wallet as WalletIcon, ArrowDownToLine, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Wallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: wallet, isLoading } = useGetWallet();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TopupRequestPaymentMethod>("momo");
  
  const topupMutation = useTopupWallet({
    mutation: {
      onSuccess: () => {
        toast({ title: "Top-up successful!", description: `Added ${formatGHS(Number(amount))} to your wallet.` });
        setAmount("");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Top-up failed", description: err?.message || "Could not process payment." });
      }
    }
  });

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    topupMutation.mutate({
      data: { amount: Number(amount), paymentMethod: method }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <WalletIcon className="w-8 h-8 text-primary" /> Wallet
          </h1>
          <p className="text-muted-foreground mt-1">Manage your funds and view transaction history.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Balance & Topup Form */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
              <p className="text-slate-300 font-medium mb-2">Available Balance</p>
              {isLoading ? (
                <div className="h-12 w-48 bg-white/10 animate-pulse rounded-lg" />
              ) : (
                <h2 className="text-5xl font-extrabold tracking-tight">
                  {formatGHS(wallet?.balance)}
                </h2>
              )}
            </div>

            <div className="bg-white border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-primary" /> Add Funds
              </h3>
              
              <form onSubmit={handleTopup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Add (GHS)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 font-bold text-muted-foreground">₵</span>
                    <Input 
                      id="amount" 
                      type="number" 
                      min="1" 
                      step="1"
                      placeholder="0.00" 
                      className="pl-10 h-12 rounded-xl text-lg font-bold"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setMethod("momo")}
                      className={`h-14 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${method === 'momo' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-slate-50'}`}
                    >
                      <Smartphone className="w-5 h-5" /> Mobile Money
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMethod("card")}
                      className={`h-14 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${method === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-slate-50'}`}
                    >
                      <CreditCard className="w-5 h-5" /> Card
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={!amount || topupMutation.isPending}
                  className="w-full h-12 rounded-xl text-base shadow-md shadow-primary/20 hover:shadow-lg transition-all"
                >
                  {topupMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ${amount ? formatGHS(Number(amount)) : ''}`}
                </Button>
              </form>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white border border-border rounded-3xl p-6 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold mb-6">Recent Transactions</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[500px]">
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
                </div>
              ) : !wallet?.transactions || wallet.transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No transactions yet.</p>
                </div>
              ) : (
                wallet.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-foreground'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatGHS(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Ensure Smartphone icon is imported since it's used in the wallet page
import { Smartphone } from "lucide-react";
