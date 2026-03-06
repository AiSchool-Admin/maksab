"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  DollarSign,
  Shield,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Heart,
  Wallet,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNavWithBadge from "@/components/layout/BottomNavWithBadge";
import Button from "@/components/ui/Button";
import PaymentStatusCard from "@/components/commission/PaymentStatusCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getPaymentHistory, type CommissionPayment } from "@/lib/payment/payment-history";
import { isCommissionSupporter } from "@/lib/commission/commission-service";

type FilterTab = "all" | "pending" | "verified" | "other";

export default function PaymentsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [isSupporter, setIsSupporter] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!user?.id) return;
    const data = await getPaymentHistory(user.id);
    setPayments(data);
    setIsLoadingPayments(false);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadPayments();
      isCommissionSupporter(user.id).then(setIsSupporter);
    }
  }, [user?.id, loadPayments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPayments();
    setIsRefreshing(false);
  };

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending")
      return p.status === "pending" || p.status === "pending_verification";
    if (activeFilter === "verified") return p.status === "paid";
    return p.status === "declined" || p.status === "later" || p.status === "cancelled";
  });

  // Stats
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payments.filter(
    (p) => p.status === "pending" || p.status === "pending_verification"
  ).length;
  const paidCount = payments.filter((p) => p.status === "paid").length;

  // ── Not logged in ──
  if (!isLoading && !user) {
    return (
      <main className="bg-white min-h-screen">
        <Header title="المدفوعات" showNotifications={false} />
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 bg-gray-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet size={28} className="text-gray-text" />
          </div>
          <p className="text-sm text-gray-text mb-4">سجّل دخولك عشان تشوف المدفوعات</p>
          <Button onClick={() => router.push("/login?redirect=/profile/payments")}>
            سجّل دخولك
          </Button>
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  // ── Loading ──
  if (isLoading || isLoadingPayments) {
    return (
      <main className="bg-white min-h-screen">
        <Header title="المدفوعات" showNotifications={false} />
        <div className="px-4 py-6 space-y-4">
          {/* Stats skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-light rounded-xl p-3 skeleton h-20" />
            ))}
          </div>
          {/* List skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-light rounded-xl skeleton" />
          ))}
        </div>
        <BottomNavWithBadge />
      </main>
    );
  }

  return (
    <main className="bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-gray-light rounded-lg transition-colors"
          >
            <ArrowRight size={20} className="text-dark" />
          </button>
          <h1 className="text-xl font-bold text-dark flex-1">المدفوعات والعمولة</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-gray-light rounded-lg transition-colors"
          >
            <RefreshCw
              size={18}
              className={`text-gray-text ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Supporter badge */}
      {isSupporter && (
        <div className="mx-4 mt-4 bg-brand-green-light border border-brand-green/20 rounded-xl p-3 flex items-center gap-2">
          <Heart size={18} className="text-brand-green" />
          <p className="text-xs font-bold text-brand-green-dark">
            أنت &quot;داعم مكسب&quot; 💚 — شكراً لدعمك!
          </p>
        </div>
      )}

      {/* Stats cards */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<DollarSign size={18} className="text-brand-green" />}
            label="إجمالي المدفوع"
            value={`${totalPaid} جنيه`}
            bgColor="bg-brand-green-light"
          />
          <StatCard
            icon={<CheckCircle size={18} className="text-brand-green" />}
            label="تم التأكيد"
            value={`${paidCount}`}
            bgColor="bg-brand-green-light"
          />
          <StatCard
            icon={<Clock size={18} className="text-brand-gold" />}
            label="معلقة"
            value={`${pendingCount}`}
            bgColor="bg-brand-gold-light"
          />
        </div>
      </section>

      {/* Filter tabs */}
      <section className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { key: "all" as const, label: "الكل", count: payments.length },
            { key: "pending" as const, label: "معلقة", count: pendingCount },
            { key: "verified" as const, label: "مؤكدة", count: paidCount },
            {
              key: "other" as const,
              label: "أخرى",
              count: payments.length - pendingCount - paidCount,
            },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === tab.key
                  ? "bg-brand-green text-white"
                  : "bg-gray-light text-gray-text hover:bg-gray-200"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                    activeFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-text"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Payments list */}
      <section className="px-4 pb-24 space-y-3">
        {filteredPayments.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          filteredPayments.map((payment) => (
            <PaymentStatusCard
              key={payment.id}
              payment={payment}
              onUpdated={loadPayments}
            />
          ))
        )}
      </section>

      <BottomNavWithBadge />
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-3 text-center`}>
      <div className="flex justify-center mb-1.5">{icon}</div>
      <p className="text-sm font-bold text-dark">{value}</p>
      <p className="text-[10px] text-gray-text mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { emoji: string; text: string }> = {
    all: { emoji: "💰", text: "مفيش مدفوعات لسه. لما تعمل صفقة هتلاقي العمولة هنا." },
    pending: { emoji: "✅", text: "مفيش مدفوعات معلقة. كل حاجة تمام!" },
    verified: { emoji: "📋", text: "مفيش مدفوعات مؤكدة لسه." },
    other: { emoji: "📦", text: "مفيش مدفوعات في القسم ده." },
  };

  const msg = messages[filter];

  return (
    <div className="py-12 text-center">
      <p className="text-4xl mb-3">{msg.emoji}</p>
      <p className="text-sm text-gray-text">{msg.text}</p>
    </div>
  );
}
