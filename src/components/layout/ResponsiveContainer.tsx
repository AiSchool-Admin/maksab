interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Use wider container for tablet/desktop */
  wide?: boolean;
}

/**
 * Responsive container that centers content and scales for tablet/desktop.
 * Uses the same max-width strategy as the root layout.
 */
export default function ResponsiveContainer({
  children,
  className = "",
  wide = false,
}: ResponsiveContainerProps) {
  const widthClass = wide
    ? "max-w-2xl md:max-w-4xl"
    : "max-w-lg sm:max-w-xl md:max-w-2xl";

  return (
    <div className={`mx-auto px-4 ${widthClass} ${className}`}>
      {children}
    </div>
  );
}
