import { Skeleton, AdGridSkeleton } from "@/components/ui/SkeletonLoader";

export default function FavoritesLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light">
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Count */}
      <div className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Grid */}
      <div className="px-4">
        <AdGridSkeleton count={6} />
      </div>
    </div>
  );
}
