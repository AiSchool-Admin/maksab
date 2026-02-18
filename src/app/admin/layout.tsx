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

const navItems = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/users", label: "المستخدمين", icon: Users },
  { href: "/admin/ads", label: "الإعلانات", icon: ShoppingBag },
  { href: "/admin/analytics", label: "التحليلات", icon: TrendingUp },
  { href: "/admin/locations", label: "المواقع", icon: MapPin },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Skip auth check on login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
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
    router.replace("/admin/login");
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
                    <p className="text-[10px] text-gray-text">لوحة التحكم</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-gray-text">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-green text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-dark"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
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
              {navItems.find((n) => n.href === pathname)?.label || "لوحة التحكم"}
            </h1>
            <div className="flex-1" />
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
