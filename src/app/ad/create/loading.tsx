import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function AdCreateLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header with steps */}
      <div className="px-4 py-3 border-b border-gray-light">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Progress bar */}
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>

      {/* Category grid */}
      <div className="px-4 pt-5">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
