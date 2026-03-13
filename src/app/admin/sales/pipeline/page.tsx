"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/app/admin/layout";
import {
  Wheat,
  Phone,
  MessageSquare,
  Reply,
  UserPlus,
  Star,
  RefreshCw,
  TrendingDown,
} from "lucide-react";

interface FunnelStage {
  stage: string;
  count: number;
  percent: number;
  color: string;
}

interface KanbanCard {
  id: string;
  name: string;
  phone: string;
  score: number;
  category: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  cards: KanbanCard[];
}

interface PerformanceCard {
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface PipelineData {
  funnel: FunnelStage[];
  kanban: { columns: KanbanColumn[] };
  todayPerformance: PerformanceCard[];
}

const perfIcons: Record<string, React.ElementType> = {
  wheat: Wheat,
  phone: Phone,
  message: MessageSquare,
  reply: Reply,
  "user-plus": UserPlus,
  star: Star,
};

export default function SalesPipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales/pipeline", {
        headers: getAdminHeaders(),
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch pipeline data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-8 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">خط أنابيب المبيعات</h1>
          <p className="text-sm text-gray-text mt-1">
            تتبع رحلة العميل من الاكتشاف للنشاط
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* Today's Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {data.todayPerformance.map((card) => {
          const Icon = perfIcons[card.icon] || Star;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: card.color + "15" }}
                >
                  <Icon size={16} style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-dark">{card.value}</p>
              <p className="text-xs text-gray-text mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Acquisition Funnel */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <TrendingDown size={20} className="text-[#1B7A3D]" />
          <h2 className="text-lg font-bold text-dark">قمع الاستحواذ</h2>
        </div>

        <div className="space-y-3">
          {data.funnel.map((stage, index) => (
            <div key={stage.stage} className="group">
              <div className="flex items-center gap-3">
                {/* Label */}
                <div className="w-28 flex-shrink-0 text-left">
                  <span className="text-sm font-medium text-dark">
                    {stage.stage}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex-1 relative">
                  <div className="h-10 rounded-xl overflow-hidden bg-gray-50">
                    <div
                      className="h-full rounded-xl transition-all duration-700 ease-out flex items-center justify-end px-3"
                      style={{
                        width: `${Math.max(stage.percent, 8)}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      <span className="text-white text-xs font-bold whitespace-nowrap">
                        {stage.count.toLocaleString("ar-EG")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Percentage */}
                <div className="w-16 flex-shrink-0 text-left">
                  <span className="text-sm font-bold" style={{ color: stage.color }}>
                    {stage.percent}%
                  </span>
                </div>

                {/* Drop-off indicator */}
                {index > 0 && (
                  <div className="w-16 flex-shrink-0 text-left">
                    <span className="text-xs text-gray-text">
                      ↓{" "}
                      {Math.round(
                        ((data.funnel[index - 1].count - stage.count) /
                          data.funnel[index - 1].count) *
                          100
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 className="text-lg font-bold text-dark mb-6">
          لوحة كانبان — متابعة العملاء
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
          {data.kanban.columns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-56 bg-gray-50 rounded-2xl overflow-hidden"
            >
              {/* Column Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: column.color + "15" }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: column.color }}
                >
                  {column.title}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: column.color + "25",
                    color: column.color,
                  }}
                >
                  {column.cards.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-3 space-y-2 min-h-[120px]">
                {column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white rounded-xl p-3 border border-gray-100 hover:shadow-sm transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-dark truncate">
                        {card.name}
                      </span>
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                          card.score >= 90
                            ? "bg-green-100 text-green-700"
                            : card.score >= 70
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {card.score}
                      </span>
                    </div>
                    <p className="text-xs text-gray-text" dir="ltr">
                      {card.phone}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {card.category}
                      </span>
                    </div>
                  </div>
                ))}

                {column.cards.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-text">
                    لا يوجد عملاء
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
