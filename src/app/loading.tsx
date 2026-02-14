import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";
import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center justify-between">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Search bar skeleton */}
      <div className="px-4 py-3">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Categories skeleton */}
      <div className="px-4 pb-4">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 min-w-[60px]">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Section title skeleton */}
      <div className="px-4 mb-3">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Ad grid skeleton */}
      <div className="px-4">
        <AdGridSkeleton count={6} />
      </div>
    </div>
  );
}
