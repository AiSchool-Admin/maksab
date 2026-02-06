"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils/format";

interface ChatAdLinkProps {
  adId: string;
  title: string;
  price: number | null;
  image: string | null;
}

export default function ChatAdLink({
  adId,
  title,
  price,
  image,
}: ChatAdLinkProps) {
  return (
    <Link
      href={`/ad/${adId}`}
      className="flex items-center gap-3 mx-4 mt-2 p-3 bg-gray-light rounded-xl hover:bg-gray-200 transition-colors"
    >
      {/* Ad image */}
      <div className="w-12 h-12 rounded-lg bg-white flex-shrink-0 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl text-gray-text">
            📷
          </div>
        )}
      </div>

      {/* Ad info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark line-clamp-1">{title}</p>
        {price != null && (
          <p className="text-xs text-brand-green font-bold">
            {formatPrice(price)}
          </p>
        )}
      </div>
    </Link>
  );
}
