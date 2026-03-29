interface UserAvatarProps {
  name?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({ name = "User", size = 40, className = "" }: UserAvatarProps) {
  const seed = encodeURIComponent(name.trim() || "user");
  const src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&backgroundType=gradientLinear&radius=50`;

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
