import { useState } from "react";
import BookAppointmentModal from "../components/BookAppointmentModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { printInvoice } from "../utils/printInvoice";
import {
  DollarSign,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  Loader2,
  Package,
  X,
  Plus,
  RefreshCw,
  Printer,
  Users,
  MoreVertical,
} from "lucide-react";

export default function Dashboard() {
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // نظام التوست الموحد
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [printingInvoiceId, setPrintingInvoiceId] = useState(null);

  // طباعة الفاتورة بضغطة زر
  const handlePrintAppointmentInvoice = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      setPrintingInvoiceId(invoiceId);
      const res = await api.get(`/invoices/${invoiceId}`);
      const invoice = res.data?.invoice || res.data;
      if (invoice) {
        printInvoice(invoice);
      }
    } catch (err) {
      showToast(
        err.response?.data?.error || "فشل تحميل بيانات الفاتورة للطباعة",
        "error"
      );
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  // تاريخ اليوم المنسق بالعربي
  const todayFormatted = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // حالة مودال تحويل الموعد إلى فاتورة مع خيار الطباعة
  const [invoiceModal, setInvoiceModal] = useState({
    isOpen: false,
    appointment: null,
    itemDescription: "كشف عيادة / علاج",
    itemPrice: "",
    paidAmount: "",
    autoPrint: false, // 👈 اختياري وغير مفعل افتراضياً
  });

  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);

  // 1. جلب إحصائيات الداشبورد
  const {
    data: dashboardData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data;
    },
    refetchOnMount: "always",
  });

  // 2. Mutation تحديث حالة الموعد مع فتح الفاتورة تلقائياً عند الاكتمال
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, appointment }) => {
      const res = await api.patch(`/appointments/${id}/status`, { status });
      return { data: res.data, status, appointment };
    },
    onSuccess: ({ status, appointment }) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      showToast("تم تحديث حالة الميعاد بنجاح", "success");

      // فتح مودال الفاتورة تلقائياً لو الموعد اكتمل ولسه ملوش فاتورة
      if (
        status === "completed" &&
        appointment &&
        !appointment.appointment_invoice_id
      ) {
        setInvoiceModal({
          isOpen: true,
          appointment: { ...appointment, status: "completed" },
          itemDescription: "كشف عيادة / علاج",
          itemPrice: "",
          paidAmount: "",
        });
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل تحديث الحالة", "error");
    },
  });

  // 3. Mutation تحويل الموعد إلى فاتورة + طباعتها فوراً
  const convertToInvoiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/invoices", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });

      setInvoiceModal({
        isOpen: false,
        appointment: null,
        itemDescription: "كشف عيادة / علاج",
        itemPrice: "",
        paidAmount: "",
      });

      showToast("تم إصدار الفاتورة وتحديث الدخل بنجاح", "success");

      // فتح نافذة الطباعة فقط إذا كان خيار الطباعة مفعلاً
      if (invoiceModal.autoPrint) {
        try {
          const createdInvoiceId = data?.invoice?.id;
          if (createdInvoiceId) {
            const res = await api.get(`/invoices/${createdInvoiceId}`);
            const invoice = res.data?.invoice || res.data;
            if (invoice) {
              printInvoice(invoice);
            }
          }
        } catch (err) {
          console.error("Print error:", err);
        }
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل إصدار الفاتورة", "error");
    },
  });

  const stats = dashboardData?.stats || {
    today_income: 0,
    month_income: 0,
    total_dues: 0,
    today_appointments_count: 0,
    today_completed_count: 0,
    urgent_lab_orders_count: 0,
    active_patients_count: 0,
  };

  const todayAppointments = dashboardData?.today_appointments || [];
  const urgentLabOrders = dashboardData?.urgent_lab_orders || [];

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const statusConfig = {
    scheduled: {
      label: "مجدول",
      bg: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    },
    completed: {
      label: "مكتمل",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    cancelled: {
      label: "ملغي",
      bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    no_show: {
      label: "لم يحضر",
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-teal-400" />
        <span className="text-sm font-medium">
          جاري تحميل إحصائيات العيادة...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <p className="text-white font-medium text-lg">
          تعذر تحميل بيانات الداشبورد
        </p>
        <p className="text-xs text-slate-400">
          تأكد من تشغيل السيرفر وقاعدة البيانات
        </p>
        <button
          onClick={() => refetch()}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] hover:bg-slate-800 text-teal-400 border border-teal-500/20 rounded-xl text-xs font-medium transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* 🌟 هيدر الترحيب */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] border border-teal-500/20 p-5 rounded-4xl shadow-xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-xl shadow-md shadow-teal-500/10">
            <svg
              className="w-7 h-7"
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
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              لوحة التحكم — مرحباً، {user?.name || "دكتور"}
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 font-medium">
                {user?.role || "Doctor"}
              </span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              متابعة نبض العيادة المالي والتشغيلي اليومي
            </p>
          </div>
        </div>

        {/* عرض تاريخ اليوم */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium shadow-sm self-start sm:self-auto">
          <CalendarIcon className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{todayFormatted}</span>
        </div>
      </div>

      {/* 🌟 2. كروت المؤشرات السريعة (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* كارت 1: الدخل المالي المدمج */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] backdrop-blur-md border border-slate-800 hover:border-emerald-500/30 p-5 rounded-xl shadow-xl transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-slate-400 block mb-1">
                تحصيلات الشهر الحالي
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {stats.month_income.toLocaleString("en-US")}{" "}
                <span className="text-xs text-slate-400 font-sans">ج.م</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">المحصّل اليوم:</span>
            <span className="font-mono font-bold text-emerald-400">
              {stats.today_income.toLocaleString("en-US")} ج.م
            </span>
          </div>
        </div>

        {/* كارت 2: فلوس برة (المستحقات) */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] backdrop-blur-md border border-slate-800 hover:border-rose-500/30 p-5 rounded-xl shadow-xl transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-slate-400 block mb-1">
                فلوس برة (مستحقات)
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {stats.total_dues.toLocaleString("en-US")}{" "}
                <span className="text-xs text-slate-400 font-sans">ج.م</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-sm shadow-rose-500/10 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-800/80 block">
            إجمالي ديون المرضى النشطة
          </span>
        </div>

        {/* كارت 3: إجمالي المرضى النشطين */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] backdrop-blur-md border border-slate-800 hover:border-teal-500/30 p-5 rounded-xl shadow-xl transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-slate-400 block mb-1">
                المرضى النشطون
              </span>
              <div className="text-2xl font-bold font-mono text-white">
                {stats.active_patients_count.toLocaleString("en-US")}{" "}
                <span className="text-xs text-teal-400 font-sans">مريض</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-sm shadow-teal-500/10 shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <span className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-800/80 block">
            الملفات النشطة بالعيادة
          </span>
        </div>

        {/* كارت 4: مواعيد اليوم */}
        <div className="sm:col-span-1 lg:col-span-3 bg-[var(--bg-surface)] backdrop-blur-md border border-slate-800 hover:border-teal-500/30 p-5 rounded-xl shadow-xl transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">
              مواعيد اليوم
            </span>
            <div className="text-2xl font-bold font-mono text-white">
              {stats.today_appointments_count}{" "}
              <span className="text-xs text-teal-400 font-sans">
                ({stats.today_completed_count} مكتمل)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              جدول كشوفات اليوم الحية
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shadow-sm shadow-teal-500/10 shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>

        {/* كارت 5: طلبات معمل عاجلة */}
        <div className="sm:col-span-1 lg:col-span-3 bg-[var(--bg-surface)] backdrop-blur-md border border-slate-800 hover:border-purple-500/30 p-5 rounded-xl shadow-xl transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">
              معامل عاجلة ومستحقة
            </span>
            <div className="text-2xl font-bold font-mono text-purple-400">
              {stats.urgent_lab_orders_count}{" "}
              <span className="text-xs text-slate-400 font-sans">حالات</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              متأخرة أو تسليم اليوم/الغد
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-500/10 shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 🌟 3. جدول مواعيد اليوم الحية + كارت المعامل العاجلة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* جدول مواعيد اليوم */}
        <div className="lg:col-span-2 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[var(--bg-surface)]">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                مواعيد اليوم الحية ({todayAppointments.length})
              </h2>
            </div>
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="flex items-center gap-1.5 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-md shadow-teal-500/20 active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>حجز ميعاد سريع</span>
            </button>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              لا توجد مواعيد مسجلة لتاريخ اليوم. اضغط على "حجز ميعاد سريع"
              للبدء.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[var(--bg-elevated)] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">المريض والمستحقات</th>
                    <th className="py-3 px-4">الوقت</th>
                    <th className="py-3 px-4">الطبيب</th>
                    <th className="py-3 px-4">الحالة والفوترة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {todayAppointments.map((apt) => (
                    <tr
                      key={apt.appointment_id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* المريض وحساباته */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white">
                          {apt.patient_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-slate-400 font-mono" dir="ltr">
                            {apt.patient_phone}
                          </span>
                          <span className="text-slate-600">•</span>
                          {!apt.appointment_invoice_id ? (
                            <span className="text-[11px] text-amber-400 font-medium">
                              بانتظار الفاتورة
                            </span>
                          ) : parseFloat(apt.patient_total_due) > 0 ? (
                            <span className="text-[11px] font-bold text-rose-400 font-mono">
                              متبقي:{" "}
                              {parseFloat(apt.patient_total_due).toLocaleString(
                                "en-US"
                              )}{" "}
                              ج.م
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-medium">
                              خالص الحساب ✓
                            </span>
                          )}
                        </div>
                      </td>

                      {/* الوقت */}
                      <td className="py-3 px-4 font-mono font-medium text-teal-400">
                        {formatTime(apt.appointment_date)}
                      </td>

                      {/* الطبيب */}
                      <td className="py-3 px-4">د. {apt.doctor_name}</td>

                      {/* الحالة والفوترة */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium ${
                              statusConfig[apt.status]?.bg ||
                              "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {statusConfig[apt.status]?.label || apt.status}
                          </span>

                          {apt.appointment_invoice_id && (
                            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                              <span>✓</span>
                              <span>تمت الفوترة</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* الإجراءات */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            title="خيارات الموعد"
                            onClick={(e) => {
                              if (activeActionMenu === apt.appointment_id) {
                                setActiveActionMenu(null);
                                setActionMenuPosition(null);
                                return;
                              }
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const estimatedMenuHeight =
                                apt.status === "scheduled" ? 210 : 70;
                              const spaceBelow =
                                window.innerHeight - rect.bottom;
                              const shouldOpenUp =
                                spaceBelow < estimatedMenuHeight + 10;
                              setActionMenuPosition({
                                top: shouldOpenUp
                                  ? rect.top - estimatedMenuHeight - 6
                                  : rect.bottom + 6,
                                left: rect.left,
                              });
                              setActiveActionMenu(apt.appointment_id);
                            }}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {/* قائمة الإجراءات العائمة */}
                        {activeActionMenu === apt.appointment_id &&
                          createPortal(
                            <>
                              <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  setActionMenuPosition(null);
                                }}
                              />
                              <div
                                style={{
                                  position: "fixed",
                                  top: actionMenuPosition?.top ?? 0,
                                  left: actionMenuPosition?.left ?? 0,
                                }}
                                className="w-48 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] shadow-elevation p-1.5 z-[9999] space-y-1 text-right"
                              >
                                {apt.status === "scheduled" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenu(null);
                                        setActionMenuPosition(null);
                                        updateStatusMutation.mutate({
                                          id: apt.appointment_id,
                                          status: "completed",
                                          appointment: apt,
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--success-text)] hover:bg-[var(--success-bg)] rounded-[var(--radius-btn)] transition-colors"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>اكتمل الكشف</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenu(null);
                                        setActionMenuPosition(null);
                                        updateStatusMutation.mutate({
                                          id: apt.appointment_id,
                                          status: "no_show",
                                          appointment: apt,
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--warning-text)] hover:bg-[var(--warning-bg)] rounded-[var(--radius-btn)] transition-colors"
                                    >
                                      <AlertCircle className="w-4 h-4" />
                                      <span>لم يحضر</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenu(null);
                                        setActionMenuPosition(null);
                                        updateStatusMutation.mutate({
                                          id: apt.appointment_id,
                                          status: "cancelled",
                                          appointment: apt,
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-bg)] rounded-[var(--radius-btn)] transition-colors"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      <span>إلغاء الموعد</span>
                                    </button>

                                    <div className="my-1 border-t border-[var(--border-default)]" />
                                  </>
                                )}

                                {/* خيارات الفاتورة والطباعة */}
                                {apt.appointment_invoice_id ? (
                                  <button
                                    type="button"
                                    disabled={
                                      printingInvoiceId ===
                                      apt.appointment_invoice_id
                                    }
                                    onClick={() => {
                                      setActiveActionMenu(null);
                                      setActionMenuPosition(null);
                                      handlePrintAppointmentInvoice(
                                        apt.appointment_invoice_id
                                      );
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--primary-base)] hover:bg-[var(--primary-muted)] rounded-[var(--radius-btn)] transition-colors"
                                  >
                                    {printingInvoiceId ===
                                    apt.appointment_invoice_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Printer className="w-4 h-4" />
                                    )}
                                    <span>طباعة الفاتورة 🖨️</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenu(null);
                                      setActionMenuPosition(null);
                                      setInvoiceModal({
                                        isOpen: true,
                                        appointment: apt,
                                        itemDescription: "كشف عيادة / علاج",
                                        itemPrice: "",
                                        paidAmount: "",
                                      });
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--primary-base)] hover:bg-[var(--primary-muted)] rounded-[var(--radius-btn)] transition-colors"
                                  >
                                    <Receipt className="w-4 h-4" />
                                    <span>إصدار وطباعة فاتورة</span>
                                  </button>
                                )}
                              </div>
                            </>,
                            document.body
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* كارت تنبيهات المعمل العاجلة والمتأخرة */}
        <div className="border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[var(--bg-surface)]">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              متابعة المعامل العاجلة
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
              {urgentLabOrders.length}
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[420px]">
            {urgentLabOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                لا توجد طلبات معمل متأخرة أو مستحقة التسليم اليوم.
              </div>
            ) : (
              urgentLabOrders.map((lo) => (
                <div
                  key={lo.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    lo.urgency === "overdue"
                      ? "bg-rose-950/20 border-rose-800/60"
                      : lo.urgency === "today"
                      ? "bg-amber-950/20 border-amber-800/60"
                      : "bg-[var(--bg-elevated)] border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="font-semibold text-white text-xs block">
                        {lo.patient_name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        معمل:{" "}
                        <strong className="text-slate-200">
                          {lo.lab_name}
                        </strong>{" "}
                        • رقم الحالة: {lo.case_number || `#${lo.id}`}
                      </span>
                    </div>
                    {lo.urgency === "overdue" && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold shrink-0">
                        متأخرة ⚠️
                      </span>
                    )}
                    {lo.urgency === "today" && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-medium shrink-0">
                        تسليم اليوم
                      </span>
                    )}
                    {lo.urgency === "tomorrow" && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-medium shrink-0">
                        تسليم الغد
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <span>د. {lo.doctor_name}</span>
                    <span className="font-mono">
                      المتوقع:{" "}
                      {lo.expected_at
                        ? new Date(lo.expected_at).toLocaleDateString("en-GB")
                        : "-"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 🌟 5. نافذة إصدار فاتورة فورية + طباعة مباشرة */}
      {invoiceModal.isOpen && invoiceModal.appointment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-teal-500/30 max-w-md w-full rounded-xl p-6 shadow-2xl shadow-black/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-400" />
                إصدار وطباعة فاتورة سريعة
              </h3>
              <button
                onClick={() =>
                  setInvoiceModal({ ...invoiceModal, isOpen: false })
                }
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-slate-300">
                المريض:{" "}
                <span className="font-bold text-white">
                  {invoiceModal.appointment.patient_name}
                </span>
              </p>
              <p className="text-slate-300">
                الطبيب:{" "}
                <span className="font-bold text-teal-400">
                  د. {invoiceModal.appointment.doctor_name}
                </span>
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !invoiceModal.itemPrice ||
                  parseFloat(invoiceModal.itemPrice) <= 0
                ) {
                  showToast("يرجى إدخال مبلغ صحيح", "error");
                  return;
                }
                const payload = {
                  patient_id: invoiceModal.appointment.patient_id,
                  appointment_id: invoiceModal.appointment.appointment_id,
                  doctor_id: invoiceModal.appointment.doctor_id,
                  appointment_date: invoiceModal.appointment.appointment_date,
                  items: [
                    {
                      description: invoiceModal.itemDescription.trim(),
                      quantity: 1,
                      unit_price: parseFloat(invoiceModal.itemPrice),
                    },
                  ],
                  initial_payment:
                    invoiceModal.paidAmount &&
                    parseFloat(invoiceModal.paidAmount) > 0
                      ? {
                          amount: parseFloat(invoiceModal.paidAmount),
                          payment_method: "cash",
                          notes: "دفعة فورية من الداشبورد",
                        }
                      : null,
                };
                convertToInvoiceMutation.mutate(payload);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  الخدمة / البند *
                </label>
                <input
                  type="text"
                  required
                  value={invoiceModal.itemDescription}
                  onChange={(e) =>
                    setInvoiceModal({
                      ...invoiceModal,
                      itemDescription: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-elevated)] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    إجمالي الفاتورة (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="350"
                    value={invoiceModal.itemPrice}
                    onChange={(e) =>
                      setInvoiceModal({
                        ...invoiceModal,
                        itemPrice: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    المدفوع الآن نقداً (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={invoiceModal.paidAmount}
                    onChange={(e) =>
                      setInvoiceModal({
                        ...invoiceModal,
                        paidAmount: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/20"
                  />
                </div>
              </div>

              {/* خيار طباعة الفاتورة الاختياري */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none pt-1">
                <input
                  type="checkbox"
                  checked={invoiceModal.autoPrint}
                  onChange={(e) =>
                    setInvoiceModal({
                      ...invoiceModal,
                      autoPrint: e.target.checked,
                    })
                  }
                  className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-teal-400 focus:ring-0 cursor-pointer"
                />
                <span>طباعة الفاتورة فور الإصدار</span>
              </label>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setInvoiceModal({ ...invoiceModal, isOpen: false })
                  }
                  className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={convertToInvoiceMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white py-2 rounded-xl text-xs font-medium transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {convertToInvoiceMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : invoiceModal.autoPrint ? (
                    <>
                      <Printer className="w-3.5 h-3.5" />
                      <span>إصدار وطباعة</span>
                    </>
                  ) : (
                    <span>إصدار الفاتورة</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 6. التوست الموحد */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom-5 ${
            toast.type === "error"
              ? "bg-[#180a0f]/95 border-rose-800/80 text-rose-200"
              : "bg-[#071916]/95 border-teal-500/40 text-teal-200"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></div>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* استدعاء المودال الموحد لحجز المواعيد */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
      />
    </div>
  );
}
