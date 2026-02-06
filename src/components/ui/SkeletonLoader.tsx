interface SkeletonProps {
  className?: string;
}

/** Basic skeleton block — uses .skeleton class from globals.css */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

/** Skeleton for an AdCard — matches AdCard layout */
export function AdCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-light overflow-hidden">
      {/* Image placeholder */}
      <div className="aspect-[4/3] skeleton" />

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />

        {/* Price */}
        <Skeleton className="h-5 w-1/2" />

        {/* Location + time */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-light">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton grid for the home feed */
export function AdGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <AdCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a single line of text */
export function TextSkeleton({ width = "w-full" }: { width?: string }) {
  return <Skeleton className={`h-4 ${width}`} />;
}

/** Skeleton for a chat message bubble */
export function ChatBubbleSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex ${isOwn ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[70%] rounded-2xl p-3 space-y-1.5 ${
          isOwn ? "bg-gray-light" : "bg-brand-green-light"
        }`}
      >
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
