import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Menu, Activity } from "lucide-react";

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-[var(--bg-app)] flex flex-col lg:flex-row"
      dir="rtl"
    >
      {/* 🌟 شريط علوي للموبايل: متوافق مع نظام الطبقات بدون شادو */}
      <header className="lg:hidden bg-[var(--bg-surface)] border-b border-[var(--border-default)] p-3.5 flex items-center justify-between sticky top-0 z-30">
        {/* 1. زر المنيو على اليمين */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] border border-[var(--border-default)] transition-colors flex items-center justify-center"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* 2. لوجو واسم العيادة على الشمال */}   
        <div className="flex items-center gap-2.5">
          <div className="text-left">
            <h1 className="text-sm font-semibold text-[var(--text-main)] leading-none">
            CUROSTA 
            </h1>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5 font-normal">
              إدارة العيادة
            </span>
          </div>
          <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)]">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* 🌟 1. القائمة الجانبية */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 🌟 2. مساحة المحتوى */}
      <main className="flex-1 w-full p-3.5 sm:p-5 md:p-6 lg:p-8 overflow-y-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
