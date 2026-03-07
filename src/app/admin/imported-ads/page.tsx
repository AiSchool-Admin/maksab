"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Upload,
  RefreshCw,
  ExternalLink,
  Image,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Package,
  Users,
} from "lucide-react";
import { getAdminHeaders } from "../layout";

// ── Types ──────────────────────────────────────────────

interface ImportedAd {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  price: number | null;
  is_negotiable: boolean;
  category_fields: Record<string, unknown>;
  governorate: string | null;
  city: string | null;
  images: string[];
  source: string;
  source_url: string | null;
  source_id: string;
  source_seller_id: string | null;
  source_seller_name: string | null;
  source_seller_phone: string | null;
  status: string;
  batch_id: string | null;
  created_at: string;
}

interface ImportStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byGovernorate: Record<string, number>;
  uniqueSellers: number;
  withImages: number;
  withPrice: number;
  avgPrice: number;
}

// ── Category Labels ────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  cars: "🚗 السيارات",
  real_estate: "🏠 العقارات",
  phones: "📱 الموبايلات",
  fashion: "👗 الموضة",
  scrap: "♻️ الخردة",
  gold_silver: "💰 الذهب والفضة",
  luxury: "💎 السلع الفاخرة",
  home_appliances: "🏠 الأجهزة المنزلية",
  furniture: "🪑 الأثاث",
  hobbies: "🎮 الهوايات",
  tools: "🔧 العدد والأدوات",
  services: "🛠️ الخدمات",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "في الانتظار", color: "#F59E0B", bg: "#FFF8E1" },
  approved: { label: "تم الموافقة", color: "#1B7A3D", bg: "#E8F5E9" },
  published: { label: "تم النشر", color: "#2563EB", bg: "#EFF6FF" },
  rejected: { label: "مرفوض", color: "#DC2626", bg: "#FEF2F2" },
  duplicate: { label: "مكرر", color: "#6B7280", bg: "#F3F4F6" },
  expired: { label: "منتهي", color: "#9CA3AF", bg: "#F9FAFB" },
};

