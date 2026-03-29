import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Zap, Shield, Clock, ChevronRight, Users, Smartphone, Wifi, Star } from "lucide-react";
import { motion } from "framer-motion";

const floatAnim = (y1: number, y2: number, delay = 0, duration = 4) => ({
  animate: { y: [y1, y2, y1] },
  transition: { repeat: Infinity, duration, ease: "easeInOut", delay },
});

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">

      {/* ─── HERO ─── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Gradient background matching original */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/60 to-[#fff0e0]" />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, #FF8000 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative container mx-auto px-6 max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-24">

          {/* LEFT COPY */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-7 z-10"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-orange-100 shadow-sm text-primary font-semibold text-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Fast Delivery
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-[72px] font-extrabold text-gray-900 leading-[1.08] tracking-tight">
              Instant Data
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0077C7] to-[#00B4FF]">
                Services 4U
              </span>
            </h1>

            <p className="text-lg text-gray-500 max-w-md leading-relaxed">
              Get your data bundles, AFA Registration, and more in minutes with secure payments and 24/7 support.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                size="lg"
                asChild
                className="rounded-2xl h-14 px-8 text-base font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:-translate-y-1 transition-all bg-gradient-to-r from-[#0077C7] to-[#0099FF]"
              >
                <Link href="/bundles">
                  <Wifi className="mr-2 w-5 h-5" /> Buy Data Now <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="rounded-2xl h-14 px-8 text-base font-semibold border-2 border-gray-200 bg-white/80 hover:bg-white hover:border-primary/30 hover:-translate-y-1 transition-all"
              >
                <Link href="/afa-registration">AFA Registration</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" /> Secure Payment
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> 24/7 Support
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Instant Activation
              </span>
            </div>
          </motion.div>

          {/* RIGHT ILLUSTRATION */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="relative hidden lg:flex items-center justify-center h-[600px]"
          >
            {/* Big blue glow behind illustration */}
            <div className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#0077C7]/20 to-[#00B4FF]/10 blur-3xl" />

            <img
              src={`${import.meta.env.BASE_URL}images/hero-fintech.png`}
              alt="GigsHub digital services"
              className="relative z-10 w-full max-w-[460px] h-full object-contain drop-shadow-2xl"
            />

            {/* ── Floating network bubbles ── */}
            {/* MTN */}
            <motion.div
              {...floatAnim(0, -18, 0, 3.5)}
              className="absolute top-[12%] left-[-6%] z-20 w-16 h-16 rounded-full bg-[#FFCC00] shadow-xl shadow-yellow-300/40 border-4 border-white flex items-center justify-center font-black text-black text-sm"
            >
              MTN
            </motion.div>

            {/* AirtelTigo */}
            <motion.div
              {...floatAnim(0, 22, 0.8, 4)}
              className="absolute top-[30%] left-[-10%] z-20 w-16 h-16 rounded-full bg-[#004b87] shadow-xl shadow-blue-500/30 border-4 border-white flex items-center justify-center font-black text-white text-sm"
            >
              AT
            </motion.div>

            {/* Ghana Flag bubble */}
            <motion.div
              {...floatAnim(0, -14, 0.4, 4.5)}
              className="absolute top-[8%] right-[5%] z-20 w-14 h-14 rounded-full shadow-xl border-4 border-white overflow-hidden"
              style={{ background: "linear-gradient(to bottom, #CE1126 33.3%, #FCD116 33.3% 66.6%, #006B3F 66.6%)" }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-black font-bold text-sm leading-none" style={{ textShadow: "0 0 4px rgba(0,0,0,0.3)" }}>★</span>
              </div>
            </motion.div>

            {/* Telecel */}
            <motion.div
              {...floatAnim(0, 16, 1.2, 3.8)}
              className="absolute bottom-[22%] right-[-4%] z-20 w-16 h-16 rounded-full bg-[#CC0000] shadow-xl shadow-red-400/30 border-4 border-white flex items-center justify-center font-black text-white text-xs"
            >
              TEL
            </motion.div>

            {/* MTN AFA badge */}
            <motion.div
              {...floatAnim(0, 12, 0.6, 5)}
              className="absolute bottom-[30%] left-[-8%] z-20 w-[90px] h-[90px] rounded-full bg-[#FFCC00]/90 shadow-xl border-4 border-white flex flex-col items-center justify-center text-center"
            >
              <span className="font-black text-black text-[10px] leading-tight">MTN<br />AFA<br />REG</span>
            </motion.div>

            {/* ── Floating feature badges ── */}
            {/* Agent Registration */}
            <motion.div
              {...floatAnim(0, -10, 0.3, 4.2)}
              className="absolute top-[4%] right-[-2%] z-30 flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-400/30 text-sm font-semibold"
            >
              <Wifi className="w-4 h-4" /> Agent Registration
            </motion.div>

            {/* Secure Payment */}
            <motion.div
              {...floatAnim(0, 14, 1, 4.8)}
              className="absolute bottom-[14%] right-[0%] z-30 flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-lg text-sm font-semibold text-gray-700"
            >
              <Shield className="w-4 h-4 text-emerald-500" /> Secure Payment
            </motion.div>

            {/* AFA Registration */}
            <motion.div
              {...floatAnim(0, 18, 1.5, 4)}
              className="absolute bottom-[5%] left-[10%] z-30 flex items-center gap-2 px-4 py-2 bg-amber-400 text-amber-900 rounded-full shadow-lg text-sm font-semibold"
            >
              <Smartphone className="w-4 h-4" /> AFA Registration
            </motion.div>

            {/* 24/7 Support */}
            <motion.div
              {...floatAnim(0, -12, 2, 3.6)}
              className="absolute bottom-[22%] right-[2%] z-30 flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-lg text-sm font-semibold text-gray-700"
            >
              <Clock className="w-4 h-4 text-primary" /> 24/7 Support
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: "50K+", label: "Active Users" },
              { num: "3", label: "Networks" },
              { num: "GHS 2M+", label: "Processed" },
              { num: "99.9%", label: "Uptime" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0077C7] to-[#00B4FF]">{s.num}</p>
                <p className="text-sm text-gray-500 font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NETWORKS ─── */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-primary font-semibold text-sm mb-3 uppercase tracking-widest">All Major Networks</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Buy Data for Any Network</h2>
            <p className="text-gray-500 text-lg">We support all three major Ghana telecom networks with the best rates guaranteed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MTN */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-[#FFCC00]/10 via-[#FFCC00]/5 to-white border border-[#FFCC00]/30 shadow-sm hover:shadow-xl hover:shadow-yellow-100 transition-shadow cursor-pointer group"
            >
              <Link href="/bundles">
                <div className="w-16 h-16 rounded-full bg-[#FFCC00] flex items-center justify-center font-black text-black text-lg shadow-lg shadow-yellow-300/40 mb-6">MTN</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">MTN Ghana</h3>
                <p className="text-gray-500 text-sm mb-5">Daily, weekly & monthly bundles. Affordable rates with instant activation.</p>
                <span className="inline-flex items-center text-[#FFCC00] font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
                  View Bundles <ArrowRight className="w-4 h-4" />
                </span>
                <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-[#FFCC00]/10 blur-2xl" />
              </Link>
            </motion.div>

            {/* AirtelTigo */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-orange-50 via-orange-50/30 to-white border border-orange-100 shadow-sm hover:shadow-xl hover:shadow-orange-100 transition-shadow cursor-pointer group"
            >
              <Link href="/bundles">
                <div className="w-16 h-16 rounded-full bg-[#004b87] flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-400/30 mb-6">AT</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AirtelTigo</h3>
                <p className="text-gray-500 text-sm mb-5">High-value bundles with maximum data at competitive prices. Wide coverage.</p>
                <span className="inline-flex items-center text-[#004b87] font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
                  View Bundles <ArrowRight className="w-4 h-4" />
                </span>
                <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-orange-200/20 blur-2xl" />
              </Link>
            </motion.div>

            {/* Telecel */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-red-50 via-red-50/30 to-white border border-red-100 shadow-sm hover:shadow-xl hover:shadow-red-100 transition-shadow cursor-pointer group"
            >
              <Link href="/bundles">
                <div className="w-16 h-16 rounded-full bg-[#CC0000] flex items-center justify-center font-black text-white text-sm shadow-lg shadow-red-400/30 mb-6">TEL</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Telecel Ghana</h3>
                <p className="text-gray-500 text-sm mb-5">Great coverage, affordable data packages, and reliable connection nationwide.</p>
                <span className="inline-flex items-center text-[#CC0000] font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
                  View Bundles <ArrowRight className="w-4 h-4" />
                </span>
                <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-red-200/20 blur-2xl" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── WHY US ─── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0077C7] to-[#0099FF]" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-black/10 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-6 max-w-7xl">
          <div className="text-center text-white max-w-2xl mx-auto mb-16">
            <p className="font-semibold text-white/70 text-sm mb-3 uppercase tracking-widest">Why GigsHub</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Built for Ghana, Built for You</h2>
            <p className="text-white/75 text-lg">The fastest, most reliable digital services platform for Ghanaians.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="w-7 h-7" />,
                bg: "bg-white/10",
                title: "Lightning Fast",
                desc: "Automated processing delivers your bundles and registrations in seconds — not hours.",
              },
              {
                icon: <Shield className="w-7 h-7" />,
                bg: "bg-white/10",
                title: "100% Secure",
                desc: "Bank-grade encryption protects every transaction and your personal information.",
              },
              {
                icon: <Clock className="w-7 h-7" />,
                bg: "bg-white/10",
                title: "24/7 Available",
                desc: "Our systems never sleep. Buy data or register at any hour of any day.",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                whileHover={{ y: -4 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 text-white hover:bg-white/15 transition-all"
              >
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6">{f.icon}</div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-white/70 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-6">
            <div>
              <p className="text-primary font-semibold text-sm mb-3 uppercase tracking-widest">Services</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Our Services</h2>
              <p className="text-gray-500 text-lg max-w-md">Everything you need to stay connected and compliant in Ghana.</p>
            </div>
            <Button variant="outline" asChild className="rounded-xl border-2 border-gray-200 hover:border-primary">
              <Link href="/services">View All <ChevronRight className="ml-1 w-4 h-4" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Data Bundles */}
            <Link href="/bundles">
              <motion.div whileHover={{ y: -5 }} className="bg-white border border-gray-100 rounded-3xl p-7 shadow-sm hover:shadow-xl transition-all cursor-pointer group h-full">
                <div className="flex gap-2 mb-6">
                  <div className="w-11 h-11 rounded-full bg-[#FFCC00] border-2 border-white shadow flex items-center justify-center text-[10px] font-black text-black">MTN</div>
                  <div className="w-11 h-11 rounded-full bg-[#004b87] border-2 border-white shadow flex items-center justify-center text-[10px] font-black text-white -ml-3">AT</div>
                  <div className="w-11 h-11 rounded-full bg-[#CC0000] border-2 border-white shadow flex items-center justify-center text-[10px] font-black text-white -ml-3">TEL</div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">Data Bundles</h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">Cheapest bundles across all networks, instantly activated.</p>
                <span className="text-primary font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">Buy Now <ArrowRight className="w-4 h-4" /></span>
              </motion.div>
            </Link>

            {/* AFA Registration */}
            <Link href="/afa-registration">
              <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-7 shadow-sm hover:shadow-xl transition-all cursor-pointer group h-full">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">AFA Registration</h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">Link your Ghana Card to any phone number quickly and securely.</p>
                <span className="text-indigo-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">Register Now <ArrowRight className="w-4 h-4" /></span>
              </motion.div>
            </Link>

            {/* Agent Registration */}
            <Link href="/agent-registration">
              <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-3xl p-7 shadow-sm hover:shadow-xl transition-all cursor-pointer group h-full">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">Become an Agent</h3>
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">Register as a GigsHub agent and earn commissions on every transaction.</p>
                <span className="text-emerald-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">Join Now <ArrowRight className="w-4 h-4" /></span>
              </motion.div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS / TRUST ─── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-12">
            <p className="text-primary font-semibold text-sm mb-3 uppercase tracking-widest">Reviews</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Trusted by Ghanaians</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Kwame A.", location: "Accra", text: "GigsHub is amazing! I got my MTN data bundle in seconds. The best platform for data bundles in Ghana.", stars: 5 },
              { name: "Abena M.", location: "Kumasi", text: "AFA registration was so easy. Did it in 5 minutes without leaving my house. Highly recommend!", stars: 5 },
              { name: "Kofi T.", location: "Takoradi", text: "I've been using GigsHub for 6 months. The wallet system is great and the prices are unbeatable.", stars: 5 },
            ].map((r) => (
              <div key={r.name} className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
                <div className="flex mb-3">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{r.text}"</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                  <p className="text-gray-400 text-xs">{r.location}, Ghana</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BOTTOM ─── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#001f40] via-[#003870] to-[#0077C7]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#0099FF]/20 rounded-full blur-3xl" />
        <div className="relative container mx-auto px-6 max-w-3xl text-center text-white">
          <p className="font-semibold text-white/60 text-sm mb-4 uppercase tracking-widest">Get Started Today</p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Ready to Go Digital?</h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">Join thousands of Ghanaians already enjoying instant data, AFA registration, and more — all from GigsHub.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="rounded-2xl h-14 px-10 text-base font-semibold bg-white text-[#0077C7] hover:bg-gray-50 shadow-xl shadow-black/20 hover:-translate-y-1 transition-all"
            >
              <Link href="/register">Create Free Account</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="rounded-2xl h-14 px-10 text-base font-semibold text-white border-2 border-white/20 hover:bg-white/10 hover:-translate-y-1 transition-all"
            >
              <Link href="/bundles">Browse Data Bundles</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
