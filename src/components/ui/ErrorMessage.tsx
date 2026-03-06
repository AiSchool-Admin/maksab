import { AlertTriangle, RefreshCw, WifiOff, ShieldAlert, Clock } from "lucide-react";
import { parseError } from "@/lib/utils/error-messages";

type ErrorVariant = "default" | "network" | "auth" | "timeout" | "inline";

interface ErrorMessageProps {
  /** Raw error string, error code, or Error object — auto-parsed to Arabic */
  message: string | Error | unknown;
  onRetry?: () => void;
  /** Visual variant */
  variant?: ErrorVariant;
  /** Compact mode for inline errors (smaller text, less padding) */
  compact?: boolean;
}

const variantConfig: Record<ErrorVariant, {
  icon: typeof AlertTriangle;
  bgClass: string;
  textClass: string;
}> = {
  default: { icon: AlertTriangle, bgClass: "bg-error/5", textClass: "text-error" },
  network: { icon: WifiOff, bgClass: "bg-warning/10", textClass: "text-warning" },
  auth: { icon: ShieldAlert, bgClass: "bg-brand-green-light", textClass: "text-brand-green" },
  timeout: { icon: Clock, bgClass: "bg-warning/10", textClass: "text-warning" },
  inline: { icon: AlertTriangle, bgClass: "bg-transparent", textClass: "text-error" },
};

/**
 * Reusable error message component — Egyptian Arabic friendly messages.
 * Accepts raw errors and auto-parses them to user-friendly Arabic.
 */
export default function ErrorMessage({
  message,
  onRetry,
  variant = "default",
  compact = false,
}: ErrorMessageProps) {
  const displayMessage = typeof message === "string" ? message : parseError(message);

  // Detect variant from message content if default
  let effectiveVariant = variant;
  if (variant === "default") {
    if (displayMessage.includes("اتصال") || displayMessage.includes("إنترنت")) {
      effectiveVariant = "network";
    } else if (displayMessage.includes("سجل") || displayMessage.includes("جلسة")) {
      effectiveVariant = "auth";
    } else if (displayMessage.includes("وقت طويل")) {
      effectiveVariant = "timeout";
    }
  }

  const config = variantConfig[effectiveVariant];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Icon size={16} className={config.textClass} />
        <p className={`text-xs font-medium ${config.textClass}`}>{displayMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-brand-green font-semibold hover:underline ms-auto"
          >
            جرب تاني
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${config.bgClass} rounded-xl p-4 text-center`}>
      <Icon
        size={24}
        className={`${config.textClass} mx-auto mb-2`}
      />
      <p className={`text-sm ${config.textClass} font-medium mb-3`}>{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-sm text-brand-green font-semibold hover:underline"
        >
          <RefreshCw size={14} />
          جرب تاني
        </button>
      )}
    </div>
  );
}

/**
 * Full-page error component — for when an entire page fails to load.
 */
export function FullPageError({
  message,
  onRetry,
}: {
  message?: string | Error | unknown;
  onRetry?: () => void;
}) {
  const displayMessage = message
    ? typeof message === "string" ? message : parseError(message)
    : "حصلت مشكلة — جرّب تاني";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-6xl mb-4">⚠️</p>
      <h2 className="text-lg font-bold text-dark mb-2">أوبس! حصلت مشكلة</h2>
      <p className="text-sm text-gray-text mb-6 max-w-xs">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-brand-green text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors"
        >
          <RefreshCw size={16} />
          جرّب تاني
        </button>
      )}
    </div>
  );
}
