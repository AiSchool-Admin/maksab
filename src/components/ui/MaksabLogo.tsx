"use client";

/**
 * MaksabLogo — Professional brand logo for مكسب
 * Egyptian-inspired world-class design with stylized م lettermark.
 *
 * The logo combines:
 * - A shield/coin shape (trust + commerce)
 * - Stylized م lettermark (Arabic identity)
 * - Gold accent crescent (Egyptian heritage)
 * - Clean modern typography
 */

interface MaksabLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  className?: string;
}

const sizeConfig = {
  sm: { height: 28, iconSize: 28 },
  md: { height: 36, iconSize: 36 },
  lg: { height: 48, iconSize: 48 },
  xl: { height: 64, iconSize: 64 },
};

export default function MaksabLogo({
  size = "md",
  variant = "full",
  className = "",
}: MaksabLogoProps) {
  const { height, iconSize } = sizeConfig[size];

  const iconMark = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Background — rounded shield/coin shape */}
      <rect width="120" height="120" rx="28" fill="#1B7A3D" />

      {/* Inner glow ring */}
      <rect x="6" y="6" width="108" height="108" rx="22" fill="none" stroke="#2A9D4E" strokeWidth="1.5" opacity="0.4" />

      {/* Gold crescent accent — Egyptian heritage element */}
      <path
        d="M92 22C86 28 82 36 82 45C82 62 95 76 112 76C104 84 93 89 80 89C58 89 40 71 40 49C40 27 58 9 80 9C85 9 89 10 92 12"
        fill="#D4A843"
        opacity="0.15"
        transform="translate(-18, 8) scale(0.7)"
      />

      {/* Stylized م lettermark — main brand element */}
      <text
        x="60"
        y="68"
        fontFamily="'Cairo', 'Noto Sans Arabic', Arial, sans-serif"
        fontSize="62"
        fontWeight="800"
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
      >
        م
      </text>

      {/* Gold dot accent — like the dot on Egyptian coins */}
      <circle cx="60" cy="98" r="4" fill="#D4A843" />

      {/* Subtle sparkle accents */}
      <circle cx="96" cy="24" r="2" fill="#D4A843" opacity="0.6" />
      <circle cx="100" cy="18" r="1.2" fill="#D4A843" opacity="0.4" />
    </svg>
  );

  const wordmark = (
    <svg
      height={height * 0.75}
      viewBox="0 0 160 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="80"
        y="34"
        fontFamily="'Cairo', 'Noto Sans Arabic', Arial, sans-serif"
        fontSize="38"
        fontWeight="800"
        fill="#1B7A3D"
        textAnchor="middle"
        dominantBaseline="central"
      >
        مكسب
      </text>
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex ${className}`}>{iconMark}</div>;
  }

  if (variant === "wordmark") {
    return <div className={`inline-flex items-center ${className}`}>{wordmark}</div>;
  }

  // Full logo: icon + wordmark
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {iconMark}
      <span
        className="font-extrabold text-brand-green leading-none"
        style={{ fontSize: height * 0.6 }}
      >
        مكسب
      </span>
    </div>
  );
}
