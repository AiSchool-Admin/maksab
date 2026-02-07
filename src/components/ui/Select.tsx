"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder = "اختار...", className = "", id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-dark mb-1.5"
          >
            {label}
            {props.required && <span className="text-error me-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none px-4 py-3 pe-10 bg-gray-light rounded-xl border-2 border-transparent focus:border-brand-green focus:bg-white focus:outline-none transition-all text-dark cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? "border-error bg-error/5" : ""
            } ${!props.value ? "text-gray-text" : ""} ${className}`}
            {...props}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-text pointer-events-none"
          />
        </div>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-text">{hint}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
export default Select;
