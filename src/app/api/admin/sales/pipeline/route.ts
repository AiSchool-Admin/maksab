import { NextResponse } from "next/server";

export async function GET() {
  const data = {
    funnel: [
      { stage: "اكتشفوا", count: 5000, percent: 100, color: "#1B7A3D" },
      { stage: "عندهم رقم", count: 3300, percent: 66, color: "#1E8B45" },
      { stage: "تم التواصل", count: 2000, percent: 40, color: "#22A050" },
      { stage: "ردّوا", count: 1000, percent: 20, color: "#2DB85E" },
      { stage: "مهتمين", count: 500, percent: 10, color: "#45C972" },
      { stage: "سجّلوا", count: 250, percent: 5, color: "#6DD895" },
      { stage: "نشروا", count: 120, percent: 2.4, color: "#95E5B2" },
      { stage: "نشطين", count: 60, percent: 1.2, color: "#D4A843" },
    ],
    kanban: {
      columns: [
        {
          id: "discovery",
          title: "اكتشاف",
          color: "#1B7A3D",
          cards: [
            { id: "1", name: "أحمد محمود", phone: "01012345678", score: 85, category: "سيارات" },
            { id: "2", name: "سارة علي", phone: "01198765432", score: 72, category: "عقارات" },
          ],
        },
        {
          id: "contact",
          title: "تواصل",
          color: "#1E8B45",
          cards: [
            { id: "3", name: "محمد حسن", phone: "01234567890", score: 90, category: "موبايلات" },
            { id: "4", name: "فاطمة أحمد", phone: "01556789012", score: 68, category: "ذهب" },
          ],
        },
        {
          id: "interested",
          title: "مهتم",
          color: "#22A050",
          cards: [
            { id: "5", name: "عمر خالد", phone: "01087654321", score: 95, category: "سيارات" },
          ],
        },
        {
          id: "registered",
          title: "تسجيل",
          color: "#2DB85E",
          cards: [
            { id: "6", name: "نور الدين", phone: "01112233445", score: 88, category: "عقارات" },
            { id: "7", name: "ياسمين وليد", phone: "01223344556", score: 76, category: "خردة" },
          ],
        },
        {
          id: "active",
          title: "نشط",
          color: "#45C972",
          cards: [
            { id: "8", name: "كريم سعيد", phone: "01009988776", score: 92, category: "سيارات" },
          ],
        },
        {
          id: "vip",
          title: "VIP",
          color: "#D4A843",
          cards: [
            { id: "9", name: "حسام الدين", phone: "01155667788", score: 98, category: "ذهب" },
          ],
        },
      ],
    },
    todayPerformance: [
      { label: "حصاد", value: 45, icon: "wheat", color: "#1B7A3D" },
      { label: "أرقام", value: 32, icon: "phone", color: "#1E8B45" },
      { label: "رسائل", value: 28, icon: "message", color: "#22A050" },
      { label: "ردود", value: 12, icon: "reply", color: "#2DB85E" },
      { label: "تسجيل", value: 5, icon: "user-plus", color: "#45C972" },
      { label: "حيتان جدد", value: 2, icon: "star", color: "#D4A843" },
    ],
  };

  return NextResponse.json(data);
}
