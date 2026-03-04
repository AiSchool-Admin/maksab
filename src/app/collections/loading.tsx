import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function CollectionsLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Collection cards */}
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-light rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
