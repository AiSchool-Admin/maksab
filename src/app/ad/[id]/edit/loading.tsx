import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function AdEditLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-7 w-28" />
      </div>

      {/* Image gallery */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-20 rounded-lg shrink-0" />
          ))}
        </div>
      </div>

      {/* Form fields */}
      <div className="px-4 pt-5 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Submit button */}
      <div className="px-4 pt-6">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
