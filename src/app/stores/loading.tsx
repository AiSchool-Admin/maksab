import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function StoresLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light">
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>

      {/* Store cards */}
      <div className="px-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-light rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
