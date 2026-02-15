"use client";

/**
 * CategoryIcon — Professional custom SVG icons with gradient backgrounds.
 * Each category has a unique, detailed SVG illustration.
 * No external images — fast, reliable, always works offline.
 */

import { type ReactNode } from "react";

interface CategoryStyleConfig {
  name: string;
  icon: (color: string) => ReactNode;
  bgFrom: string;
  bgTo: string;
  iconColor: string;
  shadowColor: string;
}

// ── SVG Icon Definitions ─────────────────────────────────────────

function CarIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="car-g" x1="4" y1="14" x2="44" y2="36">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Car body */}
      <path d="M8 28L12 18C13 15.5 15 14 17.5 14H30.5C33 14 35 15.5 36 18L40 28" stroke="url(#car-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6" y="27" width="36" height="10" rx="4" stroke="url(#car-g)" strokeWidth="2.5" />
      {/* Windows */}
      <path d="M16 18L14 25H22V18C22 17 21.5 16.5 21 16.5H17.5C16.5 16.5 16.2 17.2 16 18Z" fill={color} fillOpacity="0.15" stroke={color} strokeOpacity="0.4" strokeWidth="1.2" />
      <path d="M26 25H34L32 18C31.8 17.2 31.5 16.5 30.5 16.5H27C26.5 16.5 26 17 26 18V25Z" fill={color} fillOpacity="0.15" stroke={color} strokeOpacity="0.4" strokeWidth="1.2" />
      {/* Wheels */}
      <circle cx="15" cy="37" r="4" stroke="url(#car-g)" strokeWidth="2.5" />
      <circle cx="15" cy="37" r="1.5" fill={color} fillOpacity="0.3" />
      <circle cx="33" cy="37" r="4" stroke="url(#car-g)" strokeWidth="2.5" />
      <circle cx="33" cy="37" r="1.5" fill={color} fillOpacity="0.3" />
      {/* Headlights */}
      <rect x="7" y="29" width="4" height="2.5" rx="1" fill={color} fillOpacity="0.35" />
      <rect x="37" y="29" width="4" height="2.5" rx="1" fill={color} fillOpacity="0.35" />
    </svg>
  );
}

function RealEstateIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="house-g" x1="8" y1="8" x2="40" y2="42">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Building */}
      <rect x="10" y="16" width="18" height="26" rx="2" stroke="url(#house-g)" strokeWidth="2.5" />
      {/* Roof */}
      <path d="M7 18L19 8L31 18" stroke="url(#house-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Tower building right */}
      <rect x="30" y="22" width="10" height="20" rx="1.5" stroke="url(#house-g)" strokeWidth="2" />
      <rect x="30" y="20" width="10" height="4" rx="1" fill={color} fillOpacity="0.15" stroke={color} strokeOpacity="0.3" strokeWidth="1" />
      {/* Windows left building */}
      <rect x="14" y="20" width="4" height="4" rx="1" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      <rect x="20" y="20" width="4" height="4" rx="1" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      <rect x="14" y="27" width="4" height="4" rx="1" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      <rect x="20" y="27" width="4" height="4" rx="1" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      {/* Windows right building */}
      <rect x="33" y="26" width="4" height="3.5" rx="0.8" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      <rect x="33" y="32" width="4" height="3.5" rx="0.8" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
      {/* Door */}
      <rect x="17" y="34" width="5" height="8" rx="1.5" fill={color} fillOpacity="0.25" stroke={color} strokeOpacity="0.5" strokeWidth="1.2" />
    </svg>
  );
}

function PhoneIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="phone-g" x1="14" y1="4" x2="34" y2="44">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Phone body */}
      <rect x="13" y="6" width="22" height="36" rx="4" stroke="url(#phone-g)" strokeWidth="2.5" />
      {/* Screen */}
      <rect x="16" y="12" width="16" height="20" rx="1.5" fill={color} fillOpacity="0.08" stroke={color} strokeOpacity="0.25" strokeWidth="1" />
      {/* Camera notch */}
      <rect x="20" y="8" width="8" height="2.5" rx="1.25" fill={color} fillOpacity="0.2" />
      {/* Camera dot */}
      <circle cx="26" cy="9.25" r="1" fill={color} fillOpacity="0.35" />
      {/* Screen content lines */}
      <rect x="18" y="15" width="10" height="1.5" rx="0.75" fill={color} fillOpacity="0.15" />
      <rect x="18" y="18.5" width="7" height="1.5" rx="0.75" fill={color} fillOpacity="0.1" />
      <rect x="18" y="22" width="12" height="1.5" rx="0.75" fill={color} fillOpacity="0.1" />
      <rect x="18" y="25.5" width="5" height="1.5" rx="0.75" fill={color} fillOpacity="0.1" />
      {/* Home bar */}
      <rect x="20" y="36" width="8" height="2" rx="1" fill={color} fillOpacity="0.2" />
    </svg>
  );
}

function FashionIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="fashion-g" x1="10" y1="4" x2="38" y2="44">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Hanger hook */}
      <path d="M24 6C24 6 22 6 22 8C22 10 24 10 24 10" stroke="url(#fashion-g)" strokeWidth="2" strokeLinecap="round" />
      {/* Hanger */}
      <path d="M24 10L38 20H10L24 10Z" stroke="url(#fashion-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dress body */}
      <path d="M14 20L12 40C12 41.5 13 42 14 42H34C35 42 36 41.5 36 40L34 20" stroke="url(#fashion-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Waist belt */}
      <path d="M15 28H33" stroke={color} strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      {/* Dress folds */}
      <path d="M18 28L14 42" stroke={color} strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 28V42" stroke={color} strokeOpacity="0.1" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 28L34 42" stroke={color} strokeOpacity="0.15" strokeWidth="1.5" strokeLinecap="round" />
      {/* Collar detail */}
      <path d="M20 20C20 22 22 23 24 23C26 23 28 22 28 20" stroke={color} strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ScrapIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="scrap-g" x1="6" y1="6" x2="42" y2="42">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Recycle circle */}
      <circle cx="24" cy="24" r="18" stroke="url(#scrap-g)" strokeWidth="2.5" />
      {/* Recycle arrows */}
      <path d="M24 10L28 16H20L24 10Z" fill={color} fillOpacity="0.3" />
      <path d="M24 10C28 10 32 12.5 34 16L28 16" stroke="url(#scrap-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 16L37 24C38 28 36 32 33 34" stroke="url(#scrap-g)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M37 24L33 22L35 28L37 24Z" fill={color} fillOpacity="0.3" />
      <path d="M33 34C30 37 26 38 22 37L18 34" stroke="url(#scrap-g)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 37L21 33L17 36L22 37Z" fill={color} fillOpacity="0.3" />
      <path d="M14 31L11 24C10 20 12 16 15 14" stroke="url(#scrap-g)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Center gear */}
      <circle cx="24" cy="24" r="4" stroke={color} strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="1.5" fill={color} fillOpacity="0.25" />
    </svg>
  );
}

function GoldIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="gold-g" x1="6" y1="8" x2="42" y2="40">
          <stop stopColor={color} />
          <stop offset="0.5" stopColor="#F5D36E" />
          <stop offset="1" stopColor={color} stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="gold-shine" x1="16" y1="12" x2="32" y2="28">
          <stop stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Ring */}
      <ellipse cx="24" cy="22" rx="14" ry="12" stroke="url(#gold-g)" strokeWidth="3" />
      <ellipse cx="24" cy="22" rx="10" ry="8.5" stroke="url(#gold-g)" strokeWidth="2" />
      {/* Diamond on ring */}
      <path d="M24 10L28 14L24 19L20 14L24 10Z" fill={color} fillOpacity="0.3" stroke="url(#gold-g)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 14H28L24 19L20 14Z" fill={color} fillOpacity="0.15" />
      {/* Shine */}
      <path d="M16 18C16 18 18 14 22 13" stroke="url(#gold-shine)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Gold bar below */}
      <path d="M12 34L16 30H32L36 34H12Z" fill={color} fillOpacity="0.15" stroke="url(#gold-g)" strokeWidth="2" strokeLinejoin="round" />
      <rect x="12" y="34" width="24" height="7" rx="1" fill={color} fillOpacity="0.1" stroke="url(#gold-g)" strokeWidth="2" />
      {/* Shine on bar */}
      <rect x="16" y="36" width="8" height="2" rx="1" fill={color} fillOpacity="0.15" />
      {/* Sparkles */}
      <path d="M38 10L39 12L41 13L39 14L38 16L37 14L35 13L37 12L38 10Z" fill={color} fillOpacity="0.4" />
      <path d="M10 8L10.7 9.5L12 10L10.7 10.5L10 12L9.3 10.5L8 10L9.3 9.5L10 8Z" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

function LuxuryIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="luxury-g" x1="8" y1="6" x2="40" y2="42">
          <stop stopColor={color} />
          <stop offset="0.5" stopColor="#E879A8" />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Diamond shape */}
      <path d="M24 6L40 20L24 42L8 20L24 6Z" stroke="url(#luxury-g)" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Top facets */}
      <path d="M24 6L16 20H32L24 6Z" fill={color} fillOpacity="0.1" stroke={color} strokeOpacity="0.3" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 20L16 20L24 6" stroke={color} strokeOpacity="0.3" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M40 20L32 20L24 6" stroke={color} strokeOpacity="0.3" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Center line down */}
      <path d="M16 20L24 42L32 20" stroke={color} strokeOpacity="0.25" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Side facets */}
      <path d="M8 20L16 20L24 42" fill={color} fillOpacity="0.06" />
      <path d="M32 20L40 20L24 42" fill={color} fillOpacity="0.06" />
      <path d="M16 20H32L24 42L16 20Z" fill={color} fillOpacity="0.04" />
      {/* Shine */}
      <path d="M14 16L18 20" stroke="white" strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 20L16 24" stroke="white" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round" />
      {/* Sparkles */}
      <path d="M42 10L43 12.5L45 13L43 13.5L42 16L41 13.5L39 13L41 12.5L42 10Z" fill={color} fillOpacity="0.4" />
      <path d="M6 12L6.7 13.5L8 14L6.7 14.5L6 16L5.3 14.5L4 14L5.3 13.5L6 12Z" fill={color} fillOpacity="0.3" />
      <path d="M36 4L36.5 5.2L38 5.5L36.5 5.8L36 7L35.5 5.8L34 5.5L35.5 5.2L36 4Z" fill={color} fillOpacity="0.25" />
    </svg>
  );
}

function AppliancesIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="appl-g" x1="8" y1="4" x2="40" y2="44">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Washing machine body */}
      <rect x="10" y="6" width="28" height="36" rx="3" stroke="url(#appl-g)" strokeWidth="2.5" />
      {/* Control panel */}
      <rect x="10" y="6" width="28" height="10" rx="3" fill={color} fillOpacity="0.06" stroke="url(#appl-g)" strokeWidth="2.5" />
      {/* Knob */}
      <circle cx="18" cy="11" r="2.5" stroke={color} strokeOpacity="0.5" strokeWidth="1.5" />
      <line x1="18" y1="9" x2="18" y2="11" stroke={color} strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round" />
      {/* Display */}
      <rect x="24" y="9" width="10" height="4" rx="1" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.3" strokeWidth="1" />
      {/* Drum circle */}
      <circle cx="24" cy="28" r="10" stroke="url(#appl-g)" strokeWidth="2.5" />
      <circle cx="24" cy="28" r="7" stroke={color} strokeOpacity="0.25" strokeWidth="1.2" />
      {/* Drum details - clothes swirl */}
      <path d="M20 25C21 23 23 22 26 24C29 26 27 30 25 31" stroke={color} strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round" />
      {/* Door handle */}
      <circle cx="24" cy="28" r="2" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

function FurnitureIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="furn-g" x1="4" y1="12" x2="44" y2="40">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Sofa back */}
      <path d="M8 14C8 12 9.5 10 12 10H36C38.5 10 40 12 40 14V24H8V14Z" fill={color} fillOpacity="0.08" stroke="url(#furn-g)" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Sofa seat */}
      <rect x="6" y="24" width="36" height="10" rx="3" stroke="url(#furn-g)" strokeWidth="2.5" />
      <rect x="6" y="24" width="36" height="10" rx="3" fill={color} fillOpacity="0.06" />
      {/* Left armrest */}
      <path d="M6 18C4 18 3 19.5 3 21V31C3 32.5 4 34 6 34" stroke="url(#furn-g)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right armrest */}
      <path d="M42 18C44 18 45 19.5 45 21V31C45 32.5 44 34 42 34" stroke="url(#furn-g)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Cushion lines */}
      <line x1="18" y1="12" x2="18" y2="24" stroke={color} strokeOpacity="0.15" strokeWidth="1.2" />
      <line x1="30" y1="12" x2="30" y2="24" stroke={color} strokeOpacity="0.15" strokeWidth="1.2" />
      {/* Cushion pattern */}
      <path d="M12 16C13 15 16 15 17 16" stroke={color} strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
      <path d="M22 16C23 15 28 15 29 16" stroke={color} strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
      {/* Legs */}
      <line x1="10" y1="34" x2="10" y2="40" stroke="url(#furn-g)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="38" y1="34" x2="38" y2="40" stroke="url(#furn-g)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function HobbiesIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="hobby-g" x1="4" y1="8" x2="44" y2="40">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Controller body */}
      <path d="M8 18C6 18 4 20 4 23V29C4 32 6 34 9 34H16L20 28H28L32 34H39C42 34 44 32 44 29V23C44 20 42 18 40 18H8Z" stroke="url(#hobby-g)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M8 18C6 18 4 20 4 23V29C4 32 6 34 9 34H16L20 28H28L32 34H39C42 34 44 32 44 29V23C44 20 42 18 40 18H8Z" fill={color} fillOpacity="0.06" />
      {/* D-pad */}
      <rect x="11" y="22" width="3" height="9" rx="1" fill={color} fillOpacity="0.25" />
      <rect x="8.5" y="24.5" width="8" height="3" rx="1" fill={color} fillOpacity="0.25" />
      {/* Action buttons */}
      <circle cx="36" cy="22" r="2" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="40" cy="26" r="2" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="32" cy="26" r="2" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="36" cy="30" r="2" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
      {/* Center buttons */}
      <rect x="21" y="21" width="3" height="2" rx="0.8" fill={color} fillOpacity="0.2" />
      <rect x="25" y="21" width="3" height="2" rx="0.8" fill={color} fillOpacity="0.2" />
      {/* Analog sticks hint */}
      <circle cx="16" cy="16" r="1" fill={color} fillOpacity="0.15" />
      <circle cx="32" cy="16" r="1" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

function ToolsIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="tools-g" x1="4" y1="4" x2="44" y2="44">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Wrench */}
      <path d="M12 8C8 8 5 11 5 15C5 17.5 6.5 19.5 8 21L26 39C27 40 28.5 40 29.5 39L31 37.5C32 36.5 32 35 31 34L13 16C14.5 14.5 15 12.5 15 11C15 9 13.5 8 12 8Z" stroke="url(#tools-g)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="10" cy="14" r="2.5" fill={color} fillOpacity="0.15" />
      {/* Screwdriver */}
      <path d="M36 6L42 12L38 16L32 10L36 6Z" fill={color} fillOpacity="0.12" stroke="url(#tools-g)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 10L18 24" stroke="url(#tools-g)" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 24L16 28L20 30L22 26" stroke="url(#tools-g)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 28L12 36C11 38 13 40 15 39L20 30" stroke="url(#tools-g)" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Sparkle */}
      <path d="M40 28L41 30L43 31L41 32L40 34L39 32L37 31L39 30L40 28Z" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

function ServicesIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="svc-g" x1="4" y1="4" x2="44" y2="44">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Person silhouette */}
      <circle cx="20" cy="12" r="5" stroke="url(#svc-g)" strokeWidth="2.5" />
      <path d="M10 34V28C10 24 13 21 17 21H23C27 21 30 24 30 28V34" stroke="url(#svc-g)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Gear */}
      <circle cx="36" cy="30" r="6" stroke="url(#svc-g)" strokeWidth="2" />
      <circle cx="36" cy="30" r="2.5" fill={color} fillOpacity="0.15" stroke={color} strokeOpacity="0.3" strokeWidth="1.2" />
      {/* Gear teeth */}
      <line x1="36" y1="22.5" x2="36" y2="25" stroke="url(#svc-g)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="35" x2="36" y2="37.5" stroke="url(#svc-g)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28.5" y1="30" x2="31" y2="30" stroke="url(#svc-g)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="41" y1="30" x2="43.5" y2="30" stroke="url(#svc-g)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30.7" y1="24.7" x2="32.5" y2="26.5" stroke="url(#svc-g)" strokeWidth="2" strokeLinecap="round" />
      <line x1="39.5" y1="33.5" x2="41.3" y2="35.3" stroke="url(#svc-g)" strokeWidth="2" strokeLinecap="round" />
      <line x1="41.3" y1="24.7" x2="39.5" y2="26.5" stroke="url(#svc-g)" strokeWidth="2" strokeLinecap="round" />
      <line x1="32.5" y1="33.5" x2="30.7" y2="35.3" stroke="url(#svc-g)" strokeWidth="2" strokeLinecap="round" />
      {/* Checkmark badge */}
      <circle cx="30" cy="16" r="5" fill="white" stroke="url(#svc-g)" strokeWidth="1.5" />
      <path d="M28 16L29.5 17.5L32.5 14.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Category Configuration ───────────────────────────────────────

const categoryStyles: Record<string, CategoryStyleConfig> = {
  cars: {
    name: "سيارات",
    icon: (c) => <CarIcon color={c} />,
    bgFrom: "#DBEAFE",  // blue-100
    bgTo: "#EFF6FF",    // blue-50
    iconColor: "#2563EB", // blue-600
    shadowColor: "rgba(37, 99, 235, 0.2)",
  },
  "real-estate": {
    name: "عقارات",
    icon: (c) => <RealEstateIcon color={c} />,
    bgFrom: "#E0E7FF", // indigo-100
    bgTo: "#EEF2FF",   // indigo-50
    iconColor: "#4F46E5", // indigo-600
    shadowColor: "rgba(79, 70, 229, 0.2)",
  },
  phones: {
    name: "موبايلات",
    icon: (c) => <PhoneIcon color={c} />,
    bgFrom: "#E2E8F0", // slate-200
    bgTo: "#F1F5F9",   // slate-100
    iconColor: "#475569", // slate-600
    shadowColor: "rgba(71, 85, 105, 0.2)",
  },
  fashion: {
    name: "موضة",
    icon: (c) => <FashionIcon color={c} />,
    bgFrom: "#FCE7F3", // pink-100
    bgTo: "#FDF2F8",   // pink-50
    iconColor: "#DB2777", // pink-600
    shadowColor: "rgba(219, 39, 119, 0.2)",
  },
  scrap: {
    name: "خردة",
    icon: (c) => <ScrapIcon color={c} />,
    bgFrom: "#D1FAE5", // emerald-100
    bgTo: "#ECFDF5",   // emerald-50
    iconColor: "#059669", // emerald-600
    shadowColor: "rgba(5, 150, 105, 0.2)",
  },
  gold: {
    name: "ذهب وفضة",
    icon: (c) => <GoldIcon color={c} />,
    bgFrom: "#FEF3C7", // amber-100
    bgTo: "#FFFBEB",   // amber-50
    iconColor: "#D97706", // amber-600
    shadowColor: "rgba(217, 119, 6, 0.25)",
  },
  luxury: {
    name: "فاخرة",
    icon: (c) => <LuxuryIcon color={c} />,
    bgFrom: "#F3E8FF", // purple-100
    bgTo: "#FAF5FF",   // purple-50
    iconColor: "#9333EA", // purple-600
    shadowColor: "rgba(147, 51, 234, 0.2)",
  },
  appliances: {
    name: "أجهزة",
    icon: (c) => <AppliancesIcon color={c} />,
    bgFrom: "#CFFAFE", // cyan-100
    bgTo: "#ECFEFF",   // cyan-50
    iconColor: "#0891B2", // cyan-600
    shadowColor: "rgba(8, 145, 178, 0.2)",
  },
  furniture: {
    name: "أثاث",
    icon: (c) => <FurnitureIcon color={c} />,
    bgFrom: "#D1FAE5", // emerald-100
    bgTo: "#F0FDF4",   // green-50
    iconColor: "#16A34A", // green-600
    shadowColor: "rgba(22, 163, 74, 0.2)",
  },
  hobbies: {
    name: "هوايات",
    icon: (c) => <HobbiesIcon color={c} />,
    bgFrom: "#FFE4E6", // rose-100
    bgTo: "#FFF1F2",   // rose-50
    iconColor: "#E11D48", // rose-600
    shadowColor: "rgba(225, 29, 72, 0.2)",
  },
  tools: {
    name: "عدد",
    icon: (c) => <ToolsIcon color={c} />,
    bgFrom: "#FFEDD5", // orange-100
    bgTo: "#FFF7ED",   // orange-50
    iconColor: "#EA580C", // orange-600
    shadowColor: "rgba(234, 88, 12, 0.2)",
  },
  services: {
    name: "خدمات",
    icon: (c) => <ServicesIcon color={c} />,
    bgFrom: "#CCFBF1", // teal-100
    bgTo: "#F0FDFA",   // teal-50
    iconColor: "#0D9488", // teal-600
    shadowColor: "rgba(13, 148, 136, 0.2)",
  },
};

// Alias
categoryStyles["real_estate"] = categoryStyles["real-estate"];

function getIconSlug(slug: string): string {
  if (slug === "real_estate") return "real-estate";
  return slug;
}

// ── Size Config ──────────────────────────────────────────────────

const sizeMap = {
  sm: { container: "w-14 h-14", icon: "w-8 h-8" },
  md: { container: "w-[66px] h-[66px]", icon: "w-9 h-9" },
  lg: { container: "w-20 h-20", icon: "w-11 h-11" },
  xl: { container: "w-24 h-24", icon: "w-14 h-14" },
};

// ── Component ────────────────────────────────────────────────────

interface CategoryIconProps {
  slug: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function CategoryIcon({
  slug,
  size = "md",
  className = "",
}: CategoryIconProps) {
  const s = sizeMap[size];
  const iconSlug = getIconSlug(slug);
  const cat = categoryStyles[slug] || categoryStyles[iconSlug];

  const bgFrom = cat?.bgFrom || "#F3F4F6";
  const bgTo = cat?.bgTo || "#F9FAFB";
  const iconColor = cat?.iconColor || "#6B7280";
  const shadowColor = cat?.shadowColor || "rgba(107, 114, 128, 0.15)";

  return (
    <div
      className={`${s.container} rounded-2xl flex items-center justify-center
        hover:scale-110 active:scale-95 transition-all duration-300 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`,
        boxShadow: `0 4px 12px ${shadowColor}`,
      }}
    >
      <div className={s.icon}>
        {cat ? cat.icon(iconColor) : <FallbackIcon color={iconColor} />}
      </div>
    </div>
  );
}

function FallbackIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="10" y="10" width="28" height="28" rx="4" stroke={color} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="6" stroke={color} strokeOpacity="0.4" strokeWidth="2" />
    </svg>
  );
}
