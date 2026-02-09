"use client";

interface TypingIndicatorProps {
  userName: string;
  isVisible: boolean;
}

export default function TypingIndicator({
  userName,
  isVisible,
}: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="flex justify-start mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-gray-light rounded-2xl rounded-es-sm px-4 py-2.5 max-w-[75%]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-text">{userName}</span>
          <div className="flex gap-0.5 items-center" aria-label="بيكتب...">
            <span
              className="w-1.5 h-1.5 bg-gray-text rounded-full animate-bounce"
              style={{ animationDelay: "0ms", animationDuration: "600ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-gray-text rounded-full animate-bounce"
              style={{ animationDelay: "150ms", animationDuration: "600ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-gray-text rounded-full animate-bounce"
              style={{ animationDelay: "300ms", animationDuration: "600ms" }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-text mt-0.5">بيكتب...</p>
      </div>
    </div>
  );
}
