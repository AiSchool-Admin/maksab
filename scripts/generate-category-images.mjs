/**
 * Generate beautiful, high-quality category images using sharp.
 * Creates 400x400 PNG images with professional gradients, centered SVG icons, and polish.
 * Run: node scripts/generate-category-images.mjs
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "images", "categories");
mkdirSync(OUTPUT_DIR, { recursive: true });

const SIZE = 400;

/**
 * Each category has:
 * - gradient colors for a rich background
 * - A detailed SVG icon rendered large and crisp
 * - Subtle decorative elements for premium feel
 */
const categories = [
  {
    slug: "cars",
    name: "سيارات",
    gradient: { c1: "#1E40AF", c2: "#3B82F6", c3: "#60A5FA" },
    accent: "#93C5FD",
    icon: `
      <!-- Car body -->
      <path d="M80 225 L110 170 C115 158 128 148 145 148 L255 148 C272 148 285 158 290 170 L320 225"
            fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <rect x="68" y="220" width="264" height="70" rx="20" fill="white" fill-opacity="0.15" stroke="white" stroke-width="8" opacity="0.95"/>
      <!-- Windows -->
      <path d="M142 170 L128 210 L195 210 L195 166 C195 162 193 160 190 160 L150 160 C146 160 143 164 142 170Z"
            fill="white" fill-opacity="0.2" stroke="white" stroke-width="4" stroke-opacity="0.6"/>
      <path d="M210 210 L272 210 L262 170 C261 164 258 160 254 160 L215 160 C212 160 210 162 210 166Z"
            fill="white" fill-opacity="0.2" stroke="white" stroke-width="4" stroke-opacity="0.6"/>
      <!-- Wheels -->
      <circle cx="130" cy="292" r="30" fill="white" fill-opacity="0.1" stroke="white" stroke-width="8" opacity="0.95"/>
      <circle cx="130" cy="292" r="12" fill="white" fill-opacity="0.25"/>
      <circle cx="270" cy="292" r="30" fill="white" fill-opacity="0.1" stroke="white" stroke-width="8" opacity="0.95"/>
      <circle cx="270" cy="292" r="12" fill="white" fill-opacity="0.25"/>
      <!-- Headlights -->
      <rect x="74" y="235" width="28" height="16" rx="6" fill="white" fill-opacity="0.4"/>
      <rect x="298" y="235" width="28" height="16" rx="6" fill="white" fill-opacity="0.4"/>
      <!-- Light beam effect -->
      <ellipse cx="200" cy="180" rx="80" ry="50" fill="white" fill-opacity="0.04"/>
    `,
  },
  {
    slug: "real-estate",
    name: "عقارات",
    gradient: { c1: "#312E81", c2: "#6366F1", c3: "#818CF8" },
    accent: "#A5B4FC",
    icon: `
      <!-- Main building -->
      <rect x="90" y="140" width="130" height="180" rx="6" fill="white" fill-opacity="0.12" stroke="white" stroke-width="7" opacity="0.95"/>
      <!-- Roof -->
      <path d="M75 148 L155 80 L235 148" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <!-- Tower right -->
      <rect x="225" y="170" width="80" height="150" rx="5" fill="white" fill-opacity="0.08" stroke="white" stroke-width="6" opacity="0.9"/>
      <rect x="225" y="160" width="80" height="20" rx="4" fill="white" fill-opacity="0.15"/>
      <!-- Windows left -->
      <rect x="110" y="160" width="28" height="28" rx="4" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5" stroke-opacity="0.4"/>
      <rect x="150" y="160" width="28" height="28" rx="4" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5" stroke-opacity="0.4"/>
      <rect x="110" y="205" width="28" height="28" rx="4" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5" stroke-opacity="0.4"/>
      <rect x="150" y="205" width="28" height="28" rx="4" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5" stroke-opacity="0.4"/>
      <rect x="110" y="250" width="28" height="28" rx="4" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5" stroke-opacity="0.4"/>
      <rect x="150" y="250" width="28" height="28" rx="4" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2.5" stroke-opacity="0.4"/>
      <!-- Windows right building -->
      <rect x="245" y="195" width="24" height="22" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2" stroke-opacity="0.4"/>
      <rect x="245" y="230" width="24" height="22" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2" stroke-opacity="0.4"/>
      <rect x="245" y="265" width="24" height="22" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2" stroke-opacity="0.4"/>
      <rect x="275" y="195" width="24" height="22" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2" stroke-opacity="0.4"/>
      <rect x="275" y="230" width="24" height="22" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2" stroke-opacity="0.4"/>
      <rect x="275" y="265" width="24" height="22" rx="3" fill="white" fill-opacity="0.2" stroke="white" stroke-width="2" stroke-opacity="0.4"/>
      <!-- Door -->
      <rect x="135" y="286" width="40" height="34" rx="6" fill="white" fill-opacity="0.3" stroke="white" stroke-width="3" stroke-opacity="0.5"/>
    `,
  },
  {
    slug: "phones",
    name: "موبايلات",
    gradient: { c1: "#1E293B", c2: "#475569", c3: "#64748B" },
    accent: "#94A3B8",
    icon: `
      <!-- Phone body -->
      <rect x="130" y="75" width="140" height="250" rx="24" fill="white" fill-opacity="0.1" stroke="white" stroke-width="7" opacity="0.95"/>
      <!-- Screen -->
      <rect x="145" y="110" width="110" height="165" rx="8" fill="white" fill-opacity="0.12" stroke="white" stroke-width="3" stroke-opacity="0.3"/>
      <!-- Camera notch -->
      <rect x="170" y="85" width="60" height="16" rx="8" fill="white" fill-opacity="0.2"/>
      <circle cx="210" cy="93" r="5" fill="white" fill-opacity="0.35"/>
      <!-- Screen content -->
      <rect x="158" y="128" width="70" height="8" rx="4" fill="white" fill-opacity="0.18"/>
      <rect x="158" y="145" width="50" height="8" rx="4" fill="white" fill-opacity="0.12"/>
      <rect x="158" y="162" width="84" height="8" rx="4" fill="white" fill-opacity="0.1"/>
      <rect x="158" y="179" width="60" height="8" rx="4" fill="white" fill-opacity="0.08"/>
      <rect x="158" y="200" width="84" height="40" rx="6" fill="white" fill-opacity="0.06"/>
      <!-- Home bar -->
      <rect x="172" y="295" width="56" height="8" rx="4" fill="white" fill-opacity="0.25"/>
      <!-- Glow effect -->
      <ellipse cx="200" cy="190" rx="55" ry="80" fill="white" fill-opacity="0.03"/>
    `,
  },
  {
    slug: "fashion",
    name: "موضة",
    gradient: { c1: "#9D174D", c2: "#EC4899", c3: "#F472B6" },
    accent: "#F9A8D4",
    icon: `
      <!-- Hanger hook -->
      <path d="M200 85 C200 85 188 85 188 96 C188 108 200 108 200 108" stroke="white" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.9"/>
      <!-- Hanger bar -->
      <path d="M200 108 L300 175 L100 175 Z" fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <!-- Dress body -->
      <path d="M120 175 L105 320 C105 326 110 330 118 330 L282 330 C290 330 295 326 295 320 L280 175"
            fill="white" fill-opacity="0.1" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <!-- Waist belt -->
      <path d="M128 235 L272 235" stroke="white" stroke-width="5" stroke-linecap="round" stroke-opacity="0.5"/>
      <!-- Dress folds -->
      <path d="M155 235 L118 330" stroke="white" stroke-width="3" stroke-linecap="round" stroke-opacity="0.15"/>
      <path d="M200 235 L200 330" stroke="white" stroke-width="3" stroke-linecap="round" stroke-opacity="0.1"/>
      <path d="M245 235 L282 330" stroke="white" stroke-width="3" stroke-linecap="round" stroke-opacity="0.15"/>
      <!-- Collar -->
      <path d="M165 175 C165 188 180 195 200 195 C220 195 235 188 235 175" stroke="white" stroke-width="3" stroke-linecap="round" stroke-opacity="0.35" fill="none"/>
      <!-- Decorative sparkle -->
      <circle cx="200" cy="210" r="4" fill="white" fill-opacity="0.3"/>
    `,
  },
  {
    slug: "scrap",
    name: "خردة",
    gradient: { c1: "#065F46", c2: "#10B981", c3: "#34D399" },
    accent: "#6EE7B7",
    icon: `
      <!-- Outer circle -->
      <circle cx="200" cy="210" r="120" fill="none" stroke="white" stroke-width="7" opacity="0.9"/>
      <!-- Recycle arrows -->
      <path d="M200 100 L218 130 L182 130 Z" fill="white" fill-opacity="0.35"/>
      <path d="M200 100 C225 100 252 115 265 138 L218 130" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <path d="M265 138 L285 195 C292 225 280 258 262 272" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.95"/>
      <path d="M285 195 L272 185 L278 210 Z" fill="white" fill-opacity="0.35"/>
      <path d="M262 272 C245 290 220 298 195 295 L170 280" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.95"/>
      <path d="M195 295 L192 278 L175 290 Z" fill="white" fill-opacity="0.35"/>
      <path d="M138 262 L115 205 C108 180 118 152 135 138" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.95"/>
      <!-- Center gear -->
      <circle cx="200" cy="210" r="26" stroke="white" stroke-width="4" stroke-opacity="0.4" fill="none"/>
      <circle cx="200" cy="210" r="10" fill="white" fill-opacity="0.3"/>
    `,
  },
  {
    slug: "gold",
    name: "ذهب وفضة",
    gradient: { c1: "#92400E", c2: "#D97706", c3: "#FBBF24" },
    accent: "#FDE68A",
    icon: `
      <!-- Ring -->
      <ellipse cx="200" cy="175" rx="100" ry="80" fill="none" stroke="white" stroke-width="9" opacity="0.95"/>
      <ellipse cx="200" cy="175" rx="72" ry="58" fill="none" stroke="white" stroke-width="5" opacity="0.6"/>
      <!-- Diamond on ring -->
      <path d="M200 95 L228 125 L200 160 L172 125 Z" fill="white" fill-opacity="0.3" stroke="white" stroke-width="5" stroke-linejoin="round" opacity="0.9"/>
      <path d="M172 125 L228 125 L200 160 Z" fill="white" fill-opacity="0.15"/>
      <!-- Shine on ring -->
      <path d="M140 155 C140 155 155 132 180 125" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.35"/>
      <!-- Gold bar -->
      <path d="M105 280 L135 250 L265 250 L295 280 Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="6" stroke-linejoin="round" opacity="0.9"/>
      <rect x="105" y="280" width="190" height="45" rx="5" fill="white" fill-opacity="0.1" stroke="white" stroke-width="6" opacity="0.9"/>
      <rect x="130" y="292" width="60" height="14" rx="5" fill="white" fill-opacity="0.15"/>
      <!-- Sparkles -->
      <path d="M310 95 L316 110 L330 115 L316 120 L310 135 L304 120 L290 115 L304 110 Z" fill="white" fill-opacity="0.45"/>
      <path d="M90 80 L95 92 L106 95 L95 98 L90 110 L85 98 L74 95 L85 92 Z" fill="white" fill-opacity="0.3"/>
      <path d="M320 200 L324 208 L332 212 L324 216 L320 224 L316 216 L308 212 L316 208 Z" fill="white" fill-opacity="0.25"/>
    `,
  },
  {
    slug: "luxury",
    name: "فاخرة",
    gradient: { c1: "#581C87", c2: "#A855F7", c3: "#C084FC" },
    accent: "#D8B4FE",
    icon: `
      <!-- Diamond -->
      <path d="M200 70 L325 185 L200 340 L75 185 Z" fill="white" fill-opacity="0.06" stroke="white" stroke-width="7" stroke-linejoin="round" opacity="0.95"/>
      <!-- Top facets -->
      <path d="M200 70 L150 185 L250 185 Z" fill="white" fill-opacity="0.1" stroke="white" stroke-width="3" stroke-opacity="0.4" stroke-linejoin="round"/>
      <path d="M75 185 L150 185 L200 70" stroke="white" stroke-width="3" stroke-opacity="0.35" stroke-linejoin="round" fill="none"/>
      <path d="M325 185 L250 185 L200 70" stroke="white" stroke-width="3" stroke-opacity="0.35" stroke-linejoin="round" fill="none"/>
      <!-- Lower facets -->
      <path d="M150 185 L200 340 L250 185" stroke="white" stroke-width="3" stroke-opacity="0.3" stroke-linejoin="round" fill="white" fill-opacity="0.04"/>
      <path d="M75 185 L150 185 L200 340" fill="white" fill-opacity="0.06"/>
      <path d="M250 185 L325 185 L200 340" fill="white" fill-opacity="0.06"/>
      <!-- Shine -->
      <path d="M120 148 L155 185" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
      <path d="M100 185 L135 215" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
      <!-- Sparkles -->
      <path d="M340 80 L345 95 L358 100 L345 105 L340 120 L335 105 L322 100 L335 95 Z" fill="white" fill-opacity="0.45"/>
      <path d="M65 105 L69 115 L78 118 L69 121 L65 131 L61 121 L52 118 L61 115 Z" fill="white" fill-opacity="0.35"/>
      <path d="M290 50 L293 58 L300 60 L293 62 L290 70 L287 62 L280 60 L287 58 Z" fill="white" fill-opacity="0.3"/>
    `,
  },
  {
    slug: "appliances",
    name: "أجهزة",
    gradient: { c1: "#155E75", c2: "#0891B2", c3: "#22D3EE" },
    accent: "#67E8F9",
    icon: `
      <!-- Washing machine body -->
      <rect x="100" y="75" width="200" height="260" rx="16" fill="white" fill-opacity="0.08" stroke="white" stroke-width="7" opacity="0.95"/>
      <!-- Control panel -->
      <rect x="100" y="75" width="200" height="68" rx="16" fill="white" fill-opacity="0.1" stroke="white" stroke-width="7" opacity="0.95"/>
      <!-- Knob -->
      <circle cx="148" cy="109" r="18" fill="none" stroke="white" stroke-width="4" stroke-opacity="0.6"/>
      <line x1="148" y1="95" x2="148" y2="109" stroke="white" stroke-width="3" stroke-linecap="round" stroke-opacity="0.5"/>
      <!-- Display -->
      <rect x="200" y="97" width="76" height="26" rx="5" fill="white" fill-opacity="0.15" stroke="white" stroke-width="2.5" stroke-opacity="0.35"/>
      <!-- LED dots -->
      <circle cx="186" cy="110" r="3.5" fill="white" fill-opacity="0.3"/>
      <circle cx="186" cy="98" r="3.5" fill="white" fill-opacity="0.15"/>
      <!-- Drum circle -->
      <circle cx="200" cy="228" r="72" fill="none" stroke="white" stroke-width="7" opacity="0.95"/>
      <circle cx="200" cy="228" r="52" fill="none" stroke="white" stroke-width="3.5" stroke-opacity="0.3"/>
      <!-- Clothes swirl -->
      <path d="M172 210 C180 195 195 188 215 200 C235 212 228 235 218 242" stroke="white" stroke-width="4" stroke-linecap="round" stroke-opacity="0.25" fill="none"/>
      <path d="M185 245 C192 252 205 256 218 248" stroke="white" stroke-width="3" stroke-linecap="round" stroke-opacity="0.15" fill="none"/>
      <!-- Door handle -->
      <circle cx="200" cy="228" r="14" fill="white" fill-opacity="0.18"/>
    `,
  },
  {
    slug: "furniture",
    name: "أثاث",
    gradient: { c1: "#14532D", c2: "#16A34A", c3: "#4ADE80" },
    accent: "#86EFAC",
    icon: `
      <!-- Sofa back -->
      <path d="M85 145 C85 128 96 115 115 115 L285 115 C304 115 315 128 315 145 L315 210 L85 210 Z"
            fill="white" fill-opacity="0.1" stroke="white" stroke-width="7" stroke-linejoin="round" opacity="0.95"/>
      <!-- Sofa seat -->
      <rect x="72" y="208" width="256" height="62" rx="18" fill="white" fill-opacity="0.1" stroke="white" stroke-width="7" opacity="0.95"/>
      <!-- Left armrest -->
      <path d="M72 165 C55 165 45 178 45 192 L45 252 C45 266 55 278 72 278" stroke="white" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.9"/>
      <!-- Right armrest -->
      <path d="M328 165 C345 165 355 178 355 192 L355 252 C355 266 345 278 328 278" stroke="white" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.9"/>
      <!-- Cushion dividers -->
      <line x1="160" y1="120" x2="160" y2="210" stroke="white" stroke-width="3" stroke-opacity="0.18"/>
      <line x1="240" y1="120" x2="240" y2="210" stroke="white" stroke-width="3" stroke-opacity="0.18"/>
      <!-- Cushion details -->
      <path d="M108 155 C118 145 148 145 155 155" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.15" fill="none"/>
      <path d="M175 155 C185 145 225 145 235 155" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.15" fill="none"/>
      <path d="M252 155 C262 145 292 145 300 155" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.15" fill="none"/>
      <!-- Legs -->
      <line x1="105" y1="270" x2="105" y2="315" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
      <line x1="295" y1="270" x2="295" y2="315" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
      <!-- Decorative pillows -->
      <ellipse cx="120" cy="175" rx="22" ry="28" fill="white" fill-opacity="0.08" stroke="white" stroke-width="2" stroke-opacity="0.2"/>
      <ellipse cx="280" cy="175" rx="22" ry="28" fill="white" fill-opacity="0.08" stroke="white" stroke-width="2" stroke-opacity="0.2"/>
    `,
  },
  {
    slug: "hobbies",
    name: "هوايات",
    gradient: { c1: "#9F1239", c2: "#E11D48", c3: "#FB7185" },
    accent: "#FDA4AF",
    icon: `
      <!-- Controller body -->
      <path d="M85 165 C68 165 52 180 52 200 L52 248 C52 268 68 282 88 282 L140 282 L168 240 L232 240 L260 282 L312 282 C332 282 348 268 348 248 L348 200 C348 180 332 165 315 165 Z"
            fill="white" fill-opacity="0.08" stroke="white" stroke-width="7" stroke-linejoin="round" opacity="0.95"/>
      <!-- D-pad -->
      <rect x="98" y="190" width="22" height="60" rx="6" fill="white" fill-opacity="0.3"/>
      <rect x="82" y="206" width="54" height="22" rx="6" fill="white" fill-opacity="0.3"/>
      <!-- Action buttons -->
      <circle cx="288" cy="192" r="14" fill="white" fill-opacity="0.15" stroke="white" stroke-width="3" stroke-opacity="0.4"/>
      <circle cx="318" cy="218" r="14" fill="white" fill-opacity="0.15" stroke="white" stroke-width="3" stroke-opacity="0.4"/>
      <circle cx="258" cy="218" r="14" fill="white" fill-opacity="0.15" stroke="white" stroke-width="3" stroke-opacity="0.4"/>
      <circle cx="288" cy="244" r="14" fill="white" fill-opacity="0.15" stroke="white" stroke-width="3" stroke-opacity="0.4"/>
      <!-- Button symbols -->
      <path d="M282 186 L294 198" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.4"/>
      <path d="M294 186 L282 198" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.4"/>
      <circle cx="318" cy="218" r="5" fill="white" fill-opacity="0.2"/>
      <rect x="254" y="215" width="8" height="6" rx="2" fill="white" fill-opacity="0.2"/>
      <path d="M283 238 L293 248" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.35"/>
      <path d="M288 238 L288 248" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.35"/>
      <!-- Center buttons -->
      <rect x="175" y="192" width="22" height="14" rx="5" fill="white" fill-opacity="0.2"/>
      <rect x="203" y="192" width="22" height="14" rx="5" fill="white" fill-opacity="0.2"/>
      <!-- Analog sticks -->
      <circle cx="140" cy="160" r="6" fill="white" fill-opacity="0.2"/>
      <circle cx="260" cy="160" r="6" fill="white" fill-opacity="0.2"/>
    `,
  },
  {
    slug: "tools",
    name: "عدد",
    gradient: { c1: "#9A3412", c2: "#EA580C", c3: "#FB923C" },
    accent: "#FDBA74",
    icon: `
      <!-- Wrench -->
      <path d="M110 90 C88 90 70 108 70 132 C70 148 80 162 92 172 L230 310 C236 316 246 316 252 310 L265 297 C271 291 271 281 265 275 L128 140 C136 130 140 118 140 108 C140 96 132 90 120 90 Z"
            fill="white" fill-opacity="0.08" stroke="white" stroke-width="7" stroke-linejoin="round" opacity="0.95"/>
      <circle cx="98" cy="125" r="16" fill="white" fill-opacity="0.18"/>
      <!-- Screwdriver -->
      <path d="M280 72 L328 120 L302 148 L254 100 Z" fill="white" fill-opacity="0.15" stroke="white" stroke-width="6" stroke-linejoin="round" opacity="0.9"/>
      <path d="M254 100 L165 190" stroke="white" stroke-width="10" stroke-linecap="round" opacity="0.95"/>
      <path d="M165 190 L152 218 L176 232 L190 212" stroke="white" stroke-width="7" stroke-linejoin="round" opacity="0.95" fill="none"/>
      <path d="M152 218 L128 280 C122 296 140 312 154 306 L176 232" stroke="white" stroke-width="7" stroke-linejoin="round" opacity="0.95" fill="white" fill-opacity="0.06"/>
      <!-- Sparkle -->
      <path d="M325 232 L332 250 L348 256 L332 262 L325 280 L318 262 L302 256 L318 250 Z" fill="white" fill-opacity="0.35"/>
      <path d="M80 290 L84 300 L94 304 L84 308 L80 318 L76 308 L66 304 L76 300 Z" fill="white" fill-opacity="0.2"/>
    `,
  },
  {
    slug: "services",
    name: "خدمات",
    gradient: { c1: "#115E59", c2: "#0D9488", c3: "#2DD4BF" },
    accent: "#5EEAD4",
    icon: `
      <!-- Person -->
      <circle cx="168" cy="115" r="38" fill="none" stroke="white" stroke-width="7" opacity="0.95"/>
      <path d="M95 282 L95 235 C95 208 115 185 142 185 L194 185 C221 185 241 208 241 235 L241 282"
            stroke="white" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.95"/>
      <!-- Gear -->
      <circle cx="290" cy="245" r="42" fill="none" stroke="white" stroke-width="6" opacity="0.9"/>
      <circle cx="290" cy="245" r="18" fill="white" fill-opacity="0.15" stroke="white" stroke-width="3.5" stroke-opacity="0.4"/>
      <!-- Gear teeth -->
      <line x1="290" y1="196" x2="290" y2="210" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
      <line x1="290" y1="280" x2="290" y2="294" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
      <line x1="241" y1="245" x2="255" y2="245" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
      <line x1="325" y1="245" x2="339" y2="245" stroke="white" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
      <line x1="255" y1="210" x2="265" y2="220" stroke="white" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
      <line x1="315" y1="270" x2="325" y2="280" stroke="white" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
      <line x1="325" y1="210" x2="315" y2="220" stroke="white" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
      <line x1="265" y1="270" x2="255" y2="280" stroke="white" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
      <!-- Verification badge -->
      <circle cx="248" cy="140" r="32" fill="white" stroke="white" stroke-width="4" opacity="0.95"/>
      <path d="M234 140 L244 150 L264 130" stroke="#0D9488" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
];

async function generateImage(cat) {
  const { slug, gradient, accent, icon } = cat;
  const { c1, c2, c3 } = gradient;

  const svg = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main gradient -->
    <radialGradient id="bg-${slug}" cx="30%" cy="25%" r="80%">
      <stop offset="0%" stop-color="${c3}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c1}"/>
    </radialGradient>
    <!-- Glow effect -->
    <radialGradient id="glow-${slug}" cx="50%" cy="40%" r="45%">
      <stop offset="0%" stop-color="white" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <!-- Bottom shadow -->
    <linearGradient id="shadow-${slug}" x1="0" y1="0.7" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.2"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" rx="48" fill="url(#bg-${slug})"/>

  <!-- Ambient glow -->
  <rect width="${SIZE}" height="${SIZE}" rx="48" fill="url(#glow-${slug})"/>

  <!-- Subtle top-left shine -->
  <ellipse cx="100" cy="80" rx="160" ry="120" fill="white" fill-opacity="0.05"/>

  <!-- Decorative circles -->
  <circle cx="340" cy="60" r="80" fill="white" fill-opacity="0.03"/>
  <circle cx="60" cy="340" r="60" fill="white" fill-opacity="0.03"/>

  <!-- Bottom vignette -->
  <rect width="${SIZE}" height="${SIZE}" rx="48" fill="url(#shadow-${slug})"/>

  <!-- Icon -->
  <g>
    ${icon}
  </g>
</svg>`;

  await sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 6 })
    .toFile(join(OUTPUT_DIR, `${slug}.png`));

  console.log(`  ✓ ${slug}.png`);
}

async function main() {
  console.log("Generating category images...\n");

  for (const cat of categories) {
    await generateImage(cat);
  }

  console.log(`\nDone! ${categories.length} images created in public/images/categories/`);
}

main().catch(console.error);
