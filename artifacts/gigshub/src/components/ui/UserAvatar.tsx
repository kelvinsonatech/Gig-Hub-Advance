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

export function getAvatarSrc(seed: string, style = "adventurer"): string {
  const stableSeed = encodeURIComponent(seed.trim() || "user");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${stableSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=gradientLinear&radius=50`;
}

export function UserAvatar({ name = "User", seed, size = 40, className = "", avatarStyle = "adventurer" }: UserAvatarProps) {
  const src = getAvatarSrc(seed ?? name, avatarStyle);

  return (
    <img
      src={src}
      alt={`${name}'s avatar`}
      width={size}
      height={size}
      className={`rounded-full object-cover bg-orange-50 ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    />
  );
}
