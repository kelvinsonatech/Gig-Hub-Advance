import { useState } from "react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Lock, ArrowRight, Loader2 } from "lucide-react";
import logoUrl from "@assets/logo.png";

export default function Register() {
  const { register, isRegistering, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  if (isAuthenticated) return <Redirect to="/dashboard" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register({ data: formData });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-slate-50 pt-6 sm:py-12 px-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-black/5 border border-border p-5 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/">
            <img src={logoUrl} alt="TurboGH" className="w-36 sm:w-44 h-auto mx-auto mb-4 sm:mb-6 cursor-pointer" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Create an account</h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">Join TurboGH for the best digital services</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="name" 
                placeholder="John Doe" 
                className="pl-10 h-12 rounded-xl"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                className="pl-10 h-12 rounded-xl"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (MTN, AT, Telecel)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="phone" 
                type="tel" 
                placeholder="054 123 4567" 
                className="pl-10 h-12 rounded-xl"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password (min. 6 characters)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="pl-10 h-12 rounded-xl"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl text-base shadow-md shadow-primary/20 mt-4" 
            disabled={isRegistering}
          >
            {isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 sm:mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in <ArrowRight className="inline w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
