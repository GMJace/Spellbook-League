import type { CSSProperties } from "react";

type ProfileAvatarProps = {
  name: string;
  src?: string | null;
  size?: number;
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "?";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function ProfileAvatar({
  name,
  src,
  size = 96,
}: ProfileAvatarProps) {
  const sharedStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "999px",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    flexShrink: 0,
  } satisfies CSSProperties;

  if (src) {
    return (
      <img
        alt={`${name} profile picture`}
        src={src}
        style={{
          ...sharedStyle,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      aria-label={`${name} profile picture placeholder`}
      role="img"
      style={{
        ...sharedStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04))",
        color: "#ffffff",
        fontFamily: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif',
        fontSize: `${Math.max(18, Math.round(size * 0.34))}px`,
        fontWeight: 700,
        letterSpacing: "0.08em",
      }}
    >
      {getInitials(name)}
    </div>
  );
}
