import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Home, Store, ShoppingCart, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const bottomTabs = [
  { href: "/dashboard", icon: Home        },
  { href: "/bundles",   icon: Store       },
  { href: "/orders",    icon: ShoppingCart },
  { href: "/wallet",    icon: LayoutGrid  },
];

const TAB_SIZE   = 46;
const TAB_STRIDE = 58;
const NAV_PAD    = 12;

function tabLeft(index: number) {
  return NAV_PAD + index * TAB_STRIDE;
}

export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const activeIndex = bottomTabs.findIndex(t => t.href === location);
  const prevIndexRef = useRef(activeIndex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setBlobTransition("width 0.14s ease-out");

      timerRef.current = setTimeout(() => {
        setBlobLeft(dstLeft);
        setBlobWidth(TAB_SIZE);
        setBlobTransition("left 0.18s ease-in, width 0.18s ease-in");
      }, 140);
    } else {
      setBlobLeft(dstLeft);
      setBlobWidth(stretchW);
      setBlobTransition("left 0.14s ease-out, width 0.14s ease-out");

      timerRef.current = setTimeout(() => {
        setBlobWidth(TAB_SIZE);
        setBlobTransition("width 0.18s ease-in");
      }, 140);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [activeIndex]);

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-6">
      <div className="relative flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-3 h-[62px]">

        {/* Liquid blob */}
        <div
          aria-hidden
          style={{
            position:     "absolute",
            left:         blobLeft,
            width:        blobWidth,
            height:       TAB_SIZE,
            top:          8,
            background:   "rgba(0, 119, 199, 0.15)",
            borderRadius: 23,
            transition:   blobTransition,
          }}
        />

        {bottomTabs.map(({ href, icon: Icon }, i) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative z-10 w-[46px] h-[46px] flex items-center justify-center rounded-full"
              style={{ marginLeft: i === 0 ? 0 : 12 }}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 26 }}
              >
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors duration-150",
                    isActive ? "text-[#0077C7]" : "text-gray-400"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
