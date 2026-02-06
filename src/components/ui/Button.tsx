import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary: "bg-brand-green text-white hover:bg-brand-green-dark active:bg-brand-green-dark/90",
  secondary: "bg-brand-gold text-white hover:bg-brand-gold/90 active:bg-brand-gold/80",
  outline: "border-2 border-brand-green text-brand-green hover:bg-brand-green-light active:bg-brand-green-light/80",
  ghost: "text-gray-text hover:bg-gray-light active:bg-gray-light/80",
  danger: "bg-error text-white hover:bg-error/90 active:bg-error/80",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2.5 text-base gap-2",
  lg: "px-6 py-3 text-lg gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading,
      fullWidth,
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 size={size === "sm" ? 14 : 18} className="animate-spin" />
            <span>جاري التحميل...</span>
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
