"use client";

import { useState, useRef } from "react";
import { Send, ImagePlus, X, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/utils/image-compress";

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendImage: (preview: string) => void;
  disabled?: boolean;
}

export default function ChatInput({
  onSendText,
  onSendImage,
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (imagePreview) {
      onSendImage(imagePreview);
      setImagePreview(null);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed.preview);
    } catch {
      // Failed to compress
    }
    setIsCompressing(false);
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const canSend = (text.trim().length > 0 || imagePreview) && !disabled;

  return (
    <div className="border-t border-gray-light bg-white">
      {/* Image preview */}
      {imagePreview && (
        <div className="px-3 pt-3 relative inline-block">
          <img
            src={imagePreview}
            alt="صورة للإرسال"
            className="h-20 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="absolute top-1 end-1 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center"
            aria-label="إزالة الصورة"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        {/* Image picker */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || isCompressing}
          className="flex-shrink-0 p-2 text-gray-text hover:text-brand-green transition-colors disabled:opacity-50"
          aria-label="إرفاق صورة"
        >
          {isCompressing ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <ImagePlus size={22} />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImagePick}
          className="hidden"
        />

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          disabled={disabled}
          className="flex-1 bg-gray-light rounded-full px-4 py-2.5 text-sm text-dark placeholder:text-gray-text outline-none focus:ring-2 focus:ring-brand-green/30 disabled:opacity-50"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex-shrink-0 w-10 h-10 bg-brand-green text-white rounded-full flex items-center justify-center hover:bg-brand-green-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="إرسال"
        >
          <Send size={18} className="rotate-180" />
        </button>
      </div>
    </div>
  );
}
