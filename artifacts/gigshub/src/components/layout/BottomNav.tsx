import { useRef } from "react";
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

  // Keep last known tab so blob doesn't jump when on non-tab pages
  const lastIndexRef = useRef(activeIndex >= 0 ? activeIndex : 0);
  if (activeIndex >= 0) lastIndexRef.current = activeIndex;
  const blobIndex = lastIndexRef.current;

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-6">
      <div className="relative flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-3 h-[62px]">

        {/* Spring-driven blob — framer handles interruption & overshoot naturally */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{
            left:    tabLeft(blobIndex),
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
          transition={{
            left:    { type: "spring", stiffness: 900, damping: 40, mass: 0.35 },
            opacity: { duration: 0.15 },
          }}
          style={{
            position:     "absolute",
            width:        TAB_SIZE,
            height:       TAB_SIZE,
            top:          8,
            background:   "rgba(255, 128, 0, 0.15)",
            borderRadius: 23,
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
                animate={{ scale: isActive ? 1.12 : 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 28 }}
              >
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-colors duration-150",
                    isActive ? "text-primary" : "text-gray-400"
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
