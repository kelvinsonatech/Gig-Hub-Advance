import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/use-auth";

const SESSION_KEY = "gigshub_confetti_fired";

const BIRTHDAY_COLORS = [
  "#0077C7", "#00AAFF", "#FF6B6B", "#FFD93D",
  "#6BCB77", "#C77DFF", "#FF9F43", "#FF6EB4",
];

function fireCannons() {
  const duration = 3200;
  const end = Date.now() + duration;

  const defaults = {
    colors: BIRTHDAY_COLORS,
    zIndex: 9999,
    disableForReducedMotion: true,
  };

  // Left cannon burst
  confetti({
    ...defaults,
    particleCount: 80,
    angle: 60,
    spread: 65,
    origin: { x: 0, y: 0.85 },
    startVelocity: 55,
    shapes: ["star", "circle"],
    scalar: 1.1,
  });

  // Right cannon burst
  confetti({
    ...defaults,
    particleCount: 80,
    angle: 120,
    spread: 65,
    origin: { x: 1, y: 0.85 },
    startVelocity: 55,
    shapes: ["star", "circle"],
    scalar: 1.1,
  });

  // Centre top shower (delayed)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 60,
      angle: 90,
      spread: 120,
      origin: { x: 0.5, y: 0 },
      startVelocity: 28,
      gravity: 0.9,
      ticks: 240,
      shapes: ["star"],
      scalar: 1.3,
    });
  }, 400);

  // Continuous trickle until duration ends
  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }
    confetti({
      ...defaults,
      particleCount: 6,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.75 },
      startVelocity: 40,
      scalar: 0.9,
    });
    confetti({
      ...defaults,
      particleCount: 6,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.75 },
      startVelocity: 40,
      scalar: 0.9,
    });
  }, 260);
}

export function LoginConfetti() {
  const { isAuthenticated, user } = useAuth();
  const [showBadge, setShowBadge] = useState(false);
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

    // Tiny delay so the dashboard has painted first
    const t1 = setTimeout(() => {
      fireCannons();
      setShowBadge(true);
    }, 300);

    const t2 = setTimeout(() => setShowBadge(false), 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isAuthenticated]);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <AnimatePresence>
      {showBadge && (
        <motion.div
          key="badge"
          initial={{ opacity: 0, scale: 0.5, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className="fixed inset-x-0 top-[22%] flex justify-center z-[9998] pointer-events-none select-none"
        >
          <div className="flex flex-col items-center gap-1">
            <div className="bg-white rounded-3xl px-8 py-5 shadow-2xl border border-gray-100 flex flex-col items-center gap-1">
              <span className="text-4xl">🎉</span>
              <p className="text-lg font-extrabold text-gray-900 leading-tight">
                Welcome back, {firstName}!
              </p>
              <p className="text-sm text-[#0077C7] font-semibold">
                Great to see you on GigsHub
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
