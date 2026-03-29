import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Briefcase, MapPin, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { navigate } from "wouter/use-browser-location";

export default function AgentRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    businessName: "",
    phoneNumber: "",
    location: "",
  });

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Application Submitted!", description: "We will review your agent application shortly." });
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
        type: "agent_registration",
        phoneNumber: formData.phoneNumber,
        details: {
          businessName: formData.businessName,
          location: formData.location
        }
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Become an Agent</h1>
          <p className="text-muted-foreground mt-2">Earn commissions by selling data and registering users.</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name (Optional)</Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="businessName" 
                placeholder="My Tech Hub" 
                className="pl-10 h-12 rounded-xl"
                value={formData.businessName}
                onChange={(e) => setFormData(p => ({ ...p, businessName: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Primary Contact Number</Label>
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
            <Label htmlFor="location">City / Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="location" 
                placeholder="Accra, East Legon" 
                className="pl-10 h-12 rounded-xl"
                value={formData.location}
                onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-md shadow-primary/20"
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Application"}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              We will contact you for further verification once submitted.
            </p>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
