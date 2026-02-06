import Link from "next/link";
import Button from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * Reusable empty state with illustration + message + CTA.
 * Per CLAUDE.md: "Always show illustration + helpful message + CTA"
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-12 text-center px-4">
      <p className="text-6xl mb-4">{icon}</p>
      <h3 className="text-lg font-bold text-dark mb-2">{title}</h3>
      <p className="text-sm text-gray-text mb-6 max-w-xs mx-auto">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button size="lg">{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
