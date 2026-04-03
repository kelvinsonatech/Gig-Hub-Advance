import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { useGetBundles, useGetNetworks, useCreateOrder, useGetWallet, type Bundle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS, cn } from "@/lib/utils";
import { Wifi, Phone, CreditCard, Wallet, Smartphone, Loader2, ShoppingBag, RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { navigate } from "wouter/use-browser-location";
import { useSearch } from "wouter";
// @ts-ignore
import PaystackPop from "@paystack/inline-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function fireCelebration() {
  const burst = (x: number, angle: number) =>
    confetti({
      particleCount: 80,
      spread: 70,
      angle,
      origin: { x, y: 0.9 },
      colors: ["#FFD700", "#FF6B35", "#4CAF50", "#2196F3", "#E91E63", "#9C27B0"],
      scalar: 1.1,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 200,
    });

  // Two side poppers at the same time
  burst(0.1, 60);
  burst(0.9, 120);

  // Centre burst after a short delay
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.6 },
      colors: ["#FFD700", "#FF6B35", "#4CAF50", "#2196F3", "#E91E63", "#9C27B0"],
      scalar: 1.2,
      startVelocity: 55,
      gravity: 0.75,
      ticks: 250,
    });
  }, 150);
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;

export default function Bundles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { data: networks, isLoading: loadingNetworks } = useGetNetworks();
  const { data: wallet } = useGetWallet({ query: { enabled: isAuthenticated } });
  const search = useSearch();

  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const activeNetwork = selectedNetworkId ?? networks?.[0]?.id ?? null;

  useEffect(() => {
    if (!networks?.length) return;
    const params = new URLSearchParams(search);
    const code = params.get("network");
    if (!code) return;
    const match = networks.find(n => n.code.toUpperCase() === code.toUpperCase());
    if (match) setSelectedNetworkId(match.id);
  }, [networks, search]);

  const { data: bundles, isLoading: loadingBundles, isFetching: fetchingBundles } = useGetBundles(
    { networkId: activeNetwork || undefined },
    { query: { enabled: !!activeNetwork } }
  );

  const showBundlesSkeleton = loadingNetworks || (!!activeNetwork && (loadingBundles || fetchingBundles));

  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "wallet">("momo");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        setIsPaying(false);
        fireCelebration();
        toast({ title: "🎉 Purchase successful!", description: "Your data bundle will be activated shortly." });
        setIsModalOpen(false);
        setPhoneNumber("");
        setPhoneTouched(false);
        setPaymentMethod("momo");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      },
      onError: (err: any) => {
        setIsPaying(false);
        toast({ variant: "destructive", title: "Purchase failed", description: err?.message || "Something went wrong." });
      }
    }
  });

  const handleBuyClick = (bundle: Bundle) => {
    if (!isAuthenticated) {
      toast({ title: "Sign in required", description: "Please sign in to purchase data bundles." });
      navigate("/login");
      return;
    }
    setSelectedBundle(bundle);
    setIsModalOpen(true);
  };

  const handlePurchase = () => {
    if (!selectedBundle || phoneNumber.replace(/\D/g, "").length < 10) return;

    if (paymentMethod === "wallet") {
      if (!wallet || wallet.balance < selectedBundle.price) {
        toast({ variant: "destructive", title: "Insufficient wallet balance", description: "Please top up your wallet first." });
        return;
      }
      createOrder.mutate({
        data: { type: "bundle", bundleId: selectedBundle.id, phoneNumber, paymentMethod, details: { paymentMethod } }
      });
      return;
    }

    // MoMo → open Paystack popup first, then create order on success
    setIsPaying(true);
    const popup = new PaystackPop();
    popup.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email: user?.email || "customer@turboghcustomer.com",
      amount: Math.round(selectedBundle.price * 100), // pesewas
      currency: "GHS",
      label: `TurboGh – ${selectedBundle.data} bundle`,
      onSuccess: (response: { reference: string }) => {
        createOrder.mutate({
          data: {
            type: "bundle",
            bundleId: selectedBundle.id,
            phoneNumber,
            paymentMethod: "momo",
            paystackReference: response.reference,
            details: { paymentMethod: "momo", paystackReference: response.reference },
          } as any,
        });
      },
      onCancel: () => {
        setIsPaying(false);
      },
    });
  };

  const getNetworkAccent = (code: string) => {
    if (code === 'MTN')    return { bg: '#FFCC00', text: '#000', glow: 'shadow-yellow-200', badge: 'bg-[#FFCC00] text-black', btn: 'bg-[#FFCC00] hover:bg-[#e6b800] text-black border-0' };
    if (code === 'AT')     return { bg: '#004b87', text: '#fff', glow: 'shadow-blue-200',   badge: 'bg-[#004b87] text-white', btn: 'bg-[#004b87] hover:bg-[#003a6e] text-white border-0' };
    if (code === 'TELECEL') return { bg: '#CC0000', text: '#fff', glow: 'shadow-red-200',    badge: 'bg-[#CC0000] text-white', btn: 'bg-[#CC0000] hover:bg-[#a80000] text-white border-0' };
    return { bg: '#0077C7', text: '#fff', glow: 'shadow-blue-200', badge: 'bg-[#0077C7] text-white', btn: 'bg-[#0077C7] hover:bg-[#005fa3] text-white border-0' };
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-12 pb-28 md:pb-12 space-y-6 sm:space-y-10">

        {/* Header */}
        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-2xl isolate"
          style={{
            backgroundImage: `url("https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABUV_jDjJ4_X_PSYgTJthNlfoStaN1fqwW1vcTx8bKIwYizu5-VL1365SJPeFB1FIig2dpPVvYdgfODQ9DEKR8t9Ak3G5NIa1HeWv.jpg?r=513")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-orange-950/60" />
          <div className="absolute bottom-0 right-0 w-56 h-56 bg-primary/30 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold">Buy Data Bundles</h1>
              </div>
              <p className="text-white/70 text-sm sm:text-base">Select your network and choose the perfect data package.</p>
            </div>
            {isAuthenticated && wallet && (
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shrink-0 w-fit">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <div>
                  <p className="text-white/60 text-[10px] sm:text-xs font-medium">Wallet Balance</p>
                  <p className="font-extrabold text-base sm:text-lg tracking-tight">{formatGHS(wallet.balance)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Network Tabs */}
        {loadingNetworks ? (
          <div className="flex gap-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-12 w-32 bg-gray-200 rounded-2xl" />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {networks?.map((network) => {
              const accent = getNetworkAccent(network.code);
              const isActive = activeNetwork === network.id;
              return (
                <button
                  key={network.id}
                  onClick={() => setSelectedNetworkId(network.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 border-2",
                    !isActive && "bg-white text-gray-600 border-gray-200 hover:border-gray-300 shadow-sm"
                  )}
                  style={isActive ? { background: accent.bg, color: accent.text, borderColor: "transparent" } : {}}
                >
                  {isActive && fetchingBundles && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin opacity-70" />
                  )}
                  {network.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Bundles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {showBundlesSkeleton ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-52 bg-gray-200 rounded-3xl animate-pulse" />
            ))
          ) : !bundles?.length ? (
            <div className="col-span-full py-20 flex flex-col items-center gap-3 text-gray-400">
              <ShoppingBag className="w-10 h-10 opacity-30" />
              <p className="text-base font-medium">No bundles available for this network right now.</p>
            </div>
          ) : (
            bundles.map((bundle) => {
              const net = networks?.find(n => n.id === bundle.networkId);
              const accent = net ? getNetworkAccent(net.code) : getNetworkAccent('');
              return (
                <div
                  key={bundle.id}
                  className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 hover:shadow-xl hover:-translate-y-1 transition-[box-shadow,transform] duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  {bundle.popular && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-3 py-1 rounded-bl-xl sm:rounded-bl-2xl z-10 tracking-wider">
                      POPULAR
                    </div>
                  )}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl sm:rounded-t-3xl" style={{ background: accent.bg }} />

                  <div>
                    <div className="flex justify-between items-start mb-3 mt-1.5">
                      <span className={cn("px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold", accent.badge)}>
                        {net?.code}
                      </span>
                      <span className={cn(
                        "text-[9px] sm:text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                        bundle.type === "non-expiry"
                          ? "bg-green-50 text-green-600"
                          : "bg-blue-50 text-blue-600"
                      )}>
                        {bundle.type === "non-expiry" ? "No Expiry" : "Expiry"}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-0.5">{bundle.data}</h3>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Valid: {bundle.validity}</p>
                  </div>

                  <div className="my-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Price</span>
                    <span className="text-lg sm:text-xl font-black" style={{ color: accent.bg === '#FFCC00' ? '#b38600' : accent.bg }}>
                      {formatGHS(bundle.price)}
                    </span>
                  </div>

                  <Button
                    className={cn("w-full rounded-lg sm:rounded-xl h-9 sm:h-11 font-bold text-xs sm:text-sm shadow-md", accent.btn)}
                    onClick={() => handleBuyClick(bundle)}
                  >
                    Buy Now
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Complete Purchase</DialogTitle>
            <DialogDescription>Choose how to pay and enter the recipient number.</DialogDescription>
          </DialogHeader>

          {selectedBundle && (
            <div className="space-y-5 my-2">
              {/* Bundle summary */}
              <div className="bg-secondary/50 p-4 rounded-2xl border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{selectedBundle.data}</p>
                  <p className="text-sm text-muted-foreground">{selectedBundle.validity} • {selectedBundle.networkName}</p>
                </div>
                <p className="font-bold text-primary text-xl">{formatGHS(selectedBundle.price)}</p>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  {/* MoMo */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("momo")}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                      paymentMethod === "momo"
                        ? "border-orange-400 bg-orange-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    )}
                  >
                    {paymentMethod === "momo" && (
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-orange-500" />
                    )}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", paymentMethod === "momo" ? "bg-orange-100" : "bg-gray-100")}>
                      <Smartphone className={cn("w-5 h-5", paymentMethod === "momo" ? "text-orange-500" : "text-gray-400")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", paymentMethod === "momo" ? "text-orange-700" : "text-gray-700")}>MoMo</p>
                      <p className="text-[11px] text-gray-400">Mobile Money</p>
                    </div>
                  </button>

                  {/* Wallet */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("wallet")}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-left",
                      paymentMethod === "wallet"
                        ? "border-green-400 bg-green-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    )}
                  >
                    {paymentMethod === "wallet" && (
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-green-500" />
                    )}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", paymentMethod === "wallet" ? "bg-green-100" : "bg-gray-100")}>
                      <Wallet className={cn("w-5 h-5", paymentMethod === "wallet" ? "text-green-600" : "text-gray-400")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", paymentMethod === "wallet" ? "text-green-700" : "text-gray-700")}>Wallet</p>
                      <p className="text-[11px] text-gray-400">Wallet Balance</p>
                      <p className={cn("text-[11px] font-bold", paymentMethod === "wallet" ? "text-green-600" : "text-gray-500")}>
                        {wallet ? formatGHS(wallet.balance) : "—"}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Wallet insufficient warning */}
                {paymentMethod === "wallet" && wallet && wallet.balance < (selectedBundle?.price ?? 0) && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    Insufficient balance — you need {formatGHS((selectedBundle?.price ?? 0) - wallet.balance)} more.
                  </p>
                )}
              </div>

              {/* Phone number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Recipient Phone Number</Label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-3 h-5 w-5 ${phoneTouched && phoneNumber.replace(/\D/g, "").length < 10 ? "text-red-400" : "text-muted-foreground"}`} />
                  <Input
                    id="phone" type="tel" placeholder="Enter phone number"
                    className={`pl-10 h-12 rounded-xl text-lg font-medium transition-colors ${
                      phoneTouched && phoneNumber.replace(/\D/g, "").length < 10
                        ? "border-red-400 ring-2 ring-red-200 focus-visible:ring-red-300 focus-visible:border-red-400"
                        : ""
                    }`}
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); setPhoneTouched(true); }}
                  />
                </div>
                {phoneTouched && phoneNumber.replace(/\D/g, "").length < 10 && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <span className="font-bold">{phoneNumber.replace(/\D/g, "").length} / 10</span> digits entered — needs {10 - phoneNumber.replace(/\D/g, "").length} more
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12 flex-1">Cancel</Button>
            <Button
              onClick={handlePurchase}
              disabled={phoneNumber.replace(/\D/g, "").length < 10 || isPaying || createOrder.isPending || (paymentMethod === "wallet" && !!wallet && wallet.balance < (selectedBundle?.price ?? 0))}
              className={cn(
                "rounded-xl h-12 flex-1 shadow-md",
                paymentMethod === "wallet"
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                  : "shadow-primary/20"
              )}
            >
              {isPaying || createOrder.isPending
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : paymentMethod === "wallet" ? "Pay from Wallet" : "Pay with MoMo"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
