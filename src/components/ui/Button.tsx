import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variants = {
  primary: "bg-brand-green text-white hover:bg-brand-green-dark",
  secondary: "bg-brand-gold text-white hover:bg-brand-gold/90",
  outline: "border-2 border-brand-green text-brand-green hover:bg-brand-green-light",
  ghost: "text-gray-text hover:bg-gray-light",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-3 text-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, children, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? "جاري التحميل..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
