import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  FlaskConical,
  LogOut,
  X,
  UserCog, // 👈 أيقونة طاقم العمل والصلاحيات
} from "lucide-react";

export default function Sidebar({ isMobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // قائمة الروابط الأساسية
  const navItems = [
    { name: "الرئيسية", path: "/", icon: LayoutDashboard },
    { name: "المرضى", path: "/patients", icon: Users },
    { name: "المواعيد", path: "/appointments", icon: Calendar },
    { name: "الفواتير والمالية", path: "/invoices", icon: CreditCard },
    { name: "طلبات المعامل", path: "/lab-orders", icon: FlaskConical },
    // 🌟 بند طاقم العمل يظهر فقط لمدير العيادة (ClinicAdmin)
    ...(user?.role === "ClinicAdmin"
      ? [{ name: "طاقم العمل", path: "/staff", icon: UserCog }]
      : []),
  ];

  // دالة فحص الرابط النشط بذكاء (حتى مع الصفحات المتفرعة زي /patients/:id)
  const isRouteActive = (itemPath) => {
    if (itemPath === "/") return location.pathname === "/";
    return location.pathname.startsWith(itemPath);
  };

  // ترجمة مسمى الرتبة بالعربي
  const getRoleArabicName = (role) => {
    switch (role) {
      case "ClinicAdmin":
        return "مدير العيادة";
      case "Doctor":
        return "طبيب معالج";
      case "Receptionist":
        return "موظف استقبال";
      case "SuperAdmin":
        return "مدير المنصة";
      default:
        return role || "عضو العيادة";
    }
  };

  return (
    <>
      {/* خلفية مظللة للموبايل عند فتح القائمة */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 bottom-0 right-0 z-50 w-72 lg:w-64 bg-[var(--bg-surface)] border-l border-[var(--border-default)] flex flex-col h-screen transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* لوجو CUROSTA + زر إغلاق للموبايل */}
        <div className="p-5 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)] border border-[var(--primary-base)]/20 shadow-sm shadow-[var(--primary-base)]/10">
              {/* لوجو سن كوروستا الرسمي */}
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2C7.5 2 4 4.5 4 8.5c0 3 1.5 6 3 9.5 1 2.3 2 4 3 4s1.5-3 2-4c.5 1 1 4 2 4s2-1.7 3-4c1.5-3.5 3-6.5 3-9.5C20 4.5 16.5 2 12 2z" />
                <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-main)] leading-none tracking-wider">
                CUROSTA
              </h1>
              <span className="text-[11px] text-[var(--text-muted)] mt-1 block font-normal">
                إدارة العيادة
              </span>
            </div>
          </div>

          {/* زر إغلاق القائمة في الموبايل */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* روابط التنقل */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--primary-muted)] text-[var(--primary-base)] font-semibold border border-[var(--primary-base)]/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    active
                      ? "text-[var(--primary-base)]"
                      : "text-[var(--text-muted)]"
                  }`}
                />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* بيانات المستخدم وزرار الخروج */}
        <div className="p-4 border-t border-[var(--border-default)]">
          <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] mb-3">
            <p className="text-sm font-semibold text-[var(--text-main)] truncate">
              {user?.name || "مستخدم"}
            </p>
            <p className="text-[11px] font-medium text-[var(--primary-base)] mt-0.5">
              {getRoleArabicName(user?.role)}
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--danger-bg)] hover:bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[var(--radius-btn)] text-sm font-medium transition-colors border border-[var(--danger-text)]/20 hover:border-[var(--danger-text)]/40"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
