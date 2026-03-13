"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  TrendingUp,
  MapPin,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  UserSearch,
  Target,
  Megaphone,
  Inbox,
  BarChart3,
  Wheat,
  Bell,
  Headphones,
  ArrowUpRight,
  SmilePlus,
  PieChart,
  Mail,
  Globe,
  Search,
  Pencil,
  Facebook,
  ClipboardCheck,
  Flag,
  DollarSign,
  CreditCard,
  Monitor,
  Cpu,
  MoreHorizontal,
} from "lucide-react";

const ADMIN_SESSION_KEY = "maksab_admin_session";

interface AdminSession {
  id: string;
  email: string;
  name: string;
}

const AdminContext = createContext<AdminSession | null>(null);
export function useAdmin() {
  return useContext(AdminContext);
}

/** Build Authorization headers for admin API calls using session token */
export function getAdminHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("maksab_session_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface NavSection {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: "dashboard",
    label: "لوحة القيادة",
    icon: "🎯",
    items: [
      { href: "/admin/dashboard", label: "لوحة القيادة", icon: LayoutDashboard },
    ],
  },
  {
    id: "cs",
    label: "خدمة العملاء",
    icon: "📞",
    items: [
      { href: "/admin/cs/conversations", label: "المحادثات", icon: Headphones },
      { href: "/admin/cs/escalations", label: "التصعيدات", icon: ArrowUpRight },
      { href: "/admin/cs/reports", label: "رضا العملاء", icon: SmilePlus },
    ],
  },
  {
    id: "sales",
    label: "المبيعات والاستحواذ",
    icon: "📈",
    items: [
      { href: "/admin/sales/pipeline", label: "Pipeline", icon: PieChart },
      { href: "/admin/sales/outreach", label: "التواصل", icon: Mail },
      { href: "/admin/sales/scopes", label: "النطاقات", icon: Globe },
    ],
  },
  {
    id: "marketing",
    label: "التسويق والنمو",
    icon: "📣",
    items: [
      { href: "/admin/marketing/dashboard", label: "الحملات", icon: Megaphone },
      { href: "/admin/marketing/content", label: "المحتوى", icon: Pencil },
      { href: "/admin/marketing/groups", label: "Facebook Groups", icon: Facebook },
      { href: "/admin/marketing/seo", label: "SEO", icon: Search },
    ],
  },
  {
    id: "ops",
    label: "العمليات والجودة",
    icon: "⚙️",
    items: [
      { href: "/admin/ops/moderation", label: "مراجعة الإعلانات", icon: ClipboardCheck },
      { href: "/admin/ops/reports", label: "البلاغات", icon: Flag },
    ],
  },
  {
    id: "finance",
    label: "المالية",
    icon: "💰",
    items: [
      { href: "/admin/finance/dashboard", label: "الإيرادات", icon: DollarSign },
      { href: "/admin/finance/subscriptions", label: "الاشتراكات", icon: CreditCard },
    ],
  },
  {
    id: "tech",
    label: "التقنية",
    icon: "💻",
    items: [
      { href: "/admin/tech/dashboard", label: "حالة النظام", icon: Monitor },
      { href: "/admin/tech/harvester", label: "محرك الحصاد", icon: Cpu },
    ],
  },
  {
    id: "legacy",
    label: "أخرى",
    icon: "📁",
    items: [
      { href: "/admin/users", label: "المستخدمين", icon: Users },
      { href: "/admin/ads", label: "الإعلانات", icon: ShoppingBag },
      { href: "/admin/analytics", label: "التحليلات", icon: TrendingUp },
      { href: "/admin/locations", label: "المواقع", icon: MapPin },
      { href: "/admin/settings", label: "الإعدادات", icon: Settings },
      { href: "/admin/crm/customers", label: "CRM — العملاء", icon: UserSearch },
      { href: "/admin/crm/discovery", label: "CRM — الاكتشاف", icon: Target },
      { href: "/admin/crm/campaigns", label: "CRM — الحملات", icon: Megaphone },
      { href: "/admin/crm/inbox", label: "CRM — الوارد", icon: Inbox },
      { href: "/admin/crm/analytics", label: "CRM — تحليلات", icon: BarChart3 },
      { href: "/admin/crm/harvester", label: "CRM — الحصاد", icon: Wheat },
    ],
  },
];

