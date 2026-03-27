import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Zap, Shield, Clock, Smartphone, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white -z-10" />
        
        <div className="container mx-auto px-4 max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Instant Delivery 24/7
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.1]">
              Instant Data <br />
              Services <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">4U</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
              Ghana's most reliable platform for affordable data bundles, AFA registration, and digital services. Secure, fast, and automated.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" asChild className="rounded-2xl h-14 px-8 text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all">
                <Link href="/bundles">Buy Data Now <ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-2xl h-14 px-8 text-lg border-2 hover:bg-muted transition-all">
                <Link href="/afa-registration">AFA Registration</Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-6 pt-8 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> No hidden fees</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Instant activation</div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block h-[600px]"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl" />
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-fintech.png`} 
              alt="Premium digital services" 
              className="absolute inset-0 w-full h-full object-contain object-center animate-in fade-in zoom-in duration-1000"
            />
            
            {/* Floating Network Badges */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-1/4 -left-8 bg-white p-4 rounded-2xl shadow-xl shadow-black/5 border border-border/50 flex items-center gap-3 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-full bg-[#FFCC00] flex items-center justify-center font-bold text-black text-xs">MTN</div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Data Bundle</p>
                <p className="font-bold text-sm">GHS 10.00</p>
              </div>
            </motion.div>
            
            <motion.div 
              animate={{ y: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-1/4 -right-4 bg-white p-4 rounded-2xl shadow-xl shadow-black/5 border border-border/50 flex items-center gap-3 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-full bg-[#E20010] flex items-center justify-center font-bold text-white text-xs">TEL</div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Telecel Cash</p>
                <p className="font-bold text-sm text-emerald-600">Top-up Successful</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white border-t border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why choose GigsHub?</h2>
            <p className="text-muted-foreground text-lg">We provide the fastest, most reliable digital services infrastructure built for the modern Ghanaian.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-secondary/50 border border-border p-8 rounded-3xl hover:shadow-lg hover:border-primary/20 transition-all">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-muted-foreground">Automated processing ensures your bundles and registrations are completed in seconds, not hours.</p>
            </div>
            
            <div className="bg-secondary/50 border border-border p-8 rounded-3xl hover:shadow-lg hover:border-primary/20 transition-all">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">100% Secure</h3>
              <p className="text-muted-foreground">Bank-grade security protects your wallet, transactions, and personal information at all times.</p>
            </div>
            
            <div className="bg-secondary/50 border border-border p-8 rounded-3xl hover:shadow-lg hover:border-primary/20 transition-all">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">24/7 Availability</h3>
              <p className="text-muted-foreground">Our systems never sleep. Top up your data or register for services at any time of day or night.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-slate-50 border-t border-border relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
              <p className="text-muted-foreground text-lg max-w-md">Everything you need to stay connected and compliant.</p>
            </div>
            <Button variant="outline" asChild className="rounded-xl border-2">
              <Link href="/services">View All Services</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/bundles">
              <div className="group bg-white border border-border rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col">
                <div className="flex gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#FFCC00] border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-black z-30">MTN</div>
                  <div className="w-12 h-12 rounded-full bg-[#004b87] border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-white -ml-4 z-20">AT</div>
                  <div className="w-12 h-12 rounded-full bg-[#E20010] border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-white -ml-4 z-10">TEL</div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">Affordable Data Bundles</h3>
                <p className="text-muted-foreground mb-8 flex-1">Get the cheapest data bundles across all major networks in Ghana. Instant activation straight to your phone.</p>
                <div className="text-primary font-medium flex items-center">
                  Buy Data <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
            
            <Link href="/afa-registration">
              <div className="group bg-white border border-border rounded-3xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col overflow-hidden relative">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-indigo-600 transition-colors">AFA Registration</h3>
                <p className="text-muted-foreground mb-8 flex-1 relative z-10">Link your Ghana Card to your phone numbers seamlessly. Required for all active SIM cards in Ghana.</p>
                <div className="text-indigo-600 font-medium flex items-center relative z-10">
                  Register Now <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
                <img 
                  src={`${import.meta.env.BASE_URL}images/afa-card-placeholder.png`} 
                  alt="Ghana Card" 
                  className="absolute -right-8 -bottom-8 w-48 opacity-20 group-hover:opacity-40 transition-opacity"
                />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
