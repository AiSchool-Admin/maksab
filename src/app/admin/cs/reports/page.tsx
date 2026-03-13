"use client";

import { useState } from "react";
import {
  SmilePlus,
  Clock,
  CheckCircle2,
  Bot,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react";

interface KPICard {
  label: string;
  value: string;
  change: number; // percentage change
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

interface DailyBreakdown {
  date: string;
  total_conversations: number;
  ai_handled: number;
  human_handled: number;
  avg_response_time: string;
  resolution_rate: number;
  satisfaction: number;
}

interface SatisfactionEntry {
  period: string;
  score: number;
  responses: number;
}

const KPI_DATA: KPICard[] = [
  {
    label: "وقت الاستجابة",
    value: "< 30 ثانية",
    change: -15,
    icon: Clock,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    label: "نسبة الحل",
    value: "94%",
    change: 3,
    icon: CheckCircle2,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
  },
  {
    label: "نسبة AI التلقائي",
    value: "78%",
    change: 5,
    icon: Bot,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
  },
  {
    label: "رضا العملاء",
    value: "4.6/5",
    change: 2,
    icon: Star,
    iconColor: "text-yellow-600",
    iconBg: "bg-yellow-50",
  },
];

const DAILY_DATA: DailyBreakdown[] = [
  {
    date: "13 مارس",
    total_conversations: 45,
    ai_handled: 35,
    human_handled: 10,
    avg_response_time: "25 ث",
    resolution_rate: 96,
    satisfaction: 4.7,
  },
  {
    date: "12 مارس",
    total_conversations: 52,
    ai_handled: 40,
    human_handled: 12,
    avg_response_time: "30 ث",
    resolution_rate: 93,
    satisfaction: 4.5,
  },
  {
    date: "11 مارس",
    total_conversations: 38,
    ai_handled: 30,
    human_handled: 8,
    avg_response_time: "28 ث",
    resolution_rate: 95,
    satisfaction: 4.6,
  },
  {
    date: "10 مارس",
    total_conversations: 41,
    ai_handled: 32,
    human_handled: 9,
    avg_response_time: "35 ث",
    resolution_rate: 91,
    satisfaction: 4.4,
  },
  {
    date: "9 مارس",
    total_conversations: 55,
    ai_handled: 42,
    human_handled: 13,
    avg_response_time: "32 ث",
    resolution_rate: 92,
    satisfaction: 4.5,
  },
  {
    date: "8 مارس",
    total_conversations: 36,
    ai_handled: 28,
    human_handled: 8,
    avg_response_time: "22 ث",
    resolution_rate: 97,
    satisfaction: 4.8,
  },
  {
    date: "7 مارس",
    total_conversations: 48,
    ai_handled: 37,
    human_handled: 11,
    avg_response_time: "27 ث",
    resolution_rate: 94,
    satisfaction: 4.6,
  },
];

const SATISFACTION_TREND: SatisfactionEntry[] = [
  { period: "الأسبوع 1", score: 4.2, responses: 120 },
  { period: "الأسبوع 2", score: 4.4, responses: 145 },
  { period: "الأسبوع 3", score: 4.5, responses: 160 },
  { period: "الأسبوع 4", score: 4.6, responses: 175 },
  { period: "الأسبوع 5", score: 4.7, responses: 190 },
];

function getChangeIcon(change: number) {
  if (change > 0) return <TrendingUp size={14} className="text-green-500" />;
  if (change < 0) return <TrendingDown size={14} className="text-green-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

function getChangeLabel(change: number, isTimeBased: boolean = false) {
  // For time-based metrics, negative change is good
  const isPositive = isTimeBased ? change < 0 : change > 0;
  const color = isPositive ? "text-green-600" : change === 0 ? "text-gray-400" : "text-red-600";
  const prefix = change > 0 ? "+" : "";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {prefix}{change}% عن الأسبوع اللي فات
    </span>
  );
}

export default function CSReportsPage() {
  const [period] = useState("7d");

  const totalConversations = DAILY_DATA.reduce((s, d) => s + d.total_conversations, 0);
  const totalAI = DAILY_DATA.reduce((s, d) => s + d.ai_handled, 0);
  const totalHuman = DAILY_DATA.reduce((s, d) => s + d.human_handled, 0);
  const avgSatisfaction =
    DAILY_DATA.reduce((s, d) => s + d.satisfaction, 0) / DAILY_DATA.length;

  // Max score for the mini chart bar calculation
  const maxScore = 5;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SmilePlus size={24} className="text-[#D4A843]" />
            تقارير خدمة العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-1">أداء فريق خدمة العملاء و AI — آخر 7 أيام</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_DATA.map((kpi) => {
          const Icon = kpi.icon;
          const isTimeBased = kpi.label === "وقت الاستجابة";
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <Icon size={20} className={kpi.iconColor} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1 mb-2">{kpi.label}</p>
              <div className="flex items-center gap-1">
                {getChangeIcon(isTimeBased ? -kpi.change : kpi.change)}
                {getChangeLabel(kpi.change, isTimeBased)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Row */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">إجمالي المحادثات:</span>
            <span className="font-bold text-gray-900 mr-2">{totalConversations}</span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <span className="text-gray-500">تعامل AI:</span>
            <span className="font-bold text-purple-600 mr-2">{totalAI}</span>
            <span className="text-xs text-gray-400">
              ({Math.round((totalAI / totalConversations) * 100)}%)
            </span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <span className="text-gray-500">تعامل بشري:</span>
            <span className="font-bold text-blue-600 mr-2">{totalHuman}</span>
            <span className="text-xs text-gray-400">
              ({Math.round((totalHuman / totalConversations) * 100)}%)
            </span>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <span className="text-gray-500">متوسط الرضا:</span>
            <span className="font-bold text-yellow-600 mr-2">
              {avgSatisfaction.toFixed(1)}/5
            </span>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={18} className="text-gray-400" />
            التفصيل اليومي
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                <th className="text-center px-4 py-3 font-medium">إجمالي</th>
                <th className="text-center px-4 py-3 font-medium">AI</th>
                <th className="text-center px-4 py-3 font-medium">بشري</th>
                <th className="text-center px-4 py-3 font-medium">وقت الاستجابة</th>
                <th className="text-center px-4 py-3 font-medium">نسبة الحل</th>
                <th className="text-center px-4 py-3 font-medium">الرضا</th>
              </tr>
            </thead>
            <tbody>
              {DAILY_DATA.map((day) => (
                <tr
                  key={day.date}
                  className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{day.date}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {day.total_conversations}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-purple-600 font-medium">{day.ai_handled}</span>
                    <span className="text-gray-400 text-xs mr-1">
                      ({Math.round((day.ai_handled / day.total_conversations) * 100)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-blue-600 font-medium">{day.human_handled}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {day.avg_response_time}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        day.resolution_rate >= 95
                          ? "bg-green-50 text-green-700"
                          : day.resolution_rate >= 90
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {day.resolution_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="font-medium text-gray-900">{day.satisfaction}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Satisfaction Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
          <SmilePlus size={18} className="text-[#D4A843]" />
          اتجاه رضا العملاء
        </h3>

        <div className="space-y-3">
          {SATISFACTION_TREND.map((entry) => {
            const barWidth = (entry.score / maxScore) * 100;
            return (
              <div key={entry.period} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-500 text-left shrink-0">
                  {entry.period}
                </div>
                <div className="flex-1 relative">
                  <div className="h-8 rounded-lg overflow-hidden bg-gray-50">
                    <div
                      className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-3"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor:
                          entry.score >= 4.5
                            ? "#1B7A3D"
                            : entry.score >= 4.0
                            ? "#D4A843"
                            : "#F59E0B",
                      }}
                    >
                      <span className="text-white text-xs font-bold flex items-center gap-1">
                        <Star size={10} className="fill-white" />
                        {entry.score}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-xs text-gray-400 shrink-0">
                  {entry.responses} رد
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
