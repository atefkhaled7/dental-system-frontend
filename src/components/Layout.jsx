import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Menu, Activity } from "lucide-react";

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col lg:flex-row"
      dir="rtl"
    >
      {/* 🌟 شريط علوي للموبايل: الزرار ع اليمين واللوجو ع الشمال */}
      <header className="lg:hidden bg-slate-900 border-b border-slate-800 p-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        {/* 1. زر المنيو على اليمين (نفس مكان فتح القائمة) */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors flex items-center justify-center"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* 2. لوجو واسم العيادة على الشمال */}
        <div className="flex items-center gap-2.5">
          <div className="text-left">
            <h1 className="text-sm font-bold text-white leading-none">
              Dental SaaS
            </h1>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              إدارة العيادة
            </span>
          </div>
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* 🌟 1. القائمة الجانبية (Desktop Sidebar + Mobile Drawer) */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 🌟 2. شباك المحتوى المتغير (100% عرض على الموبايل بدون زحام) */}
      <main className="flex-1 w-full p-3.5 sm:p-5 md:p-6 lg:p-8 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
