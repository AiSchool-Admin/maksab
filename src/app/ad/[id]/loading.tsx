import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function AdDetailLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Image gallery skeleton */}
      <Skeleton className="w-full aspect-[4/3]" />

      <div className="px-4 py-4 space-y-4">
        {/* Price */}
        <Skeleton className="h-8 w-40" />

        {/* Sale type badge */}
        <Skeleton className="h-6 w-32 rounded-full" />

        {/* Title */}
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />

        {/* Specs section */}
        <div className="border-t border-gray-light pt-4 space-y-3">
          <Skeleton className="h-5 w-24 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="border-t border-gray-light pt-4 space-y-2">
          <Skeleton className="h-5 w-20 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Seller section */}
        <div className="border-t border-gray-light pt-4 flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-light px-4 py-3">
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
