import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, Store, ShoppingCart, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const bottomTabs = [
  { href: "/dashboard", icon: Home,         label: "Home"   },
  { href: "/bundles",   icon: Store,        label: "Store"  },
  { href: "/orders",    icon: ShoppingCart, label: "Orders" },
  { href: "/wallet",    icon: LayoutGrid,   label: "Wallet" },
];

const TAB_SIZE   = 46;
const TAB_STRIDE = 58;
const NAV_PAD    = 12;

function tabLeft(index: number) {
  return NAV_PAD + index * TAB_STRIDE;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const activeIndex = bottomTabs.findIndex(t => t.href === location);
  const prevIndexRef = useRef(activeIndex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  const initIndex = activeIndex >= 0 ? activeIndex : 0;
  const [blobLeft,       setBlobLeft]       = useState(tabLeft(initIndex));
  const [blobWidth,      setBlobWidth]      = useState(TAB_SIZE);
  const [blobTransition, setBlobTransition] = useState("none");

  useEffect(() => {
    const prev = prevIndexRef.current;
    const curr = activeIndex;

    if (curr < 0) return;

    if (prev < 0 || prev === curr) {
      prevIndexRef.current = curr;
      setBlobLeft(tabLeft(curr));
      setBlobWidth(TAB_SIZE);
      setBlobTransition("none");
      return;
    }

    const srcLeft    = tabLeft(prev);
    const dstLeft    = tabLeft(curr);
    const stretchW   = Math.abs(dstLeft - srcLeft) + TAB_SIZE;
    const goingRight = curr > prev;
    prevIndexRef.current = curr;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (goingRight) {
      setBlobLeft(srcLeft);
      setBlobWidth(stretchW);
      setBlobTransition("width 0.14s cubic-bezier(0.34,1.56,0.64,1)");

      timerRef.current = setTimeout(() => {
        setBlobLeft(dstLeft);
        setBlobWidth(TAB_SIZE);
        setBlobTransition("left 0.2s cubic-bezier(0.34,1.16,0.64,1), width 0.18s cubic-bezier(0.34,1.16,0.64,1)");
      }, 130);
    } else {
      setBlobLeft(dstLeft);
      setBlobWidth(stretchW);
      setBlobTransition("left 0.14s cubic-bezier(0.34,1.56,0.64,1), width 0.14s cubic-bezier(0.34,1.56,0.64,1)");

      timerRef.current = setTimeout(() => {
        setBlobWidth(TAB_SIZE);
        setBlobTransition("width 0.2s cubic-bezier(0.34,1.16,0.64,1)");
      }, 130);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeIndex]);

  const spawnRipple = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleIdRef.current;
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rip => rip.id !== id)), 600);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-6 pointer-events-none">
      {/* Glass pill container */}
      <div
        className="relative flex items-center px-3 h-[66px] pointer-events-auto"
        style={{
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRadius: 33,
          border: "1px solid rgba(255,255,255,0.75)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(0,0,0,0.04) inset",
        }}
      >
        {/* Continuous shimmer sweep */}
        <div
          className="absolute inset-0 rounded-[33px] overflow-hidden pointer-events-none"
          aria-hidden
        >
          <div className="shimmer-wave" />
        </div>

        {/* Liquid blob (active pill) */}
        <div
          aria-hidden
          style={{
            position:     "absolute",
            left:         blobLeft,
            width:        blobWidth,
            height:       TAB_SIZE,
            top:          10,
            background:   "linear-gradient(135deg, rgba(0,149,255,0.18) 0%, rgba(0,119,199,0.12) 100%)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 23,
            border:       "1px solid rgba(0,149,255,0.25)",
            boxShadow:    "0 2px 12px rgba(0,119,199,0.15), 0 1px 0 rgba(255,255,255,0.6) inset",
            transition:   blobTransition,
          }}
        />

        {/* Tab icons */}
        {bottomTabs.map(({ href, icon: Icon, label }, i) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={spawnRipple}
              className="relative z-10 w-[46px] h-[46px] flex items-center justify-center rounded-full overflow-hidden select-none"
              style={{ marginLeft: i === 0 ? 0 : 12 }}
              aria-label={label}
            >
              {/* Ripples for this tab */}
              <AnimatePresence>
                {ripples.map(rip => (
                  <motion.span
                    key={rip.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: rip.x,
                      top:  rip.y,
                      x: "-50%",
                      y: "-50%",
                      background: "rgba(0,119,199,0.18)",
                    }}
                    initial={{ width: 0, height: 0, opacity: 0.7 }}
                    animate={{ width: 80, height: 80, opacity: 0 }}
                    exit={{}}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                  />
                ))}
              </AnimatePresence>

              {/* Icon */}
              <motion.div
                animate={{
                  scale:      isActive ? 1.12 : 1,
                  y:          isActive ? -1 : 0,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
              >
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="icon-glow"
                      className="absolute inset-0 rounded-full blur-md"
                      style={{ background: "rgba(0,119,199,0.3)", transform: "scale(1.6)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] relative z-10 transition-colors duration-200",
                      isActive ? "text-[#0077C7]" : "text-gray-400/80"
                    )}
                    strokeWidth={isActive ? 2.3 : 1.7}
                  />
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
