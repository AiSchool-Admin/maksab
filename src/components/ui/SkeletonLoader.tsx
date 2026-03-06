interface SkeletonProps {
  className?: string;
}

/** Basic skeleton block — uses .skeleton class from globals.css */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

/** Skeleton for an AdCard — matches AdCard layout */
export function AdCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-light overflow-hidden">
      {/* Image placeholder */}
      <div className="aspect-[4/3] skeleton" />

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />

        {/* Price */}
        <Skeleton className="h-5 w-1/2" />

        {/* Location + time */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-light">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton grid for the home feed */
export function AdGridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-2 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <AdCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a single line of text */
export function TextSkeleton({ width = "w-full" }: { width?: string }) {
  return <Skeleton className={`h-4 ${width}`} />;
}

/** Skeleton for a chat message bubble */
export function ChatBubbleSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex ${isOwn ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[70%] rounded-2xl p-3 space-y-1.5 ${
          isOwn ? "bg-gray-light" : "bg-brand-green-light"
        }`}
      >
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Skeleton for the conversation list page */
export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-light">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full skeleton flex-shrink-0" />
          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the chat messages page */
export function ChatPageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <ChatBubbleSkeleton isOwn={false} />
      <ChatBubbleSkeleton isOwn={true} />
      <ChatBubbleSkeleton isOwn={false} />
      <ChatBubbleSkeleton isOwn={true} />
      <ChatBubbleSkeleton isOwn={false} />
    </div>
  );
}

/** Skeleton for ad detail page */
export function AdDetailSkeleton() {
  return (
    <div className="space-y-4">
      {/* Image gallery */}
      <div className="aspect-[4/3] skeleton w-full" />

      <div className="px-4 space-y-4">
        {/* Price */}
        <Skeleton className="h-8 w-40" />
        {/* Sale type badge */}
        <Skeleton className="h-6 w-32" />
        {/* Title */}
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />

        {/* Specs */}
        <div className="border border-gray-light rounded-xl p-4 space-y-3">
          <Skeleton className="h-5 w-20" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Seller */}
        <div className="flex items-center gap-3 p-4 border border-gray-light rounded-xl">
          <div className="w-12 h-12 rounded-full skeleton" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-2">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the profile page */
export function ProfileSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-20 h-20 rounded-full skeleton" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats */}
      <div className="flex justify-around py-4 border border-gray-light rounded-xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-lg skeleton" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for my-ads page list items */
export function MyAdsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 border border-gray-light rounded-xl">
          <div className="w-20 h-20 rounded-lg skeleton flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for search results page */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex gap-2 px-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
        ))}
      </div>
      {/* Results grid */}
      <div className="px-3">
        <AdGridSkeleton count={6} />
      </div>
    </div>
  );
}

/** Skeleton for horizontal section on home page */
export function HorizontalSectionSkeleton() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36">
            <AdCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full page skeleton with header placeholder */
export function PageSkeleton({ hasHeader = true }: { hasHeader?: boolean }) {
  return (
    <div className="min-h-screen">
      {hasHeader && (
        <div className="h-14 border-b border-gray-light flex items-center px-4">
          <Skeleton className="h-6 w-24" />
        </div>
      )}
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/** Category grid skeleton for home page */
export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-4 gap-x-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 rounded-2xl skeleton" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
