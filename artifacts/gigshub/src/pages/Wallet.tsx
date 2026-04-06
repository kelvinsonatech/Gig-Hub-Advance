import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetWallet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS } from "@/lib/utils";
import { Wallet as WalletIcon, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/api";

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];
const INTENT_KEY = "turbogh_payment_intent";

export default function Wallet() {
  const { toast } = useToast();
  const { data: wallet, isLoading } = useGetWallet({ query: { refetchOnMount: "always" } });
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const triggerTopup = async (amt: number) => {
    if (!amt || isNaN(amt) || amt < 1) return;

    setIsPaying(true);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    try {
      const token = localStorage.getItem("gigshub_token");
      const callbackUrl = `${window.location.origin}/payment-success`;

      const res = await fetch(`${API}/api/payments/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: amt,
          type: "wallet_topup",
          callbackUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to initialise payment");
      }

      const { authorizationUrl } = await res.json();

      localStorage.setItem(INTENT_KEY, JSON.stringify({ type: "wallet_topup" }));
      window.location.href = authorizationUrl;
    } catch (err: any) {
      setIsPaying(false);
      toast({ variant: "destructive", title: "Payment unavailable", description: err.message || "Could not start payment. Please try again." });
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerTopup(Number(amount));
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-8">
        <header>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <WalletIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /> Wallet
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm sm:text-base">Manage your funds and view transaction history.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">

          {/* ── Left column: balance card + top-up form ── */}
          <div className="space-y-4 sm:space-y-5">

            {/* Balance card */}
            <div
              className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-2xl relative overflow-hidden isolate"
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
                  <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-2 drop-shadow-lg">
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
            <div className="bg-white border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">Add Funds</h3>
                  <p className="text-xs text-muted-foreground">Instant top-up to your wallet</p>
                </div>
              </div>

              <form onSubmit={handleTopup} className="space-y-4 sm:space-y-5">

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
                      className="pl-9 h-12 sm:h-14 rounded-2xl text-xl sm:text-2xl font-extrabold border-2 focus-visible:ring-primary/30 tracking-tight"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
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
                        disabled={isPaying}
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
                  <div className="relative overflow-hidden rounded-2xl border-2 border-primary shadow-md shadow-primary/10">
                    {/* Background image layer */}
                    <div className="absolute inset-0">
                      <img
                        src="https://www.myjoyonline.com/wp-content/uploads/2021/02/Momo.jpg"
                        alt=""
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                    </div>
                    {/* Content */}
                    <div className="relative z-10 flex items-center gap-4 px-4 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-white leading-tight tracking-wide">Mobile Money</p>
                        <p className="text-xs text-white/70 mt-0.5 font-medium">MTN · AirtelTigo · Telecel</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-white">Selected</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={!amount || isPaying}
                  className="w-full h-13 rounded-2xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Preparing checkout…
                    </>
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

          {/* ── Right column: Top-up History ── */}
          <div className="bg-white border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center overflow-hidden">
                <img
                  src="https://www.myjoyonline.com/wp-content/uploads/2021/02/Momo.jpg"
                  alt="MoMo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight">Top-up History</h3>
                <p className="text-xs text-muted-foreground">Your wallet funding records</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[560px]">
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-2xl" />
                  ))}
                </div>
              ) : (() => {
                const topups = (wallet?.transactions ?? []).filter(tx => tx.type === "credit");
                if (topups.length === 0) return (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 overflow-hidden">
                      <img
                        src="https://www.myjoyonline.com/wp-content/uploads/2021/02/Momo.jpg"
                        alt="MoMo"
                        className="w-full h-full object-cover opacity-40"
                      />
                    </div>
                    <p className="font-semibold text-sm">No top-ups yet</p>
                    <p className="text-xs mt-1">Add funds to get started</p>
                  </div>
                );
                return topups.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border/50 hover:bg-emerald-50/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border/50">
                        <img
                          src="https://www.myjoyonline.com/wp-content/uploads/2021/02/Momo.jpg"
                          alt="MoMo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground leading-tight">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}
                        </p>
                      </div>
                    </div>
                    <p className="font-extrabold text-sm text-emerald-600">
                      +{formatGHS(tx.amount)}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
