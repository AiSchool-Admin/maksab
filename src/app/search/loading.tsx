import { Skeleton, AdGridSkeleton } from "@/components/ui/SkeletonLoader";

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-gray-light">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Filter chips */}
      <div className="px-4 py-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* Sort bar */}
      <div className="px-4 pb-3 flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Results grid */}
      <div className="px-4">
        <AdGridSkeleton count={6} />
      </div>
    </div>
  );
}
