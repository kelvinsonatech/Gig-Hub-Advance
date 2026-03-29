import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/use-auth";

const SESSION_KEY = "gigshub_confetti_fired";

const POPPER_COLORS = [
  "#FF3CAC", "#FFDD00", "#00C6FF", "#FF6B35",
  "#A855F7", "#00E676", "#FF1744", "#0077C7",
];

function firePopper(x: number, angle: number) {
  // Initial hard burst — the "pop"
  confetti({
    particleCount: 120,
    angle,
    spread: 55,
    origin: { x, y: 1 },
    colors: POPPER_COLORS,
    startVelocity: 72,
    gravity: 0.9,
    decay: 0.93,
    ticks: 280,
    shapes: ["square", "circle"],
    scalar: 1.1,
    zIndex: 9999,
  });

  // Streamers — long thin pieces
  confetti({
    particleCount: 40,
    angle,
    spread: 38,
    origin: { x, y: 1 },
    colors: POPPER_COLORS,
    startVelocity: 80,
    gravity: 0.75,
    decay: 0.95,
    ticks: 320,
    shapes: ["square"],
    scalar: 0.4,
    flat: true,
    zIndex: 9999,
  });

  // Stars scatter
  confetti({
    particleCount: 30,
    angle,
    spread: 70,
    origin: { x, y: 1 },
    colors: POPPER_COLORS,
    startVelocity: 60,
    gravity: 1.1,
    decay: 0.91,
    ticks: 240,
    shapes: ["star"],
    scalar: 1.4,
    zIndex: 9999,
  });
}

function startBirthdayPoppers() {
  // First double-pop
  firePopper(0.02, 65);
  firePopper(0.98, 115);

  // Second wave (slight delay — like two separate poppers going off)
  setTimeout(() => {
    firePopper(0.05, 72);
    firePopper(0.95, 108);
  }, 350);

  // Third mini-burst for extra flair
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 90,
      spread: 140,
      origin: { x: 0.5, y: 1 },
      colors: POPPER_COLORS,
      startVelocity: 55,
      gravity: 0.8,
      decay: 0.93,
      ticks: 260,
      shapes: ["star", "circle"],
      scalar: 1.2,
      zIndex: 9999,
    });
  }, 700);
}

// Animated 🎊 popper emoji that launches from a corner
function PopperEmoji({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <motion.div
      initial={{ opacity: 1, x: 0, y: 0, rotate: isLeft ? -20 : 20, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        x: isLeft ? [0, 30, 60] : [0, -30, -60],
        y: [0, -120, -220],
        rotate: isLeft ? [-20, 10, 30] : [20, -10, -30],
        scale: [1, 1.3, 0.6],
      }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      className="fixed bottom-0 text-5xl select-none pointer-events-none z-[9999]"
      style={{ [isLeft ? "left" : "right"]: "12px" }}
    >
      🎊
    </motion.div>
  );
}

export function LoginConfetti() {
  const { isAuthenticated, user } = useAuth();
  const [showBadge, setShowBadge] = useState(false);
  const [showPoppers, setShowPoppers] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    firedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");

    const t1 = setTimeout(() => {
      startBirthdayPoppers();
      setShowPoppers(true);
      setShowBadge(true);
    }, 280);

    const t2 = setTimeout(() => setShowPoppers(false), 1400);
    const t3 = setTimeout(() => setShowBadge(false), 3200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isAuthenticated]);

  const firstName = user?.name?.split(" ")[0] ?? "there";

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
            transition={{ type: "spring", stiffness: 440, damping: 22, delay: 0.15 }}
            className="fixed inset-x-0 top-[20%] flex justify-center z-[9998] pointer-events-none select-none"
          >
            <div className="bg-white rounded-3xl px-8 py-5 shadow-2xl border border-gray-100 flex flex-col items-center gap-1 mx-4">
              <span className="text-4xl mb-0.5">🎉</span>
              <p className="text-lg font-extrabold text-gray-900 leading-tight text-center">
                Welcome back, {firstName}!
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
