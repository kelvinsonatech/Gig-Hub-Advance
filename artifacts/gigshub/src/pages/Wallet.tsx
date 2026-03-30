import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetWallet, useTopupWallet, type TopupRequestPaymentMethod } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/utils";
import {
  CreditCard,
  Wallet as WalletIcon,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const QUICK_AMOUNTS = [20, 50, 100, 200, 500];

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
      },
    },
  });

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    topupMutation.mutate({ data: { amount: Number(amount), paymentMethod: method } });
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

          {/* ── Left column: balance card + top-up form ── */}
          <div className="space-y-5">

            {/* Balance card */}
            <div
              className="rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden isolate"
              style={{
                backgroundImage: `url("https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABUV_jDjJ4_X_PSYgTJthNlfoStaN1fqwW1vcTx8bKIwYizu5-VL1365SJPeFB1FIig2dpPVvYdgfODQ9DEKR8t9Ak3G5NIa1HeWv.jpg?r=513")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-orange-950/60" />
              <div className="absolute bottom-0 right-0 w-56 h-56 bg-primary/30 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <WalletIcon className="w-4 h-4 text-primary" />
                  <p className="text-white/70 text-sm font-medium tracking-wide uppercase">Available Balance</p>
                </div>
                {isLoading ? (
                  <div className="h-12 w-48 bg-white/10 animate-pulse rounded-lg mt-2" />
                ) : (
                  <h2 className="text-5xl font-extrabold tracking-tight mt-2 drop-shadow-lg">
                    {formatGHS(wallet?.balance)}
                  </h2>
                )}
                <div className="mt-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs font-semibold text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Wallet
                  </span>
                </div>
              </div>
            </div>

            {/* Add Funds form */}
            <div className="bg-white border border-border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Add Funds</h3>
                  <p className="text-xs text-muted-foreground">Instant top-up to your wallet</p>
                </div>
              </div>

              <form onSubmit={handleTopup} className="space-y-5">

                {/* Amount input */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">Amount (GHS)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground select-none">₵</span>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="0.00"
                      className="pl-9 h-14 rounded-2xl text-2xl font-extrabold border-2 focus-visible:ring-primary/30 tracking-tight"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Quick amount pills */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Select</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(String(q))}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                          amount === String(q)
                            ? "border-primary bg-primary text-white shadow-md shadow-primary/30"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                        }`}
                      >
                        ₵{q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment method */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMethod("momo")}
                      className={`h-16 rounded-2xl border-2 font-bold flex flex-col items-center justify-center gap-1 transition-all text-sm ${
                        method === "momo"
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:bg-slate-50 hover:border-primary/30"
                      }`}
                    >
                      <Smartphone className="w-5 h-5" />
                      <span>Mobile Money</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("card")}
                      className={`h-16 rounded-2xl border-2 font-bold flex flex-col items-center justify-center gap-1 transition-all text-sm ${
                        method === "card"
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:bg-slate-50 hover:border-primary/30"
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Card</span>
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={!amount || topupMutation.isPending}
                  className="w-full h-13 rounded-2xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  {topupMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      {amount ? `Top Up ${formatGHS(Number(amount))}` : "Enter an amount"}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* ── Right column: Transaction History ── */}
          <div className="bg-white border border-border rounded-3xl p-6 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold mb-6">Recent Transactions</h3>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[560px]">
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-2xl" />
                  ))}
                </div>
              ) : !wallet?.transactions || wallet.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                    <WalletIcon className="w-8 h-8 opacity-30" />
                  </div>
                  <p className="font-semibold text-sm">No transactions yet</p>
                  <p className="text-xs mt-1">Top up your wallet to get started</p>
                </div>
              ) : (
                wallet.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border/50 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          tx.type === "credit" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"
                        }`}
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground leading-tight">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}
                        </p>
                      </div>
                    </div>
                    <p className={`font-extrabold text-sm ${tx.type === "credit" ? "text-emerald-600" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}{formatGHS(tx.amount)}
                    </p>
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
