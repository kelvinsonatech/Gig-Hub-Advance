import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetBundles, useGetNetworks, useCreateOrder, useGetWallet, type Bundle } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS, cn } from "@/lib/utils";
import { Wifi, Phone, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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
  const { data: networks, isLoading: loadingNetworks } = useGetNetworks();
  const { data: wallet } = useGetWallet();
  
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const { data: bundles, isLoading: loadingBundles } = useGetBundles(
    { networkId: activeNetwork || undefined },
    { query: { enabled: true } }
  );

  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize active network when networks load
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

  const handlePurchase = () => {
    if (!selectedBundle || !phoneNumber) return;
    if (wallet && wallet.balance < selectedBundle.price) {
      toast({ variant: "destructive", title: "Insufficient balance", description: "Please top up your wallet first." });
      return;
    }
    createOrder.mutate({
      data: {
        type: "bundle",
        bundleId: selectedBundle.id,
        phoneNumber: phoneNumber
      }
    });
  };

  const getNetworkColor = (code: string) => {
    if (code === 'MTN') return 'bg-[#FFCC00] text-black border-[#FFCC00]';
    if (code === 'AT') return 'bg-[#004b87] text-white border-[#004b87]';
    if (code === 'TELECEL') return 'bg-[#E20010] text-white border-[#E20010]';
    return 'bg-primary text-primary-foreground';
  };

  const getNetworkStyle = (code: string, isActive: boolean) => {
    const base = getNetworkColor(code);
    if (isActive) return base + " ring-4 ring-offset-2 ring-opacity-50 " + (code === 'MTN' ? 'ring-[#FFCC00]' : code === 'AT' ? 'ring-[#004b87]' : 'ring-[#E20010]');
    return "bg-white text-foreground border-border hover:border-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Wifi className="w-8 h-8 text-primary" /> Buy Data Bundles
            </h1>
            <p className="text-muted-foreground mt-1">Select a network and choose your preferred data package.</p>
          </div>
          <div className="bg-secondary px-4 py-2 rounded-xl flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Wallet Balance:</span>
            <span className="font-bold text-primary">{formatGHS(wallet?.balance)}</span>
          </div>
        </header>

        {/* Network Selection Tabs */}
        {loadingNetworks ? (
          <div className="flex gap-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-12 w-32 bg-muted rounded-xl" />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {networks?.map((network) => (
              <button
                key={network.id}
                onClick={() => setActiveNetwork(network.id)}
                className={cn(
                  "px-6 py-3 rounded-xl border-2 font-bold text-lg transition-all duration-200",
                  getNetworkStyle(network.code, activeNetwork === network.id)
                )}
              >
                {network.name}
              </button>
            ))}
          </div>
        )}

        {/* Bundles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loadingBundles ? (
            [1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />)
          ) : bundles?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No bundles available for this network right now.
            </div>
          ) : (
            bundles?.map((bundle) => {
              const net = networks?.find(n => n.id === bundle.networkId);
              const colorClass = net ? getNetworkColor(net.code).split(' ')[0] : 'bg-primary';
              const textClass = net ? getNetworkColor(net.code).split(' ')[1] : 'text-white';
              
              return (
                <div 
                  key={bundle.id} 
                  className="bg-white border border-border rounded-2xl p-6 hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {bundle.popular && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10">
                      POPULAR
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={cn("px-2.5 py-1 rounded text-xs font-bold", colorClass, textClass)}>
                        {net?.code}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider bg-secondary px-2 py-1 rounded">
                        {bundle.type}
                      </span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-foreground mb-1">{bundle.data}</h3>
                    <p className="text-sm font-medium text-muted-foreground mb-6">Validity: {bundle.validity}</p>
                  </div>
                  
                  <Button 
                    className="w-full rounded-xl shadow-md group-hover:shadow-lg transition-all" 
                    onClick={() => {
                      setSelectedBundle(bundle);
                      setIsModalOpen(true);
                    }}
                  >
                    Buy for {formatGHS(bundle.price)}
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
            <DialogDescription>
              Enter the recipient phone number for this data bundle.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBundle && (
            <div className="space-y-6 my-4">
              <div className="bg-secondary/50 p-4 rounded-2xl border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-lg">{selectedBundle.data}</p>
                  <p className="text-sm text-muted-foreground">{selectedBundle.validity} • {selectedBundle.networkName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-xl">{formatGHS(selectedBundle.price)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone">Recipient Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="Enter phone number" 
                    className="pl-10 h-12 rounded-xl text-lg font-medium"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl h-12 flex-1">
              Cancel
            </Button>
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
    </DashboardLayout>
  );
}
