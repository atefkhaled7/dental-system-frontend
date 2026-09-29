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
        className={`fixed lg:sticky top-0 bottom-0 right-0 z-50 w-72 lg:w-64 bg-slate-900 border-l border-slate-800 flex flex-col h-screen transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* لوجو العيادة + زر إغلاق للموبايل */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">
                Dental SaaS
              </h1>
              <span className="text-xs text-slate-500 mt-1 block">
                إدارة العيادة
              </span>
            </div>
          </div>

          {/* زر إغلاق القائمة في الموبايل */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* روابط التنقل */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile} // 👈 يقفل القائمة تلقائياً عند الضغط
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* بيانات المستخدم وزرار الخروج */}
        <div className="p-4 border-t border-slate-800">
          <div className="p-3 bg-slate-800/60 rounded-xl mb-3 flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-bold text-white truncate">
                {user?.name || "مستخدم"}
              </p>
              <p className="text-xs text-emerald-400 font-medium capitalize">
                {user?.role || "Doctor"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium text-sm transition-colors border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
