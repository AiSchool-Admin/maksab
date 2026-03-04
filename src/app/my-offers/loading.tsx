import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function MyOffersLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-7 w-28" />
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Offer cards */}
      <div className="px-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-light rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
