import { useEffect, useRef, useState } from "react";
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
  const [showPoppers, setShowPoppers] = useState(false);
  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!justLoggedIn) return;
    setJustLoggedIn(false);

    setShowPoppers(true);
    startBirthdayPoppers();

    t1.current = setTimeout(() => setShowPoppers(false), 1400);
  }, [justLoggedIn]);

  useEffect(() => {
    return () => {
      if (t1.current) clearTimeout(t1.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {showPoppers && (
        <>
          <PopperEmoji key="left" side="left" />
          <PopperEmoji key="right" side="right" />
        </>
      )}
    </AnimatePresence>
  );
}
