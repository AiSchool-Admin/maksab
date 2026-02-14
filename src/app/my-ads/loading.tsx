import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function MyAdsLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light">
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 flex gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>

      {/* Ad list */}
      <div className="px-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 border border-gray-light rounded-xl">
            <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-24" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
