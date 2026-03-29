import { useState } from "react";
import { useGetBundles, useGetNetworks, useCreateOrder, useGetWallet, type Bundle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS, cn } from "@/lib/utils";
import { Wifi, Phone, CreditCard, Loader2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { navigate } from "wouter/use-browser-location";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Bundles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { data: networks, isLoading: loadingNetworks } = useGetNetworks();
  const { data: wallet } = useGetWallet({ query: { enabled: isAuthenticated } });

  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const { data: bundles, isLoading: loadingBundles } = useGetBundles(
    { networkId: activeNetwork || undefined },
    { query: { enabled: true } }
  );

  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (networks && !activeNetwork && networks.length > 0) {
    setActiveNetwork(networks[0].id);
  }

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Purchase successful!", description: "Your data bundle will be activated shortly." });
        setIsModalOpen(false);
        setPhoneNumber("");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      },
      onError: (err: any) => {
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
    if (!selectedBundle || !phoneNumber) return;
    if (wallet && wallet.balance < selectedBundle.price) {
      toast({ variant: "destructive", title: "Insufficient balance", description: "Please top up your wallet first." });
      return;
    }
    createOrder.mutate({
      data: { type: "bundle", bundleId: selectedBundle.id, phoneNumber }
    });
  };

  const getNetworkAccent = (code: string) => {
    if (code === 'MTN')    return { bg: '#FFCC00', text: '#000', glow: 'shadow-yellow-200', badge: 'bg-[#FFCC00] text-black', btn: 'bg-[#FFCC00] hover:bg-[#e6b800] text-black border-0' };
    if (code === 'AT')     return { bg: '#004b87', text: '#fff', glow: 'shadow-blue-200',   badge: 'bg-[#004b87] text-white', btn: 'bg-[#004b87] hover:bg-[#003a6e] text-white border-0' };
    if (code === 'TELECEL') return { bg: '#CC0000', text: '#fff', glow: 'shadow-red-200',    badge: 'bg-[#CC0000] text-white', btn: 'bg-[#CC0000] hover:bg-[#a80000] text-white border-0' };
    return { bg: '#0077C7', text: '#fff', glow: 'shadow-blue-200', badge: 'bg-primary text-white', btn: 'bg-primary hover:bg-primary/90 text-white border-0' };
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28 md:pb-10 space-y-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0077C7] to-[#0099FF] p-8 text-white shadow-xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold">Buy Data Bundles</h1>
              </div>
              <p className="text-white/70">Select your network and choose the perfect data package.</p>
            </div>
            {isAuthenticated && wallet && (
              <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 shrink-0">
                <CreditCard className="w-5 h-5 text-white/70" />
                <div>
                  <p className="text-white/60 text-xs font-medium">Wallet Balance</p>
                  <p className="font-extrabold text-lg tracking-tight">{formatGHS(wallet.balance)}</p>
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
                  onClick={() => setActiveNetwork(network.id)}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-bold text-base transition-all duration-200 border-2",
                    !isActive && "bg-white text-gray-600 border-gray-200 hover:border-gray-300 shadow-sm"
                  )}
                  style={isActive ? { background: accent.bg, color: accent.text, borderColor: "transparent" } : {}}
                >
                  {network.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Bundles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {loadingBundles ? (
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
                  className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden"
                >
                  {bundle.popular && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-2xl z-10 tracking-wider">
                      POPULAR
                    </div>
                  )}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: accent.bg }} />

                  <div>
                    <div className="flex justify-between items-start mb-4 mt-2">
                      <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", accent.badge)}>
                        {net?.code}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-lg">
                        {bundle.type}
                      </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-gray-900 mb-1">{bundle.data}</h3>
                    <p className="text-sm font-medium text-muted-foreground mb-5">Valid: {bundle.validity}</p>
                  </div>

                  <Button
                    className={cn("w-full rounded-xl h-11 font-bold text-sm shadow-md transition-all", accent.btn)}
                    onClick={() => handleBuyClick(bundle)}
                  >
                    Buy — {formatGHS(bundle.price)}
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
            <DialogDescription>Enter the recipient phone number for this data bundle.</DialogDescription>
          </DialogHeader>

          {selectedBundle && (
            <div className="space-y-6 my-4">
              <div className="bg-secondary/50 p-4 rounded-2xl border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{selectedBundle.data}</p>
                  <p className="text-sm text-muted-foreground">{selectedBundle.validity} • {selectedBundle.networkName}</p>
                </div>
                <p className="font-bold text-primary text-xl">{formatGHS(selectedBundle.price)}</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone">Recipient Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone" type="tel" placeholder="Enter phone number"
                    className="pl-10 h-12 rounded-xl text-lg font-medium"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12 flex-1">Cancel</Button>
            <Button
              onClick={handlePurchase}
              disabled={!phoneNumber || createOrder.isPending}
              className="rounded-xl h-12 flex-1 shadow-md shadow-primary/20"
            >
              {createOrder.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
