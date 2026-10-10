import { useState, useMemo } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Menu, Activity, AlertTriangle, Lock, MessageCircle } from "lucide-react";

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 🌟 جلب بيانات المستخدم لمعرفة حالة الاشتراك
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // 🌟 حساب حالة الاشتراك والأيام المتبقية
  const subscriptionState = useMemo(() => {
    // السوبر أدمن معندوش اشتراك عيادة
    if (!user || user.role === "SuperAdmin" || !user.subscription_ends_at) {
      return { show: false };
    }

    const now = new Date();
    const endDate = new Date(user.subscription_ends_at);
    const diffTime = endDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffTime <= 0) {
      return { show: true, type: "expired" };
    }

    // إظهار التحذير في آخر 3 أيام فقط
    if (daysLeft <= 3) {
      return { show: true, type: "warning", daysLeft };
    }

    return { show: false };
  }, [user]);

  // رقم واتساب الدعم لتجديد الاشتراك (حط رقمك هنا)
  const whatsappNumber = "201503076555"; 
  const renewUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `مرحباً كوروستا، أرغب في تجديد اشتراك عيادتي (${user?.name || ""})`
  )}`;

  return (
    <div
      className="min-h-screen bg-[var(--bg-app)] flex flex-col lg:flex-row"
      dir="rtl"
    >
      {/* 🌟 شريط علوي للموبايل: متوافق مع نظام الطبقات بدون شادو */}
      <header className="lg:hidden bg-[var(--bg-surface)] border-b border-[var(--border-default)] p-3.5 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] border border-[var(--border-default)] transition-colors flex items-center justify-center"
          aria-label="فتح القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

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

      {/* 🌟 2. مساحة العمل والمحتوى */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 🔔 بانر الاشتراك التجريبي */}
        {subscriptionState.show && (
          <div
            className={`border-b px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between gap-3 ${
              subscriptionState.type === "expired"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {subscriptionState.type === "expired" ? (
                <>
                  <Lock className="w-4 h-4 text-red-400 shrink-0" />
                  <span>
                    انتهت الفترة التجريبية. النظام الآن في وضع <b>القراءة فقط</b> — يمكنك استعراض وتصدير بياناتك.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    متبقي{" "}
                    <b>
                      {subscriptionState.daysLeft === 1
                        ? "يوم واحد"
                        : subscriptionState.daysLeft === 2
                        ? "يومان"
                        : `${subscriptionState.daysLeft} أيام`}
                    </b>{" "}
                    على انتهاء الفترة التجريبية للعيادة.
                  </span>
                </>
              )}
            </div>

            <a
              href={renewUrl}
              target="_blank"
              rel="noreferrer"
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] font-semibold transition text-xs ${
                subscriptionState.type === "expired"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-zinc-900"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {subscriptionState.type === "expired" ? "تجديد الاشتراك" : "تواصل للتجديد"}
            </a>
          </div>
        )}

        <main className="flex-1 w-full p-3.5 sm:p-5 md:p-6 lg:p-8 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}