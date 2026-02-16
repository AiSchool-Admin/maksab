/**
 * Generate realistic, product-style category images using sharp.
 * White/light backgrounds with filled, 3D-effect illustrations.
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

const categories = [
  {
    slug: "cars",
    name: "سيارات",
    bg: "#EBF3FF",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="310" rx="120" ry="14" fill="#B0C4DE" opacity="0.4"/>
      <!-- Car body lower -->
      <path d="M60 240 L60 270 C60 285 70 290 85 290 L315 290 C330 290 340 285 340 270 L340 240 C340 228 332 220 320 220 L80 220 C68 220 60 228 60 240Z" fill="#2563EB"/>
      <path d="M60 240 L60 270 C60 285 70 290 85 290 L315 290 C330 290 340 285 340 270 L340 240 C340 228 332 220 320 220 L80 220 C68 220 60 228 60 240Z" fill="url(#carShine)" opacity="0.3"/>
      <!-- Car body upper/cabin -->
      <path d="M108 220 L130 155 C135 142 148 135 162 135 L238 135 C252 135 265 142 270 155 L292 220" fill="#3B82F6"/>
      <path d="M108 220 L130 155 C135 142 148 135 162 135 L238 135 C252 135 265 142 270 155 L292 220" fill="url(#carShine)" opacity="0.25"/>
      <!-- Windshield -->
      <path d="M140 165 L155 215 L195 215 L195 158 C195 155 192 152 188 152 L150 152 C145 152 141 158 140 165Z" fill="#E0EDFF" opacity="0.85"/>
      <path d="M205 215 L260 215 L248 165 C247 158 244 152 239 152 L212 152 C208 152 205 155 205 158Z" fill="#E0EDFF" opacity="0.85"/>
      <!-- Headlights -->
      <rect x="64" y="238" width="30" height="18" rx="6" fill="#FCD34D"/>
      <rect x="64" y="238" width="30" height="9" rx="4" fill="white" opacity="0.5"/>
      <rect x="306" y="238" width="30" height="18" rx="6" fill="#FCD34D"/>
      <rect x="306" y="238" width="30" height="9" rx="4" fill="white" opacity="0.5"/>
      <!-- Tail lights -->
      <rect x="64" y="262" width="20" height="12" rx="4" fill="#EF4444"/>
      <rect x="316" y="262" width="20" height="12" rx="4" fill="#EF4444"/>
      <!-- Grill -->
      <rect x="155" y="225" width="90" height="14" rx="5" fill="#1E3A5F"/>
      <line x1="170" y1="225" x2="170" y2="239" stroke="#2563EB" stroke-width="2" opacity="0.5"/>
      <line x1="185" y1="225" x2="185" y2="239" stroke="#2563EB" stroke-width="2" opacity="0.5"/>
      <line x1="200" y1="225" x2="200" y2="239" stroke="#2563EB" stroke-width="2" opacity="0.5"/>
      <line x1="215" y1="225" x2="215" y2="239" stroke="#2563EB" stroke-width="2" opacity="0.5"/>
      <line x1="230" y1="225" x2="230" y2="239" stroke="#2563EB" stroke-width="2" opacity="0.5"/>
      <!-- Wheels -->
      <circle cx="128" cy="290" r="32" fill="#1E293B"/>
      <circle cx="128" cy="290" r="22" fill="#475569"/>
      <circle cx="128" cy="290" r="14" fill="#94A3B8"/>
      <circle cx="128" cy="290" r="6" fill="#CBD5E1"/>
      <circle cx="272" cy="290" r="32" fill="#1E293B"/>
      <circle cx="272" cy="290" r="22" fill="#475569"/>
      <circle cx="272" cy="290" r="14" fill="#94A3B8"/>
      <circle cx="272" cy="290" r="6" fill="#CBD5E1"/>
      <!-- Door line -->
      <line x1="200" y1="152" x2="200" y2="220" stroke="#1D4ED8" stroke-width="2" opacity="0.4"/>
      <!-- Door handle -->
      <rect x="166" y="195" width="22" height="6" rx="3" fill="#93C5FD"/>
      <rect x="214" y="195" width="22" height="6" rx="3" fill="#93C5FD"/>
      <!-- Roof shine -->
      <path d="M155 140 C170 132 230 132 245 140" stroke="white" stroke-width="3" opacity="0.4" fill="none"/>
    `,
    defs: `<linearGradient id="carShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>`,
  },
  {
    slug: "real-estate",
    name: "عقارات",
    bg: "#EEF0FF",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="330" rx="140" ry="12" fill="#9CA3AF" opacity="0.3"/>
      <!-- Main building -->
      <rect x="80" y="120" width="140" height="210" rx="4" fill="#6366F1"/>
      <rect x="80" y="120" width="140" height="210" rx="4" fill="url(#bldgShine)" opacity="0.2"/>
      <!-- Tower -->
      <rect x="230" y="160" width="90" height="170" rx="4" fill="#818CF8"/>
      <rect x="230" y="160" width="90" height="170" rx="4" fill="url(#bldgShine)" opacity="0.15"/>
      <!-- Tower top -->
      <rect x="230" y="148" width="90" height="18" rx="3" fill="#4F46E5"/>
      <!-- Roof -->
      <path d="M70 125 L150 70 L230 125" fill="#4F46E5"/>
      <path d="M70 125 L150 70 L150 125Z" fill="white" opacity="0.08"/>
      <!-- Main windows -->
      <rect x="98" y="145" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="98" y="145" width="28" height="16" rx="3" fill="#E0E7FF"/>
      <rect x="138" y="145" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="138" y="145" width="28" height="16" rx="3" fill="#E0E7FF"/>
      <rect x="178" y="145" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="178" y="145" width="28" height="16" rx="3" fill="#E0E7FF"/>
      <rect x="98" y="195" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="98" y="195" width="28" height="16" rx="3" fill="#E0E7FF"/>
      <rect x="138" y="195" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="138" y="195" width="28" height="16" rx="3" fill="#E0E7FF"/>
      <rect x="178" y="195" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="178" y="195" width="28" height="16" rx="3" fill="#E0E7FF"/>
      <rect x="98" y="245" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="138" y="245" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <rect x="178" y="245" width="28" height="32" rx="3" fill="#C7D2FE"/>
      <!-- Tower windows -->
      <rect x="245" y="178" width="22" height="26" rx="2" fill="#C7D2FE"/>
      <rect x="275" y="178" width="22" height="26" rx="2" fill="#C7D2FE"/>
      <rect x="245" y="216" width="22" height="26" rx="2" fill="#C7D2FE"/>
      <rect x="275" y="216" width="22" height="26" rx="2" fill="#C7D2FE"/>
      <rect x="245" y="254" width="22" height="26" rx="2" fill="#C7D2FE"/>
      <rect x="275" y="254" width="22" height="26" rx="2" fill="#C7D2FE"/>
      <!-- Door -->
      <rect x="130" y="290" width="40" height="40" rx="4" fill="#4338CA"/>
      <rect x="130" y="290" width="40" height="20" rx="4" fill="#4F46E5"/>
      <circle cx="163" cy="312" r="3" fill="#FCD34D"/>
      <!-- Antenna -->
      <line x1="275" y1="148" x2="275" y2="120" stroke="#6366F1" stroke-width="3"/>
      <circle cx="275" cy="118" r="4" fill="#EF4444"/>
    `,
    defs: `<linearGradient id="bldgShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>`,
  },
  {
    slug: "phones",
    name: "موبايلات",
    bg: "#F0F2F5",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="348" rx="80" ry="10" fill="#94A3B8" opacity="0.35"/>
      <!-- Phone body -->
      <rect x="120" y="60" width="160" height="285" rx="28" fill="#1E293B"/>
      <!-- Screen bezel -->
      <rect x="126" y="66" width="148" height="273" rx="24" fill="#334155"/>
      <!-- Screen -->
      <rect x="132" y="90" width="136" height="228" rx="4" fill="#0F172A"/>
      <!-- Dynamic Island -->
      <rect x="172" y="72" width="56" height="14" rx="7" fill="#0F172A"/>
      <circle cx="210" cy="79" r="4" fill="#1E293B"/>
      <!-- Screen content - app icons grid -->
      <rect x="144" y="108" width="30" height="30" rx="8" fill="#3B82F6"/>
      <rect x="184" y="108" width="30" height="30" rx="8" fill="#10B981"/>
      <rect x="224" y="108" width="30" height="30" rx="8" fill="#F59E0B"/>
      <rect x="144" y="148" width="30" height="30" rx="8" fill="#EF4444"/>
      <rect x="184" y="148" width="30" height="30" rx="8" fill="#8B5CF6"/>
      <rect x="224" y="148" width="30" height="30" rx="8" fill="#EC4899"/>
      <rect x="144" y="188" width="30" height="30" rx="8" fill="#06B6D4"/>
      <rect x="184" y="188" width="30" height="30" rx="8" fill="#F97316"/>
      <rect x="224" y="188" width="30" height="30" rx="8" fill="#14B8A6"/>
      <!-- Dock -->
      <rect x="140" y="240" width="120" height="42" rx="12" fill="#1E293B"/>
      <rect x="150" y="248" width="26" height="26" rx="7" fill="#22C55E"/>
      <rect x="184" y="248" width="26" height="26" rx="7" fill="#3B82F6"/>
      <rect x="218" y="248" width="26" height="26" rx="7" fill="#A855F7"/>
      <!-- Status bar -->
      <rect x="145" y="95" width="24" height="4" rx="2" fill="white" opacity="0.5"/>
      <rect x="222" y="95" width="16" height="4" rx="2" fill="white" opacity="0.5"/>
      <rect x="208" y="95" width="10" height="4" rx="2" fill="white" opacity="0.3"/>
      <!-- Home indicator -->
      <rect x="175" y="302" width="50" height="5" rx="2.5" fill="white" opacity="0.3"/>
      <!-- Side button -->
      <rect x="280" y="140" width="4" height="40" rx="2" fill="#475569"/>
      <!-- Volume buttons -->
      <rect x="116" y="130" width="4" height="28" rx="2" fill="#475569"/>
      <rect x="116" y="168" width="4" height="28" rx="2" fill="#475569"/>
      <!-- Reflection -->
      <rect x="132" y="90" width="30" height="228" rx="4" fill="white" opacity="0.04"/>
    `,
    defs: ``,
  },
  {
    slug: "fashion",
    name: "موضة",
    bg: "#FFF0F5",
    icon: `
      <!-- Hanger -->
      <path d="M200 72 C200 72 190 72 190 82 C190 92 200 92 200 92" stroke="#9CA3AF" stroke-width="5" fill="none"/>
      <circle cx="200" cy="68" r="5" fill="#9CA3AF"/>
      <path d="M200 92 L290 155 L110 155 Z" fill="#D1D5DB" stroke="#9CA3AF" stroke-width="3"/>
      <!-- T-shirt -->
      <path d="M130 155 L130 148 L155 125 L180 148 L180 155" fill="#EC4899" stroke="#DB2777" stroke-width="2"/>
      <path d="M220 155 L220 148 L245 125 L270 148 L270 155" fill="#EC4899" stroke="#DB2777" stroke-width="2"/>
      <path d="M130 155 L120 320 C120 325 125 330 135 330 L265 330 C275 330 280 325 280 320 L270 155" fill="#EC4899"/>
      <path d="M130 155 L120 320 C120 325 125 330 135 330 L265 330 C275 330 280 325 280 320 L270 155" fill="url(#fashShine)" opacity="0.15"/>
      <!-- Collar -->
      <path d="M180 155 C180 170 190 178 200 178 C210 178 220 170 220 155" fill="#DB2777"/>
      <!-- Pocket -->
      <rect x="155" y="218" width="40" height="35" rx="3" fill="#DB2777" opacity="0.3"/>
      <path d="M155 218 L195 218" stroke="#DB2777" stroke-width="2.5"/>
      <!-- Button line -->
      <line x1="200" y1="178" x2="200" y2="320" stroke="#DB2777" stroke-width="1.5" opacity="0.2"/>
      <!-- Buttons -->
      <circle cx="200" cy="200" r="4" fill="#DB2777" opacity="0.4"/>
      <circle cx="200" cy="230" r="4" fill="#DB2777" opacity="0.4"/>
      <circle cx="200" cy="260" r="4" fill="#DB2777" opacity="0.4"/>
      <!-- Sleeves shadow -->
      <path d="M130 155 L120 200" stroke="#DB2777" stroke-width="2.5" opacity="0.3"/>
      <path d="M270 155 L280 200" stroke="#DB2777" stroke-width="2.5" opacity="0.3"/>
      <!-- Tag -->
      <rect x="232" y="160" width="22" height="30" rx="2" fill="white"/>
      <rect x="232" y="160" width="22" height="10" rx="2" fill="#FCD34D"/>
      <line x1="237" y1="178" x2="249" y2="178" stroke="#D1D5DB" stroke-width="1.5"/>
      <line x1="237" y1="183" x2="245" y2="183" stroke="#D1D5DB" stroke-width="1.5"/>
    `,
    defs: `<linearGradient id="fashShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>`,
  },
  {
    slug: "scrap",
    name: "خردة",
    bg: "#ECFDF5",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="335" rx="110" ry="12" fill="#6EE7B7" opacity="0.3"/>
      <!-- Recycle arrows - 3 curved arrows forming triangle -->
      <!-- Arrow 1: top -->
      <path d="M200 90 C240 90 275 110 290 145" stroke="#10B981" stroke-width="28" stroke-linecap="round" fill="none"/>
      <path d="M200 90 C240 90 275 110 290 145" stroke="#34D399" stroke-width="18" stroke-linecap="round" fill="none"/>
      <polygon points="200,62 218,98 182,98" fill="#10B981"/>
      <!-- Arrow 2: bottom-right -->
      <path d="M290 145 C310 195 295 250 255 280" stroke="#10B981" stroke-width="28" stroke-linecap="round" fill="none"/>
      <path d="M290 145 C310 195 295 250 255 280" stroke="#34D399" stroke-width="18" stroke-linecap="round" fill="none"/>
      <polygon points="304,138 290,172 276,142" fill="#10B981"/>
      <!-- Arrow 3: bottom-left -->
      <path d="M255 280 C215 305 165 300 135 270" stroke="#10B981" stroke-width="28" stroke-linecap="round" fill="none"/>
      <path d="M255 280 C215 305 165 300 135 270" stroke="#34D399" stroke-width="18" stroke-linecap="round" fill="none"/>
      <polygon points="262,296 240,290 256,272" fill="#10B981"/>
      <!-- Arrow 4: left side going up -->
      <path d="M135 270 C105 230 110 175 140 140" stroke="#10B981" stroke-width="28" stroke-linecap="round" fill="none"/>
      <path d="M135 270 C105 230 110 175 140 140" stroke="#34D399" stroke-width="18" stroke-linecap="round" fill="none"/>
      <polygon points="126,276 140,248 152,278" fill="#10B981"/>
      <!-- Center circle -->
      <circle cx="200" cy="195" r="32" fill="#D1FAE5" stroke="#10B981" stroke-width="6"/>
      <circle cx="200" cy="195" r="14" fill="#10B981"/>
      <circle cx="200" cy="195" r="6" fill="#D1FAE5"/>
    `,
    defs: ``,
  },
  {
    slug: "gold",
    name: "ذهب وفضة",
    bg: "#FFFBEB",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="340" rx="120" ry="12" fill="#D4A843" opacity="0.25"/>
      <!-- Gold bar bottom -->
      <path d="M80 285 L110 255 L290 255 L320 285 Z" fill="#D97706"/>
      <path d="M80 285 L110 255 L200 255 L170 285 Z" fill="#F59E0B"/>
      <rect x="80" y="285" width="240" height="45" rx="4" fill="#D97706"/>
      <rect x="80" y="285" width="120" height="45" rx="4" fill="#F59E0B"/>
      <rect x="100" y="297" width="60" height="14" rx="4" fill="#FBBF24" opacity="0.5"/>
      <!-- Gold bar top -->
      <path d="M120 230 L145 205 L255 205 L280 230 Z" fill="#FBBF24"/>
      <path d="M120 230 L145 205 L200 205 L175 230 Z" fill="#FDE68A"/>
      <rect x="120" y="230" width="160" height="30" rx="3" fill="#FBBF24"/>
      <rect x="120" y="230" width="80" height="30" rx="3" fill="#FDE68A"/>
      <!-- Ring -->
      <ellipse cx="200" cy="140" rx="72" ry="58" fill="none" stroke="#D97706" stroke-width="12"/>
      <ellipse cx="200" cy="140" rx="72" ry="58" fill="none" stroke="#F59E0B" stroke-width="8"/>
      <ellipse cx="200" cy="140" rx="52" ry="42" fill="none" stroke="#D97706" stroke-width="6"/>
      <ellipse cx="200" cy="140" rx="52" ry="42" fill="none" stroke="#FBBF24" stroke-width="3"/>
      <!-- Diamond on ring -->
      <path d="M200 80 L222 105 L200 135 L178 105 Z" fill="#FDE68A" stroke="#D97706" stroke-width="3"/>
      <path d="M178 105 L222 105 L200 135 Z" fill="#FBBF24"/>
      <!-- Sparkles -->
      <path d="M310 85 L316 102 L332 108 L316 114 L310 130 L304 114 L288 108 L304 102 Z" fill="#FCD34D"/>
      <path d="M90 70 L94 82 L106 86 L94 90 L90 102 L86 90 L74 86 L86 82 Z" fill="#FDE68A"/>
      <path d="M320 180 L323 188 L330 190 L323 192 L320 200 L317 192 L310 190 L317 188 Z" fill="#FCD34D" opacity="0.7"/>
    `,
    defs: ``,
  },
  {
    slug: "luxury",
    name: "فاخرة",
    bg: "#FAF5FF",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="345" rx="100" ry="10" fill="#A855F7" opacity="0.2"/>
      <!-- Handbag body -->
      <rect x="100" y="170" width="200" height="155" rx="12" fill="#9333EA"/>
      <rect x="100" y="170" width="200" height="155" rx="12" fill="url(#luxShine)" opacity="0.15"/>
      <!-- Bag flap -->
      <path d="M100 200 L100 175 C100 168 106 162 113 162 L287 162 C294 162 300 168 300 175 L300 200" fill="#7C3AED"/>
      <!-- Clasp -->
      <rect x="182" y="192" width="36" height="22" rx="6" fill="#FCD34D" stroke="#D97706" stroke-width="2"/>
      <circle cx="200" cy="203" r="5" fill="#D97706"/>
      <!-- Handle -->
      <path d="M150 162 C150 120 170 95 200 95 C230 95 250 120 250 162" fill="none" stroke="#7C3AED" stroke-width="14" stroke-linecap="round"/>
      <path d="M150 162 C150 120 170 95 200 95 C230 95 250 120 250 162" fill="none" stroke="#9333EA" stroke-width="10" stroke-linecap="round"/>
      <!-- Stitching -->
      <line x1="105" y1="230" x2="295" y2="230" stroke="#A855F7" stroke-width="2" stroke-dasharray="6 4"/>
      <!-- Brand logo area -->
      <rect x="160" y="248" width="80" height="30" rx="4" fill="#7C3AED" opacity="0.5"/>
      <rect x="172" y="256" width="56" height="5" rx="2" fill="#C4B5FD"/>
      <rect x="180" y="265" width="40" height="4" rx="2" fill="#C4B5FD" opacity="0.6"/>
      <!-- Side texture -->
      <line x1="110" y1="240" x2="110" y2="320" stroke="#A855F7" stroke-width="1.5" opacity="0.3"/>
      <line x1="290" y1="240" x2="290" y2="320" stroke="#A855F7" stroke-width="1.5" opacity="0.3"/>
      <!-- Sparkle -->
      <path d="M322 130 L326 142 L338 146 L326 150 L322 162 L318 150 L306 146 L318 142 Z" fill="#C084FC"/>
      <path d="M80 120 L83 128 L90 130 L83 132 L80 140 L77 132 L70 130 L77 128 Z" fill="#DDD6FE"/>
    `,
    defs: `<linearGradient id="luxShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>`,
  },
  {
    slug: "appliances",
    name: "أجهزة",
    bg: "#ECFEFF",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="340" rx="110" ry="12" fill="#67E8F9" opacity="0.3"/>
      <!-- Body -->
      <rect x="95" y="70" width="210" height="265" rx="14" fill="#E2E8F0"/>
      <rect x="95" y="70" width="210" height="265" rx="14" fill="url(#applShine)" opacity="0.3"/>
      <rect x="100" y="75" width="200" height="255" rx="10" fill="#F1F5F9"/>
      <!-- Control panel -->
      <rect x="100" y="75" width="200" height="65" rx="10" fill="#CBD5E1"/>
      <!-- Knob -->
      <circle cx="145" cy="107" r="18" fill="#94A3B8" stroke="#64748B" stroke-width="3"/>
      <circle cx="145" cy="107" r="12" fill="#E2E8F0"/>
      <line x1="145" y1="95" x2="145" y2="104" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
      <!-- Display -->
      <rect x="195" y="92" width="80" height="30" rx="5" fill="#0F172A"/>
      <text x="235" y="113" font-family="monospace" font-size="16" fill="#22D3EE" text-anchor="middle">30°C</text>
      <!-- LED indicators -->
      <circle cx="180" cy="85" r="4" fill="#22C55E"/>
      <circle cx="180" cy="100" r="4" fill="#64748B"/>
      <circle cx="180" cy="115" r="4" fill="#64748B"/>
      <!-- Drum circle -->
      <circle cx="200" cy="225" r="80" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="5"/>
      <circle cx="200" cy="225" r="65" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="3"/>
      <circle cx="200" cy="225" r="50" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="2"/>
      <!-- Drum perforations -->
      <circle cx="200" cy="190" r="4" fill="#CBD5E1"/>
      <circle cx="220" cy="200" r="4" fill="#CBD5E1"/>
      <circle cx="230" cy="222" r="4" fill="#CBD5E1"/>
      <circle cx="220" cy="245" r="4" fill="#CBD5E1"/>
      <circle cx="200" cy="255" r="4" fill="#CBD5E1"/>
      <circle cx="180" cy="245" r="4" fill="#CBD5E1"/>
      <circle cx="170" cy="222" r="4" fill="#CBD5E1"/>
      <circle cx="180" cy="200" r="4" fill="#CBD5E1"/>
      <!-- Center -->
      <circle cx="200" cy="225" r="16" fill="#CBD5E1"/>
      <circle cx="200" cy="225" r="8" fill="#94A3B8"/>
      <!-- Door handle -->
      <rect x="285" y="200" width="12" height="50" rx="6" fill="#94A3B8"/>
    `,
    defs: `<linearGradient id="applShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="white" stop-opacity="0.5"/><stop offset="50%" stop-color="white" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.05"/></linearGradient>`,
  },
  {
    slug: "furniture",
    name: "أثاث",
    bg: "#F0FDF4",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="320" rx="150" ry="14" fill="#86EFAC" opacity="0.3"/>
      <!-- Sofa back -->
      <path d="M60 150 C60 130 75 115 95 115 L305 115 C325 115 340 130 340 150 L340 215 L60 215 Z" fill="#16A34A"/>
      <path d="M60 150 C60 130 75 115 95 115 L200 115 L200 215 L60 215 Z" fill="#22C55E"/>
      <!-- Sofa seat cushion -->
      <rect x="50" y="212" width="300" height="55" rx="14" fill="#15803D"/>
      <rect x="50" y="212" width="150" height="55" rx="14" fill="#16A34A"/>
      <!-- Left arm -->
      <path d="M50 160 C30 160 18 175 18 195 L18 255 C18 270 30 280 50 280" fill="#15803D"/>
      <path d="M50 160 C35 160 25 175 25 195 L25 255 C25 265 32 272 42 275 L50 280" fill="#16A34A"/>
      <!-- Right arm -->
      <path d="M350 160 C370 160 382 175 382 195 L382 255 C382 270 370 280 350 280" fill="#15803D"/>
      <!-- Cushion lines -->
      <line x1="160" y1="120" x2="160" y2="215" stroke="#14532D" stroke-width="2" opacity="0.15"/>
      <line x1="240" y1="120" x2="240" y2="215" stroke="#14532D" stroke-width="2" opacity="0.15"/>
      <!-- Pillow left -->
      <ellipse cx="110" cy="165" rx="30" ry="38" fill="#4ADE80" opacity="0.6"/>
      <!-- Pillow right -->
      <ellipse cx="290" cy="165" rx="30" ry="38" fill="#4ADE80" opacity="0.6"/>
      <!-- Legs -->
      <rect x="85" y="267" width="12" height="40" rx="3" fill="#854D0E"/>
      <rect x="303" y="267" width="12" height="40" rx="3" fill="#854D0E"/>
      <rect x="85" y="267" width="12" height="10" rx="3" fill="#A16207"/>
      <rect x="303" y="267" width="12" height="10" rx="3" fill="#A16207"/>
    `,
    defs: ``,
  },
  {
    slug: "hobbies",
    name: "هوايات",
    bg: "#FFF1F2",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="310" rx="145" ry="12" fill="#FDA4AF" opacity="0.3"/>
      <!-- Controller body -->
      <path d="M75 180 C55 180 38 198 38 218 L38 255 C38 278 55 295 80 295 L138 295 L165 250 L235 250 L262 295 L320 295 C345 295 362 278 362 255 L362 218 C362 198 345 180 325 180 Z" fill="#E11D48"/>
      <path d="M75 180 C55 180 38 198 38 218 L38 255 C38 278 55 295 80 295 L138 295 L165 250 L200 250 L200 180 Z" fill="#F43F5E"/>
      <!-- D-pad -->
      <rect x="82" y="206" width="20" height="52" rx="5" fill="#9F1239"/>
      <rect x="68" y="220" width="48" height="20" rx="5" fill="#9F1239"/>
      <rect x="84" y="208" width="16" height="48" rx="4" fill="#BE123C"/>
      <rect x="70" y="222" width="44" height="16" rx="4" fill="#BE123C"/>
      <!-- Action buttons -->
      <circle cx="295" cy="200" r="14" fill="#9F1239"/>
      <circle cx="295" cy="200" r="11" fill="#BE123C"/>
      <path d="M289 194 L301 206 M301 194 L289 206" stroke="white" stroke-width="2.5" opacity="0.7"/>

      <circle cx="325" cy="228" r="14" fill="#9F1239"/>
      <circle cx="325" cy="228" r="11" fill="#BE123C"/>
      <circle cx="325" cy="228" r="5" fill="white" opacity="0.4"/>

      <circle cx="265" cy="228" r="14" fill="#9F1239"/>
      <circle cx="265" cy="228" r="11" fill="#BE123C"/>
      <rect x="261" y="225" width="8" height="6" rx="2" fill="white" opacity="0.4"/>

      <circle cx="295" cy="256" r="14" fill="#9F1239"/>
      <circle cx="295" cy="256" r="11" fill="#BE123C"/>
      <path d="M290 250 L295 260 L300 250" stroke="white" stroke-width="2.5" fill="none" opacity="0.7"/>
      <!-- Center buttons -->
      <rect x="178" y="203" width="20" height="12" rx="5" fill="#881337"/>
      <rect x="204" y="203" width="20" height="12" rx="5" fill="#881337"/>
      <!-- Analog sticks -->
      <circle cx="120" cy="192" r="16" fill="#881337"/>
      <circle cx="120" cy="192" r="11" fill="#9F1239"/>
      <circle cx="120" cy="190" r="8" fill="#BE123C"/>
      <circle cx="280" cy="270" r="16" fill="#881337"/>
      <circle cx="280" cy="270" r="11" fill="#9F1239"/>
      <circle cx="280" cy="268" r="8" fill="#BE123C"/>
      <!-- Share/options -->
      <circle cx="165" cy="195" r="4" fill="#881337"/>
      <circle cx="238" cy="195" r="4" fill="#881337"/>
      <!-- Light bar -->
      <rect x="160" y="178" width="80" height="6" rx="3" fill="#3B82F6"/>
      <rect x="160" y="178" width="40" height="6" rx="3" fill="#60A5FA"/>
    `,
    defs: ``,
  },
  {
    slug: "tools",
    name: "عدد",
    bg: "#FFF7ED",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="340" rx="120" ry="10" fill="#FDBA74" opacity="0.3"/>
      <!-- Drill body -->
      <rect x="130" y="140" width="180" height="80" rx="12" fill="#EA580C"/>
      <rect x="130" y="140" width="180" height="40" rx="12" fill="#F97316"/>
      <!-- Drill chuck -->
      <rect x="60" y="158" width="75" height="44" rx="6" fill="#94A3B8"/>
      <rect x="60" y="158" width="75" height="22" rx="6" fill="#CBD5E1"/>
      <!-- Drill bit -->
      <path d="M60 180 L20 178 L15 180 L20 182 L60 180" fill="#64748B"/>
      <line x1="20" y1="180" x2="60" y2="180" stroke="#94A3B8" stroke-width="2"/>
      <!-- Trigger area -->
      <path d="M200 220 L200 280 C200 295 210 300 220 300 L260 300 C270 300 270 292 270 285 L270 220" fill="#C2410C"/>
      <path d="M200 220 L200 280 C200 295 210 300 220 300 L235 300 L235 220" fill="#EA580C"/>
      <!-- Trigger -->
      <rect x="215" y="240" width="30" height="22" rx="5" fill="#7C2D12"/>
      <rect x="215" y="240" width="30" height="11" rx="5" fill="#9A3412"/>
      <!-- Chuck ring details -->
      <line x1="80" y1="158" x2="80" y2="202" stroke="#64748B" stroke-width="2" opacity="0.5"/>
      <line x1="95" y1="158" x2="95" y2="202" stroke="#64748B" stroke-width="2" opacity="0.5"/>
      <line x1="110" y1="158" x2="110" y2="202" stroke="#64748B" stroke-width="2" opacity="0.5"/>
      <!-- Battery -->
      <rect x="240" y="220" width="68" height="60" rx="6" fill="#1E293B"/>
      <rect x="240" y="220" width="68" height="30" rx="6" fill="#334155"/>
      <!-- Battery indicator -->
      <rect x="252" y="232" width="30" height="8" rx="2" fill="#22C55E"/>
      <rect x="252" y="232" width="20" height="8" rx="2" fill="#4ADE80"/>
      <!-- Speed switch -->
      <rect x="250" y="150" width="40" height="16" rx="4" fill="#9A3412"/>
      <circle cx="278" cy="158" r="6" fill="#FCD34D"/>
      <!-- Top vent -->
      <line x1="160" y1="148" x2="180" y2="148" stroke="#C2410C" stroke-width="2"/>
      <line x1="185" y1="148" x2="205" y2="148" stroke="#C2410C" stroke-width="2"/>
      <line x1="210" y1="148" x2="230" y2="148" stroke="#C2410C" stroke-width="2"/>
      <!-- Brand label -->
      <rect x="155" y="165" width="50" height="16" rx="3" fill="#7C2D12"/>
      <rect x="161" y="170" width="38" height="5" rx="2" fill="#FDBA74"/>
    `,
    defs: ``,
  },
  {
    slug: "services",
    name: "خدمات",
    bg: "#F0FDFA",
    icon: `
      <!-- Shadow -->
      <ellipse cx="200" cy="335" rx="120" ry="10" fill="#5EEAD4" opacity="0.25"/>
      <!-- Person body -->
      <path d="M130 320 L130 250 C130 222 150 200 178 200 L222 200 C250 200 270 222 270 250 L270 320" fill="#0D9488"/>
      <path d="M130 320 L130 250 C130 222 150 200 178 200 L200 200 L200 320 Z" fill="#14B8A6"/>
      <!-- Head -->
      <circle cx="200" cy="145" r="48" fill="#FDE68A"/>
      <circle cx="200" cy="145" r="48" fill="url(#svcFace)" opacity="0.15"/>
      <!-- Hard hat -->
      <path d="M148 140 C148 110 170 85 200 85 C230 85 252 110 252 140" fill="#F59E0B"/>
      <path d="M148 140 C148 110 170 85 200 85 C200 85 200 140 200 140 L148 140Z" fill="#FBBF24"/>
      <rect x="140" y="136" width="120" height="14" rx="4" fill="#D97706"/>
      <rect x="140" y="136" width="60" height="14" rx="4" fill="#F59E0B"/>
      <!-- Face -->
      <circle cx="185" cy="148" r="4" fill="#78350F"/>
      <circle cx="215" cy="148" r="4" fill="#78350F"/>
      <path d="M190 162 C195 168 205 168 210 162" stroke="#78350F" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Collar -->
      <path d="M178 200 L200 218 L222 200" fill="#0F766E"/>
      <!-- Tool belt -->
      <rect x="130" y="270" width="140" height="14" rx="3" fill="#92400E"/>
      <rect x="160" y="264" width="20" height="24" rx="3" fill="#78350F"/>
      <rect x="190" y="264" width="16" height="20" rx="2" fill="#78350F"/>
      <!-- Wrench in hand -->
      <path d="M270 250 L310 210 L320 220 L280 260" fill="#94A3B8" stroke="#64748B" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="316" cy="208" r="12" fill="none" stroke="#94A3B8" stroke-width="6"/>
      <!-- Checkmark badge -->
      <circle cx="260" cy="120" r="22" fill="white" stroke="#0D9488" stroke-width="4"/>
      <path d="M250 120 L257 127 L272 112" stroke="#0D9488" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `,
    defs: `<radialGradient id="svcFace" cx="40%" cy="40%"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="black" stop-opacity="0.1"/></radialGradient>`,
  },
];

async function generateImage(cat) {
  const { slug, bg, icon, defs } = cat;

  const svg = `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs || ""}</defs>
  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>
  <!-- Subtle radial light -->
  <radialGradient id="ambientLight-${slug}">
    <stop offset="0%" stop-color="white" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>
  <ellipse cx="180" cy="120" rx="200" ry="150" fill="url(#ambientLight-${slug})"/>
  <!-- Icon -->
  <g>${icon}</g>
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
  console.log(`\nDone! ${categories.length} images in public/images/categories/`);
}

main().catch(console.error);
