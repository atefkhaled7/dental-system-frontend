import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  BarChart3,
  TrendingDown,
  Users,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  ArrowUpRight,
} from "lucide-react";

const formatCairoDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
};
export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  // حساب أول وآخر يوم للشهر الحالي افتراضياً
  const todayStr = formatCairoDate();
  const [currentYear, currentMonth] = todayStr.split("-").map(Number);

  const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;

  const [dateRange, setDateRange] = useState({
    startDate: firstDayOfMonth,
    endDate: todayStr,
  });
  const [activePreset, setActivePreset] = useState("thisMonth");

  const fetchReports = async (start, end) => {
    try {
      setLoading(true);
      setFetchError("");

      const res = await api.get("/reports/summary", {
        params: {
          from: start,
          to: end,
        },
      });

      setData(res.data);
    } catch (err) {
      console.error("فشل جلب التقارير:", err);

      setFetchError(
        err.response?.data?.error || "تعذر تحميل التقارير. حاول مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(dateRange.startDate, dateRange.endDate);
  }, []);

  // فلاتر التواريخ السريعة
  const handlePreset = (type) => {
    let sDate = todayStr;
    let eDate = todayStr;
    setActivePreset(type);
    if (type === "7days") {
      const past7 = new Date(`${todayStr}T00:00:00.000Z`);
      past7.setUTCDate(past7.getUTCDate() - 6);
      sDate = past7.toISOString().slice(0, 10);
    } else if (type === "thisMonth") {
      sDate = firstDayOfMonth;
    } else if (type === "lastMonth") {
      const [year, month] = todayStr.split("-").map(Number);

      const firstLastMonth = new Date(Date.UTC(year, month - 2, 1));
      const lastLastMonth = new Date(Date.UTC(year, month - 1, 0));

      sDate = firstLastMonth.toISOString().slice(0, 10);
      eDate = lastLastMonth.toISOString().slice(0, 10);
    }

    setDateRange({ startDate: sDate, endDate: eDate });
    fetchReports(sDate, eDate);
  };

  const handleCustomFilter = (e) => {
    e.preventDefault();
    setActivePreset(null);
    fetchReports(dateRange.startDate, dateRange.endDate);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 🌟 الهيدر وفلاتر التواريخ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[var(--primary-base)]" />
            تقارير الأداء والأرباح
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            تحليل الإيرادات المحصلة، إنتاجية الأطباء، ومعدلات حضور المواعيد.
          </p>
        </div>

        {/* أزرار الفلاتر السريعة والمدى الزمني */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => handlePreset("today")}
              className={`px-2.5 py-1.5 rounded transition ${
                activePreset === "today"
                  ? "bg-[var(--primary-muted)] text-[var(--primary-base)] font-bold"
                  : "hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => handlePreset("7days")}
              className={`px-2.5 py-1.5 rounded transition ${
                activePreset === "7days"
                  ? "bg-[var(--primary-muted)] text-[var(--primary-base)] font-bold"
                  : "hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => handlePreset("thisMonth")}
              className={`px-2.5 py-1.5 rounded transition ${
                activePreset === "thisMonth"
                  ? "bg-[var(--primary-muted)] text-[var(--primary-base)] font-bold"
                  : "hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => handlePreset("lastMonth")}
              className={`px-2.5 py-1.5 rounded transition ${
                activePreset === "lastMonth"
                  ? "bg-[var(--primary-muted)] text-[var(--primary-base)] font-bold"
                  : "hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
            >
              الشهر الماضي
            </button>
          </div>

          <form
            onSubmit={handleCustomFilter}
            className="flex items-center gap-2"
          >
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-1.5 text-xs text-[var(--text-main)]"
            />
            <span className="text-xs text-[var(--text-muted)]">إلى</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-1.5 text-xs text-[var(--text-main)]"
            />
            <button
              type="submit"
              className="bg-[var(--primary-base)] text-white px-3 py-1.5 rounded-[var(--radius-btn)] text-xs font-semibold hover:opacity-90"
            >
              تطبيق
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-[var(--text-muted)]">
          جاري تجميع وحساب البيانات...
        </div>
      ) : fetchError || !data ? (
        <div className="p-12 text-center space-y-3">
          <p className="text-sm text-red-400">
            {fetchError || "تعذر تحميل التقارير"}
          </p>

          <button
            type="button"
            onClick={() => fetchReports(dateRange.startDate, dateRange.endDate)}
            className="text-sm text-[var(--primary-base)] hover:underline"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {/* 🌟 4 كروت إحصائية رئيسية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* المحصل الفعلي */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                <span>إجمالي التحصيل الفعلي </span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                {data.financials.total_collected.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  ج.م
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                تم تحصيلها في الفترة المحددة
              </p>
            </div>

            {/* الديون الحالية المعلقة */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                <span>إجمالي الديون المعلقة على المرضى</span>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-300">
                {data.financials.current_total_dues.toLocaleString("ar-EG")}{" "}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  ج.م
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                متبقي في ذمة المرضى حتى الآن
              </p>
            </div>

            {/* المواعيد المكتملة */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                <span>المواعيد المنفذة (Completed)</span>
                <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                {data.appointments.completed}{" "}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  من أصل {data.appointments.total} موعد
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {data.appointments.cancelled} ملغي في نفس الفترة
              </p>
            </div>

            {/* نسبة الـ No-Show */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                <span>نسبة عدم الحضور (No-Show)</span>
                <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-red-400">
                {data.appointments.no_show_rate_percent}%
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {data.appointments.no_show} مريض لم يحضروا موعدهم
              </p>
            </div>
          </div>

          {/* 🌟 جدول إنتاجية الأطباء وتوزيع الدفع */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* جدول إنتاجية الأطباء (2 أعمدة) */}
            <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5">
              <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)] mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--primary-base)]" />
                تقرير إنتاجية الأطباء (Doctor Performance)
              </h3>
              {data.doctors_production.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-6">
                  لا يوجد أطباء مسجلين
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[var(--text-muted)]">
                      <tr>
                        <th className="p-3 font-medium">اسم الطبيب</th>
                        <th className="p-3 font-medium">المواعيد المنفذة</th>
                        <th className="p-3 font-medium">لم يحضر (No-Show)</th>
                        <th className="p-3 font-medium text-left">
                          الدخل المحقق
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-main)]">
                      {data.doctors_production.map((doc) => (
                        <tr
                          key={doc.doctor_id}
                          className="hover:bg-[var(--bg-elevated)]/40 transition"
                        >
                          <td className="p-3 font-bold">{doc.doctor_name}</td>
                          <td className="p-3">
                            {doc.completed_appointments} موعد
                          </td>
                          <td className="p-3 text-red-400 font-medium">
                            {doc.no_show_appointments}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-400 text-left">
                            {doc.total_revenue_generated.toLocaleString(
                              "ar-EG",
                            )}{" "}
                            ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* تفصيل طرق التحصيل (1 عمود) */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 space-y-4">
              <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--primary-base)]" />
                توزيع طرق التحصيل
              </h3>
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                  <span className="font-medium text-[var(--text-secondary)]">
                    نقداً (كاش الدرج)
                  </span>
                  <span className="font-bold text-[var(--text-main)] font-mono">
                    {data.financials.payment_methods.cash.toLocaleString(
                      "ar-EG",
                    )}{" "}
                    ج.م
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                  <span className="font-medium text-[var(--text-secondary)]">
                    بطاقة دفع (فيزا / ماستركارد)
                  </span>
                  <span className="font-bold text-[var(--text-main)] font-mono">
                    {data.financials.payment_methods.card.toLocaleString(
                      "ar-EG",
                    )}{" "}
                    ج.م
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                  <span className="font-medium text-[var(--text-secondary)]">
                    تحويل بنكي / إنستاباي
                  </span>
                  <span className="font-bold text-[var(--text-main)] font-mono">
                    {data.financials.payment_methods.transfer.toLocaleString(
                      "ar-EG",
                    )}{" "}
                    ج.م
                  </span>
                </div>
                {data.financials.payment_methods.other > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                    <span className="font-medium text-[var(--text-secondary)]">
                      طرق دفع أخرى
                    </span>
                    <span className="font-bold text-[var(--text-main)] font-mono">
                      {data.financials.payment_methods.other.toLocaleString(
                        "ar-EG",
                      )}{" "}
                      ج.م
                    </span>
                  </div>
                )}
                {data.financials.payment_methods.vodafone_cash > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                    <span className="font-medium text-[var(--text-secondary)]">
                      Vodafone Cash
                    </span>
                    <span className="font-bold text-[var(--text-main)] font-mono">
                      {data.financials.payment_methods.vodafone_cash.toLocaleString(
                        "ar-EG",
                      )}{" "}
                      ج.م
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