// Flatten all nav items for header title lookup
const allNavItems = navSections.flatMap((s) => s.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount] = useState(3);

  // Collapsible sections — start all expanded except legacy
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    legacy: true,
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Skip auth check on login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous client-side init
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!stored) {
        router.replace("/admin/login");
        return;
      }
      const parsed = JSON.parse(stored) as AdminSession;
      setSession(parsed);
    } catch {
      router.replace("/admin/login");
    }
    setIsLoading(false);
  }, [isLoginPage, router]);

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem("maksab_session_token");
    router.replace("/admin/login");
  };

  // Resolve header title from pathname
  const getPageTitle = (): string => {
    // Exact match first
    const exact = allNavItems.find((n) => n.href === pathname);
    if (exact) return exact.label;
    // Prefix match for nested pages
    const prefix = allNavItems
      .filter((n) => pathname.startsWith(n.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);
    if (prefix.length > 0) return prefix[0].label;
    // Old /admin root
    if (pathname === "/admin") return "لوحة التحكم";
    return "لوحة التحكم";
  };

  // Login page — render without layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-green rounded-xl flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Shield size={24} className="text-white" />
          </div>
          <p className="text-sm text-gray-text">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <AdminContext.Provider value={session}>
      <div className="min-h-screen bg-gray-50 flex" dir="rtl">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 right-0 z-50 w-64 bg-white border-l border-gray-200 transform transition-transform lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-brand-green rounded-lg flex items-center justify-center">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-dark">مكسب</h2>
                    <p className="text-[10px] text-gray-text">إدارة العمليات</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-gray-text">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Navigation with collapsible sections */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navSections.map((section) => {
                const isCollapsed = collapsedSections[section.id] ?? false;
                const hasActiveItem = section.items.some(
                  (item) => pathname === item.href || pathname.startsWith(item.href + "/")
                );

                // Single-item sections (dashboard) render directly
                if (section.items.length === 1) {
                  const item = section.items[0];
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={section.id}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-green text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                      }`}
                    >
                      <span className="text-base">{section.icon}</span>
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <div key={section.id}>
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        hasActiveItem ? "text-brand-green" : "text-gray-400"
                      } hover:bg-gray-50`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{section.icon}</span>
                        {section.label}
                      </span>
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>

                    {/* Section items */}
                    {!isCollapsed && (
                      <div className="mt-0.5 mr-3 border-r border-gray-100 space-y-0.5">
                        {section.items.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-2 mr-1 rounded-lg text-sm transition-colors ${
                                isActive
                                  ? "bg-brand-green text-white font-medium"
                                  : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                              }`}
                            >
                              <item.icon size={16} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Admin info & logout */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <div className="w-8 h-8 bg-brand-green-light rounded-full flex items-center justify-center text-brand-green text-xs font-bold">
                  {(session.name || "A")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-dark truncate">{session.name}</p>
                  <p className="text-[10px] text-gray-text truncate" dir="ltr">{session.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-error hover:bg-error/5 transition-colors"
              >
                <LogOut size={16} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="bg-white border-b border-gray-200 px-4 lg:px-6 h-14 flex items-center gap-3 sticky top-0 z-30">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-gray-text hover:text-dark rounded-lg hover:bg-gray-100">
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-dark">
              {getPageTitle()}
            </h1>
            <div className="flex-1" />

            {/* Notifications bell */}
            <button className="relative p-2 text-gray-text hover:text-dark rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            <Link href="/" className="text-xs text-brand-green hover:text-brand-green-dark flex items-center gap-1">
              <ChevronLeft size={14} />
              الموقع الرئيسي
            </Link>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
