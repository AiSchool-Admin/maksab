"use client";

/**
 * InstaPayLogo — InstaPay brand mark (Egyptian instant payment by CBE).
 * Inline SVG representation of the InstaPay logo mark.
 */

interface InstaPayLogoProps {
  size?: number;
  className?: string;
}

export default function InstaPayLogo({ size = 28, className = "" }: InstaPayLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
    >
      {/* Background circle — InstaPay purple/blue */}
      <circle cx="60" cy="60" r="60" fill="#6C2D82" />

      {/* Inner ring */}
      <circle cx="60" cy="60" r="52" fill="none" stroke="#9B59B6" strokeWidth="2" opacity="0.3" />

      {/* Lightning bolt / arrow — instant payment symbol */}
      <path
        d="M68 28L44 64H58L52 92L76 56H62L68 28Z"
        fill="white"
      />

      {/* Stylized "i" dot for InstaPay */}
      <circle cx="85" cy="35" r="6" fill="#F39C12" />
    </svg>
  );
}
