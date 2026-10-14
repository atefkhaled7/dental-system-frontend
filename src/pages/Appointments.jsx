import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import BookAppointmentModal from "../components/BookAppointmentModal";
import BookingRequestsView from "../components/BookingRequestsView";
import VisitEditorModal from "../components/VisitEditorModal";
import MedicalAlertBanner from "../components/MedicalAlertBanner";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { printInvoice } from "../utils/printInvoice";
import api from "../api/axios";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  X,
  Check,
  Loader2,
  Filter,
  Receipt,
  Printer,
  RefreshCw,
  Trash2,
  MessageCircle,
  Globe,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
  Settings2,
  Armchair,
  Play,
  UserCheck,
  ExternalLink,
  CalendarOff,
  Stethoscope,
} from "lucide-react";

const formatToDateTimeLocal = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getCairoDateString = (dayOffset = 0) => {
  const target = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(target);
};

// تحويل تاريخ YYYY-MM-DD إلى كائن تاريخ وإضافة أيام
const addDaysToDateStr = (dateStr, days) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

const ARABIC_WEEKDAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function Appointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // استخراج الفاتورة المرتبطة بالموعد من بيانات React Query المخزنة
  const getCachedInvoiceId = (appointmentId) => {
    if (!appointmentId) return null;

    const queryGroups = [
      queryClient.getQueriesData({
        queryKey: ["calendar-appointments"],
      }),
      queryClient.getQueriesData({
        queryKey: ["appointments"],
      }),
    ];

    for (const queries of queryGroups) {
      for (const [, data] of queries) {
        const appointment = data?.appointments?.find(
          (item) => item.id === appointmentId,
        );

        if (appointment?.invoice_id) {
          return appointment.invoice_id;
        }
      }
    }

    return null;
  };

  // حالة فتح مودال الحجز مع تعبئة مسبقة للطبيب والوقت عند الضغط على خانة فارغة
  const [bookModalState, setBookModalState] = useState({
    isOpen: false,
    initialDoctorId: "",
    initialDate: "",
  });

  // التبديل بين تبويب التقويم وطلبات الحجز الأونلاين
  const [activeTab, setActiveTab] = useState("calendar"); // calendar | requests
  // التبديل بين العرض اليومي بأعمدة الأطباء وعرض القائمة الشاملة
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  // التاريخ المختار في تقويم الأعمدة اليومي
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() =>
    getCairoDateString(0),
  );

  // الدرج الجانبي للموعد (Slide-over Drawer)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [visitModalApptId, setVisitModalApptId] = useState(null);
  // مودال إعدادات التشغيل والكراسي وساعات العمل والعطلات
  const [scheduleSettingsOpen, setScheduleSettingsOpen] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [totalChairs, setTotalChairs] = useState(1);
  const [workingHoursForm, setWorkingHoursForm] = useState([]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayReason, setNewHolidayReason] = useState("");

  // Pagination وفلاتر عرض القائمة (List View)
  const [page, setPage] = useState(1);
  const limit = 10;
  const [dateFilterMode, setDateFilterMode] = useState("all");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("");

  const [printingInvoiceId, setPrintingInvoiceId] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // مودال إعادة الجدولة
  const [rescheduleData, setRescheduleData] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
    currentDate: "",
    newDate: "",
  });

  // مودال الفاتورة السريعة
  const [invoiceModal, setInvoiceModal] = useState({
    isOpen: false,
    appointment: null,
    itemDescription: "كشف عيادة / استشارة",
    itemPrice: "",
    paidAmount: "",
    autoPrint: false,
  });

  // مودال تأكيد الحذف
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
  });

  // 1. جلب عدد طلبات الحجز الأونلاين المعلقة (تحديث كل 30 ثانية)
  const { data: pendingRequestsData } = useQuery({
    queryKey: ["booking-requests-pending-count"],
    queryFn: async () => {
      const res = await api.get("/booking-requests", {
        params: { status: "pending", limit: 1 },
      });
      return res.data?.pagination?.total || 0;
    },
    refetchInterval: 30000,
  });
  const pendingRequestsCount = pendingRequestsData || 0;

  // 2. جلب بيانات التقويم اليومي السريع بأعمدة الأطباء (تحديث تلقائي كل 30 ثانية)
  const {
    data: calendarData,
    isLoading: isLoadingCalendar,
    isFetching: isFetchingCalendar,
    isError: isErrorCalendar,
    error: errorCalendar,
    refetch: refetchCalendar,
  } = useQuery({
    queryKey: ["calendar-appointments", selectedCalendarDate, filterDoctor],
    queryFn: async () => {
      const params = {
        from: selectedCalendarDate,
        to: selectedCalendarDate,
      };
      if (filterDoctor) params.doctor_ids = filterDoctor;
      const res = await api.get("/appointments/calendar", { params });
      return res.data;
    },
    enabled: activeTab === "calendar" && viewMode === "grid",
    refetchInterval: 30000,
  });

  // 3. جلب تفاصيل الموعد المختار في الدرج الجانبي

  const {
    data: drawerAppointmentData,
    isLoading: isLoadingDrawer,
    isError: isErrorDrawer,
    error: errorDrawer,
    refetch: refetchDrawer,
    isFetching: isFetchingDrawer,
  } = useQuery({
    queryKey: ["appointment-details", selectedAppointmentId],
    queryFn: async () => {
      const res = await api.get(`/appointments/${selectedAppointmentId}`);
      return res.data?.appointment;
    },
    enabled: !!selectedAppointmentId,
  });

  // 4. جلب المواعيد لعرض القائمة الشاملة (List View)
  const {
    data: listData,
    isLoading: isLoadingList,
    isError: isErrorList,
    error: errorList,
    refetch: refetchList,
  } = useQuery({
    queryKey: [
      "appointments",
      { page, limit, filterDate, filterDoctor, filterStatus },
    ],
    queryFn: async () => {
      const params = { page, limit };
      if (filterDate) params.date = filterDate;
      if (filterDoctor) params.doctor_id = filterDoctor;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get("/appointments", { params });
      return res.data;
    },
    enabled: activeTab === "calendar" && viewMode === "list",
    placeholderData: keepPreviousData,
    refetchInterval: 30000,
  });

  const appointments = listData?.appointments || [];
  const pagination = listData?.pagination || {
    total: 0,
    page: 1,
    totalPages: 1,
  };

  // 5. جلب إعدادات العيادة (المدة، الكراسي، ساعات العمل، العطلات)
  const { data: durationSettings } = useQuery({
    queryKey: ["clinic-duration-settings"],
    queryFn: async () => {
      const res = await api.get("/appointments/settings/duration");
      return res.data;
    },
    enabled: ["ClinicAdmin", "Receptionist", "Doctor"].includes(user?.role),
  });

  // 6. جلب الأطباء للفلاتر
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await api.get("/auth/doctors");
      return res.data?.doctors || [];
    },
  });

  // تهيئة بيانات نافذة إعدادات التشغيل عند فتحها
  const handleOpenScheduleSettings = () => {
    setDefaultDuration(durationSettings?.default_appointment_duration || 30);
    setTotalChairs(durationSettings?.total_chairs_count || 1);

    const existingHours = durationSettings?.working_hours || [];
    const fullWeek = Array.from({ length: 7 }, (_, idx) => {
      const found = existingHours.find((h) => Number(h.weekday) === idx);
      return {
        weekday: idx,
        open_time: found?.open_time ? found.open_time.slice(0, 5) : "09:00",
        close_time: found?.close_time ? found.close_time.slice(0, 5) : "22:00",
        is_closed: found ? Boolean(found.is_closed) : idx === 5, // الجمعة مغلق افتراضياً
        breaks: found?.breaks || [],
      };
    });
    setWorkingHoursForm(fullWeek);
    setScheduleSettingsOpen(true);
  };

  // طباعة الفاتورة
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

  // إرسال واتساب
  const handleSendWhatsApp = async (appointmentId, type) => {
    const newTab = window.open("about:blank", "_blank");
    if (!newTab) {
      showToast("يرجى السماح بالنوافذ المنبثقة لهذا الموقع", "error");
      return;
    }
    newTab.opener = null;
    try {
      const res = await api.get(
        `/whatsapp/appointment-link?appointment_id=${appointmentId}&type=${type}`,
      );
      if (res.data?.url) {
        newTab.location.href = res.data.url;
        showToast("تم فتح واتساب برسالة المريض بنجاح", "success");
      } else {
        newTab.close();
        showToast("لم يتم العثور على رابط واتساب صالح", "error");
      }
    } catch (err) {
      newTab.close();
      showToast(
        err.response?.data?.error || "فشل إنشاء رابط الواتساب",
        "error",
      );
    }
  };

  // تحديث حالة الموعد
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, appointment }) => {
      const res = await api.patch(`/appointments/${id}/status`, { status });
      return { data: res.data, status, appointment };
    },
    onSuccess: ({ status, appointment }) => {
      const existingInvoiceId =
        appointment?.invoice_id || getCachedInvoiceId(appointment?.id);

      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["appointment-details", selectedAppointmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      showToast("تم تحديث حالة الموعد بنجاح", "success");

      if (status === "completed" && appointment && !existingInvoiceId) {
        setInvoiceModal({
          isOpen: true,
          appointment: { ...appointment, status: "completed" },
          itemDescription: "كشف عيادة / استشارة",
          itemPrice: "",
          paidAmount: "",
          autoPrint: false,
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
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["appointment-details", selectedAppointmentId],
      });
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
        "error",
      );
    },
  });

  // تحويل الموعد إلى فاتورة
  const convertToInvoiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/invoices", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({
        queryKey: ["appointment-details", selectedAppointmentId],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      setInvoiceModal({
        isOpen: false,
        appointment: null,
        itemDescription: "كشف عيادة / استشارة",
        itemPrice: "",
        paidAmount: "",
        autoPrint: false,
      });
      showToast("تم إصدار الفاتورة بنجاح", "success");

      if (invoiceModal.autoPrint) {
        try {
          const createdInvoiceId = data?.invoice?.id;
          if (createdInvoiceId) {
            const fullInv = await api.get(`/invoices/${createdInvoiceId}`);
            if (fullInv.data) printInvoice(fullInv.data);
          }
        } catch (printErr) {
          console.error("Print auto open error:", printErr);
        }
      }
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء إنشاء الفاتورة",
        "error",
      );
    },
  });

  // حفظ إعدادات التشغيل والكراسي وساعات العمل
  const updateScheduleSettingsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch("/appointments/settings/duration", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-duration-settings"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      setScheduleSettingsOpen(false);
      showToast("تم حفظ إعدادات التشغيل والكراسي وساعات العمل", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء تحديث الإعدادات",
        "error",
      );
    },
  });

  // إضافة عطلة رسمية
  const addHolidayMutation = useMutation({
    mutationFn: async ({ date, reason }) => {
      const res = await api.post("/appointments/settings/holidays", {
        date,
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-duration-settings"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      setNewHolidayDate("");
      setNewHolidayReason("");
      showToast("تمت إضافة العطلة الرسمية", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل إضافة العطلة", "error");
    },
  });

  // حذف عطلة رسمية
  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId) => {
      const res = await api.delete(
        `/appointments/settings/holidays/${holidayId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-duration-settings"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      showToast("تم حذف العطلة", "success");
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
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      setSelectedAppointmentId(null);
      setDeleteModal({ isOpen: false, appointmentId: null, patientName: "" });
      showToast("تم حذف الموعد نهائياً بنجاح", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل حذف الموعد", "error");
    },
  });

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    const date = d.toLocaleDateString("en-GB", { timeZone: "Africa/Cairo" });
    const time = d.toLocaleTimeString("en-US", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${date} - ${time}`;
  };

  const formatCairoTimeOnly = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("ar-EG", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCairoHHMM = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "00:00";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  };

  // ألوان الحالات بلمسة زجاجية
  const statusConfig = {
    scheduled: {
      label: "مجدول",
      bg: "bg-teal-500/15 text-teal-300 border border-teal-500/30",
      cardBg:
        "bg-teal-950/55 hover:bg-teal-900/60 border-teal-500/40 text-teal-100",
    },
    arrived: {
      label: "وصل بالانتظار",
      bg: "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40",
      cardBg:
        "bg-cyan-950/65 hover:bg-cyan-900/70 border-cyan-400/50 text-cyan-100",
    },
    in_progress: {
      label: "داخل الكشف 🩺",
      bg: "bg-indigo-500/20 text-indigo-300 border border-indigo-400/40",
      cardBg:
        "bg-indigo-950/70 hover:bg-indigo-900/75 border-indigo-400/50 text-indigo-100 ring-1 ring-indigo-400/30",
    },
    completed: {
      label: "مكتمل",
      bg: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
      cardBg:
        "bg-emerald-950/50 hover:bg-emerald-900/55 border-emerald-500/35 text-emerald-100",
    },
    cancelled: {
      label: "ملغي",
      bg: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
      cardBg:
        "bg-rose-950/35 hover:bg-rose-950/50 border-rose-500/25 text-rose-200/70 opacity-60",
    },
    no_show: {
      label: "لم يحضر",
      bg: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      cardBg:
        "bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/30 text-amber-200/80 opacity-75",
    },
  };

  // ==========================================
  // حسابات شبكة التقويم اليومي (Daily Doctor Columns)
  // ==========================================
  const selectedDayWeekday = useMemo(() => {
    const [y, m, d] = selectedCalendarDate.split("-").map(Number);
    return new Date(y, m - 1, d).getDay(); // 0=الأحد .. 6=السبت
  }, [selectedCalendarDate]);

  const calendarDoctors = useMemo(() => {
    const allDocs = calendarData?.doctors || doctors || [];
    if (filterDoctor) {
      return allDocs.filter((d) => d.id === filterDoctor);
    }
    return allDocs;
  }, [calendarData?.doctors, doctors, filterDoctor]);

  const calendarAppointments = calendarData?.appointments || [];
  const activeInvoiceId =
    drawerAppointmentData?.invoice_id ||
    getCachedInvoiceId(selectedAppointmentId);
  const doctorShifts = calendarData?.doctor_shifts || [];
  const doctorLeaves = calendarData?.doctor_leaves || [];
  const clinicWorkingHours = calendarData?.clinic_settings?.working_hours || [];
  const clinicHolidays = calendarData?.clinic_settings?.holidays || [];
  const clinicChairsCount =
    calendarData?.clinic_settings?.total_chairs_count ||
    durationSettings?.total_chairs_count ||
    1;

  // هل اليوم المختار عطلة رسمية للعيادة؟
  const activeHoliday = useMemo(() => {
    return clinicHolidays.find((h) => h.date === selectedCalendarDate) || null;
  }, [clinicHolidays, selectedCalendarDate]);

  // ساعات عمل العيادة لليوم المختار
  const todayClinicSchedule = useMemo(() => {
    return (
      clinicWorkingHours.find(
        (h) => Number(h.weekday) === selectedDayWeekday,
      ) || null
    );
  }, [clinicWorkingHours, selectedDayWeekday]);

  // توليد الخانات الزمنية (كل 30 دقيقة) بناءً على ساعات عمل العيادة (أو من 09:00 إلى 22:30 افتراضياً)
  const timeSlots = useMemo(() => {
    let startHour = 9;
    let endHour = 22;

    if (todayClinicSchedule && !todayClinicSchedule.is_closed) {
      const [oh] = (todayClinicSchedule.open_time || "09:00")
        .split(":")
        .map(Number);
      const [ch, cm] = (todayClinicSchedule.close_time || "22:00")
        .split(":")
        .map(Number);
      startHour = Math.max(0, oh);
      endHour = cm > 0 ? ch : Math.max(startHour + 1, ch - 1);
    }

    const slots = [];
    for (let h = startHour; h <= endHour; h++) {
      for (const m of [0, 30]) {
        if (
          todayClinicSchedule &&
          !todayClinicSchedule.is_closed &&
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00` >=
            todayClinicSchedule.close_time
        ) {
          continue;
        }
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const time24 = `${hh}:${mm}`;
        const period = h >= 12 ? "م" : "ص";
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        slots.push({
          time24,
          label: `${hour12}:${mm} ${period}`,
        });
      }
    }
    return slots;
  }, [todayClinicSchedule]);

  // فحص هل الخانة الزمنية تقع داخل شيفت الطبيب أم خارجه
  const isSlotInDoctorShift = (docId, time24) => {
    const docAllShifts = doctorShifts.filter((s) => s.doctor_id === docId);
    // لو الطبيب ملوش أي شيفتات مضافة في النظام، نعتبر كل الأوقات متاحة
    if (docAllShifts.length === 0) return true;

    const todayShifts = docAllShifts.filter(
      (s) => Number(s.day_of_week) === selectedDayWeekday,
    );
    if (todayShifts.length === 0) return false;

    const slotTimeSec = `${time24}:00`;
    return todayShifts.some(
      (s) => slotTimeSec >= s.start_time && slotTimeSec < s.end_time,
    );
  };

  // فحص هل الطبيب في إجازة اليوم
  const getDoctorLeaveToday = (docId) => {
    return (
      doctorLeaves.find(
        (l) => l.doctor_id === docId && l.leave_date === selectedCalendarDate,
      ) || null
    );
  };

  // بناء ملخص التنبيه الطبي للدرج الجانبي
  const drawerAlertSummary = useMemo(() => {
    if (!drawerAppointmentData) return { level: "none", tags: [] };
    const answers = drawerAppointmentData.medical_history_answers || {};
    const allergies = drawerAppointmentData.patient_allergies || [];
    const tags = [];

    if (answers.blood_thinners) tags.push("مميعات دم");
    if (answers.heart_disease) tags.push("أمراض قلب");
    if (answers.bleeding_disorder) tags.push("سيولة دم");
    if (answers.pregnancy) tags.push("حمل");
    if (answers.diabetes) tags.push("سكري");
    if (answers.hypertension) tags.push("ضغط دم");
    if (answers.asthma) tags.push("ربو");
    if (answers.hepatitis) tags.push("كبد");
    if (answers.kidney_disease) tags.push("كلى");

    allergies.forEach((a) => tags.push(`حساسية: ${a.substance}`));
    if (drawerAppointmentData.patient_medical_alerts && tags.length === 0) {
      tags.push(drawerAppointmentData.patient_medical_alerts);
    }

    return {
      level:
        drawerAppointmentData.medical_alert_level !== "none"
          ? drawerAppointmentData.medical_alert_level
          : drawerAppointmentData.has_medical_alert
            ? "moderate"
            : "none",
      tags,
    };
  }, [drawerAppointmentData]);

  return (
    <div className="space-y-6 relative">
      {/* 🌟 الهيدر الزجاجي الرئيسي */}
      <div className="relative rounded-2xl bg-[#0d1527]/70 backdrop-blur-xl border border-teal-500/20 p-5 shadow-xl overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 shadow-lg shadow-teal-500/10">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                  <span>التقويم ومحرك المواعيد</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                    مباشر (تحديث كل 30ث)
                  </span>
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-0.5 flex items-center gap-3">
                  <span>
                    إدارة الكراسي وشيفتات الأطباء ومنع التضارب تلقائياً
                  </span>
                  <span className="text-teal-400/90 font-semibold inline-flex items-center gap-1">
                    <Armchair className="w-3.5 h-3.5" />
                    سعة العيادة: {clinicChairsCount} كرسي
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* أزرار التبديل بين تقويم الأعمدة والجدول */}
            {activeTab === "calendar" && (
              <div className="flex items-center bg-[#070b14]/80 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "grid"
                      ? "bg-teal-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>أعمدة الأطباء</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "list"
                      ? "bg-teal-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>القائمة الشاملة</span>
                </button>
              </div>
            )}

            {user?.role === "ClinicAdmin" && (
              <button
                onClick={handleOpenScheduleSettings}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-slate-200 hover:text-teal-300 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all"
              >
                <Settings2 className="w-4 h-4 text-teal-400" />
                <span>إعدادات الكراسي والدوام</span>
              </button>
            )}

            <button
              onClick={() =>
                setBookModalState({
                  isOpen: true,
                  initialDoctorId: filterDoctor || "",
                  initialDate: "",
                })
              }
              className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>حجز موعد جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🌟 شريط التبديل بين التقويم الحي وطلبات الحجز الأونلاين */}
      <div className="flex border-b border-white/10 gap-6 px-2">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all relative ${
            activeTab === "calendar"
              ? "text-teal-400 border-b-2 border-teal-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>شاشة تشغيل المواعيد</span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 pb-3 text-sm font-bold transition-all relative ${
            activeTab === "requests"
              ? "text-teal-400 border-b-2 border-teal-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>طلبات الحجز أونلاين</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "calendar" ? (
        viewMode === "grid" ? (
          /* =========================================================
             🌟 أولاً: عرض التقويم اليومي بأعمدة الأطباء (Glassmorphic Grid)
             ========================================================= */
          <div className="space-y-4">
            {/* شريط التحكم في اليوم وفلتر الطبيب */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1527]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-lg">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    setSelectedCalendarDate(
                      addDaysToDateStr(selectedCalendarDate, -1),
                    )
                  }
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                  title="اليوم السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 bg-[#070b14]/80 border border-teal-500/30 rounded-xl px-3.5 py-1.5">
                  <CalendarIcon className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-teal-300">
                    {ARABIC_WEEKDAYS[selectedDayWeekday]}
                  </span>
                  <input
                    type="date"
                    value={selectedCalendarDate}
                    onChange={(e) => {
                      if (e.target.value)
                        setSelectedCalendarDate(e.target.value);
                    }}
                    className="bg-transparent text-xs sm:text-sm font-mono font-bold text-white focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() =>
                    setSelectedCalendarDate(
                      addDaysToDateStr(selectedCalendarDate, 1),
                    )
                  }
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                  title="اليوم التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedCalendarDate(getCairoDateString(0))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedCalendarDate === getCairoDateString(0)
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  اليوم
                </button>

                <button
                  onClick={() => setSelectedCalendarDate(getCairoDateString(1))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedCalendarDate === getCairoDateString(1)
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  غداً
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* فلتر طبيب محدد */}
                <select
                  value={filterDoctor}
                  onChange={(e) => setFilterDoctor(e.target.value)}
                  className="bg-[#070b14]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                >
                  <option value="">👨‍⚕️ كل الأطباء ({doctors.length})</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      د. {d.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => refetchCalendar()}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-teal-300 transition-colors"
                  title="تحديث الآن"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      isFetchingCalendar ? "animate-spin text-teal-400" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* تنبيه لو اليوم عطلة رسمية أو العيادة مغلقة */}
            {(activeHoliday || todayClinicSchedule?.is_closed) && (
              <div className="p-4 rounded-2xl bg-amber-500/15 backdrop-blur-xl border border-amber-500/35 text-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarOff className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <span className="font-bold">
                      {activeHoliday
                        ? `العيادة في عطلة رسمية هذا اليوم (${
                            activeHoliday.reason || "عطلة"
                          })`
                        : "العيادة مغلقة في هذا اليوم من الأسبوع حسب جدول ساعات العمل"}
                    </span>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      الحجز العادي متوقف في هذا اليوم، ويمكن لمدير العيادة فقط
                      تجاوز القفل للحالات الطارئة.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* شبكة أعمدة الأطباء الزجاجية */}

            <div className="rounded-2xl bg-[#0d1527]/65 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* فشل تحديث التقويم مع وجود بيانات سابقة: نحتفظ بالبيانات ونوضح الخطأ */}
              {isErrorCalendar && calendarData && (
                <div
                  role="alert"
                  className="m-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-rose-200">
                        تعذر تحديث بيانات التقويم
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        المعروض هو آخر بيانات تم تحميلها بنجاح.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => refetchCalendar()}
                    disabled={isFetchingCalendar}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isFetchingCalendar ? "animate-spin" : ""
                      }`}
                    />
                    إعادة المحاولة
                  </button>
                </div>
              )}

              {isLoadingCalendar ? (
                <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-9 h-9 animate-spin text-teal-400" />
                  <span className="text-sm font-medium">
                    جاري تحضير شبكة المواعيد وأعمدة الأطباء...
                  </span>
                </div>
              ) : isErrorCalendar && !calendarData ? (
                <div
                  role="alert"
                  className="p-12 sm:p-16 flex flex-col items-center justify-center text-center gap-4"
                >
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle className="w-10 h-10 text-rose-400" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white">
                      تعذر تحميل التقويم
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md">
                      {errorCalendar?.response?.data?.error ||
                        errorCalendar?.response?.data?.message ||
                        "حدث خطأ أثناء تحميل المواعيد. تحقق من اتصالك وحاول مرة أخرى."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => refetchCalendar()}
                    disabled={isFetchingCalendar}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isFetchingCalendar ? "animate-spin" : ""
                      }`}
                    />
                    {isFetchingCalendar
                      ? "جاري إعادة المحاولة..."
                      : "إعادة المحاولة"}
                  </button>
                </div>
              ) : calendarDoctors.length === 0 ? (
                <div className="p-16 text-center text-slate-400 space-y-2">
                  <Stethoscope className="w-10 h-10 mx-auto text-teal-400/60" />
                  <p className="font-bold text-slate-200">
                    لا يوجد أطباء نشطون مسجلون في العيادة
                  </p>
                  <p className="text-xs">
                    أضف طبيباً من قسم "فريق العمل" ليظهر عموده الخاص في التقويم.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[720px]">
                    {/* ترويسة الأعمدة (الأطباء) */}
                    <div
                      className="grid border-b border-white/10 bg-[#070b14]/85 sticky top-0 z-10"
                      style={{
                        gridTemplateColumns: `95px repeat(${calendarDoctors.length}, minmax(210px, 1fr))`,
                      }}
                    >
                      <div className="p-3.5 flex items-center justify-center border-l border-white/10 text-xs font-bold text-slate-400">
                        الوقت
                      </div>

                      {calendarDoctors.map((doc) => {
                        const leave = getDoctorLeaveToday(doc.id);
                        const docApptsCount = calendarAppointments.filter(
                          (a) =>
                            a.doctor_id === doc.id &&
                            !["cancelled", "no_show"].includes(a.status),
                        ).length;

                        return (
                          <div
                            key={doc.id}
                            className="p-3.5 border-l border-white/10 last:border-l-0 flex items-center justify-between bg-gradient-to-b from-white/[0.03] to-transparent"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-sm shrink-0">
                                {doc.name?.charAt(0)}
                              </div>
                              <div className="truncate">
                                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                                  د. {doc.name}
                                </h3>
                                {leave ? (
                                  <span className="text-[10px] text-rose-400 font-semibold block">
                                    🏖️ في إجازة اليوم
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 block">
                                    {docApptsCount} مواعيد نشطة
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* صفوف الخانات الزمنية (Time Slots) */}
                    <div className="divide-y divide-white/[0.06]">
                      {timeSlots.map((slot) => (
                        <div
                          key={slot.time24}
                          className="grid min-h-[68px] transition-colors hover:bg-white/[0.01]"
                          style={{
                            gridTemplateColumns: `95px repeat(${calendarDoctors.length}, minmax(210px, 1fr))`,
                          }}
                        >
                          {/* عمود الساعة */}
                          <div className="p-2 border-l border-white/10 bg-[#070b14]/40 flex items-start justify-center pt-3">
                            <span className="text-xs font-mono font-semibold text-slate-400">
                              {slot.label}
                            </span>
                          </div>

                          {/* خانات الأطباء في هذه الساعة */}
                          {calendarDoctors.map((doc) => {
                            const docLeave = getDoctorLeaveToday(doc.id);
                            const inShift = isSlotInDoctorShift(
                              doc.id,
                              slot.time24,
                            );
                            const isUnavailable =
                              Boolean(activeHoliday) ||
                              Boolean(todayClinicSchedule?.is_closed) ||
                              Boolean(docLeave) ||
                              !inShift;

                            // المواعيد التي تبدأ في هذه الخانة الزمنية (نصف الساعة)

                            const [slotH, slotM] = slot.time24
                              .split(":")
                              .map(Number);

                            const slotStartMinutes = slotH * 60 + slotM;
                            const slotEndMinutes = slotStartMinutes + 30;

                            // المواعيد التي تبدأ داخل الخانة الحالية، بغض النظر عن حالتها
                            const slotAppts = calendarAppointments.filter(
                              (apt) => {
                                if (apt.doctor_id !== doc.id) return false;

                                const hhmm = getCairoHHMM(apt.appointment_date);
                                const [ah, am] = hhmm.split(":").map(Number);

                                return (
                                  ah === slotH &&
                                  (slotM === 0 ? am < 30 : am >= 30)
                                );
                              },
                            );

                            // المواعيد النشطة التي تشغل أي جزء من الخانة الحالية
                            const blockingSlotAppts =
                              calendarAppointments.filter((apt) => {
                                if (apt.doctor_id !== doc.id) return false;

                                const status = (apt.status || "")
                                  .toLowerCase()
                                  .trim();

                                if (
                                  ![
                                    "scheduled",
                                    "arrived",
                                    "in_progress",
                                  ].includes(status)
                                ) {
                                  return false;
                                }

                                const hhmm = getCairoHHMM(apt.appointment_date);
                                const [ah, am] = hhmm.split(":").map(Number);
                                const appointmentStartMinutes = ah * 60 + am;
                                const appointmentDuration =
                                  Number(apt.duration_minutes) || 30;
                                const appointmentEndMinutes =
                                  appointmentStartMinutes + appointmentDuration;

                                return (
                                  appointmentStartMinutes < slotEndMinutes &&
                                  appointmentEndMinutes > slotStartMinutes
                                );
                              });

                            return (
                              <div
                                key={`${doc.id}-${slot.time24}`}
                                onClick={() => {
                                  if (blockingSlotAppts.length === 0) {
                                    setBookModalState({
                                      isOpen: true,
                                      initialDoctorId: doc.id,
                                      initialDate: `${selectedCalendarDate}T${slot.time24}`,
                                    });
                                  }
                                }}
                                className={`relative p-1.5 border-l border-white/10 last:border-l-0 transition-all group ${
                                  isUnavailable
                                    ? "bg-[#050811]/75 cursor-pointer"
                                    : "hover:bg-teal-500/[0.06] cursor-pointer"
                                }`}
                                style={
                                  isUnavailable
                                    ? {
                                        backgroundImage:
                                          "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 8px, transparent 8px, transparent 16px)",
                                      }
                                    : undefined
                                }
                              >
                                {/* زر + يظهر عند التمرير على خانة فارغة */}
                                {blockingSlotAppts.length === 0 && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity py-1 flex items-center justify-center">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 rounded-lg backdrop-blur-md">
                                      <Plus className="w-3 h-3" />
                                      {isUnavailable
                                        ? "خارج الدوام (حجز طارئ)"
                                        : `حجز ${slot.label}`}
                                    </span>
                                  </div>
                                )}

                                {/* كروت المواعيد داخل الخانة */}
                                <div className="space-y-1.5">
                                  {slotAppts.map((apt) => {
                                    const st = (apt.status || "scheduled")
                                      .toLowerCase()
                                      .trim();
                                    const cfg =
                                      statusConfig[st] ||
                                      statusConfig.scheduled;
                                    const isCritical =
                                      apt.medical_alert_level === "critical";

                                    return (
                                      <div
                                        key={apt.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAppointmentId(apt.id);
                                        }}
                                        className={`p-2.5 rounded-xl border backdrop-blur-xl shadow-md transition-all cursor-pointer ${cfg.cardBg}`}
                                      >
                                        <div className="flex items-start justify-between gap-1.5">
                                          <span className="font-bold text-xs truncate">
                                            {apt.patient_name}
                                          </span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {apt.has_medical_alert && (
                                              <span
                                                title={
                                                  isCritical
                                                    ? "تنبيه طبي حرج!"
                                                    : "تنبيه طبي"
                                                }
                                                className={`p-0.5 rounded-full ${
                                                  isCritical
                                                    ? "bg-rose-500 text-white animate-pulse"
                                                    : "bg-amber-500 text-slate-950"
                                                }`}
                                              >
                                                <AlertOctagon className="w-3 h-3" />
                                              </span>
                                            )}
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-semibold">
                                              {cfg.label}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] opacity-85 mt-1 font-mono">
                                          <span>
                                            {formatCairoTimeOnly(
                                              apt.appointment_date,
                                            )}{" "}
                                            ({apt.duration_minutes}د)
                                          </span>
                                          {apt.invoice_id && (
                                            <span className="text-emerald-300 font-sans font-bold">
                                              ✓ مفوتر
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {blockingSlotAppts
                                    .filter(
                                      (apt) =>
                                        !slotAppts.some(
                                          (shown) => shown.id === apt.id,
                                        ),
                                    )
                                    .map((apt) => (
                                      <div
                                        key={`continuation-${apt.id}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAppointmentId(apt.id);
                                        }}
                                        className="p-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs cursor-pointer"
                                      >
                                        <div className="font-bold truncate">
                                          {apt.patient_name}
                                        </div>
                                        <div className="text-[10px] mt-1">
                                          مستمر من{" "}
                                          {formatCairoTimeOnly(
                                            apt.appointment_date,
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================
             🌟 ثانياً: عرض القائمة الشاملة بالـ Pagination (List View)
             ========================================================= */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 bg-[#0d1527]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold text-slate-300">
                  فلترة المواعيد:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={dateFilterMode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDateFilterMode(value);
                    setPage(1);
                    if (value === "all") setFilterDate("");
                    else if (value === "today")
                      setFilterDate(getCairoDateString(0));
                    else if (value === "tomorrow")
                      setFilterDate(getCairoDateString(1));
                    else if (value === "custom") setFilterDate("");
                  }}
                  className="bg-[#070b14]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                >
                  <option value="all">📅 كل التواريخ</option>
                  <option value="today">📅 مواعيد اليوم</option>
                  <option value="tomorrow">📅 مواعيد الغد</option>
                  <option value="custom">📅 تاريخ محدد</option>
                </select>

                {dateFilterMode === "custom" && (
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setPage(1);
                    }}
                    className="bg-[#070b14]/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                )}

                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#070b14]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                >
                  <option value="">📌 كل الحالات</option>
                  <option value="scheduled">مجدول</option>
                  <option value="arrived">وصل بالانتظار</option>
                  <option value="in_progress">داخل الكشف</option>
                  <option value="completed">مكتمل</option>
                  <option value="no_show">لم يحضر</option>
                  <option value="cancelled">ملغي</option>
                </select>

                <select
                  value={filterDoctor}
                  onChange={(e) => {
                    setFilterDoctor(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#070b14]/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
                >
                  <option value="">كل الأطباء</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      د. {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#0d1527]/70 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              {isLoadingList ? (
                <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                  <span className="text-sm">جاري تحميل قائمة المواعيد...</span>
                </div>
              ) : isErrorList ? (
                <div className="p-12 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
                  <p className="text-white font-semibold">
                    {errorList?.response?.data?.error ||
                      "حدث خطأ أثناء تحميل المواعيد"}
                  </p>
                  <button
                    onClick={() => refetchList()}
                    className="px-4 py-2 bg-white/10 rounded-xl text-xs text-white"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CalendarIcon className="w-8 h-8 mx-auto opacity-50" />
                  <p className="font-semibold text-white">
                    لا توجد مواعيد مطابقة
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-[#070b14]/90 text-slate-400 border-b border-white/10 text-xs">
                      <tr>
                        <th className="py-3.5 px-5">المريض</th>
                        <th className="py-3.5 px-5">الطبيب</th>
                        <th className="py-3.5 px-5">التاريخ والوقت</th>
                        <th className="py-3.5 px-5">الحالة والفاتورة</th>
                        <th className="py-3.5 px-5 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {appointments.map((apt) => {
                        const status = (apt.status || "scheduled")
                          .toLowerCase()
                          .trim();
                        return (
                          <tr
                            key={apt.id}
                            onClick={() => setSelectedAppointmentId(apt.id)}
                            className="hover:bg-white/[0.04] cursor-pointer transition-colors"
                          >
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">
                                  {apt.patient_name}
                                </span>
                                {apt.has_medical_alert && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      apt.medical_alert_level === "critical"
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    }`}
                                  >
                                    ⚠️ تنبيه طبي
                                  </span>
                                )}
                              </div>
                              <span
                                className="text-xs text-slate-400 font-mono"
                                dir="ltr"
                              >
                                {apt.patient_phone}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              د. {apt.doctor_name}
                            </td>
                            <td className="py-3.5 px-5 font-mono text-xs">
                              <div dir="ltr">
                                {formatDateTime(apt.appointment_date)}
                              </div>
                              <span className="text-[11px] text-slate-400 font-sans">
                                المدة: {apt.duration_minutes} دقيقة
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  statusConfig[status]?.bg || ""
                                }`}
                              >
                                {statusConfig[status]?.label || apt.status}
                              </span>
                            </td>
                            <td
                              className="py-3.5 px-5 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setSelectedAppointmentId(apt.id)}
                                className="px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-colors"
                              >
                                فتح الدرج
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!isLoadingList && pagination.total > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#070b14]/60 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white disabled:opacity-40"
                    >
                      السابق
                    </button>
                    <span>
                      صفحة <b className="text-teal-400">{page}</b> من{" "}
                      <b>{pagination.totalPages}</b>
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      disabled={page >= pagination.totalPages}
                      className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white disabled:opacity-40"
                    >
                      التالي
                    </button>
                  </div>
                  <div>إجمالي {pagination.total} موعد</div>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <BookingRequestsView showToast={showToast} />
      )}

      {/* =========================================================
          🌟 الدرج الجانبي الزجاجي للموعد (Slide-over Appointment Drawer)
          ========================================================= */}
      {selectedAppointmentId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#04070e]/65 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedAppointmentId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            className="relative w-full max-w-md h-full bg-[#0d1527]/90 backdrop-blur-2xl border-r border-teal-500/25 shadow-2xl flex flex-col justify-between overflow-y-auto p-6 text-right"
          >
            {/* إضاءة زجاجية في خلفية الدرج */}
            <div className="absolute top-10 left-10 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {isLoadingDrawer ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                <span className="text-xs">
                  جاري جلب تفاصيل الموعد والملف الطبي...
                </span>
              </div>
            ) : isErrorDrawer || !drawerAppointmentData ? (
              <div
                role="alert"
                className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4"
              >
                <AlertTriangle className="w-10 h-10 text-rose-400" />

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">
                    تعذر تحميل تفاصيل الموعد
                  </h3>

                  <p className="text-sm text-slate-400">
                    {errorDrawer?.response?.data?.error ||
                      errorDrawer?.response?.data?.message ||
                      "حدث خطأ أثناء جلب بيانات الموعد، أو لم يتم العثور عليه."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => refetchDrawer()}
                    disabled={isFetchingDrawer}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isFetchingDrawer ? "animate-spin" : ""
                      }`}
                    />
                    {isFetchingDrawer ? "جاري المحاولة..." : "إعادة المحاولة"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAppointmentId(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 relative">
                {/* الهيدر */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        statusConfig[drawerAppointmentData.status]?.bg || ""
                      }`}
                    >
                      {statusConfig[drawerAppointmentData.status]?.label ||
                        drawerAppointmentData.status}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5">
                      تفاصيل الموعد السريري
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedAppointmentId(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* شريط التنبيه الطبي الحاسم MedicalAlertBanner */}
                <MedicalAlertBanner alertSummary={drawerAlertSummary} />

                {/* كارت ملخص المريض */}
                <div className="p-4 rounded-2xl bg-[#070b14]/70 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-base">
                        {drawerAppointmentData.patient_name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">
                          {drawerAppointmentData.patient_name}
                        </h4>
                        <p
                          className="text-xs text-slate-400 font-mono"
                          dir="ltr"
                        >
                          {drawerAppointmentData.patient_phone}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/patients/${drawerAppointmentData.patient_id}`,
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition-colors"
                    >
                      <span>ملف المريض</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {drawerAppointmentData.patient_guardian_name && (
                    <div className="text-xs text-teal-300 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20">
                      ولي الأمر: {drawerAppointmentData.patient_guardian_name} (
                      {drawerAppointmentData.patient_guardian_phone})
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-slate-400 block">
                        الطبيب المعالج
                      </span>
                      <span className="font-bold text-slate-100">
                        د. {drawerAppointmentData.doctor_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">
                        التوقيت والمدة
                      </span>
                      <span className="font-mono font-bold text-teal-300">
                        {formatCairoTimeOnly(
                          drawerAppointmentData.appointment_date,
                        )}{" "}
                        ({drawerAppointmentData.duration_minutes} د)
                      </span>
                    </div>
                  </div>

                  {drawerAppointmentData.notes && (
                    <div className="pt-2 border-t border-white/10 text-xs">
                      <span className="text-slate-400 block mb-0.5">
                        ملاحظات الحجز:
                      </span>
                      <p className="text-slate-200 bg-white/5 p-2 rounded-lg">
                        {drawerAppointmentData.notes}
                      </p>
                    </div>
                  )}
                </div>
                {/* 🌟 زر فتح سجل الزيارة السريري والروشتة السريعة */}
                {["ClinicAdmin", "Doctor"].includes(user?.role) && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisitModalApptId(drawerAppointmentData.id)
                    }
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>فتح سجل الزيارة السريري والروشتة 🩺</span>
                  </button>
                )}
                {/* أزرار تغيير الحالة السريعة للاستقبال والطبيب */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 block">
                    تحديث حالة المريض في العيادة:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={
                        drawerAppointmentData.status === "arrived" ||
                        drawerAppointmentData.status === "completed" ||
                        updateStatusMutation.isPending
                      }
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: drawerAppointmentData.id,
                          status: "arrived",
                          appointment: drawerAppointmentData,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-40"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>وصل بالانتظار</span>
                    </button>

                    <button
                      disabled={
                        drawerAppointmentData.status === "in_progress" ||
                        drawerAppointmentData.status === "completed" ||
                        updateStatusMutation.isPending
                      }
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: drawerAppointmentData.id,
                          status: "in_progress",
                          appointment: drawerAppointmentData,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-xs font-bold transition-all disabled:opacity-40"
                    >
                      <Play className="w-4 h-4" />
                      <span>ابدأ الكشف الآن</span>
                    </button>

                    <button
                      disabled={
                        drawerAppointmentData.status === "completed" ||
                        updateStatusMutation.isPending
                      }
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: drawerAppointmentData.id,
                          status: "completed",
                          appointment: drawerAppointmentData,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اكتمل الكشف</span>
                    </button>

                    <button
                      disabled={
                        drawerAppointmentData.status === "completed" ||
                        updateStatusMutation.isPending
                      }
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: drawerAppointmentData.id,
                          status: "no_show",
                          appointment: drawerAppointmentData,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-40"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>لم يحضر</span>
                    </button>
                  </div>
                </div>

                {/* إجراءات الواتساب والجدولة والفاتورة */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-slate-400 block">
                    إجراءات التواصل والمالية:
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        handleSendWhatsApp(
                          drawerAppointmentData.id,
                          drawerAppointmentData.status === "completed"
                            ? "follow_up"
                            : "reminder",
                        )
                      }
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-semibold transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>رسالة واتساب</span>
                    </button>

                    {activeInvoiceId ? (
                      <button
                        type="button"
                        onClick={() =>
                          handlePrintExistingInvoice(activeInvoiceId)
                        }
                        disabled={printingInvoiceId === activeInvoiceId}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {printingInvoiceId === activeInvoiceId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}

                        <span>
                          {printingInvoiceId === activeInvoiceId
                            ? "جاري تجهيز الفاتورة..."
                            : "طباعة الفاتورة"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setInvoiceModal({
                            isOpen: true,
                            appointment: drawerAppointmentData,
                            itemDescription: "كشف عيادة / استشارة",
                            itemPrice: "",
                            paidAmount: "",
                            autoPrint: false,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>إصدار فاتورة</span>
                      </button>
                    )}

                    {drawerAppointmentData.status !== "completed" && (
                      <button
                        onClick={() =>
                          setRescheduleData({
                            isOpen: true,
                            appointmentId: drawerAppointmentData.id,
                            patientName: drawerAppointmentData.patient_name,
                            currentDate: drawerAppointmentData.appointment_date,
                            newDate: formatToDateTimeLocal(
                              drawerAppointmentData.appointment_date,
                            ),
                          })
                        }
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>إعادة جدولة</span>
                      </button>
                    )}

                    {drawerAppointmentData.status !== "completed" &&
                      drawerAppointmentData.status !== "cancelled" && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: drawerAppointmentData.id,
                              status: "cancelled",
                              appointment: drawerAppointmentData,
                            })
                          }
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>إلغاء الموعد</span>
                        </button>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* فوتر الدرج */}
            {drawerAppointmentData && user?.role === "ClinicAdmin" && (
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <button
                  onClick={() =>
                    setDeleteModal({
                      isOpen: true,
                      appointmentId: drawerAppointmentData.id,
                      patientName: drawerAppointmentData.patient_name,
                    })
                  }
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف الموعد نهائياً</span>
                </button>

                <button
                  onClick={() => setSelectedAppointmentId(null)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 text-xs text-white"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          🌟 نافذة إعدادات التشغيل والكراسي وساعات عمل العيادة والعطلات
          ========================================================= */}
      {scheduleSettingsOpen && (
        <div className="fixed inset-0 bg-[#04070e]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div
            dir="rtl"
            className="bg-[#0d1527]/90 backdrop-blur-2xl border border-teal-500/25 max-w-2xl w-full rounded-2xl p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto text-right"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Settings2 className="w-5 h-5 text-teal-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  إعدادات الكراسي وساعات العمل والعطلات
                </h3>
              </div>
              <button
                onClick={() => setScheduleSettingsOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. عدد الكراسي والمدة الافتراضية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#070b14]/60 p-4 rounded-xl border border-white/10">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عدد كراسي العيادة (Total Chairs) 🪑
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={totalChairs}
                  onChange={(e) => setTotalChairs(e.target.value)}
                  className="w-full bg-[#0d1527] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:border-teal-400 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  يمنع حجز مواعيد متزامنة تتجاوز عدد الكراسي الفعلية
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  مدة الكشف الافتراضية (دقيقة) ⏱️
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(e.target.value)}
                  className="w-full bg-[#0d1527] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:border-teal-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. ساعات عمل العيادة الأسبوعية */}
            <div className="space-y-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-teal-300">
                ساعات عمل العيادة الأسبوعية:
              </h4>
              <div className="space-y-2 bg-[#070b14]/60 p-3.5 rounded-xl border border-white/10">
                {workingHoursForm.map((day, idx) => (
                  <div
                    key={day.weekday}
                    className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-b-0 text-xs"
                  >
                    <label className="flex items-center gap-2 min-w-[110px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!day.is_closed}
                        onChange={(e) => {
                          const isClosed = !e.target.checked;

                          setWorkingHoursForm((prev) =>
                            prev.map((day, i) =>
                              i === idx ? { ...day, is_closed: isClosed } : day,
                            ),
                          );
                        }}
                        className="rounded accent-teal-500 w-4 h-4"
                      />
                      <span className="font-bold text-slate-200">
                        {ARABIC_WEEKDAYS[day.weekday]}
                      </span>
                    </label>

                    {day.is_closed ? (
                      <span className="text-rose-400 font-semibold px-3 py-1 bg-rose-500/10 rounded-lg">
                        مغلق (إجازة أسبوعية)
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 font-sans">من</span>
                        <input
                          type="time"
                          value={day.open_time}
                          onChange={(e) => {
                            const openTime = e.target.value;

                            setWorkingHoursForm((prev) =>
                              prev.map((day, i) =>
                                i === idx
                                  ? { ...day, open_time: openTime }
                                  : day,
                              ),
                            );
                          }}
                          className="bg-[#0d1527] border border-white/10 rounded-lg px-2 py-1 text-white"
                        />
                        <span className="text-slate-400 font-sans">إلى</span>
                        <input
                          type="time"
                          value={day.close_time}
                          onChange={(e) => {
                            const closeTime = e.target.value;

                            setWorkingHoursForm((prev) =>
                              prev.map((day, i) =>
                                i === idx
                                  ? { ...day, close_time: closeTime }
                                  : day,
                              ),
                            );
                          }}
                          className="bg-[#0d1527] border border-white/10 rounded-lg px-2 py-1 text-white"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. العطلات الرسمية */}
            <div className="space-y-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                العطلات الرسمية للعيادة:
              </h4>
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <input
                  type="text"
                  value={newHolidayReason}
                  onChange={(e) => setNewHolidayReason(e.target.value)}
                  placeholder="سبب العطلة (مثل: إجازة عيد الفطر)"
                  className="flex-1 bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newHolidayDate) return;
                    addHolidayMutation.mutate({
                      date: newHolidayDate,
                      reason: newHolidayReason,
                    });
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  إضافة عطلة
                </button>
              </div>

              {durationSettings?.holidays?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {durationSettings.holidays.map((h) => (
                    <span
                      key={h.id}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs"
                    >
                      <span className="font-mono">{h.date}</span>
                      {h.reason && <span>({h.reason})</span>}
                      <button
                        type="button"
                        onClick={() => deleteHolidayMutation.mutate(h.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setScheduleSettingsOpen(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={updateScheduleSettingsMutation.isPending}
                onClick={() => {
                  const hasInvalidHours = workingHoursForm.some(
                    (day) =>
                      !day.is_closed &&
                      (!day.open_time ||
                        !day.close_time ||
                        day.open_time >= day.close_time),
                  );

                  if (hasInvalidHours) {
                    showToast(
                      "وقت بداية العمل يجب أن يكون قبل وقت الإغلاق في جميع الأيام المفتوحة",
                      "error",
                    );
                    return;
                  }

                  updateScheduleSettingsMutation.mutate({
                    default_appointment_duration: Number(defaultDuration),
                    total_chairs_count: Number(totalChairs),
                    working_hours: workingHoursForm,
                  });
                }}
                className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/20"
              >
                {updateScheduleSettingsMutation.isPending
                  ? "جاري الحفظ..."
                  : "حفظ جميع الإعدادات"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 نافذة إعادة الجدولة */}
      {rescheduleData.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            dir="rtl"
            className="bg-[#0d1527]/90 backdrop-blur-2xl border border-teal-500/25 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-right"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-400" />
                إعادة جدولة الموعد
              </h3>
              <button
                onClick={() =>
                  setRescheduleData({ ...rescheduleData, isOpen: false })
                }
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              المريض: <b className="text-white">{rescheduleData.patientName}</b>
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                التاريخ والوقت الجديد *
              </label>
              <input
                type="datetime-local"
                required
                min={formatToDateTimeLocal(new Date())}
                value={rescheduleData.newDate}
                onChange={(e) =>
                  setRescheduleData({
                    ...rescheduleData,
                    newDate: e.target.value,
                  })
                }
                className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:border-teal-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() =>
                  setRescheduleData({ ...rescheduleData, isOpen: false })
                }
                className="flex-1 py-2 bg-white/5 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={rescheduleMutation.isPending}
                onClick={() => {
                  const newDateObj = new Date(rescheduleData.newDate);
                  if (isNaN(newDateObj.getTime())) {
                    showToast("تاريخ الموعد الجديد غير صالح", "error");
                    return;
                  }
                  rescheduleMutation.mutate({
                    id: rescheduleData.appointmentId,
                    newDate: newDateObj.toISOString(),
                  });
                }}
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 py-2 rounded-xl text-xs font-bold"
              >
                {rescheduleMutation.isPending
                  ? "جاري الحفظ..."
                  : "تأكيد الجدولة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 نافذة تحويل الموعد إلى فاتورة فورية */}
      {invoiceModal.isOpen && invoiceModal.appointment && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            dir="rtl"
            className="bg-[#0d1527]/90 backdrop-blur-2xl border border-teal-500/25 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-right"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-teal-400" />
                إصدار وطباعة فاتورة الكشف
              </h3>
              <button
                onClick={() =>
                  setInvoiceModal({ ...invoiceModal, isOpen: false })
                }
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#070b14]/60 p-3 rounded-xl border border-white/10 space-y-1 text-xs">
              <p className="text-slate-300">
                المريض:{" "}
                <b className="text-white">
                  {invoiceModal.appointment.patient_name}
                </b>
              </p>
              <p className="text-slate-300">
                الطبيب:{" "}
                <b className="text-teal-400">
                  د. {invoiceModal.appointment.doctor_name}
                </b>
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const price = parseFloat(invoiceModal.itemPrice);
                if (isNaN(price) || price <= 0) {
                  showToast("يرجى إدخال سعر صحيح للبند", "error");
                  return;
                }
                const paid = invoiceModal.paidAmount
                  ? parseFloat(invoiceModal.paidAmount)
                  : 0;
                if (paid > price) {
                  showToast(
                    "المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الفاتورة",
                    "error",
                  );
                  return;
                }

                convertToInvoiceMutation.mutate({
                  patient_id: invoiceModal.appointment.patient_id,
                  appointment_id: invoiceModal.appointment.id,
                  doctor_id: invoiceModal.appointment.doctor_id,
                  appointment_date: invoiceModal.appointment.appointment_date,
                  items: [
                    {
                      description: invoiceModal.itemDescription.trim(),
                      quantity: 1,
                      unit_price: price,
                    },
                  ],
                  initial_payment:
                    paid > 0
                      ? {
                          amount: paid,
                          payment_method: "cash",
                          notes: "دفعة فورية عند تحويل الموعد",
                        }
                      : null,
                });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
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
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
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
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={invoiceModal.autoPrint}
                  onChange={(e) =>
                    setInvoiceModal({
                      ...invoiceModal,
                      autoPrint: e.target.checked,
                    })
                  }
                  className="rounded accent-teal-500 w-4 h-4"
                />
                <span>طباعة الفاتورة فور الإصدار</span>
              </label>

              <div className="flex gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    setInvoiceModal({ ...invoiceModal, isOpen: false })
                  }
                  className="flex-1 py-2 bg-white/5 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={convertToInvoiceMutation.isPending}
                  className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 py-2 rounded-xl text-xs font-bold"
                >
                  {convertToInvoiceMutation.isPending
                    ? "جاري الحفظ..."
                    : "إصدار الفاتورة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 نافذة تأكيد حذف الموعد */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            dir="rtl"
            className="bg-[#0d1527]/95 backdrop-blur-2xl border border-rose-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-right"
          >
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                تأكيد حذف الموعد نهائياً
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              هل أنت متأكد من حذف موعد المريض{" "}
              <b className="text-white">"{deleteModal.patientName}"</b>؟
            </p>
            <div className="flex gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    appointmentId: null,
                    patientName: "",
                  })
                }
                className="flex-1 py-2 bg-white/5 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteAppointmentMutation.isPending}
                onClick={() =>
                  deleteAppointmentMutation.mutate(deleteModal.appointmentId)
                }
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-xs font-bold"
              >
                {deleteAppointmentMutation.isPending
                  ? "جاري الحذف..."
                  : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 التوست الموحد */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border text-sm font-semibold transition-all ${
            toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
              : "bg-teal-950/90 border-teal-500/40 text-teal-200"
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
      {/* محرر الزيارة السريري والروشتة السريعة */}
      <VisitEditorModal
        isOpen={!!visitModalApptId}
        appointmentId={visitModalApptId}
        onClose={() => setVisitModalApptId(null)}
        showToast={showToast}
      />
      {/* المودال الموحد الذكي لحجز المواعيد (يدعم التعبئة المسبقة للطبيب والوقت) */}
      <BookAppointmentModal
        isOpen={bookModalState.isOpen}
        initialDoctorId={bookModalState.initialDoctorId}
        initialDate={bookModalState.initialDate}
        onClose={() =>
          setBookModalState({
            isOpen: false,
            initialDoctorId: "",
            initialDate: "",
          })
        }
      />
    </div>
  );
}