export default function ImportedAdsPage() {
  const [ads, setAds] = useState<ImportedAd[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAd, setSelectedAd] = useState<ImportedAd | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/admin/imported-ads?${params}`, {
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAds(data.ads || []);
      setTotalPages(data.totalPages || 1);
      setStats(data.stats || null);
    } catch (err) {
      console.error("Error fetching imported ads:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const updateAdStatus = async (adId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/imported-ads", {
        method: "PATCH",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: adId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      // Update local state
      setAds((prev) => prev.map((a) => (a.id === adId ? { ...a, status: newStatus } : a)));
      if (selectedAd?.id === adId) {
        setSelectedAd((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error("Error updating ad:", err);
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    const pendingAds = ads.filter((a) => a.status === "pending");
    if (pendingAds.length === 0) return;

    try {
      const res = await fetch("/api/admin/imported-ads/bulk", {
        method: "PATCH",
        headers: { ...getAdminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: pendingAds.map((a) => a.id),
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to bulk update");
      fetchAds();
    } catch (err) {
      console.error("Error bulk updating:", err);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "—";
    return `${price.toLocaleString("en-US")} جنيه`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "الآن";
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString("ar-EG");
  };

  return (
    <div style={{ direction: "rtl" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>
          📦 بيانات OLX المستوردة
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280" }}>
          إدارة الإعلانات والبائعين المجمّعين من OLX
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard icon={<Package size={20} />} label="إجمالي الإعلانات" value={stats.total} color="#1B7A3D" />
          <StatCard icon={<Users size={20} />} label="بائعين فريدين" value={stats.uniqueSellers} color="#D4A843" />
          <StatCard icon={<Image size={20} />} label="بصور" value={stats.withImages} color="#2563EB" />
          <StatCard
            icon={<BarChart3 size={20} />}
            label="متوسط السعر"
            value={stats.avgPrice ? `${Math.round(stats.avgPrice).toLocaleString()} ج` : "—"}
            color="#7C3AED"
          />
        </div>
      )}

      {/* Status Distribution */}
      {stats && stats.byStatus && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const config = STATUS_LABELS[status] || { label: status, color: "#6B7280", bg: "#F3F4F6" };
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: statusFilter === status ? `2px solid ${config.color}` : "1px solid #E5E7EB",
                  background: statusFilter === status ? config.bg : "white",
                  color: config.color,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Cairo, sans-serif",
                }}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Filters Bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "white",
            borderRadius: 8,
            border: "1px solid #E5E7EB",
          }}
        >
          <Search size={16} color="#6B7280" />
          <input
            type="text"
            placeholder="ابحث في الإعلانات..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              fontSize: 14,
              fontFamily: "Cairo, sans-serif",
              direction: "rtl",
            }}
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            fontSize: 13,
            fontFamily: "Cairo, sans-serif",
            background: "white",
            cursor: "pointer",
          }}
        >
          <option value="all">كل الأقسام</option>
          {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>

        {/* Bulk Actions */}
        <button
          onClick={() => bulkUpdateStatus("approved")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#1B7A3D",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Cairo, sans-serif",
          }}
        >
          ✅ موافقة على الكل
        </button>

        <button
          onClick={fetchAds}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Ads Table */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #E5E7EB",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
            جاري التحميل...
          </div>
        ) : ads.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
            <Package size={48} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>لا يوجد إعلانات مستوردة</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              استخدم أداة الجمع لاستيراد إعلانات من OLX
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
                <th style={thStyle}>الإعلان</th>
                <th style={thStyle}>القسم</th>
                <th style={thStyle}>السعر</th>
                <th style={thStyle}>الموقع</th>
                <th style={thStyle}>البائع</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr
                  key={ad.id}
                  style={{
                    borderBottom: "1px solid #F3F4F6",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedAd(ad)}
                >
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {ad.images?.[0] ? (
                        <img
                          src={ad.images[0]}
                          alt=""
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 6,
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 6,
                            background: "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Image size={20} color="#D1D5DB" />
                        </div>
                      )}
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ad.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>
                          {formatDate(ad.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12 }}>
                      {CATEGORY_LABELS[ad.category_id || ""] || ad.category_id || "—"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: "#1B7A3D" }}>
                    {formatPrice(ad.price)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={12} />
                      {ad.governorate || "—"}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 12 }}>{ad.source_seller_name || "—"}</div>
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge status={ad.status} />
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <ActionBtn
                        icon={<CheckCircle size={14} />}
                        color="#1B7A3D"
                        title="موافقة"
                        onClick={() => updateAdStatus(ad.id, "approved")}
                      />
                      <ActionBtn
                        icon={<XCircle size={14} />}
                        color="#DC2626"
                        title="رفض"
                        onClick={() => updateAdStatus(ad.id, "rejected")}
                      />
                      {ad.source_url && (
                        <a
                          href={ad.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: 4,
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="فتح على OLX"
                        >
                          <ExternalLink size={14} color="#6B7280" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              padding: 16,
              borderTop: "1px solid #E5E7EB",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={paginationBtn}
            >
              <ChevronRight size={16} />
            </button>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              صفحة {page} من {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={paginationBtn}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Ad Detail Modal */}
      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onStatusChange={(status) => updateAdStatus(selectedAd.id, status)}
        />
      )}
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        padding: 16,
        border: "1px solid #E5E7EB",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: 12, color: "#6B7280" }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] || { label: status, color: "#6B7280", bg: "#F3F4F6" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

function ActionBtn({
  icon,
  color,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: 4,
        borderRadius: 4,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color,
        display: "flex",
        alignItems: "center",
      }}
    >
      {icon}
    </button>
  );
}

function AdDetailModal({
  ad,
  onClose,
  onStatusChange,
}: {
  ad: ImportedAd;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          maxWidth: 600,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          direction: "rtl",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Images */}
        {ad.images && ad.images.length > 0 && (
          <div style={{ display: "flex", gap: 4, padding: 16, overflowX: "auto" }}>
            {ad.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`صورة ${i + 1}`}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 8,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ))}
          </div>
        )}

        <div style={{ padding: "0 20px 20px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{ad.title}</h2>

          {ad.price && (
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1B7A3D", marginBottom: 12 }}>
              {ad.price.toLocaleString("en-US")} جنيه
              {ad.is_negotiable && (
                <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 400, marginRight: 8 }}>
                  (قابل للتفاوض)
                </span>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <StatusBadge status={ad.status} />
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <DetailItem label="القسم" value={CATEGORY_LABELS[ad.category_id || ""] || ad.category_id || "—"} />
            <DetailItem label="الموقع" value={`${ad.governorate || ""} ${ad.city || ""}`} />
            <DetailItem label="البائع" value={ad.source_seller_name || "—"} />
            <DetailItem label="هاتف البائع" value={ad.source_seller_phone || "غير متاح"} />
            <DetailItem label="المصدر" value={ad.source} />
            <DetailItem label="الدفعة" value={ad.batch_id || "—"} />
          </div>

          {/* Category Fields */}
          {ad.category_fields && Object.keys(ad.category_fields).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                تفاصيل إضافية
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                {Object.entries(ad.category_fields).map(([key, value]) => (
                  <DetailItem key={key} label={key} value={String(value)} />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {ad.description && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                الوصف
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>
                {ad.description}
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button
              onClick={() => onStatusChange("approved")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#1B7A3D",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Cairo, sans-serif",
              }}
            >
              ✅ موافقة
            </button>
            <button
              onClick={() => onStatusChange("rejected")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #DC2626",
                background: "white",
                color: "#DC2626",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Cairo, sans-serif",
              }}
            >
              ❌ رفض
            </button>
            {ad.source_url && (
              <a
                href={ad.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  background: "white",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Cairo, sans-serif",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ExternalLink size={14} />
                OLX
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              background: "#F9FAFB",
              color: "#6B7280",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
              marginTop: 8,
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 8,
        background: "#F9FAFB",
        borderRadius: 6,
      }}
    >
      <div style={{ fontSize: 11, color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: "#6B7280",
  textAlign: "right",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
};

const paginationBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #E5E7EB",
  background: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};
