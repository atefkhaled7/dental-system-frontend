import { useEffect, useRef, useState } from "react";
import BookAppointmentModal from "../components/BookAppointmentModal";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { printInvoice } from "../utils/printInvoice";
import api from "../api/axios";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  X,
  Search,
  UserPlus,
  Check,
  Loader2,
  Filter,
  Receipt,
  Printer,
  RefreshCw,
  Trash2,
  MessageCircle,
} from "lucide-react";

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const getTodayString = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().split("T")[0];
};

const getTomorrowString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

export default function Appointments() {
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [durationSettingsOpen, setDurationSettingsOpen] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState(30);

  // فلاتر المواعيد
  const [dateFilterMode, setDateFilterMode] = useState("all");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");

  // حالة لودينج زر الطباعة المباشرة
  const [printingInvoiceId, setPrintingInvoiceId] = useState(null);

  // نظام التوست الموحد
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // حالة مودال إعادة الجدولة
  const [rescheduleData, setRescheduleData] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
    currentDate: "",
    newDate: "",
  });

  // حالة مودال تحويل الموعد لفاتورة سريعة
  const [invoiceModal, setInvoiceModal] = useState({
    isOpen: false,
    appointment: null,
    itemDescription: "كشف عيادة / استشارة",
    itemPrice: "",
    paidAmount: "",
  });

  // حالة مودال تأكيد الحذف
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
  });

  // حالة منيو الواتساب العائمة
  const [activeWhatsAppMenu, setActiveWhatsAppMenu] = useState(null);
  const [whatsAppMenuPosition, setWhatsAppMenuPosition] = useState(null);
  const whatsAppMenuRef = useRef(null);

  // دالة طباعة فاتورة موجودة بالفعل بضغطة زر
  const handlePrintExistingInvoice = async (invoiceId) => {
    try {
      setPrintingInvoiceId(invoiceId);
      const res = await api.get(`/invoices/${invoiceId}`);
      if (res.data) {
        printInvoice(res.data);
      }
    } catch (err) {
      showToast("تعذر جلب بيانات الفاتورة للطباعة", "error");
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  // دالة إرسال رسائل الواتساب
  const handleSendWhatsApp = async (appointmentId, type) => {
    setActiveWhatsAppMenu(null);
    const newTab = window.open("about:blank", "_blank");
    if (!newTab) {
      showToast(
        "يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مرة أخرى.",
        "error"
      );
      return;
    }
    newTab.opener = null;
    try {
      const res = await api.get(
        `/whatsapp/appointment-link?appointment_id=${appointmentId}&type=${type}`
      );
      if (res.data?.url) {
        newTab.location.href = res.data.url;
        showToast("تم فتح واتساب برسالة المريض بنجاح.", "success");
      } else {
        newTab.close();
        showToast("لم يتم العثور على رابط واتساب صالح.", "error");
      }
    } catch (err) {
      newTab.close();
      showToast(
        err.response?.data?.error || "فشل إنشاء رابط الواتساب.",
        "error"
      );
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        whatsAppMenuRef.current &&
        !whatsAppMenuRef.current.contains(e.target)
      ) {
        setActiveWhatsAppMenu(null);
        setWhatsAppMenuPosition(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // جلب المواعيد
  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["appointments", filterDate, filterDoctor],
    queryFn: async () => {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterDoctor) params.doctor_id = filterDoctor;
      const res = await api.get("/appointments", { params });
      return res.data.appointments || [];
    },
  });

  const filteredAppointments = filterStatus
    ? appointments.filter(
        (apt) => (apt.status || "").toLowerCase().trim() === filterStatus
      )
    : appointments;

  const { data: durationSettings } = useQuery({
    queryKey: ["clinic-duration-settings"],
    queryFn: async () => {
      const res = await api.get("/appointments/settings/duration");
      return res.data;
    },
    enabled: ["ClinicAdmin", "Receptionist", "Doctor"].includes(user?.role),
  });

  // جلب الأطباء
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await api.get("/auth/doctors");
      return res.data.doctors || [];
    },
  });

  // تحديث حالة الميعاد + فتح الفاتورة تلقائياً عند الاكتمال
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, appointment }) => {
      const res = await api.patch(`/appointments/${id}/status`, { status });
      return { data: res.data, status, appointment };
    },
    onSuccess: ({ status, appointment }) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      showToast("تم تحديث حالة الميعاد بنجاح", "success");

      // لو الموعد اكتمل ولسه ملوش فاتورة، نفتح مودال الفاتورة تلقائياً
      if (status === "completed" && appointment && !appointment.invoice_id) {
        setInvoiceModal({
          isOpen: true,
          appointment: { ...appointment, status: "completed" },
          itemDescription: "كشف عيادة / استشارة",
          itemPrice: "",
          paidAmount: "",
        });
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل تحديث الحالة", "error");
    },
  });

  // إعادة الجدولة
  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, newDate }) => {
      const res = await api.patch(`/appointments/${id}/reschedule`, {
        appointment_date: newDate,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setRescheduleData({
        isOpen: false,
        appointmentId: null,
        patientName: "",
        currentDate: "",
        newDate: "",
      });
      showToast("تمت إعادة جدولة الموعد بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء إعادة الجدولة",
        "error"
      );
    },
  });

  // تحويل الموعد إلى فاتورة + طباعتها فوراً
  const convertToInvoiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/invoices", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      setInvoiceModal({
        isOpen: false,
        appointment: null,
        itemDescription: "كشف عيادة / استشارة",
        itemPrice: "",
        paidAmount: "",
      });

      showToast("تم إصدار الفاتورة بنجاح، جاري فتح الطباعة...", "success");

      // فتح نافذة الطباعة فوراً
      try {
        const createdInvoiceId = data?.invoice?.id;
        if (createdInvoiceId) {
          const fullInv = await api.get(`/invoices/${createdInvoiceId}`);
          if (fullInv.data) {
            printInvoice(fullInv.data);
          }
        }
      } catch (printErr) {
        console.error("Print auto open error:", printErr);
      }
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء إنشاء الفاتورة",
        "error"
      );
    },
  });

  // زرار تغيير مدة الكشف
  const updateDurationMutation = useMutation({
    mutationFn: async (newDuration) => {
      const res = await api.patch("/appointments/settings/duration", {
        default_appointment_duration: Number(newDuration),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["clinic-duration-settings"],
      });
      setDurationSettingsOpen(false);
      showToast("تم تحديث مدة الكشف الافتراضية بنجاح", "success");
    },
    onError: (error) => {
      showToast(
        error.response?.data?.error || "حدث خطأ أثناء تحديث مدة الكشف",
        "error"
      );
    },
  });

  // حذف الموعد
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/appointments/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setDeleteModal({ isOpen: false, appointmentId: null, patientName: "" });
      showToast("تم حذف الموعد نهائياً بنجاح", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل حذف الموعد", "error");
    },
  });

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    const date = d.toLocaleDateString("en-GB");
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${date} - ${time}`;
  };

  const statusConfig = {
    scheduled: {
      label: "مجدول",
      bg: "bg-[var(--primary-muted)] text-[var(--primary-base)] border border-[var(--primary-base)]/20",
    },
    completed: {
      label: "مكتمل",
      bg: "bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-text)]/20",
    },
    cancelled: {
      label: "ملغي",
      bg: "bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-text)]/20",
    },
    no_show: {
      label: "لم يحضر",
      bg: "bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-text)]/20",
    },
  };

  return (
    <div className="space-y-6">
      {/* 🌟 الهيدر الرئيسي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-main)] flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--primary-base)]" />
            جدول المواعيد
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">
            متابعة الحجوزات وتنظيم مواعيد العيادة بدقة
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {["ClinicAdmin", "Receptionist", "Doctor"].includes(user?.role) && (
            <button
              onClick={() => {
                setDefaultDuration(
                  durationSettings?.default_appointment_duration || 30
                );
                setDurationSettingsOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--primary-base)] px-4 py-2.5 rounded-[var(--radius-btn)] font-medium text-sm transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>مدة الكشف الافتراضية</span>
            </button>
          )}
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 rounded-[var(--radius-btn)] font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>حجز ميعاد جديد</span>
          </button>
        </div>
      </div>

      {/* 🌟 شريط الفلاتر */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-app)] p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--primary-base)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            فلترة المواعيد:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* فلترة التاريخ */}
          <div className="relative">
            <select
              value={dateFilterMode}
              onChange={(e) => {
                const value = e.target.value;
                setDateFilterMode(value);
                if (value === "all") setFilterDate("");
                else if (value === "today") setFilterDate(getTodayString());
                else if (value === "tomorrow")
                  setFilterDate(getTomorrowString());
                else if (value === "custom") setFilterDate("");
              }}
              className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] pl-9 pr-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-focus)] focus:text-[var(--text-main)] cursor-pointer min-w-[145px] transition-colors"
            >
              <option value="all">📅 كل التواريخ</option>
              <option value="today">📅 مواعيد اليوم</option>
              <option value="tomorrow">📅 مواعيد الغد</option>
              <option value="custom">📅 تاريخ محدد</option>
            </select>
            <CalendarIcon className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {/* التاريخ المخصص */}
          {dateFilterMode === "custom" && (
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
            />
          )}

          {/* فلترة الحالة */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] pl-9 pr-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-focus)] focus:text-[var(--text-main)] cursor-pointer min-w-[145px] transition-colors"
            >
              <option value="">📌 كل الحالات</option>
              <option value="scheduled">مجدول</option>
              <option value="completed">مكتمل</option>
              <option value="no_show">لم يحضر</option>
              <option value="cancelled">ملغي</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {/* فلترة الطبيب */}
          <div className="relative min-w-[170px]">
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="w-full appearance-none bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] pl-9 pr-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-focus)] focus:text-[var(--text-main)] cursor-pointer transition-colors"
            >
              <option value="">كل الأطباء</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  د. {d.name}
                </option>
              ))}
            </select>
            <User className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 🌟 جدول المواعيد */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
            <span className="text-sm">جاري تحميل جدول المواعيد...</span>
          </div>
        ) : isError ? (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-[var(--danger-text)]" />
            <p className="text-[var(--text-main)] font-semibold">
              حدث خطأ أثناء تحميل جدول المواعيد
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {error?.response?.data?.error ||
                "تعذر الاتصال بالسيرفر، تأكد من اتصالك وجرب مجدداً"}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs font-medium border border-[var(--border-default)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة المحاولة
            </button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            {filterDate || filterDoctor || filterStatus ? (
              <>
                <Filter className="w-8 h-8 text-[var(--text-muted)] mb-1" />
                <p className="text-[var(--text-main)] font-semibold">
                  لا توجد مواعيد بهذه الفلاتر
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  لم يتم العثور على أي حجز مطابق لخيارات التاريخ أو الطبيب
                  المحددة.
                </p>
                <button
                  onClick={() => {
                    setFilterDate("");
                    setFilterDoctor("");
                    setFilterStatus("");
                    setDateFilterMode("all");
                  }}
                  className="text-xs text-[var(--primary-base)] hover:underline"
                >
                  إعادة ضبط الفلاتر وعرض الكل
                </button>
              </>
            ) : (
              <>
                <CalendarIcon className="w-8 h-8 text-[var(--text-muted)] mb-1" />
                <p className="text-[var(--text-main)] font-semibold">
                  لا توجد مواعيد محجوزة حتى الآن
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  جدول العيادة فارغ حالياً، يمكنك بدء حجز ميعاد جديد الآن.
                </p>
                <button
                  onClick={() => setIsBookModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  حجز ميعاد جديد
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--bg-app)] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                <tr>
                  <th className="py-3.5 px-5 font-medium text-xs">المريض</th>
                  <th className="py-3.5 px-5 font-medium text-xs">
                    الطبيب المعالج
                  </th>
                  <th className="py-3.5 px-5 font-medium text-xs">
                    تاريخ ووقت الميعاد
                  </th>
                  <th className="py-3.5 px-5 font-medium text-xs">
                  حالة الموعد والفاتورة
                  </th>
                  <th className="py-3.5 px-5 font-medium text-xs text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                {filteredAppointments.map((apt) => {
                  const status = (apt.status || "").toLowerCase().trim();
                  const hasInvoice = !!apt.invoice_id;

                  return (
                    <tr
                      key={apt.id}
                      className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                    >
                      {/* المريض */}
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-[var(--text-main)]">
                          {apt.patient_name}
                        </p>
                        <span
                          className="text-xs text-[var(--text-muted)] font-mono"
                          dir="ltr"
                        >
                          {apt.patient_phone}
                        </span>
                      </td>

                      {/* الطبيب */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[var(--primary-base)]" />
                          <span className="text-[var(--text-secondary)]">
                            د. {apt.doctor_name}
                          </span>
                        </div>
                      </td>

                      {/* التاريخ والوقت والمدة */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span dir="ltr">
                            {formatDateTime(apt.appointment_date)}
                          </span>
                        </div>
                        {apt.duration_minutes && (
                          <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                            المدة: {apt.duration_minutes} دقيقة
                          </span>
                        )}
                      </td>

                      {/* حالة الموعد والفوترة - شكل نظيف وبدون أزرار ضخمة */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-[var(--radius-pill)] text-xs font-medium ${
                              statusConfig[status]?.bg ||
                              "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-default)]"
                            }`}
                          >
                            {statusConfig[status]?.label || apt.status}
                          </span>

                          {/* مؤشر الفاتورة الأنيق */}
                          {hasInvoice ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success-text)]">
                              <Check className="w-3 h-3" />
                              <span>
                               (
                                {parseFloat(
                                  apt.invoice_total || 0
                                ).toLocaleString("en-US")}{" "}
                                ج.م)
                              </span>
                            </span>
                          ) : status === "completed" ? (
                            <span className="text-xs text-amber-400">
                              ⏳ بدون فاتورة
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* الإجراءات */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {status === "scheduled" && (
                            <>
                              <button
                                title="اكتمل الكشف (سيفتح نافذة الفاتورة والطباعة تلقائياً)"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: apt.id,
                                    status: "completed",
                                    appointment: apt,
                                  })
                                }
                                className="p-1.5 hover:bg-[var(--success-bg)] text-[var(--success-text)] rounded-[var(--radius-btn)] transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                title="لم يحضر"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: apt.id,
                                    status: "no_show",
                                    appointment: apt,
                                  })
                                }
                                className="p-1.5 hover:bg-[var(--warning-bg)] text-[var(--warning-text)] rounded-[var(--radius-btn)] transition-colors"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                              <button
                                title="إلغاء الميعاد"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: apt.id,
                                    status: "cancelled",
                                    appointment: apt,
                                  })
                                }
                                className="p-1.5 hover:bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[var(--radius-btn)] transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* إعادة الجدولة (متاحة لغير المكتمل) */}
                          {status !== "completed" && (
                            <button
                              title="إعادة جدولة الموعد"
                              onClick={() =>
                                setRescheduleData({
                                  isOpen: true,
                                  appointmentId: apt.id,
                                  patientName: apt.patient_name,
                                  currentDate: apt.appointment_date,
                                  newDate: getCurrentDateTimeLocal(),
                                })
                              }
                              className="p-1.5 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--primary-base)] rounded-[var(--radius-btn)] transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}

                          {/* 🖨️ زرار الفاتورة / الطباعة المباشرة */}
                          {hasInvoice ? (
                            <button
                              title="طباعة الفاتورة 🖨️"
                              disabled={printingInvoiceId === apt.invoice_id}
                              onClick={() =>
                                handlePrintExistingInvoice(apt.invoice_id)
                              }
                              className="p-1.5 hover:bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)] transition-colors"
                            >
                              {printingInvoiceId === apt.invoice_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Printer className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              title="إصدار وطباعة فاتورة"
                              onClick={() =>
                                setInvoiceModal({
                                  isOpen: true,
                                  appointment: apt,
                                  itemDescription: "كشف عيادة / استشارة",
                                  itemPrice: "",
                                  paidAmount: "",
                                })
                              }
                              className="p-1.5 hover:bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)] transition-colors"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}

                          {/* 📲 زرار وقائمة الواتساب */}
                          <div>
                            <button
                              title="مراسلة المريض عبر واتساب"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeWhatsAppMenu === apt.id) {
                                  setActiveWhatsAppMenu(null);
                                  setWhatsAppMenuPosition(null);
                                  return;
                                }
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const gap = 4;
                                setWhatsAppMenuPosition({
                                  top: rect.bottom + gap,
                                  left: rect.left,
                                });
                                setActiveWhatsAppMenu(apt.id);
                              }}
                              className="p-1.5 hover:bg-[var(--success-bg)] text-[var(--success-text)] rounded-[var(--radius-btn)] transition-colors flex items-center justify-center"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            {activeWhatsAppMenu === apt.id &&
                              createPortal(
                                <div
                                  ref={whatsAppMenuRef}
                                  dir="rtl"
                                  style={{
                                    position: "fixed",
                                    top: `${whatsAppMenuPosition?.top ?? 0}px`,
                                    left: `${
                                      whatsAppMenuPosition?.left ?? 0
                                    }px`,
                                    zIndex: 99999,
                                  }}
                                  className="w-52 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] shadow-elevation p-1 space-y-1 text-right"
                                >
                                  {status === "completed" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSendWhatsApp(apt.id, "feedback")
                                        }
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] hover:text-[var(--warning-text)] rounded-[var(--radius-btn)] transition-colors"
                                      >
                                        <span>⭐</span>
                                        <span>تقييم الزيارة ورأي المريض</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSendWhatsApp(
                                            apt.id,
                                            "follow_up"
                                          )
                                        }
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary-base)] rounded-[var(--radius-btn)] transition-colors"
                                      >
                                        <span>🩺</span>
                                        <span>اطمئنان ومتابعة بعد الكشف</span>
                                      </button>
                                    </>
                                  ) : status === "no_show" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSendWhatsApp(apt.id, "no_show")
                                        }
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] hover:text-[var(--warning-text)] rounded-[var(--radius-btn)] transition-colors"
                                      >
                                        <span>🌸</span>
                                        <span>متابعة عدم الحضور</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSendWhatsApp(apt.id, "reminder")
                                        }
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary-base)] rounded-[var(--radius-btn)] transition-colors"
                                      >
                                        <span>🔔</span>
                                        <span>اقتراح موعد جديد</span>
                                      </button>
                                    </>
                                  ) : status === "scheduled" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSendWhatsApp(
                                            apt.id,
                                            "confirmation"
                                          )
                                        }
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] hover:text-[var(--success-text)] rounded-[var(--radius-btn)] transition-colors"
                                      >
                                        <span>🦷</span>
                                        <span>تأكيد الحجز</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSendWhatsApp(apt.id, "reminder")
                                        }
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-main)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary-base)] rounded-[var(--radius-btn)] transition-colors"
                                      >
                                        <span>🔔</span>
                                        <span>تذكير بالموعد</span>
                                      </button>
                                    </>
                                  ) : (
                                    <div className="px-2.5 py-2 text-xs text-center text-[var(--text-muted)]">
                                      الموعد ملغي
                                    </div>
                                  )}
                                </div>,
                                document.body
                              )}
                          </div>

                          {/* حذف الموعد (للـ ClinicAdmin فقط) */}
                          {user?.role === "ClinicAdmin" && (
                            <button
                              title="حذف الموعد نهائياً"
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  appointmentId: apt.id,
                                  patientName: apt.patient_name,
                                })
                              }
                              className="p-1.5 hover:bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[var(--radius-btn)] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🌟 نافذة إعادة الجدولة */}
      {rescheduleData.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--primary-base)]" />
                إعادة جدولة الموعد
              </h3>
              <button
                onClick={() =>
                  setRescheduleData({ ...rescheduleData, isOpen: false })
                }
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] p-1 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              تعديل موعد المريض:{" "}
              <span className="font-semibold text-[var(--text-main)]">
                {rescheduleData.patientName}
              </span>
            </p>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                التاريخ والوقت الجديد *
              </label>
              <input
                type="datetime-local"
                required
                min={getCurrentDateTimeLocal()}
                value={rescheduleData.newDate}
                onChange={(e) =>
                  setRescheduleData({
                    ...rescheduleData,
                    newDate: e.target.value,
                  })
                }
                className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2.5 text-[var(--text-main)] font-mono text-sm focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
            </div>
            <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() =>
                  setRescheduleData({ ...rescheduleData, isOpen: false })
                }
                className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={rescheduleMutation.isPending}
                onClick={() =>
                  rescheduleMutation.mutate({
                    id: rescheduleData.appointmentId,
                    newDate: new Date(rescheduleData.newDate).toISOString(),
                  })
                }
                className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
              >
                {rescheduleMutation.isPending
                  ? "جاري الحفظ..."
                  : "تأكيد الجدولة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 نافذة تحويل الموعد إلى فاتورة فورية + طباعة */}
      {invoiceModal.isOpen && invoiceModal.appointment && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[var(--primary-base)]" />
                إصدار وطباعة فاتورة الكشف
              </h3>
              <button
                onClick={() =>
                  setInvoiceModal({ ...invoiceModal, isOpen: false })
                }
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] p-1 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[var(--bg-elevated)] p-3 rounded-[var(--radius-btn)] border border-[var(--border-default)] space-y-1 text-xs">
              <p className="text-[var(--text-secondary)]">
                المريض:{" "}
                <span className="font-semibold text-[var(--text-main)]">
                  {invoiceModal.appointment.patient_name}
                </span>
              </p>
              <p className="text-[var(--text-secondary)]">
                الطبيب:{" "}
                <span className="font-semibold text-[var(--primary-base)]">
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
                  showToast("يرجى إدخال سعر صحيح للبند", "error");
                  return;
                }
                const payload = {
                  patient_id: invoiceModal.appointment.patient_id,
                  appointment_id: invoiceModal.appointment.id,
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
                          notes: "دفعة فورية عند تحويل الموعد",
                        }
                      : null,
                };
                convertToInvoiceMutation.mutate(payload);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  وصف الخدمة / الإجراء *
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
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    السعر الإجمالي (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="300"
                    value={invoiceModal.itemPrice}
                    onChange={(e) =>
                      setInvoiceModal({
                        ...invoiceModal,
                        itemPrice: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() =>
                    setInvoiceModal({ ...invoiceModal, isOpen: false })
                  }
                  className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={convertToInvoiceMutation.isPending}
                  className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {convertToInvoiceMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الإصدار...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5" />
                      <span>إصدار وطباعة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 التوست الموحد */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-btn)] shadow-elevation border text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-[var(--bg-elevated)] border-[var(--danger-text)]/30 text-[var(--danger-text)]"
              : "bg-[var(--bg-elevated)] border-[var(--success-text)]/30 text-[var(--success-text)]"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-[var(--danger-text)] shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-[var(--success-text)] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 نافذة تأكيد حذف الموعد */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation space-y-4">
            <div className="flex items-center gap-3 text-[var(--danger-text)]">
              <div className="p-2.5 bg-[var(--danger-bg)] rounded-[var(--radius-btn)] border border-[var(--danger-text)]/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-main)]">
                  تأكيد حذف الموعد
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  هذا الإجراء سيحذف الموعد نهائياً من قاعدة البيانات
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              هل أنت متأكد من حذف موعد المريض{" "}
              <span className="font-semibold text-[var(--text-main)]">
                "{deleteModal.patientName}"
              </span>
              ؟
            </p>
            <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    appointmentId: null,
                    patientName: "",
                  })
                }
                className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteAppointmentMutation.isPending}
                onClick={() =>
                  deleteAppointmentMutation.mutate(deleteModal.appointmentId)
                }
                className="flex-1 bg-[var(--danger-text)] hover:opacity-90 text-white py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
              >
                {deleteAppointmentMutation.isPending
                  ? "جاري الحذف..."
                  : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 نافذة إعدادات مدة الكشف */}
      {durationSettingsOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--primary-base)]" />
                مدة الكشف الافتراضية
              </h3>
              <button
                type="button"
                onClick={() => setDurationSettingsOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] p-1 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                حدد المدة التي يتم استخدامها تلقائياً عند إنشاء حجز جديد.
              </p>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                مدة الكشف (بالدقائق)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(e.target.value)}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2.5 text-[var(--text-main)] font-mono text-sm focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {[15, 30, 45, 60].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setDefaultDuration(minutes)}
                    className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium border transition-colors ${
                      Number(defaultDuration) === minutes
                        ? "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/30"
                        : "bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    {minutes} دقيقة
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                مسموح من 5 إلى 240 دقيقة.
              </p>
            </div>
            <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setDurationSettingsOpen(false)}
                className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={updateDurationMutation.isPending}
                onClick={() => {
                  const value = Number(defaultDuration);
                  if (!Number.isInteger(value) || value < 5 || value > 240) {
                    showToast(
                      "مدة الكشف يجب أن تكون بين 5 و240 دقيقة",
                      "error"
                    );
                    return;
                  }
                  updateDurationMutation.mutate(value);
                }}
                className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
              >
                {updateDurationMutation.isPending
                  ? "جاري الحفظ..."
                  : "حفظ الإعداد"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* المودال الموحد الذكي لحجز المواعيد */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
      />
    </div>
  );
}
