import { Skeleton, AdGridSkeleton } from "@/components/ui/SkeletonLoader";

export default function StoreDetailLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Cover image */}
      <Skeleton className="w-full h-36" />

      {/* Store info */}
      <div className="px-4 -mt-8 relative">
        <Skeleton className="h-16 w-16 rounded-full border-4 border-white" />
        <div className="mt-2 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-4 flex gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 text-center space-y-1">
            <Skeleton className="h-5 w-10 mx-auto" />
            <Skeleton className="h-3 w-14 mx-auto" />
          </div>
        ))}
      </div>

      {/* Products grid */}
      <div className="px-4">
        <AdGridSkeleton count={6} />
      </div>
    </div>
  );
}
