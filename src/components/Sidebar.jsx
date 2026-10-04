import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  FlaskConical,
  LogOut,
  Activity,
  X,
} from "lucide-react";

export default function Sidebar({ isMobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();

  const navItems = [
    { name: "الرئيسية", path: "/", icon: LayoutDashboard },
    { name: "المرضى", path: "/patients", icon: Users },
    { name: "المواعيد", path: "/appointments", icon: Calendar },
    { name: "الفواتير والمالية", path: "/invoices", icon: CreditCard },
    { name: "طلبات المعامل", path: "/lab-orders", icon: FlaskConical },
  ];

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
        {/* لوجو العيادة + زر إغلاق للموبايل */}
        <div className="p-5 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-[var(--text-main)] leading-none">
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
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--primary-muted)] text-[var(--primary-base)] font-semibold border border-[var(--primary-base)]/20"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] border border-transparent"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive
                          ? "text-[var(--primary-base)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    />
                    <span>{item.name}</span>
                  </>
                )}
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
            <p className="text-[11px] font-medium text-[var(--success-text)] mt-0.5 capitalize">
              {user?.role || "Doctor"}
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
