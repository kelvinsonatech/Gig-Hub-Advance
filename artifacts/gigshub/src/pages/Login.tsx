import { useState, useEffect } from "react";
import { Link } from "wouter";
import { navigate } from "wouter/use-browser-location";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import logoUrl from "@/assets/logo.png";

export default function Login() {
  const { login, isLoggingIn, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center bg-slate-50 pt-6 sm:pt-0 px-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-black/5 border border-border p-5 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/">
            <img src={logoUrl} alt="TurboGH" className="w-36 sm:w-44 h-auto mx-auto mb-4 sm:mb-6 cursor-pointer" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">Enter your details to sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                className="pl-10 h-12 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="text-sm text-muted-foreground font-medium">Forgot password?</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="pl-10 h-12 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl text-base shadow-md shadow-primary/20" 
            disabled={isLoggingIn}
          >
            {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 sm:mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Sign up for free <ArrowRight className="inline w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
