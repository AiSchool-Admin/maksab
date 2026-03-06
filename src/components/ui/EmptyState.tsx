import Link from "next/link";
import Button from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** Optional secondary action */
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryAction?: () => void;
}

/**
 * Reusable empty state with illustration + message + CTA.
 * Per CLAUDE.md: "Always show illustration + helpful message + CTA"
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="py-12 text-center px-4">
      <p className="text-6xl mb-4">{icon}</p>
      <h3 className="text-lg font-bold text-dark mb-2">{title}</h3>
      <p className="text-sm text-gray-text mb-6 max-w-xs mx-auto">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button size="lg">{actionLabel}</Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {secondaryLabel && (secondaryHref || onSecondaryAction) && (
        <div className="mt-3">
          {secondaryHref ? (
            <Link
              href={secondaryHref}
              className="text-sm font-semibold text-brand-green hover:underline"
            >
              {secondaryLabel}
            </Link>
          ) : (
            <button
              onClick={onSecondaryAction}
              className="text-sm font-semibold text-brand-green hover:underline"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured empty states for common pages.
 * Use these instead of building custom empty states each time.
 */

/** Empty state for favorites page */
export function EmptyFavorites() {
  return (
    <EmptyState
      icon="💚"
      title="مفيش مفضلات لسه"
      description="لما تعجبك حاجة اضغط على قلب ♡ وهتلاقيها هنا"
      actionLabel="تصفّح الإعلانات"
      actionHref="/"
    />
  );
}

/** Empty state for my-ads page */
export function EmptyMyAds() {
  return (
    <EmptyState
      icon="📦"
      title="مفيش إعلانات لسه"
      description="أضف أول إعلان ليك وابدأ بيع أو تبديل في ثواني"
      actionLabel="أضف إعلان"
      actionHref="/ad/create"
    />
  );
}

/** Empty state for chat list */
export function EmptyChats() {
  return (
    <EmptyState
      icon="💬"
      title="مفيش رسائل لسه"
      description="لما تتواصل مع بائع أو مشتري هتلاقي المحادثات هنا"
      actionLabel="تصفّح الإعلانات"
      actionHref="/"
    />
  );
}

/** Empty state for search results */
export function EmptySearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="مفيش نتائج"
      description={
        query
          ? `مفيش نتائج لـ "${query}" — جرّب كلمات تانية أو فلاتر مختلفة`
          : "جرّب تبحث بكلمات تانية أو غيّر الفلاتر"
      }
      actionLabel="مسح الفلاتر"
    />
  );
}

/** Empty state for notifications */
export function EmptyNotifications() {
  return (
    <EmptyState
      icon="🔔"
      title="مفيش إشعارات"
      description="هنبعتلك إشعارات لما حد يبعتلك رسالة أو يزايد على إعلانك"
    />
  );
}

/** Empty state for auctions */
export function EmptyAuctions() {
  return (
    <EmptyState
      icon="🔨"
      title="مفيش مزادات حالياً"
      description="كن أول واحد يبدأ مزاد — بيع حاجتك بأعلى سعر!"
      actionLabel="أضف مزاد"
      actionHref="/ad/create"
    />
  );
}

/** Empty state for buy requests */
export function EmptyBuyRequests() {
  return (
    <EmptyState
      icon="🛒"
      title="مفيش طلبات شراء"
      description="لو بتدور على حاجة معينة اعمل طلب شراء وهنلاقيهالك"
      actionLabel="اعمل طلب شراء"
      actionHref="/buy-requests"
    />
  );
}

/** Empty state for offers */
export function EmptyOffers() {
  return (
    <EmptyState
      icon="💰"
      title="مفيش عروض سعر"
      description="لسه محدش بعتلك عرض سعر — العروض هتظهر هنا"
    />
  );
}

/** Empty state for collections */
export function EmptyCollections() {
  return (
    <EmptyState
      icon="📁"
      title="مفيش مجموعات لسه"
      description="أنشئ مجموعة عشان تنظم الإعلانات اللي بتتابعها"
      actionLabel="أنشئ مجموعة"
      actionHref="/collections"
    />
  );
}

/** Empty state when not logged in */
export function EmptyNeedsLogin({
  feature = "المحتوى",
  onLogin,
}: {
  feature?: string;
  onLogin?: () => void;
}) {
  return (
    <EmptyState
      icon="🔐"
      title="سجّل دخولك"
      description={`لازم تسجل الأول عشان تشوف ${feature}`}
      actionLabel="تسجيل الدخول"
      actionHref="/login"
      onAction={onLogin}
    />
  );
}

/** Empty state for store products */
export function EmptyStoreProducts() {
  return (
    <EmptyState
      icon="🏪"
      title="مفيش منتجات لسه"
      description="أضف أول منتج لمتجرك وابدأ البيع"
      actionLabel="أضف منتج"
      actionHref="/store/dashboard/products/quick-add"
    />
  );
}
