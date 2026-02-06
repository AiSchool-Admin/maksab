export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-light px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-green">مكسب 💚</h1>
        <button className="p-2 text-gray-text" aria-label="الإشعارات">
          🔔
        </button>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-gray-light rounded-xl px-4 py-3">
          <span className="text-gray-text">🔍</span>
          <span className="text-gray-text text-sm">ابحث في مكسب...</span>
        </div>
      </div>

      {/* Categories Grid */}
      <section className="px-4 pb-4">
        <h2 className="text-sm font-semibold text-dark mb-3">الأقسام</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: "🚗", name: "سيارات" },
            { icon: "🏠", name: "عقارات" },
            { icon: "📱", name: "موبايلات" },
            { icon: "👗", name: "موضة" },
            { icon: "♻️", name: "خردة" },
            { icon: "💰", name: "ذهب" },
            { icon: "💎", name: "فاخرة" },
            { icon: "🏠", name: "أجهزة" },
            { icon: "🪑", name: "أثاث" },
            { icon: "🎮", name: "هوايات" },
            { icon: "🔧", name: "عدد" },
            { icon: "🛠️", name: "خدمات" },
          ].map((cat) => (
            <div
              key={cat.name}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-light hover:bg-brand-green-light transition-colors cursor-pointer"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-dark">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Empty State */}
      <section className="px-4 py-8 text-center">
        <p className="text-6xl mb-4">🏪</p>
        <h3 className="text-lg font-bold text-dark mb-2">
          أهلاً بيك في مكسب!
        </h3>
        <p className="text-sm text-gray-text mb-4">
          لسه مفيش إعلانات. كن أول واحد يضيف إعلان!
        </p>
        <button className="bg-brand-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-green-dark transition-colors">
          + أضف إعلان
        </button>
      </section>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-light px-2 py-1 flex items-center justify-around z-50">
        {[
          { icon: "🏠", label: "الرئيسية", active: true },
          { icon: "🔍", label: "البحث", active: false },
          { icon: "+", label: "أضف إعلان", active: false, isAdd: true },
          { icon: "💬", label: "الرسائل", active: false },
          { icon: "👤", label: "حسابي", active: false },
        ].map((tab) => (
          <button
            key={tab.label}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 ${
              tab.isAdd
                ? "relative -top-4 bg-brand-green text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
                : tab.active
                  ? "text-brand-green"
                  : "text-gray-text"
            }`}
          >
            <span className={tab.isAdd ? "text-2xl font-bold" : "text-xl"}>
              {tab.icon}
            </span>
            {!tab.isAdd && (
              <span className="text-[10px] font-medium">{tab.label}</span>
            )}
          </button>
        ))}
      </nav>
    </main>
  );
}
