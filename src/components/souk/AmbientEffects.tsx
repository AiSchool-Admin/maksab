"use client";

/**
 * Ambient decorative effects for the souk street.
 * Lanterns, walking people silhouettes, and decorative patterns.
 */

/** Hanging lantern SVG decoration */
export function Lantern({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Chain */}
      <div className="w-px h-4 bg-amber-800" />
      {/* Lantern body */}
      <div className="relative">
        <div className="w-6 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-lg rounded-t-sm border border-amber-700 shadow-lg shadow-amber-400/30">
          {/* Glass panels */}
          <div className="absolute inset-0.5 bg-gradient-to-b from-yellow-200/60 to-amber-300/60 rounded-b-md rounded-t-sm" />
          {/* Light glow */}
          <div className="absolute -inset-2 bg-amber-300/20 rounded-full blur-md animate-pulse" />
        </div>
        {/* Top cap */}
        <div className="absolute -top-1 inset-x-0 h-2 bg-amber-800 rounded-t-lg mx-0.5" />
        {/* Bottom */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-amber-800 rounded-b" />
      </div>
    </div>
  );
}

/** Decorative Islamic arch pattern */
export function ArchDecoration() {
  return (
    <div className="relative w-full h-12 flex items-end justify-center overflow-hidden">
      {/* Main arch */}
      <div className="w-20 h-10 border-t-2 border-x-2 border-amber-400/40 rounded-t-full" />
      {/* Inner arch */}
      <div className="absolute bottom-0 w-14 h-7 border-t-2 border-x-2 border-amber-400/20 rounded-t-full" />
    </div>
  );
}

/** Walking person silhouette (simple CSS) */
export function WalkingPerson({ direction = "right", delay = 0 }: { direction?: "right" | "left"; delay?: number }) {
  const isRight = direction === "right";

  return (
    <div
      className={`absolute bottom-0 ${isRight ? "animate-walk-right" : "animate-walk-left"}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`flex flex-col items-center ${isRight ? "" : "scale-x-[-1]"}`}>
        {/* Head */}
        <div className="w-3 h-3 bg-gray-600 rounded-full" />
        {/* Body */}
        <div className="w-2 h-4 bg-gray-600 rounded-sm -mt-0.5" />
        {/* Legs */}
        <div className="flex gap-0.5 -mt-0.5">
          <div className="w-1 h-3 bg-gray-600 rounded-b animate-step-left" />
          <div className="w-1 h-3 bg-gray-600 rounded-b animate-step-right" />
        </div>
      </div>
    </div>
  );
}

/** Cobblestone ground pattern */
export function CobblestoneGround() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-amber-200 to-amber-300 relative overflow-hidden">
      {/* Stone pattern using repeating bg */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 20px 15px at 20px 15px, rgba(120,80,40,0.3) 0%, transparent 100%),
            radial-gradient(ellipse 20px 15px at 50px 30px, rgba(120,80,40,0.2) 0%, transparent 100%)
          `,
          backgroundSize: "60px 40px",
        }}
      />
      {/* Center walk line */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-amber-400/30" />
    </div>
  );
}

/** Decorative string lights across the street */
export function StringLights() {
  return (
    <div className="w-full flex items-start justify-around px-4 h-8 relative">
      {/* Cable */}
      <svg className="absolute top-0 inset-x-0 h-4 w-full" viewBox="0 0 400 20" preserveAspectRatio="none">
        <path
          d="M0,5 Q100,18 200,5 Q300,18 400,5"
          fill="none"
          stroke="rgba(120,80,40,0.4)"
          strokeWidth="1"
        />
      </svg>
      {/* Light bulbs */}
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full mt-2 shadow-sm"
          style={{
            backgroundColor: ["#FCD34D", "#F87171", "#34D399", "#60A5FA", "#F472B6", "#FCD34D", "#A78BFA"][i],
            boxShadow: `0 0 6px ${["#FCD34D", "#F87171", "#34D399", "#60A5FA", "#F472B6", "#FCD34D", "#A78BFA"][i]}40`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
