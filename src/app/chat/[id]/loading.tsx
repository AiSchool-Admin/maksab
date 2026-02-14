import { Skeleton, ChatBubbleSkeleton } from "@/components/ui/SkeletonLoader";

export default function ChatDetailLoading() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-light flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Ad reference */}
      <div className="px-4 py-2 bg-gray-light/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-4">
        <ChatBubbleSkeleton isOwn={false} />
        <ChatBubbleSkeleton isOwn={true} />
        <ChatBubbleSkeleton isOwn={false} />
        <ChatBubbleSkeleton isOwn={true} />
        <ChatBubbleSkeleton isOwn={false} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-light flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}
