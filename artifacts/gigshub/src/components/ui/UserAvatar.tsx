import { useState, useEffect, useRef } from "react";

interface UserAvatarProps {
  name?: string;
  seed?: string;
  size?: number;
  className?: string;
  avatarStyle?: string;
}

export const AVATAR_STYLES = [
  { id: "adventurer", label: "Adventurer" },
  { id: "adventurer-neutral", label: "Neutral" },
  { id: "avataaars", label: "Avataaars" },
  { id: "big-ears", label: "Big Ears" },
  { id: "big-smile", label: "Big Smile" },
  { id: "bottts", label: "Robots" },
  { id: "fun-emoji", label: "Fun Emoji" },
  { id: "lorelei", label: "Lorelei" },
  { id: "miniavs", label: "Miniavs" },
  { id: "notionists", label: "Notionists" },
  { id: "open-peeps", label: "Open Peeps" },
  { id: "personas", label: "Personas" },
  { id: "pixel-art", label: "Pixel Art" },
  { id: "thumbs", label: "Thumbs" },
  { id: "croodles", label: "Croodles" },
];

const CACHE_PREFIX = "avatar_";
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getCachedSvg(key: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { svg, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_MAX_AGE) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return svg;
  } catch {
    return null;
  }
}

function setCachedSvg(key: string, svg: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ svg, ts: Date.now() }));
  } catch {}
}

export function getAvatarSrc(seed: string, style = "adventurer"): string {
  const stableSeed = encodeURIComponent(seed.trim() || "user");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${stableSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=gradientLinear&radius=50`;
}

const PLACEHOLDER_COLORS = ["#b6e3f4", "#c0aede", "#d1d4f9", "#ffd5dc", "#ffdfbf"];

function getPlaceholderColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

function getInitial(name: string): string {
  return (name.trim()[0] || "U").toUpperCase();
}

export function UserAvatar({ name = "User", seed, size = 40, className = "", avatarStyle = "adventurer" }: UserAvatarProps) {
  const actualSeed = seed ?? name;
  const url = getAvatarSrc(actualSeed, avatarStyle);
  const cacheKey = `${avatarStyle}_${actualSeed}`;

  const [svgDataUri, setSvgDataUri] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const prevCacheKey = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (prevCacheKey.current === cacheKey) return;
    prevCacheKey.current = cacheKey;

    abortRef.current?.abort();
    setLoaded(false);
    setSvgDataUri(null);

    const cached = getCachedSvg(cacheKey);
    if (cached) {
      const uri = `data:image/svg+xml;utf8,${encodeURIComponent(cached)}`;
      setSvgDataUri(uri);
      setLoaded(true);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetch(url, { signal: ctrl.signal })
      .then(r => r.ok ? r.text() : Promise.reject("fetch failed"))
      .then(svg => {
        if (ctrl.signal.aborted) return;
        setCachedSvg(cacheKey, svg);
        setSvgDataUri(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
        setLoaded(true);
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [cacheKey, url]);

  const bgColor = getPlaceholderColor(actualSeed);
  const initial = getInitial(name);
  const fontSize = Math.round(size * 0.4);

  return (
    <div
      className={`rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        backgroundColor: bgColor,
        position: "relative",
      }}
    >
      {!loaded && (
        <div
          style={{
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize,
            fontWeight: 700,
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
        >
          {initial}
        </div>
      )}
      {svgDataUri && (
        <img
          src={svgDataUri}
          alt={`${name}'s avatar`}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{
            width: size,
            height: size,
            position: "absolute",
            top: 0,
            left: 0,
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s ease-in",
          }}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}
