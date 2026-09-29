import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  RefreshCw,
  Trash2,
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
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  // حالة التحكم في الـ Combobox الذكي
  const [patientInput, setPatientInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // فورم حجز الميعاد
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_date: getCurrentDateTimeLocal(),
    notes: "",
  });

  // فورم إضافة مريض سريع
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
  });

  // 1. فلاتر التاريخ والطبيب
  const [filterDate, setFilterDate] = useState(""); // "" يعني الكل، أو تاريخ YYYY-MM-DD
  const [filterDoctor, setFilterDoctor] = useState(""); // "" يعني كل الأطباء

  // 2. نظام التوست الموحد (نفس صفحة patients)
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 3. حالة مودال إعادة الجدولة
  const [rescheduleData, setRescheduleData] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
    currentDate: "",
    newDate: "",
  });

  // 4. حالة مودال تحويل الموعد لفاتورة سريعة
  const [invoiceModal, setInvoiceModal] = useState({
    isOpen: false,
    appointment: null,
    itemDescription: "كشف / استشارة",
    itemPrice: "",
    paidAmount: "",
  });

  // حالة مودال تأكيد الحذف النهائي
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: "",
  });

  // جلب المواعيد مع دعم الفلاتر والـ Retry
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

  // 2. جلب المرضى
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients");
      return res.data.patients || [];
    },
  });

  // 3. جلب الدكاترة
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await api.get("/auth/doctors");
      return res.data.doctors || [];
    },
  });

  // 4. حجز الميعاد
  const createAppointmentMutation = useMutation({
    mutationFn: async (newAppointment) => {
      const res = await api.post("/appointments", newAppointment);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsModalOpen(false);
      setFormData({
        patient_id: "",
        doctor_id: "",
        appointment_date: getCurrentDateTimeLocal(),
        notes: "",
      });
      setPatientInput("");
      showToast("تم حجز الميعاد بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء حجز الميعاد",
        "error"
      );
    },
  });

  // 5. إضافة مريض سريع
  const createPatientMutation = useMutation({
    mutationFn: async (patient) => {
      const res = await api.post("/patients", patient);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setFormData((prev) => ({ ...prev, patient_id: data.patient.id }));
      setPatientInput(data.patient.name);
      setIsNewPatientModalOpen(false);
      setIsDropdownOpen(false);
      setNewPatientData({ name: "", phone_number: "", gender: "Male" });
      showToast("تمت إضافة المريض بنجاح واختياره", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل إضافة المريض", "error");
    },
  });

  // 6. تحديث حالة الميعاد
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/appointments/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      showToast("تم تحديث حالة الميعاد بنجاح", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل تحديث الحالة", "error");
    },
  });

  // 1. إعادة الجدولة
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

  // 2. تحويل الموعد إلى فاتورة
  const convertToInvoiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/invoices", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setInvoiceModal({
        isOpen: false,
        appointment: null,
        itemDescription: "كشف / استشارة",
        itemPrice: "",
        paidAmount: "",
      });
      showToast("تم إصدار الفاتورة للموعد بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء إنشاء الفاتورة",
        "error"
      );
    },
  });

  // Mutation حذف الموعد
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
      // لو الموعد مربوط بفاتورة نشطة هتطلع الرسالة بالتوست فوراً
      showToast(err.response?.data?.error || "فشل حذف الموعد", "error");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patient_id) {
      alert("يرجى اختيار مريض من القائمة");
      return;
    }
    createAppointmentMutation.mutate({
      ...formData,
      appointment_date: new Date(formData.appointment_date).toISOString(),
    });
  };

  const handleQuickPatientSubmit = (e) => {
    e.preventDefault();
    createPatientMutation.mutate(newPatientData);
  };

  // فلترة المرضى حسب اللي بيتكتب في الخانة
  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientInput.toLowerCase()) ||
      p.phone_number.includes(patientInput)
  );

  // اختيار مريض من القائمة المنسدلة العائمة
  const handleSelectPatient = (patient) => {
    setFormData((prev) => ({ ...prev, patient_id: patient.id }));
    setPatientInput(patient.name);
    setIsDropdownOpen(false);
  };

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
      bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    completed: {
      label: "مكتمل",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    cancelled: {
      label: "ملغي",
      bg: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    no_show: {
      label: "لم يحضر",
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  };

  return (
    <div className="space-y-6">
      {/* الهيدر */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-blue-500" />
            جدول المواعيد
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            متابعة الحجوزات وتنظيم مواعيد العيادة
          </p>
        </div>

        <button
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              appointment_date: getCurrentDateTimeLocal(),
            }));
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>حجز ميعاد جديد</span>
        </button>
      </div>

      {/* شريط الفلاتر الذكي (اليوم / غداً / تاريخ مخصص / الطبيب) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 ml-2">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            فلترة المواعيد:
          </span>

          {/* أزرار سريعة للتاريخ */}
          <button
            onClick={() => setFilterDate("")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              filterDate === ""
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterDate(getTodayString())}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              filterDate === getTodayString()
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            مواعيد اليوم
          </button>
          <button
            onClick={() => setFilterDate(getTomorrowString())}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              filterDate === getTomorrowString()
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            مواعيد الغد
          </button>

          {/* اختيار تاريخ مخصص */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* اختيار الطبيب المعالج */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">جميع الأطباء</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                د. {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* جدول المواعيد بكل حالاته (Loading / Error / Empty / Data) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* 1. حالة الـ Loading */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm">جاري تحميل جدول المواعيد...</span>
          </div>
        ) : isError ? (
          /* 2. حالة الـ Backend Error مع زر الـ Retry */
          <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <p className="text-white font-medium">
              حدث خطأ أثناء تحميل جدول المواعيد
            </p>
            <p className="text-xs text-slate-400">
              {error?.response?.data?.error ||
                "تعذر الاتصال بالسيرفر، تأكد من اتصالك وجرب مجدداً"}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة المحاولة
            </button>
          </div>
        ) : appointments.length === 0 ? (
          /* 3. حالات الـ Empty State */
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            {filterDate || filterDoctor ? (
              <>
                <Filter className="w-8 h-8 text-slate-600 mb-1" />
                <p className="text-white font-medium">
                  لا توجد مواعيد بهذه الفلاتر
                </p>
                <p className="text-xs text-slate-400 mb-2">
                  لم يتم العثور على أي حجز مطابق لخيارات التاريخ أو الطبيب
                  المحددة.
                </p>
                <button
                  onClick={() => {
                    setFilterDate("");
                    setFilterDoctor("");
                  }}
                  className="text-xs text-blue-400 hover:underline"
                >
                  إعادة ضبط الفلاتر وعرض الكل
                </button>
              </>
            ) : (
              <>
                <CalendarIcon className="w-8 h-8 text-slate-600 mb-1" />
                <p className="text-white font-medium">
                  لا توجد مواعيد محجوزة حتى الآن
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  جدول العيادة فارغ حالياً، يمكنك بدء حجز ميعاد جديد الآن.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  حجز ميعاد جديد
                </button>
              </>
            )}
          </div>
        ) : (
          /* 4. عرض البيانات */
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 font-semibold">المريض</th>
                  <th className="py-4 px-6 font-semibold">الطبيب المعالج</th>
                  <th className="py-4 px-6 font-semibold">
                    تاريخ ووقت الميعاد
                  </th>
                  <th className="py-4 px-6 font-semibold">الحالة</th>
                  <th className="py-4 px-6 font-semibold text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {appointments.map((apt) => (
                  <tr
                    key={apt.appointment_id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <p className="font-medium text-white">
                        {apt.patient_name}
                      </p>
                      <span
                        className="text-xs text-slate-400 font-mono"
                        dir="ltr"
                      >
                        {apt.patient_phone}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400" />
                        <span>د. {apt.doctor_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-slate-300 font-mono">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span dir="ltr">
                          {formatDateTime(apt.appointment_date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                          statusConfig[apt.status]?.bg ||
                          "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {statusConfig[apt.status]?.label || apt.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        {/* أزرار تغيير الحالة إذا كان الموعد مجدولاً */}
                        {apt.status === "scheduled" && (
                          <>
                            <button
                              title="اكتمل الكشف"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: apt.appointment_id,
                                  status: "completed",
                                })
                              }
                              className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button
                              title="لم يحضر"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: apt.appointment_id,
                                  status: "no_show",
                                })
                              }
                              className="p-1.5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors"
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                            <button
                              title="إلغاء الميعاد"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: apt.appointment_id,
                                  status: "cancelled",
                                })
                              }
                              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}

                        {/* زر إعادة الجدولة (شغال لكل المواعيد لتعديل وقت الحجز) */}
                        <button
                          title="إعادة جدولة الموعد"
                          onClick={() =>
                            setRescheduleData({
                              isOpen: true,
                              appointmentId: apt.appointment_id,
                              patientName: apt.patient_name,
                              currentDate: apt.appointment_date,
                              newDate: getCurrentDateTimeLocal(),
                            })
                          }
                          className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* 🌟 الزر المباشر لتحويل الموعد إلى فاتورة */}
                        <button
                          title="تحويل الموعد إلى فاتورة فورية"
                          onClick={() =>
                            setInvoiceModal({
                              isOpen: true,
                              appointment: apt,
                              itemDescription: "كشف عيادة / استشارة",
                              itemPrice: "",
                              paidAmount: "",
                            })
                          }
                          className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        {/* زر مسح الموعد نهائياً */}
                        <button
                          title="حذف الموعد نهائياً"
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              appointmentId: apt.appointment_id,
                              patientName: apt.patient_name,
                            })
                          }
                          className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* نافذة حجز ميعاد جديد */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                حجز ميعاد جديد
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 🌟 الـ Combobox الموحد: خانة بحث واختيار المريض معاً */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    المريض *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewPatientModalOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ مريض جديد</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={patientInput}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setPatientInput(e.target.value);
                      setFormData((prev) => ({ ...prev, patient_id: "" })); // تصفير الاختيار لحين الضغط على اسم
                      setIsDropdownOpen(true);
                    }}
                    className={`w-full bg-slate-950 border ${
                      formData.patient_id
                        ? "border-emerald-500/50"
                        : "border-slate-700"
                    } rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors`}
                  />
                  {formData.patient_id && (
                    <Check className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  )}
                </div>

                {/* القائمة العائمة الذكية (Dropdown List) */}
                {isDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {filteredPatients.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-xs">
                        لا يوجد مريض بهذا الاسم. اضغط على "+ مريض جديد" بالأعلى.
                      </div>
                    ) : (
                      filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-3 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between text-sm transition-colors"
                        >
                          <span className="font-medium text-white">
                            {p.name}
                          </span>
                          <span
                            className="text-xs text-slate-400 font-mono"
                            dir="ltr"
                          >
                            {p.phone_number}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* اختيار الدكتور */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  الطبيب المعالج *
                </label>
                <select
                  required
                  value={formData.doctor_id}
                  onChange={(e) =>
                    setFormData({ ...formData, doctor_id: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="">-- اختر الطبيب المعالج --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      د. {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* التاريخ والوقت */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  تاريخ ووقت الميعاد *
                </label>
                <input
                  type="datetime-local"
                  required
                  min={getCurrentDateTimeLocal()}
                  value={formData.appointment_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      appointment_date: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  ملاحظات الكشف
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="مثال: كشف أولي، فحص ألم في الفك..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {createAppointmentMutation.isPending
                    ? "جاري الحجز..."
                    : "تأكيد الحجز"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة مريض سريع */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              إضافة مريض سريعاً
            </h3>

            <form onSubmit={handleQuickPatientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  placeholder="محمد علي"
                  value={newPatientData.name}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={newPatientData.phone_number}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  النوع
                </label>
                <select
                  value={newPatientData.gender}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      gender: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Male">ذكر</option>
                  <option value="Female">أنثى</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-medium"
                >
                  {createPatientMutation.isPending
                    ? "جاري الإضافة..."
                    : "حفظ واختيار"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. نافذة إعادة الجدولة (Reschedule Modal) */}
      {rescheduleData.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
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

            <p className="text-xs text-slate-400">
              تعديل موعد المريض:{" "}
              <span className="font-bold text-white">
                {rescheduleData.patientName}
              </span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setRescheduleData({ ...rescheduleData, isOpen: false })
                }
                className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
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
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              >
                {rescheduleMutation.isPending
                  ? "جاري الحفظ..."
                  : "تأكيد الجدولة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. نافذة تحويل الموعد إلى فاتورة فورية (Convert to Invoice Modal) */}
      {invoiceModal.isOpen && invoiceModal.appointment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                إصدار فاتورة من الموعد
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

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-300">
                المريض:{" "}
                <span className="font-bold text-white">
                  {invoiceModal.appointment.patient_name}
                </span>
              </p>
              <p className="text-slate-300">
                الطبيب:{" "}
                <span className="font-bold text-blue-400">
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
                          notes: "دفعة فورية عند تحويل الموعد",
                        }
                      : null,
                };

                convertToInvoiceMutation.mutate(payload);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  وصف الخدمة / البند *
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setInvoiceModal({ ...invoiceModal, isOpen: false })
                  }
                  className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={convertToInvoiceMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {convertToInvoiceMutation.isPending
                    ? "جاري الإصدار..."
                    : "إصدار الفاتورة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. التوست الموحد (بنفس كلاس z-[100] ليظهر فوق أي نافذة) */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom-5 ${
            toast.type === "error"
              ? "bg-red-950/90 border-red-800 text-red-200"
              : "bg-emerald-950/90 border-emerald-800 text-emerald-200"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
          )}
          <span>{toast.message}</span>
        </div>
      )}
      {/* نافذة تأكيد حذف الموعد */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  تأكيد حذف الموعد
                </h3>
                <p className="text-xs text-slate-400">
                  هذا الإجراء سيحذف الموعد نهائياً من قاعدة البيانات
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              هل أنت متأكد من حذف موعد المريض{" "}
              <span className="font-bold text-white">
                "{deleteModal.patientName}"
              </span>
              ؟
            </p>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    appointmentId: null,
                    patientName: "",
                  })
                }
                className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deleteAppointmentMutation.isPending}
                onClick={() =>
                  deleteAppointmentMutation.mutate(deleteModal.appointmentId)
                }
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              >
                {deleteAppointmentMutation.isPending
                  ? "جاري الحذف..."
                  : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
