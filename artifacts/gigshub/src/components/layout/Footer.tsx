import { Link } from "wouter";
import logoUrl from "@assets/logo.png";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <img src={logoUrl} alt="GigsHub Logo" className="h-10" />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Your premium digital services marketplace in Ghana. Instant data bundles, AFA registration, and utility services at your fingertips.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Services</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/bundles" className="hover:text-primary transition-colors">Buy Data Bundles</Link></li>
              <li><Link href="/afa-registration" className="hover:text-primary transition-colors">AFA / Ghana Card Registration</Link></li>
              <li><Link href="/services" className="hover:text-primary transition-colors">Airtime Top-up</Link></li>
              <li><Link href="/agent-registration" className="hover:text-primary transition-colors">Become an Agent</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-display font-bold text-lg mb-4 text-foreground">Contact Us</h3>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>Accra Digital Centre, Ring Road West, Accra, Ghana</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+233 55 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>support@gigshub.store</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GigsHub. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Secure Payments via</span>
            <div className="flex gap-2 font-bold text-xs uppercase tracking-wider bg-secondary px-3 py-1.5 rounded text-secondary-foreground">
              MoMo
            </div>
            <div className="flex gap-2 font-bold text-xs uppercase tracking-wider bg-secondary px-3 py-1.5 rounded text-secondary-foreground">
              Telecel Cash
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
