import { useLocation } from "wouter";

export function TopLoadingBar() {
  const [location] = useLocation();
  return (
    <div
      key={location}
      className="pointer-events-none fixed top-0 left-0 z-[9999] h-[2.5px] bg-orange-500 rounded-r-full"
      style={{ animation: "topbar 1.1s cubic-bezier(0.4,0,0.2,1) forwards" }}
    />
  );
}
