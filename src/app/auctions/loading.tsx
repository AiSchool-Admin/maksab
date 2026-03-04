import { Skeleton, AdGridSkeleton } from "@/components/ui/SkeletonLoader";

export default function AuctionsLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Status filter tabs */}
      <div className="px-4 py-3 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* Sort chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* Grid */}
      <div className="px-4">
        <AdGridSkeleton count={6} cols={2} />
      </div>
    </div>
  );
}
