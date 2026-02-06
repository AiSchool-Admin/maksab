import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Reusable error message component — Egyptian Arabic friendly messages.
 */
export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-error/5 rounded-xl p-4 text-center">
      <AlertTriangle
        size={24}
        className="text-error mx-auto mb-2"
      />
      <p className="text-sm text-error font-medium mb-3">{message}</p>
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
