import { Link } from "wouter";
import logoUrl from "@assets/logo.png";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-[#001630] via-[#002a5c] to-[#003f82] text-white pt-16 pb-8">
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      {/* Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[200px] bg-[#0077C7]/20 rounded-full blur-3xl" />

      <div className="relative container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-14">

          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <img src={logoUrl} alt="GigsHub Logo" className="h-9 brightness-0 invert" />
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Ghana's premium digital services marketplace. Instant data bundles, AFA registration, and more — 24/7.
            </p>
            <div className="flex gap-3 pt-2">
              {[Facebook, Twitter, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-base mb-5 text-white">Services</h3>
            <ul className="space-y-3 text-sm text-white/60">
              {[
                { label: "Buy Data Bundles", href: "/bundles" },
                { label: "AFA / Ghana Card Reg.", href: "/afa-registration" },
                { label: "Become an Agent", href: "/agent-registration" },
                { label: "Wallet & Top-Up", href: "/wallet" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold text-base mb-5 text-white">Company</h3>
            <ul className="space-y-3 text-sm text-white/60">
              {[
                { label: "About Us", href: "/about" },
                { label: "Contact Support", href: "/contact" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Privacy Policy", href: "/privacy" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-base mb-5 text-white">Contact Us</h3>
            <ul className="space-y-4 text-sm text-white/60">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#0099FF] shrink-0 mt-0.5" />
                <span>Accra Digital Centre, Ring Road West, Accra, Ghana</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#0099FF] shrink-0" />
                <span>+233 55 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#0099FF] shrink-0" />
                <span>support@gigshub.store</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>© {new Date().getFullYear()} GigsHub. All rights reserved. Made in Ghana 🇬🇭</p>
          <div className="flex items-center gap-3">
            <span className="text-white/30">Secure via</span>
            {["MoMo", "Telecel Cash", "AT Money"].map((p) => (
              <span key={p} className="px-2.5 py-1 bg-white/10 border border-white/10 rounded text-xs font-semibold text-white/60 tracking-wide">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
