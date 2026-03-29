import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuthStore } from "@/hooks/use-auth";

const POPPER_COLORS = [
  "#FF3CAC", "#FFDD00", "#00C6FF", "#FF6B35",
  "#A855F7", "#00E676", "#FF1744", "#0077C7",
];

function firePopper(x: number, angle: number) {
  // Main burst
  confetti({
    particleCount: 55,
    angle,
    spread: 50,
    origin: { x, y: 1 },
    colors: POPPER_COLORS,
    startVelocity: 58,
    gravity: 1.0,
    decay: 0.92,
    ticks: 220,
    shapes: ["square", "circle"],
    scalar: 1.0,
    zIndex: 9999,
  });
  // Streamers
  confetti({
    particleCount: 18,
    angle,
    spread: 35,
    origin: { x, y: 1 },
    colors: POPPER_COLORS,
    startVelocity: 62,
    gravity: 0.8,
    decay: 0.94,
    ticks: 240,
    shapes: ["square"],
    scalar: 0.4,
    flat: true,
    zIndex: 9999,
  });
}

function startBirthdayPoppers() {
  // Single wave — both corners pop simultaneously
  firePopper(0.02, 65);
  firePopper(0.98, 115);
}

function PopperEmoji({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, rotate: isLeft ? -20 : 20, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        x: isLeft ? [0, 30, 70] : [0, -30, -70],
        y: [0, -130, -240],
        rotate: isLeft ? [-20, 10, 35] : [20, -10, -35],
        scale: [1, 1.4, 0.5],
      }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      className="fixed bottom-2 text-5xl select-none pointer-events-none z-[9999]"
      style={{ [isLeft ? "left" : "right"]: "14px" }}
    >
      🎊
    </motion.div>
  );
}

export function LoginConfetti() {
  const { justLoggedIn, setJustLoggedIn } = useAuthStore();
  const [showBadge, setShowBadge] = useState(false);
  const [showPoppers, setShowPoppers] = useState(false);
  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!justLoggedIn) return;
    setJustLoggedIn(false);

    setShowPoppers(true);
    setShowBadge(true);
    startBirthdayPoppers();

    // Store timers in refs so the cleanup from this effect re-running
    // (caused by setJustLoggedIn(false)) does NOT cancel them
    t1.current = setTimeout(() => setShowPoppers(false), 1400);
    t2.current = setTimeout(() => setShowBadge(false), 3200);
  }, [justLoggedIn]);

  // Only clear on actual unmount
  useEffect(() => {
    return () => {
      if (t1.current) clearTimeout(t1.current);
      if (t2.current) clearTimeout(t2.current);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {showPoppers && (
          <>
            <PopperEmoji key="left" side="left" />
            <PopperEmoji key="right" side="right" />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBadge && (
          <motion.div
            key="badge"
            initial={{ opacity: 0, scale: 0.4, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.75, y: -24 }}
            transition={{ type: "spring", stiffness: 440, damping: 22, delay: 0.1 }}
            className="fixed inset-x-0 top-[20%] flex justify-center z-[9998] pointer-events-none select-none"
          >
            <div className="bg-white rounded-3xl px-8 py-5 shadow-2xl border border-gray-100 flex flex-col items-center gap-1 mx-4">
              <span className="text-4xl mb-0.5">🎉</span>
              <p className="text-lg font-extrabold text-gray-900 leading-tight text-center">
                Welcome back!
              </p>
              <p className="text-sm text-[#0077C7] font-semibold">
                Great to see you on GigsHub
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
