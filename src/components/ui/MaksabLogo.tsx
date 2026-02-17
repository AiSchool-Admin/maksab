"use client";

/**
 * MaksabLogo — Brand logo for مكسب
 * Green rounded square with gold $ symbol + brand text.
 *
 * Variants:
 * - icon:      Icon only (green square with $)
 * - full:      Icon + مكسب inline (for header)
 * - wordmark:  Text only (مكسب)
 * - stacked:   Full branding stacked vertically (icon + مكسب + Maksab + EARN WITH EVERY DEAL)
 */

interface MaksabLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark" | "stacked";
  className?: string;
  showTagline?: boolean;
}

const sizeConfig = {
  sm: { height: 28, iconSize: 28 },
  md: { height: 36, iconSize: 36 },
  lg: { height: 48, iconSize: 48 },
  xl: { height: 64, iconSize: 64 },
};

const stackedSizeConfig = {
  sm: { iconSize: 56, arabicSize: 20, englishSize: 12, taglineSize: 8 },
  md: { iconSize: 80, arabicSize: 28, englishSize: 16, taglineSize: 10 },
  lg: { iconSize: 100, arabicSize: 34, englishSize: 20, taglineSize: 12 },
  xl: { iconSize: 128, arabicSize: 42, englishSize: 24, taglineSize: 14 },
};

function LogoIcon({ size, id }: { size: number; id: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={`logoBg-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#2E8B4A" />
          <stop offset="100%" stopColor="#1D6B36" />
        </linearGradient>
      </defs>

      {/* Background — green rounded square */}
      <rect width="512" height="512" rx="112" fill={`url(#logoBg-${id})`} />

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
}

export default function MaksabLogo({
  size = "md",
  variant = "full",
  className = "",
  showTagline = true,
}: MaksabLogoProps) {
  const { height, iconSize } = sizeConfig[size];

  if (variant === "icon") {
    return (
      <div className={`inline-flex ${className}`}>
        <LogoIcon size={iconSize} id="icon" />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={`inline-flex items-center ${className}`}>
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
      </div>
    );
  }

  if (variant === "stacked") {
    const s = stackedSizeConfig[size];
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <LogoIcon size={s.iconSize} id="stacked" />
        <span
          className="font-extrabold text-brand-green-dark leading-none mt-3"
          style={{ fontSize: s.arabicSize }}
        >
          مكسب
        </span>
        <span
          className="font-bold text-brand-green-dark leading-none mt-1 tracking-widest"
          style={{ fontSize: s.englishSize }}
        >
          Maksab
        </span>
        {showTagline && (
          <span
            className="font-semibold text-brand-gold tracking-wider leading-none mt-1.5 uppercase"
            style={{ fontSize: s.taglineSize, letterSpacing: "0.15em" }}
          >
            EARN WITH EVERY DEAL
          </span>
        )}
      </div>
    );
  }

  // Full logo: icon + brand name (inline, for header)
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <LogoIcon size={iconSize} id="full" />
      <span
        className="font-extrabold text-brand-green leading-none"
        style={{ fontSize: height * 0.6 }}
      >
        مكسب
      </span>
    </div>
  );
}
