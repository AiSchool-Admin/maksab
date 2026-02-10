import { Skeleton } from "@/components/ui/SkeletonLoader";

/** Skeleton for the store header */
export function StoreHeaderSkeleton() {
  return (
    <div className="bg-white border-b border-gray-light">
      <Skeleton className="h-36 sm:h-48 rounded-none" />
      <div className="px-4 pb-4">
        <div className="relative -mt-12 mb-3 flex items-end justify-between">
          <Skeleton className="w-24 h-24 rounded-2xl" />
          <Skeleton className="w-24 h-8 rounded-xl" />
        </div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for a store card in the grid */
export function StoreCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-light overflow-hidden">
      <Skeleton className="h-24 rounded-none" />
      <div className="px-3 pb-3">
        <div className="relative -mt-8 mb-2">
          <Skeleton className="w-16 h-16 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3 mb-2" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton grid for stores listing */
export function StoresGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <StoreCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for review card */
export function ReviewCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-light p-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-2 w-14" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
