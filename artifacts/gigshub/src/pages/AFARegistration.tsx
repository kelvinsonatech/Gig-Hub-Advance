import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, User, Phone, FileText, Loader2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { navigate } from "wouter/use-browser-location";

export default function AFARegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    ghanaCardNumber: "GHA-",
  });

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Registration Submitted!", description: "Your AFA registration is being processed." });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        navigate("/orders");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Submission failed", description: err?.message || "Please try again." });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrder.mutate({
      data: {
        type: "afa_registration",
        phoneNumber: formData.phoneNumber,
        details: {
          fullName: formData.fullName,
          ghanaCardNumber: formData.ghanaCardNumber
        }
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">AFA Registration</h1>
          <p className="text-muted-foreground mt-2">Link your Ghana Card to your SIM card officially.</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name (as it appears on ID)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="fullName" 
                placeholder="John Doe" 
                className="pl-10 h-12 rounded-xl"
                value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number to Register</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="phoneNumber" 
                type="tel"
                placeholder="054 123 4567" 
                className="pl-10 h-12 rounded-xl"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(p => ({ ...p, phoneNumber: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ghanaCardNumber">Ghana Card Number</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="ghanaCardNumber" 
                placeholder="GHA-123456789-0" 
                className="pl-10 h-12 rounded-xl uppercase font-mono"
                value={formData.ghanaCardNumber}
                onChange={(e) => setFormData(p => ({ ...p, ghanaCardNumber: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Upload ID Copy (Front & Back)</Label>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
              <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-primary">Click to upload files</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-md shadow-primary/20"
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Registration - GHS 5.00"}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              By submitting, you agree to our Terms of Service. Fee will be deducted from your wallet.
            </p>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
