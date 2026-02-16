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
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#22A94E" />
          <stop offset="100%" stopColor="#1B7A3D" />
        </linearGradient>
        <linearGradient id="logoGold" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#F0D060" />
          <stop offset="50%" stopColor="#D4A843" />
          <stop offset="100%" stopColor="#C49530" />
        </linearGradient>
      </defs>

      {/* Background — green rounded square */}
      <rect width="120" height="120" rx="26" fill="url(#logoBg)" />

      {/* Dollar sign $ — main brand symbol */}
      <text
        x="60"
        y="66"
        fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
        fontSize="82"
        fontWeight="900"
        fill="url(#logoGold)"
        textAnchor="middle"
        dominantBaseline="central"
      >
        $
      </text>

      {/* Green accent circle */}
      <circle cx="82" cy="24" r="7" fill="#2ECC60" />
      <circle cx="82" cy="24" r="4.5" fill="#3DDB72" />
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
