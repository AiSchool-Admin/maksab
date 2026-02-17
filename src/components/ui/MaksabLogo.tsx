"use client";

/**
 * MaksabLogo — Brand logo for مكسب
 * Green rounded square with gold $ symbol + brand text.
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
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="logoBg" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#2E8B4A" />
          <stop offset="100%" stopColor="#1D6B36" />
        </linearGradient>
      </defs>

      {/* Background — green rounded square */}
      <rect width="512" height="512" rx="112" fill="url(#logoBg)" />

      {/* Dollar sign $ — visually centered */}
      <text
        x="272"
        y="266"
        fontFamily="sans-serif"
        fontSize="260"
        fontWeight="900"
        fill="#C8942A"
        textAnchor="middle"
        dominantBaseline="central"
      >
        $
      </text>

      {/* Green accent dot */}
      <circle cx="370" cy="90" r="15" fill="#45C468" />
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

  // Full logo: icon + brand name
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
