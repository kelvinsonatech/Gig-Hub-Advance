import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useRef } from "react";
import { Home, Store, ShoppingCart, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const bottomTabs = [
  { href: "/dashboard", icon: Home        },
  { href: "/bundles",   icon: Store       },
  { href: "/orders",    icon: ShoppingCart },
  { href: "/wallet",    icon: LayoutGrid  },
];

const TAB_SIZE = 46;
const TAB_STRIDE = 58;
const NAV_PAD = 12;

function tabLeft(index: number) {
  return NAV_PAD + index * TAB_STRIDE;
}

export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const activeIndex = bottomTabs.findIndex(t => t.href === location);
  const prevIndexRef = useRef(activeIndex);
  const controls = useAnimationControls();

  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev === activeIndex || prev < 0) return;

    const dir = activeIndex > prev ? 1 : -1;
    const srcLeft = tabLeft(prev);
    const dstLeft = tabLeft(activeIndex);
    const stretchWidth = Math.abs(dstLeft - srcLeft) + TAB_SIZE;
    prevIndexRef.current = activeIndex;

    if (dir > 0) {
      controls.start({
        left:         [srcLeft,      srcLeft,      dstLeft],
        width:        [TAB_SIZE,     stretchWidth, TAB_SIZE],
        borderRadius: ["23px", "12px", "23px"],
        transition: { duration: 0.44, times: [0, 0.46, 1], ease: "easeInOut" },
      });
    } else {
      controls.start({
        left:         [srcLeft,      dstLeft,      dstLeft],
        width:        [TAB_SIZE,     stretchWidth, TAB_SIZE],
        borderRadius: ["23px", "12px", "23px"],
        transition: { duration: 0.44, times: [0, 0.46, 1], ease: "easeInOut" },
      });
    }
  }, [activeIndex]);

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-6">
      <div className="relative flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-3 h-[62px]">

        {activeIndex >= 0 && (
          <motion.div
            animate={controls}
            initial={{ left: tabLeft(activeIndex), width: TAB_SIZE }}
            className="absolute bg-[#0077C7]/15 rounded-full"
            style={{ height: TAB_SIZE, top: 8 }}
          />
        )}

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
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
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
