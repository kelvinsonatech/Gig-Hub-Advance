import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Lock, ArrowRight, Loader2 } from "lucide-react";
import logoUrl from "@assets/logo.png";

export default function Register() {
  const { register, isRegistering } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register({ data: formData });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white sm:bg-slate-50 px-5 sm:p-4 sm:py-12">
      <div className="w-full max-w-md bg-white sm:rounded-3xl sm:shadow-xl sm:shadow-black/5 sm:border sm:border-border py-10 sm:p-8">
        <div className="text-center mb-7">
          <Link href="/">
            <img src={logoUrl} alt="TurboGH" className="w-40 h-auto mx-auto mb-5 cursor-pointer" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Create an account</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Join TurboGH for the best digital services</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
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
            className="w-full h-12 rounded-xl text-base shadow-md shadow-primary/20 hover:shadow-lg transition-[box-shadow,transform] mt-2"
            disabled={isRegistering}
          >
            {isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </Button>
        </form>

        <div className="mt-7 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in <ArrowRight className="inline w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
