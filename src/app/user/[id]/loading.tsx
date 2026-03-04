import { Skeleton } from "@/components/ui/SkeletonLoader";
import { AdGridSkeleton } from "@/components/ui/SkeletonLoader";

export default function UserProfileLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-7 w-28" />
      </div>

      {/* User info */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 text-center space-y-1">
            <Skeleton className="h-6 w-10 mx-auto" />
            <Skeleton className="h-3 w-14 mx-auto" />
          </div>
        ))}
      </div>

      {/* Ads grid */}
      <div className="px-4 pt-2">
        <Skeleton className="h-5 w-24 mb-3" />
        <AdGridSkeleton count={4} cols={2} />
      </div>
    </div>
  );
}
