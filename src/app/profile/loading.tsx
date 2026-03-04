import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light">
        <Skeleton className="h-7 w-20" />
      </div>

      {/* Profile header */}
      <div className="px-4 pt-4 pb-5 flex items-center gap-4">
        <Skeleton className="h-[72px] w-[72px] rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>

      {/* Completion bar */}
      <div className="px-4 pb-5">
        <div className="bg-gray-light/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Menu items */}
      <div className="px-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
