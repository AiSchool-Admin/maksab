"use client";

import Link from "next/link";

interface StoreFrontProps {
  categoryId: string;
  name: string;
  icon: string;
  itemCount: number;
  side: "right" | "left";
  index: number;
  /** Store personality color accent */
  accentColor: string;
}

/** Map category IDs to thematic store descriptions */
const storeDescriptions: Record<string, string> = {
  cars: "معرض سيارات",
  real_estate: "مكتب عقارات",
  phones: "محل موبايلات",
  fashion: "بوتيك أزياء",
  scrap: "بورصة الخردة",
  gold: "محل المجوهرات",
  luxury: "بوتيك فاخر",
  appliances: "معرض أجهزة",
  furniture: "معرض أثاث",
  hobbies: "محل الهوايات",
  tools: "محل العدد",
  services: "مركز الخدمات",
};

/** Each store gets a unique visual style */
const storeStyles: Record<string, { awning: string; door: string; sign: string }> = {
  cars: { awning: "from-blue-600 to-blue-800", door: "bg-blue-900", sign: "bg-blue-700" },
  real_estate: { awning: "from-emerald-600 to-emerald-800", door: "bg-emerald-900", sign: "bg-emerald-700" },
  phones: { awning: "from-purple-600 to-purple-800", door: "bg-purple-900", sign: "bg-purple-700" },
  fashion: { awning: "from-pink-500 to-pink-700", door: "bg-pink-900", sign: "bg-pink-600" },
  scrap: { awning: "from-amber-600 to-amber-800", door: "bg-amber-900", sign: "bg-amber-700" },
  gold: { awning: "from-yellow-500 to-yellow-700", door: "bg-yellow-900", sign: "bg-yellow-600" },
  luxury: { awning: "from-slate-700 to-slate-900", door: "bg-slate-950", sign: "bg-slate-800" },
  appliances: { awning: "from-cyan-600 to-cyan-800", door: "bg-cyan-900", sign: "bg-cyan-700" },
  furniture: { awning: "from-orange-600 to-orange-800", door: "bg-orange-900", sign: "bg-orange-700" },
  hobbies: { awning: "from-indigo-500 to-indigo-700", door: "bg-indigo-900", sign: "bg-indigo-600" },
  tools: { awning: "from-stone-600 to-stone-800", door: "bg-stone-900", sign: "bg-stone-700" },
  services: { awning: "from-teal-600 to-teal-800", door: "bg-teal-900", sign: "bg-teal-700" },
};

export default function StoreFront({
  categoryId,
  name,
  icon,
  itemCount,
  side,
  index,
}: StoreFrontProps) {
  const desc = storeDescriptions[categoryId] || "محل";
  const style = storeStyles[categoryId] || storeStyles.cars;

  return (
    <Link
      href={`/souk/${categoryId}`}
      className="block group"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative animate-fade-in-up">
        {/* Store building */}
        <div className="relative bg-gradient-to-b from-amber-50 to-amber-100 rounded-t-xl border border-amber-200 overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300">
          {/* Decorative arch top */}
          <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200" />

          {/* Store sign */}
          <div className={`mx-3 mt-5 mb-2 rounded-lg ${style.sign} px-3 py-2 text-center shadow-inner`}>
            <p className="text-white text-base font-bold leading-tight">{name}</p>
            <p className="text-white/70 text-[10px] mt-0.5">{desc}</p>
          </div>

          {/* Display window */}
          <div className="mx-3 mb-2 bg-white/80 rounded-lg border border-amber-200 p-2 min-h-[60px] flex items-center justify-center">
            <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
              {icon}
            </span>
          </div>

          {/* Door */}
          <div className="flex justify-center pb-2">
            <div className={`w-12 h-16 ${style.door} rounded-t-full relative overflow-hidden`}>
              {/* Door handle */}
              <div className={`absolute ${side === "right" ? "start-2" : "end-2"} top-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-sm`} />
              {/* Door light effect */}
              <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-yellow-300/30 to-transparent" />
            </div>
          </div>
        </div>

        {/* Awning / canopy */}
        <div className={`absolute top-0 inset-x-0 h-4 bg-gradient-to-b ${style.awning} rounded-t-xl`}>
          {/* Scalloped edge */}
          <div className="absolute -bottom-2 inset-x-0 flex justify-around">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 bg-gradient-to-b ${style.awning} rounded-b-full`}
              />
            ))}
          </div>
        </div>

        {/* Item count badge */}
        <div className="absolute -top-2 -start-2 bg-brand-green text-white text-[10px] font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-md z-10 border-2 border-white">
          {itemCount > 99 ? "+99" : itemCount}
        </div>

        {/* Open indicator */}
        <div className="mt-1 text-center">
          <span className="inline-flex items-center gap-1 text-[10px] text-brand-green font-semibold bg-green-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse" />
            مفتوح — ادخل
          </span>
        </div>
      </div>
    </Link>
  );
}
