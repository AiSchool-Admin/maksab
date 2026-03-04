import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function RewardsLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-7 w-28" />
      </div>

      {/* Points card */}
      <div className="px-4 pt-4">
        <div className="bg-gray-light/50 rounded-xl p-5 space-y-3">
          <Skeleton className="h-10 w-24 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-32 mx-auto" />
        </div>
      </div>

      {/* Actions list */}
      <div className="px-4 pt-5 space-y-3">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-light">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
