import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  unit?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, unit, icon, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-dark mb-1.5"
          >
            {label}
            {props.required && <span className="text-error me-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-4 py-3 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark placeholder:text-gray-text ${
              error ? "border-error bg-error/5" : ""
            } ${icon ? "pe-10" : ""} ${unit ? "ps-14" : ""} ${className}`}
            {...props}
          />
          {unit && (
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-gray-text font-medium pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-text">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
