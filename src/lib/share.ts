/**
 * Share Utilities — مكسب
 *
 * WhatsApp, Facebook, Twitter, and copy-to-clipboard sharing
 * with Egyptian Arabic pre-filled messages.
 */

import { ga4Share } from "@/lib/analytics/ga4";
import { fbShare } from "@/lib/meta-pixel";

export type SharePlatform = "whatsapp" | "facebook" | "twitter" | "copy" | "native";

interface ShareAdParams {
  adId: string;
  title: string;
  price?: number;
  url?: string;
}

/**
 * Format price in Egyptian style.
 */
function fmtPrice(price: number): string {
  return price.toLocaleString("en-US") + " جنيه";
}

/**
 * Build the pre-filled WhatsApp share message in Egyptian Arabic.
 */
export function buildWhatsAppMessage(params: ShareAdParams): string {
  const { title, price, url } = params;
  const priceStr = price ? ` بـ ${fmtPrice(price)}` : "";
  const adUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  return `شوف ${title} ده على مكسب${priceStr} 💚\n${adUrl}`;
}

/**
 * Build WhatsApp deep link.
 */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Build Facebook share link.
 */
export function buildFacebookLink(url: string, quote?: string): string {
  const params = new URLSearchParams({ u: url });
  if (quote) params.set("quote", quote);
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Build Twitter (X) share link.
 */
export function buildTwitterLink(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Share an ad via the specified platform.
 * Returns true if share was initiated successfully.
 */
export async function shareAd(
  platform: SharePlatform,
  params: ShareAdParams,
): Promise<boolean> {
  const adUrl =
    params.url || (typeof window !== "undefined" ? window.location.href : "");
  const message = buildWhatsAppMessage(params);

  // Track in analytics
  const ga4Method = platform === "twitter" ? "native" : platform;
  ga4Share(params.adId, ga4Method as "whatsapp" | "facebook" | "copy" | "native");
  fbShare(params.adId);

  switch (platform) {
    case "whatsapp": {
      window.open(buildWhatsAppLink(message), "_blank", "noopener,noreferrer");
      return true;
    }

    case "facebook": {
      window.open(
        buildFacebookLink(adUrl, message),
        "_blank",
        "noopener,noreferrer,width=600,height=400",
      );
      return true;
    }

    case "twitter": {
      window.open(
        buildTwitterLink(message, adUrl),
        "_blank",
        "noopener,noreferrer,width=600,height=400",
      );
      return true;
    }

    case "copy": {
      try {
        await navigator.clipboard.writeText(adUrl);
        return true;
      } catch {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = adUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      }
    }

    case "native": {
      if (navigator.share) {
        try {
          await navigator.share({ title: params.title, text: message, url: adUrl });
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    default:
      return false;
  }
}
