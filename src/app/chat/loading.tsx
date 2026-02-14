import { Skeleton } from "@/components/ui/SkeletonLoader";

export default function ChatListLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light">
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Conversation list */}
      <div className="divide-y divide-gray-light">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
