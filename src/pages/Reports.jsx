import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  ArrowUpRight,
  Plus,
  Trash2,
  Settings,
  Wallet,
  Receipt,
  X,
  Check,
  Loader2,
  Search,
  Percent,
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
const formatMoney = (value) => {
  const amount = Number(value ?? 0);

  return (Number.isFinite(amount) ? amount : 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
};
const EXPENSE_CATEGORIES = [
  "مستلزمات وخامات طبية",
  "إيجار ومرافق وكهرباء",
  "مدفوعات معامل الأسنان",
  "رواتب وعمولات الأطباء",
  "رواتب الموظفين والإداريين",
  "صيانة وأجهزة طبية",
  "تسويق وإعلانات",
  "مصاريف نثرية وأخرى",
];

const PAYMENT_METHOD_LABELS = {
  cash: "نقداً (كاش 💵)",
  instapay: "إنستا باي (InstaPay ⚡)",
  vodafone_cash: "فودافون كاش 📱",
  card: "بطاقة بنكية (POS 💳)",
  bank_transfer: "تحويل بنكي 🏦",
  cheque: "شيك 📄",
  other: "أخرى",
};

const COMMISSION_TYPE_LABELS = {
  collected: "على المبالغ المحصلة فعلياً",
  invoiced: "على إجمالي الفواتير الصادرة",
  after_lab_cost: "على المحصل بعد خصم تكلفة المعمل",
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState("overview"); // overview | expenses | commissions
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // حساب أول وآخر يوم للشهر الحالي افتراضياً بتوقيت القاهرة
  const todayStr = formatCairoDate();
  const [currentYear, currentMonth] = todayStr.split("-").map(Number);
  const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;

  const [dateRange, setDateRange] = useState({
    startDate: firstDayOfMonth,
    endDate: todayStr,
  });
  const [activePreset, setActivePreset] = useState("thisMonth");

  // حالة سجل المصروفات
  const [expensesList, setExpensesList] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesPagination, setExpensesPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "مستلزمات وخامات طبية",
    title: "",
    amount: "",
    payment_method: "cash",
    expense_date: todayStr,
    vendor_name: "",
    notes: "",
  });

  // حالة إعداد وصرف عمولات الأطباء
  const [payoutsHistory, setPayoutsHistory] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [compModalDoctor, setCompModalDoctor] = useState(null);
  const [compForm, setCompForm] = useState({
    base_salary: 0,
    commission_type: "collected",
    commission_rate: 0,
    notes: "",
  });
  const [savingComp, setSavingComp] = useState(false);

  const [payoutModalDoctor, setPayoutModalDoctor] = useState(null);
  const [payoutForm, setPayoutForm] = useState({
    commission_amount: 0,
    base_salary_amount: 0,
    payment_method: "cash",
    notes: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);

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

  const fetchExpenses = async (
    start = dateRange.startDate,
    end = dateRange.endDate,
    cat = expenseCategoryFilter,
    q = expenseSearch,
    page = expensesPage,
  ) => {
    try {
      setExpensesLoading(true);
      const res = await api.get("/reports/expenses", {
        params: {
          from: start,
          to: end,
          category: cat || undefined,
          search: q.trim() || undefined,
          page,
          limit: 50,
        },
      });
      const list = res.data.expenses || [];

      const pagination = res.data.pagination || {
        total: list.length,
        page,
        limit: 50,
        totalPages: list.length > 0 ? 1 : 0,
      };

      // لو آخر صفحة بقت خارج النطاق بعد حذف مصروف، ارجع لآخر صفحة موجودة.
      const totalPages = Number(pagination.totalPages || 0);

      if (totalPages > 0 && page > totalPages) {
        setExpensesPage(totalPages);
        await fetchExpenses(start, end, cat, q, totalPages);
        return;
      }

      setExpensesList(list);
      setExpensesPage(totalPages > 0 ? Number(pagination.page || page) : 1);

      setExpensesPagination({
        total: Number(pagination.total || 0),
        page: Number(pagination.page || page),
        limit: Number(pagination.limit || 50),
        totalPages,
      });
    } catch (err) {
      showToast(err.response?.data?.error || "تعذر جلب سجل المصروفات", "error");
    } finally {
      setExpensesLoading(false);
    }
  };

  const fetchPayouts = async () => {
    try {
      setPayoutsLoading(true);
      const res = await api.get("/reports/commissions/payouts");
      setPayoutsHistory(res.data.payouts || []);
    } catch (err) {
      console.error("Failed to fetch payouts:", err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(dateRange.startDate, dateRange.endDate);
  }, []);

  useEffect(() => {
    if (activeTab === "expenses") {
      fetchExpenses(
        dateRange.startDate,
        dateRange.endDate,
        expenseCategoryFilter,
        expenseSearch,
      );
    } else if (activeTab === "commissions") {
      fetchPayouts();
    }
  }, [activeTab, expenseCategoryFilter]);

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
    setExpensesPage(1);
    fetchReports(sDate, eDate);
    if (activeTab === "expenses") {
      fetchExpenses(sDate, eDate, expenseCategoryFilter, expenseSearch, 1);
    }
  };

  const handleCustomFilter = (e) => {
    e.preventDefault();
    setActivePreset(null);
    setExpensesPage(1);
    fetchReports(dateRange.startDate, dateRange.endDate);
    if (activeTab === "expenses") {
      fetchExpenses(
        dateRange.startDate,
        dateRange.endDate,
        expenseCategoryFilter,
        expenseSearch,
        1,
      );
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      setSubmittingExpense(true);
      await api.post("/reports/expenses", {
        ...expenseForm,
        amount: Number(expenseForm.amount),
      });
      setIsAddExpenseOpen(false);
      setExpenseForm({
        category: "مستلزمات وخامات طبية",
        title: "",
        amount: "",
        payment_method: "cash",
        expense_date: todayStr,
        vendor_name: "",
        notes: "",
      });
      showToast("تم تسجيل المصروف بنجاح", "success");
      fetchReports(dateRange.startDate, dateRange.endDate);
      fetchExpenses(
        dateRange.startDate,
        dateRange.endDate,
        expenseCategoryFilter,
        expenseSearch,
      );
    } catch (err) {
      showToast(err.response?.data?.error || "فشل تسجيل المصروف", "error");
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;
    try {
      await api.delete(`/reports/expenses/${id}`);
      showToast("تم حذف المصروف بنجاح", "success");
      fetchReports(dateRange.startDate, dateRange.endDate);
      fetchExpenses(
        dateRange.startDate,
        dateRange.endDate,
        expenseCategoryFilter,
        expenseSearch,
      );
    } catch (err) {
      showToast(err.response?.data?.error || "فشل حذف المصروف", "error");
    }
  };

  const handleOpenCompModal = (doc) => {
    setCompModalDoctor(doc);
    setCompForm({
      base_salary: doc.base_salary || 0,
      commission_type: doc.commission_type || "collected",
      commission_rate: doc.commission_rate || 0,
      notes: "",
    });
  };

  const handleSaveCompensation = async (e) => {
    e.preventDefault();
    if (!compModalDoctor) return;
    try {
      setSavingComp(true);
      const res = await api.put(
        `/reports/doctors/${compModalDoctor.doctor_id}/compensation`,
        {
          base_salary: Number(compForm.base_salary || 0),
          commission_type: compForm.commission_type,
          commission_rate: Number(compForm.commission_rate || 0),
          notes: compForm.notes,
        },
      );
      showToast(res.data.message || "تم حفظ إعدادات الطبيب", "success");
      setCompModalDoctor(null);
      fetchReports(dateRange.startDate, dateRange.endDate);
    } catch (err) {
      showToast(err.response?.data?.error || "فشل حفظ الإعدادات", "error");
    } finally {
      setSavingComp(false);
    }
  };

  const handleOpenPayoutModal = (doc) => {
    setPayoutModalDoctor(doc);
    setPayoutForm({
      commission_amount: Number(doc.calculated_commission || 0),
      base_salary_amount: Number(doc.base_salary || 0),
      payment_method: "cash",
      notes: "",
    });
  };

  // حساب إجمالي الصرف تلقائياً بالقروش ليطابق شرط الباك إند (total_payout === commission_amount + base_salary_amount)
  const calculatedTotalPayout =
    (Math.round(Number(payoutForm.commission_amount || 0) * 100) +
      Math.round(Number(payoutForm.base_salary_amount || 0) * 100)) /
    100;

  const handleRecordPayout = async (e) => {
    e.preventDefault();
    if (!payoutModalDoctor) return;
    if (calculatedTotalPayout < 0.01) {
      showToast("إجمالي المبلغ المصروف يجب أن يكون أكبر من الصفر", "error");
      return;
    }
    try {
      setSavingPayout(true);
      const res = await api.post("/reports/commissions/payouts", {
        doctor_id: payoutModalDoctor.doctor_id,
        period_start: dateRange.startDate,
        period_end: dateRange.endDate,
        gross_basis_amount: Number(payoutModalDoctor.gross_basis_amount || 0),
        lab_deduction_amount: Number(payoutModalDoctor.total_lab_cost || 0),
        commission_rate: Number(payoutModalDoctor.commission_rate || 0),
        commission_amount:
          Math.round(Number(payoutForm.commission_amount || 0) * 100) / 100,
        base_salary_amount:
          Math.round(Number(payoutForm.base_salary_amount || 0) * 100) / 100,
        total_payout: calculatedTotalPayout,
        payment_method: payoutForm.payment_method,
        notes: payoutForm.notes,
      });
      showToast(res.data.message || "تم تسجيل صرف المستحقات بنجاح", "success");
      setPayoutModalDoctor(null);
      fetchReports(dateRange.startDate, dateRange.endDate);
      fetchPayouts();
    } catch (err) {
      showToast(
        err.response?.data?.error || "فشل تسجيل صرف المستحقات",
        "error",
      );
    } finally {
      setSavingPayout(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {toast && (
        <div
          className={`fixed top-6 left-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-bold ${
            toast.type === "error"
              ? "bg-rose-950/95 border-rose-500/40 text-rose-200"
              : "bg-teal-950/95 border-teal-500/40 text-teal-200"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-teal-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 الهيدر وفلاتر التواريخ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[var(--primary-base)]" />
            التقارير المالية، المصروفات، ونسب الأطباء
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            تحليل الإيرادات المحصلة، المصروفات التشغيلية، صافي الربح، وعمولات
            الأطباء.
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
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-1.5 text-xs text-[var(--text-main)] font-mono"
            />
            <span className="text-xs text-[var(--text-muted)]">إلى</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-1.5 text-xs text-[var(--text-main)] font-mono"
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

      {/* التبويبات الـ 3 */}
      <div className="flex border-b border-[var(--border-default)] gap-6 overflow-x-auto whitespace-nowrap">
        {[
          {
            id: "overview",
            label: "الملخص المالي وصافي الربح",
            icon: BarChart3,
          },
          {
            id: "expenses",
            label: "سجل مصروفات العيادة",
            icon: Receipt,
          },
          {
            id: "commissions",
            label: "إنتاجية ونسب ورواتب الأطباء",
            icon: Users,
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                activeTab === t.id
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {loading && activeTab !== "expenses" ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
          <span>جاري تجميع وحساب البيانات المالية...</span>
        </div>
      ) : (fetchError || !data) && activeTab !== "expenses" ? (
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
          {/* ====================================================
              تبويب 1: الملخص المالي وصافي الربح
             ==================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* 6 كروت إحصائية رئيسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. المحصل الفعلي */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                    <span>إجمالي التحصيل الفعلي (الإيرادات)</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <Banknote className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
                    {Number(
                      data.financials.total_collected || 0,
                    ).toLocaleString("ar-EG")}{" "}
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      ج.م
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5 flex items-center justify-between">
                    <span>
                      من {data.financials.payments_count || 0} عملية دفع
                    </span>
                    {Number(data.financials.total_discount || 0) > 0 && (
                      <span className="text-teal-400">
                        خصومات ممنوحة:{" "}
                        {Number(data.financials.total_discount).toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ج.م
                      </span>
                    )}
                  </p>
                </div>

                {/* 2. إجمالي المصروفات */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                    <span>إجمالي المصروفات التشغيلية</span>
                    <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-rose-400 font-mono">
                    {Number(data.financials.total_expenses || 0).toLocaleString(
                      "ar-EG",
                    )}{" "}
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      ج.م
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5 flex items-center justify-between">
                    <span>
                      منها معامل أسنان:{" "}
                      {Number(data.financials.lab_expenses || 0).toLocaleString(
                        "ar-EG",
                      )}{" "}
                      ج.م
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("expenses")}
                      className="text-teal-400 hover:underline font-bold"
                    >
                      إدارة المصروفات ←
                    </button>
                  </p>
                </div>

                {/* 3. صافي الربح الفعلي */}
                <div className="bg-[var(--bg-surface)] border border-teal-500/30 rounded-[var(--radius-card)] p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                    <span>صافي الربح النقدي (التحصيل - المصروفات)</span>
                    <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div
                    className={`text-xl sm:text-2xl font-bold font-mono ${
                      Number(data.financials.net_profit || 0) >= 0
                        ? "text-teal-300"
                        : "text-rose-400"
                    }`}
                  >
                    {Number(data.financials.net_profit || 0).toLocaleString(
                      "ar-EG",
                    )}{" "}
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      ج.م
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-400/90 mt-1.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    الفائض النقدي الحقيقي للعيادة في الفترة
                  </p>
                </div>

                {/* 4. الديون المعلقة والأقساط المتأخرة */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                    <span>ديون المرضى والأقساط المتأخرة</span>
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-300 font-mono">
                    {Number(
                      data.financials.current_total_dues || 0,
                    ).toLocaleString("ar-EG")}{" "}
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      ج.م
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1.5 flex flex-wrap items-center justify-between gap-1">
                    {Number(data.financials.overdue_installments_count || 0) >
                    0 ? (
                      <span className="text-rose-400 font-bold">
                        ⚠️ {data.financials.overdue_installments_count} قسط
                        متأخر (
                        {Number(
                          data.financials.overdue_installments_amount || 0,
                        ).toLocaleString("ar-EG")}{" "}
                        ج.م)
                      </span>
                    ) : (
                      <span>لا توجد أقساط متأخرة</span>
                    )}
                    {Number(data.financials.unpaid_lab_dues || 0) > 0 && (
                      <span className="text-amber-300">
                        مستحق للمعامل:{" "}
                        {Number(data.financials.unpaid_lab_dues).toLocaleString(
                          "ar-EG",
                        )}{" "}
                        ج.م
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. المواعيد المكتملة */}
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
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    {data.appointments.cancelled} موعد ملغي في نفس الفترة
                  </p>
                </div>

                {/* 6. نسبة الـ No-Show */}
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
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    {data.appointments.no_show} مريض لم يحضروا موعدهم
                  </p>
                </div>
              </div>

              {/* توزيع طرق التحصيل وتفصيل المصروفات */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* تفصيل طرق التحصيل */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 space-y-4">
                  <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[var(--primary-base)]" />
                    توزيع طرق التحصيل في الفترة
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      {
                        label: "نقداً (كاش الدرج 💵)",
                        val: data.financials.payment_methods?.cash || 0,
                      },
                      {
                        label: "إنستا باي (InstaPay ⚡)",
                        val: data.financials.payment_methods?.instapay || 0,
                      },
                      {
                        label: "فودافون كاش 📱",
                        val:
                          data.financials.payment_methods?.vodafone_cash || 0,
                      },
                      {
                        label: "بطاقة بنكية (POS 💳)",
                        val: data.financials.payment_methods?.card || 0,
                      },
                      {
                        label: "تحويل بنكي 🏦",
                        val: data.financials.payment_methods?.transfer || 0,
                      },
                      {
                        label: "شيكات 📄",
                        val: data.financials.payment_methods?.cheque || 0,
                      },
                      {
                        label: "دفع إلكتروني (Paymob 🌐)",
                        val: data.financials.payment_methods?.online || 0,
                      },
                      {
                        label: "طرق أخرى",
                        val: data.financials.payment_methods?.other || 0,
                      },
                    ].map((pm) => (
                      <div
                        key={pm.label}
                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]"
                      >
                        <span className="font-medium text-[var(--text-secondary)]">
                          {pm.label}
                        </span>
                        <span className="font-bold text-[var(--text-main)] font-mono">
                          {Number(pm.val).toLocaleString("ar-EG")} ج.م
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* توزيع المصروفات حسب البند */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)] flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-rose-400" />
                      توزيع المصروفات حسب البند
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("expenses");
                        setIsAddExpenseOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--primary-base)] text-white text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تسجيل مصروف</span>
                    </button>
                  </div>

                  {!data.financials.expenses_by_category ||
                  data.financials.expenses_by_category.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                      لا توجد مصروفات مسجلة في هذه الفترة.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {data.financials.expenses_by_category.map((cat) => {
                        const pct =
                          data.financials.total_expenses > 0
                            ? Math.round(
                                (cat.total_amount /
                                  data.financials.total_expenses) *
                                  100,
                              )
                            : 0;
                        return (
                          <div key={cat.category} className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-main)] font-medium">
                                {cat.category}{" "}
                                <span className="text-[var(--text-muted)]">
                                  ({cat.count})
                                </span>
                              </span>
                              <span className="font-mono font-bold text-rose-400">
                                {Number(cat.total_amount).toLocaleString(
                                  "ar-EG",
                                )}{" "}
                                ج.م ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              تبويب 2: سجل مصروفات العيادة
             ==================================================== */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="relative w-64">
                      <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-2.5" />

                      <input
                        type="text"
                        placeholder="بحث في المصروفات أو الموردين..."
                        value={expenseSearch}
                        onChange={(e) => setExpenseSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setExpensesPage(1);
                            fetchExpenses(
                              dateRange.startDate,
                              dateRange.endDate,
                              expenseCategoryFilter,
                              expenseSearch,
                              1,
                            );
                          }
                        }}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg pr-9 pl-9 py-2 text-xs text-[var(--text-main)]"
                      />

                      {expenseSearch.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setExpenseSearch("");
                            setExpensesPage(1);
                            fetchExpenses(
                              dateRange.startDate,
                              dateRange.endDate,
                              expenseCategoryFilter,
                              "",
                              1,
                            );
                          }}
                          className="absolute left-2 top-2 text-[var(--text-muted)] hover:text-white"
                          title="مسح البحث"
                          aria-label="مسح البحث"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setExpensesPage(1);
                        fetchExpenses(
                          dateRange.startDate,
                          dateRange.endDate,
                          expenseCategoryFilter,
                          expenseSearch,
                          1,
                        );
                      }}
                      disabled={expensesLoading}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--primary-base)] text-white text-xs font-bold disabled:opacity-50"
                    >
                      <Search className="w-3.5 h-3.5" />
                      بحث
                    </button>
                  </div>

                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => {
                      setExpenseCategoryFilter(e.target.value);
                      setExpensesPage(1);
                    }}
                    className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)]"
                  >
                    <option value="">كل تصنيفات المصروفات</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary-base)] hover:opacity-90 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ تسجيل مصروف جديد</span>
                </button>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden">
                {expensesLoading ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-base)]" />
                    <span>جاري تحميل المصروفات...</span>
                  </div>
                ) : expensesList.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[var(--text-muted)]">
                    لا توجد مصروفات مسجلة في هذه الفترة.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[var(--text-muted)]">
                        <tr>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3">التصنيف</th>
                          <th className="p-3">البيان / العنوان</th>
                          <th className="p-3">المورد / الجهة</th>
                          <th className="p-3">طريقة الدفع</th>
                          <th className="p-3">المبلغ</th>
                          <th className="p-3 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-main)]">
                        {expensesList.map((exp) => (
                          <tr
                            key={exp.id}
                            className="hover:bg-[var(--bg-elevated)]/40"
                          >
                            <td className="p-3 font-mono" dir="ltr">
                              {exp.expense_date}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[11px]">
                                {exp.category}
                              </span>
                            </td>
                            <td className="p-3 font-semibold">
                              {exp.title}
                              {exp.notes && (
                                <span className="block text-[11px] text-[var(--text-muted)] font-normal">
                                  {exp.notes}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[var(--text-secondary)]">
                              {exp.vendor_name || "—"}
                            </td>
                            <td className="p-3 text-[var(--text-secondary)]">
                              {PAYMENT_METHOD_LABELS[exp.payment_method] ||
                                exp.payment_method}
                            </td>
                            <td className="p-3 font-mono font-bold text-rose-400">
                              {Number(exp.amount).toLocaleString("ar-EG")} ج.م
                            </td>
                            <td className="p-3 text-center">
                              {exp.lab_order_id ? (
                                <span className="text-[10px] text-teal-400">
                                  مرتبط بمعمل
                                </span>
                              ) : exp.is_payout ? (
                                <span className="text-[10px] text-amber-400">
                                  تسوية طبيب
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded"
                                  title="حذف المصروف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {expensesPagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-[var(--border-default)]">
                    <span className="text-xs text-[var(--text-muted)]">
                      إجمالي المصروفات:{" "}
                      {expensesPagination.total.toLocaleString("ar-EG")}
                      {" — "}
                      الصفحة {expensesPage} من {expensesPagination.totalPages}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={expensesLoading || expensesPage <= 1}
                        onClick={() => {
                          const previousPage = expensesPage - 1;
                          setExpensesPage(previousPage);

                          fetchExpenses(
                            dateRange.startDate,
                            dateRange.endDate,
                            expenseCategoryFilter,
                            expenseSearch,
                            previousPage,
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-elevated)]"
                      >
                        السابق
                      </button>

                      <button
                        type="button"
                        disabled={
                          expensesLoading ||
                          expensesPage >= expensesPagination.totalPages
                        }
                        onClick={() => {
                          const nextPage = expensesPage + 1;
                          setExpensesPage(nextPage);

                          fetchExpenses(
                            dateRange.startDate,
                            dateRange.endDate,
                            expenseCategoryFilter,
                            expenseSearch,
                            nextPage,
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-elevated)]"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================
              تبويب 3: إنتاجية ونسب ورواتب الأطباء
             ==================================================== */}
          {activeTab === "commissions" && (
            <div className="space-y-6">
              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)] flex items-center gap-2">
                      <Users className="w-5 h-5 text-[var(--primary-base)]" />
                      حساب إنتاجية ونسب ورواتب الأطباء في الفترة المحددة
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      يمكنك تخصيص نسبة العمولة والراتب الأساسي لكل طبيب وصرف
                      مستحقاته ليتم قيدها تلقائياً في المصروفات.
                    </p>
                  </div>
                </div>

                {data.doctors_production.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-8">
                    لا يوجد أطباء مسجلين
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[var(--text-muted)]">
                        <tr>
                          <th className="p-3">الطبيب</th>
                          <th className="p-3">المواعيد</th>
                          <th className="p-3">الفواتير الصادرة</th>
                          <th className="p-3">المحصل الفعلي</th>
                          <th className="p-3">تكلفة المعامل</th>
                          <th className="p-3">نظام النسبة والراتب</th>
                          <th className="p-3">العمولة + الراتب</th>
                          <th className="p-3">المصروف بالفترة</th>
                          <th className="p-3 text-center">إجراءات</th>
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
                              <span className="text-emerald-400 font-bold">
                                {doc.completed_appointments} منفذ
                              </span>
                              {doc.no_show_appointments > 0 && (
                                <span className="block text-[10px] text-rose-400">
                                  {doc.no_show_appointments} لم يحضر
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">
                              {Number(
                                doc.total_revenue_generated || 0,
                              ).toLocaleString("ar-EG")}{" "}
                              ج.م
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              {Number(
                                doc.total_collected_generated || 0,
                              ).toLocaleString("ar-EG")}{" "}
                              ج.م
                            </td>
                            <td className="p-3 font-mono text-rose-300">
                              {Number(doc.total_lab_cost || 0).toLocaleString(
                                "ar-EG",
                              )}{" "}
                              ج.م
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-teal-300">
                                {doc.commission_rate || 0}%
                              </span>{" "}
                              <span className="text-[11px] text-[var(--text-muted)]">
                                (
                                {COMMISSION_TYPE_LABELS[doc.commission_type] ||
                                  doc.commission_type}
                                )
                              </span>
                              {Number(doc.base_salary || 0) > 0 && (
                                <span className="block text-[11px] text-amber-300 font-mono">
                                  + راتب أساسي: {formatMoney(doc.base_salary)}{" "}
                                  ج.م
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">
                              <div className="font-bold text-white">
                                {Number(
                                  doc.total_entitlement || 0,
                                ).toLocaleString("ar-EG")}{" "}
                                ج.م
                              </div>
                              <span className="text-[10px] text-teal-400">
                                عمولة: {formatMoney(doc.calculated_commission)}{" "}
                                ج.م
                              </span>
                            </td>
                            <td className="p-3 font-mono text-amber-300 font-bold">
                              {Number(
                                doc.payouts_in_period || 0,
                              ).toLocaleString("ar-EG")}{" "}
                              ج.م
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCompModal(doc)}
                                  className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-default)] text-[11px] flex items-center gap-1"
                                  title="ضبط النسبة والراتب"
                                >
                                  <Settings className="w-3 h-3" />
                                  <span>النسبة</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayoutModal(doc)}
                                  className="px-2.5 py-1 rounded bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 font-bold text-[11px] flex items-center gap-1"
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>صرف مستحقات</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* سجل عمليات صرف مستحقات الأطباء السابقة */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 space-y-4">
                <h3 className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-400" />
                  سجل صرف مستحقات ورواتب الأطباء
                </h3>

                {payoutsLoading ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    جاري تحميل سجل الصرف...
                  </div>
                ) : payoutsHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    لم يتم تسجيل عمليات صرف عمولات أو رواتب بعد.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[var(--text-muted)]">
                        <tr>
                          <th className="p-2.5">تاريخ الصرف</th>
                          <th className="p-2.5">الطبيب</th>
                          <th className="p-2.5">عن الفترة</th>
                          <th className="p-2.5">العمولة</th>
                          <th className="p-2.5">الراتب الأساسي</th>
                          <th className="p-2.5">إجمالي المنصرف</th>
                          <th className="p-2.5">طريقة الدفع</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-main)]">
                        {payoutsHistory.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2.5 font-mono" dir="ltr">
                              {new Date(p.paid_at).toLocaleDateString("en-GB", {
                                timeZone: "Africa/Cairo",
                              })}
                            </td>
                            <td className="p-2.5 font-bold">
                              د. {p.doctor_name}
                            </td>
                            <td
                              className="p-2.5 font-mono text-[11px]"
                              dir="ltr"
                            >
                              {p.period_start} → {p.period_end}
                            </td>
                            <td className="p-2.5 font-mono text-teal-300">
                              {formatMoney(p.commission_amount)} ج.م
                            </td>
                            <td className="p-2.5 font-mono">
                              {formatMoney(p.base_salary_amount)} ج.م
                            </td>
                            <td className="p-2.5 font-mono font-bold text-emerald-400">
                              {formatMoney(p.total_payout)} ج.م
                            </td>
                            <td className="p-2.5 text-[var(--text-secondary)]">
                              {PAYMENT_METHOD_LABELS[p.payment_method] ||
                                p.payment_method}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 🌟 نافذة إضافة مصروف تشغيلي جديد */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <span>تسجيل مصروف تشغيلي جديد</span>
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-[var(--text-muted)] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  تصنيف المصروف *
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  بيان / عنوان المصروف *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شراء بنج وكومبوزيت / فاتورة كهرباء..."
                  value={expenseForm.title}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, title: e.target.value })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    المبلغ (ج.م) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    تاريخ المصروف *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expense_date}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        expense_date: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    طريقة الدفع
                  </label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        payment_method: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    اسم المورد / الجهة (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="شركة مستلزمات..."
                    value={expenseForm.vendor_name}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        vendor_name: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  ملاحظات المصروف (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="تفاصيل إضافية عن المصروف أو الفاتورة..."
                  value={expenseForm.notes}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white resize-y"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="flex-1 py-2 border border-[var(--border-default)] rounded-lg text-xs text-[var(--text-secondary)]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="flex-1 py-2 bg-[var(--primary-base)] text-white font-bold rounded-lg text-xs disabled:opacity-50"
                >
                  {submittingExpense ? "جاري الحفظ..." : "حفظ المصروف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 نافذة ضبط راتب ونسبة الطبيب */}
      {compModalDoctor && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Percent className="w-5 h-5 text-teal-400" />
                <span>إعدادات نسبة وراتب: {compModalDoctor.doctor_name}</span>
              </h3>
              <button
                onClick={() => setCompModalDoctor(null)}
                className="text-[var(--text-muted)] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompensation} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  طريقة احتساب العمولة *
                </label>
                <select
                  value={compForm.commission_type}
                  onChange={(e) =>
                    setCompForm({
                      ...compForm,
                      commission_type: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white"
                >
                  {Object.entries(COMMISSION_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    نسبة العمولة (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={compForm.commission_rate}
                    onChange={(e) =>
                      setCompForm({
                        ...compForm,
                        commission_rate: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    الراتب الأساسي الثابت (ج.م)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={compForm.base_salary}
                    onChange={(e) =>
                      setCompForm({
                        ...compForm,
                        base_salary: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  ملاحظات الاتفاق (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: نسبة خاصة لفترة محددة أو شروط الاتفاق..."
                  value={compForm.notes}
                  onChange={(e) =>
                    setCompForm({
                      ...compForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white resize-y"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompModalDoctor(null)}
                  className="flex-1 py-2 border border-[var(--border-default)] rounded-lg text-xs text-[var(--text-secondary)]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingComp}
                  className="flex-1 py-2 bg-teal-500 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-50"
                >
                  {savingComp ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 نافذة صرف مستحقات ونسبة الطبيب */}
      {payoutModalDoctor && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-teal-400" />
                <span>صرف مستحقات: {payoutModalDoctor.doctor_name}</span>
              </h3>
              <button
                onClick={() => setPayoutModalDoctor(null)}
                className="text-[var(--text-muted)] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-app)] border border-[var(--border-default)] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">الفترة:</span>
                <span className="font-mono text-white" dir="ltr">
                  {dateRange.startDate} → {dateRange.endDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">
                  الوعاء الخاضع للنسبة ({payoutModalDoctor.commission_rate}%):
                </span>
                <span className="font-mono text-teal-300 font-bold">
                  {formatMoney(payoutModalDoctor.gross_basis_amount)} ج.م
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPayout} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    قيمة العمولة المنصرفة (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payoutForm.commission_amount}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        commission_amount: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    الراتب الأساسي المنصرف (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payoutForm.base_salary_amount}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        base_salary_amount: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-xs">
                <span className="text-teal-300 font-bold">
                  إجمالي المبلغ المنصرف (العمولة + الراتب):
                </span>
                <span className="font-mono text-base font-black text-white">
                  {formatMoney(calculatedTotalPayout)}
                </span>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  طريقة الصرف
                </label>
                <select
                  value={payoutForm.payment_method}
                  onChange={(e) =>
                    setPayoutForm({
                      ...payoutForm,
                      payment_method: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white"
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">
                  ملاحظات التسوية (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: تسوية عمولة شهر أكتوبر..."
                  value={payoutForm.notes}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, notes: e.target.value })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalDoctor(null)}
                  className="flex-1 py-2 border border-[var(--border-default)] rounded-lg text-xs text-[var(--text-secondary)]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingPayout || calculatedTotalPayout < 0.01}
                  className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs disabled:opacity-50"
                >
                  {savingPayout
                    ? "جاري الصرف والقيد..."
                    : "تأكيد الصرف وقيد المصروف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
