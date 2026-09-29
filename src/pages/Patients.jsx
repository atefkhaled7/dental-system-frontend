import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import TreatmentPlans from "../components/TreatmentPlans";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import DentalChart from "../components/DentalChart";

export default function Patients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // فورم إضافة مريض جديد
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
    date_of_birth: "",
    medical_alerts: "",
  });

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'appointments' | 'invoices' | 'lab_orders'
  const [showArchived, setShowArchived] = useState(false);

  // 1. جلب المرضى باستخدام useQuery (مع دعم البحث السريع)
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", search, showArchived],
    queryFn: async () => {
      const res = await api.get("/patients", {
        params: {
          ...(search ? { search } : {}),
          archived: showArchived,
        },
      });
      return res.data.patients || [];
    },
  });

  // 1. جلب مواعيد المريض المحدد
  const { data: patientAppointments = [], isLoading: isLoadingAppointments } =
    useQuery({
      queryKey: ["patient-appointments", selectedPatient?.id],
      queryFn: async () => {
        if (!selectedPatient?.id) return [];
        const res = await api.get("/appointments", {
          params: { patient_id: selectedPatient.id },
        });
        return res.data.appointments || [];
      },
      enabled: !!selectedPatient?.id,
    });

  // 2. جلب فواتير المريض المحدد
  const { data: patientInvoices = [], isLoading: isLoadingInvoices } = useQuery(
    {
      queryKey: ["patient-invoices", selectedPatient?.id],
      queryFn: async () => {
        if (!selectedPatient?.id) return [];
        const res = await api.get("/invoices", {
          params: { patient_id: selectedPatient.id },
        });
        // getInvoices بترجع array مباشرة
        return Array.isArray(res.data) ? res.data : res.data.invoices || [];
      },
      enabled: !!selectedPatient?.id,
    }
  );

  // 3. جلب طلبات معمل المريض المحدد
  const { data: patientLabOrders = [], isLoading: isLoadingLabOrders } =
    useQuery({
      queryKey: ["patient-lab-orders", selectedPatient?.id],
      queryFn: async () => {
        if (!selectedPatient?.id) return [];
        // تأكد لو مسار الراوت عندك /lab-orders أو /laborders
        const res = await api.get("/lab-orders", {
          params: { patient_id: selectedPatient.id },
        });
        return res.data.lab_orders || [];
      },
      enabled: !!selectedPatient?.id,
    });

  // قاموس ترجمة الحالات وتنسيق ألوانها
  const STATUS_MAP = {
    // فواتير
    paid: {
      label: "مدفوعة",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    pending: {
      label: "معلقة / غير مدفوعة",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    partially_paid: {
      label: "مدفوعة جزئياً",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    cancelled: {
      label: "ملغاة",
      color: "bg-red-500/10 text-red-400 border-red-500/20",
    },

    // مواعيد
    scheduled: {
      label: "مجدول",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    confirmed: {
      label: "مؤكد",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    completed: {
      label: "مكتمل",
      color: "bg-slate-700 text-slate-300 border-slate-600",
    },
    no_show: {
      label: "لم يحضر",
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },

    // طلبات معمل
    sent: {
      label: "تم الإرسال للمعمل",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    in_progress: {
      label: "قيد التنفيذ",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    ready: {
      label: "جاهز للتسليم",
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    received: {
      label: "تم الاستلام بالعيادة",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
  };

  // دالة مساعدة للعرض
  const renderStatusBadge = (status) => {
    if (!status) return "-";
    const normalized = status.toLowerCase();
    const config = STATUS_MAP[normalized] || {
      label: status,
      color: "bg-slate-800 text-slate-400 border-slate-700",
    };
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  // نافذة تعديل المريض
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
    medical_alerts: "",
  });

  // نافذة تأكيد الأرشفة
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // حالة التوست
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 2. إضافة مريض جديد باستخدام useMutation
  const addPatientMutation = useMutation({
    mutationFn: async (newPatient) => {
      const res = await api.post("/patients", newPatient);
      return res.data;
    },
    onSuccess: () => {
      // تحديث كاش المرضى فوراً لمسح الداتا القديمة وسحب الجديد
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsModalOpen(false); // قفل النافذة
      setFormData({
        name: "",
        phone_number: "",
        gender: "Male",
        date_of_birth: "",
        medical_alerts: "",
      });
      showToast("تمت إضافة المريض بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء إضافة المريض",
        "error"
      );
    },
  });

  const restorePatientMutation = useMutation({
    mutationFn: async (patientId) => {
      const res = await api.patch(`/patients/${patientId}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setSelectedPatient(null);
      showToast("تمت استعادة المريض بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء استعادة المريض",
        "error"
      );
    },
  });

  const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!PHONE_REGEX.test(formData.phone_number.trim())) {
      showToast("رقم الهاتف غير صالح (أرقام فقط من 10 إلى 15 رقم)", "error");
      return;
    }
    if (formData.date_of_birth) {
      const selectedDate = new Date(formData.date_of_birth);
      if (selectedDate > new Date()) {
        showToast("تاريخ الميلاد لا يمكن أن يكون في المستقبل", "error");
        return;
      }
    }
    addPatientMutation.mutate(formData);
  };

  // دالة فتح نافذة التعديل وتعبئة البيانات القديمة
  const handleEditClick = (patient) => {
    setEditFormData({
      name: patient.name || "",
      phone_number: patient.phone_number || "",
      gender: patient.gender || "Male",
      medical_alerts: patient.medical_alerts || "",
    });
    setIsEditModalOpen(true);
  };

  // دالة فتح تأكيد الأرشفة
  const handleArchiveClick = () => {
    setIsArchiveConfirmOpen(true);
  };

  // 1. Mutation تعديل المريض
  const updatePatientMutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await api.put(`/patients/${selectedPatient.id}`, updatedData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      // تحديث بيانات المريض المفتوح في البروفايل فوراً
      setSelectedPatient(data.patient);
      setIsEditModalOpen(false);
      showToast("تم تحديث بيانات المريض بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء تعديل المريض",
        "error"
      );
    },
  });

  // معالجة فورم التعديل مع التحقق من التليفون
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!PHONE_REGEX.test(editFormData.phone_number.trim())) {
      showToast("رقم الهاتف غير صالح (أرقام فقط من 10 إلى 15 رقم)", "error");
      return;
    }
    updatePatientMutation.mutate(editFormData);
  };

  // 2. Mutation أرشفة المريض
  const archivePatientMutation = useMutation({
    mutationFn: async (patientId) => {
      const res = await api.delete(`/patients/${patientId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsArchiveConfirmOpen(false);
      setSelectedPatient(null); // قفل البروفايل لأن المريض اتشال من القائمة النشطة
      showToast("تم أرشفة ملف المريض بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء أرشفة المريض",
        "error"
      );
    },
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
      {/* الهيدر العلوي وزرار الإضافة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-500" />
            سجل المرضى
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            إدارة ملفات المرضى وتاريخهم الطبي
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مريض جديد</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* خانة البحث */}
        <div className="relative max-w-md w-full">
          <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-11 pl-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* زرار عرض الأرشيف / النشطين */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
            showArchived
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          {showArchived ? "العودة للمرضى النشطين" : "عرض الأرشيف"}
        </button>
      </div>

      {/* جدول المرضى */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span>جاري تحميل بيانات المرضى...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-500 gap-2">
            {search ? (
              <>
                <Search className="w-8 h-8 text-slate-600 mb-1" />
                <p className="text-white font-medium">لا توجد نتائج بحث</p>
                <p className="text-xs text-slate-400">
                  لم نجد أي مريض يطابق بحثك عن: "{search}"
                </p>
              </>
            ) : (
              <>
                <Users className="w-8 h-8 text-slate-600 mb-1" />
                <p className="text-white font-medium">
                  لا يوجد مرضى مسجلين حتى الآن
                </p>
                <p className="text-xs text-slate-400">
                  اضغط على "إضافة مريض جديد" في الأعلى لإضافة أول مريض للعيادة.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 font-semibold">اسم المريض</th>
                  <th className="py-4 px-6 font-semibold">رقم الهاتف</th>
                  <th className="py-4 px-6 font-semibold">النوع</th>
                  <th className="py-4 px-6 font-semibold">
                    التنبيهات الطبية (حساسية/أمراض)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setActiveTab("overview");
                    }}
                    className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-white">
                      {patient.name}
                    </td>
                    <td className="py-4 px-6 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span dir="ltr">{patient.phone_number}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          patient.gender === "Female"
                            ? "bg-pink-500/10 text-pink-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {patient.gender === "Female" ? "أنثى" : "ذكر"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {patient.medical_alerts ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {patient.medical_alerts}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">لا يوجد</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إضافة مريض جديد (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                إضافة مريض جديد
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="محمد أحمد"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder="01012345678"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    النوع
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    تاريخ الميلاد
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date_of_birth: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  التنبيهات الطبية (حساسية بنج / أمراض مزمنة)
                </label>
                <textarea
                  rows="2"
                  value={formData.medical_alerts}
                  onChange={(e) =>
                    setFormData({ ...formData, medical_alerts: e.target.value })
                  }
                  placeholder="مثال: حساسية من البنسلين، مريض سكر..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
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
                  disabled={addPatientMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {addPatientMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ المريض"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* نافذة الملف الشخصي للمريض (Patient Profile Modal - Responsive Native Feel) */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50">
          <div
            className={`bg-slate-900 border-0 sm:border border-slate-800 w-full h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
              activeTab === "dental_chart"
                ? "sm:max-w-[1050px]"
                : "sm:max-w-2xl"
            }`}
          >
            {/* 1. هيدر البروفايل الثابت */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-base shrink-0">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div className="truncate">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">
                    {selectedPatient.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span dir="ltr" className="font-mono">
                      {selectedPatient.phone_number}
                    </span>
                    <span>•</span>
                    <span>
                      {selectedPatient.gender === "Female" ? "أنثى" : "ذكر"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. شريط التبويبات المتجاوب (سكرول أفقي ناعم بدون كسر سطور) */}
            <div className="flex border-b border-slate-800 px-3 sm:px-6 gap-2 sm:gap-6 text-xs sm:text-sm font-medium bg-slate-950/30 overflow-x-auto whitespace-nowrap shrink-0">
              {[
                { id: "overview", label: "نظرة عامة" },
                { id: "dental_chart", label: "مخطط الأسنان 🦷" },
                { id: "treatment_plans", label: "خطط العلاج 📋" },
                { id: "appointments", label: "المواعيد" },
                { id: "invoices", label: "الفواتير" },
                { id: "lab_orders", label: "طلبات المعمل" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-2 sm:px-1 border-b-2 transition-colors shrink-0 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-400 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 3. محتوى التبويب المختار (سكرول داخلي رأسي) */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                      <span className="text-xs text-slate-500 block mb-1">
                        تاريخ الميلاد والسن
                      </span>
                      <span className="text-sm font-medium text-white">
                        {selectedPatient.date_of_birth
                          ? `${selectedPatient.date_of_birth.split("T")[0]} (${
                              new Date().getFullYear() -
                              new Date(
                                selectedPatient.date_of_birth
                              ).getFullYear()
                            } سنة)`
                          : "غير محدد"}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                      <span className="text-xs text-slate-500 block mb-1">
                        النوع
                      </span>
                      <span className="text-sm font-medium text-white">
                        {selectedPatient.gender === "Female" ? "أنثى" : "ذكر"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-xs text-slate-500 block mb-1">
                      التنبيهات الطبية والحساسية
                    </span>
                    {selectedPatient.medical_alerts ? (
                      <div className="flex items-center gap-2 text-amber-400 text-sm mt-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{selectedPatient.medical_alerts}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">
                        لا توجد تنبيهات طبية مسجلة
                      </span>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "dental_chart" && (
                <DentalChart
                  patientId={selectedPatient.id}
                  showToast={showToast}
                />
              )}

              {activeTab === "treatment_plans" && (
                <TreatmentPlans
                  patientId={selectedPatient.id}
                  showToast={showToast}
                />
              )}

              {/* تبويب المواعيد */}
              {activeTab === "appointments" && (
                <div>
                  {isLoadingAppointments ? (
                    <div className="py-8 flex justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : patientAppointments.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      لا توجد مواعيد مسجلة لهذا المريض حتى الآن.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">تاريخ الموعد</th>
                            <th className="py-2.5 px-3">الطبيب</th>
                            <th className="py-2.5 px-3">الحالة</th>
                            <th className="py-2.5 px-3">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {patientAppointments.map((app) => (
                            <tr key={app.appointment_id}>
                              <td className="py-2.5 px-3 font-medium text-white">
                                {new Date(app.appointment_date).toLocaleString(
                                  "ar-EG"
                                )}
                              </td>
                              <td className="py-2.5 px-3">{app.doctor_name}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                  {renderStatusBadge(app.status)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">
                                {app.notes || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* تبويب الفواتير */}
              {activeTab === "invoices" && (
                <div>
                  {isLoadingInvoices ? (
                    <div className="py-8 flex justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : patientInvoices.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      لا توجد فواتير صادرة لهذا المريض حتى الآن.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">رقم الفاتورة</th>
                            <th className="py-2.5 px-3">الإجمالي</th>
                            <th className="py-2.5 px-3">المدفوع</th>
                            <th className="py-2.5 px-3">المتبقي</th>
                            <th className="py-2.5 px-3">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {patientInvoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="py-2.5 px-3 font-mono text-white">
                                #{inv.id}
                              </td>
                              <td className="py-2.5 px-3 font-medium">
                                {inv.total_amount} ج.م
                              </td>
                              <td className="py-2.5 px-3 text-emerald-400">
                                {inv.paid_amount} ج.م
                              </td>
                              <td className="py-2.5 px-3 text-amber-400">
                                {inv.remaining_amount} ج.م
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {renderStatusBadge(inv.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* تبويب طلبات المعمل */}
              {activeTab === "lab_orders" && (
                <div>
                  {isLoadingLabOrders ? (
                    <div className="py-8 flex justify-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  ) : patientLabOrders.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      لا توجد طلبات معمل مسجلة لهذا المريض حتى الآن.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">رقم الحالة</th>
                            <th className="py-2.5 px-3">اسم المعمل</th>
                            <th className="py-2.5 px-3">برنامج التصميم</th>
                            <th className="py-2.5 px-3">الطبيب</th>
                            <th className="py-2.5 px-3">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {patientLabOrders.map((order) => (
                            <tr key={order.id}>
                              <td className="py-2.5 px-3 font-mono text-white">
                                {order.case_number || `#${order.id}`}
                              </td>
                              <td className="py-2.5 px-3">{order.lab_name}</td>
                              <td className="py-2.5 px-3 text-blue-400">
                                {order.design_software || "-"}
                              </td>
                              <td className="py-2.5 px-3">
                                {order.doctor_name}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {renderStatusBadge(order.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* أزرار الإجراءات في الأسفل (ثابتة في الموبايل والديسكتوب) */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex justify-between gap-3 shrink-0">
              {showArchived ? (
                <button
                  type="button"
                  onClick={() =>
                    restorePatientMutation.mutate(selectedPatient.id)
                  }
                  disabled={restorePatientMutation.isPending}
                  className="px-3 sm:px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-950/50 border border-emerald-900/50 rounded-xl transition-colors"
                >
                  {restorePatientMutation.isPending
                    ? "جاري الاستعادة..."
                    : "استعادة المريض للقائمة"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleArchiveClick(selectedPatient)}
                  className="px-3 sm:px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-950/50 border border-red-900/50 rounded-xl transition-colors"
                >
                  أرشفة ملف المريض
                </button>
              )}

              <button
                type="button"
                onClick={() => handleEditClick(selectedPatient)}
                className="px-4 sm:px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-lg shadow-blue-600/20"
              >
                تعديل البيانات
              </button>
            </div>
          </div>
        </div>
      )}
      {/* نافذة تأكيد الأرشفة */}
      {isArchiveConfirmOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  تأكيد أرشفة المريض
                </h3>
                <p className="text-xs text-slate-400">
                  هذا الإجراء ينقل المريض إلى الأرشيف
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              هل أنت متأكد من رغبتك في أرشفة ملف المريض{" "}
              <span className="font-bold text-white">
                "{selectedPatient.name}"
              </span>
              ؟ لن يظهر المريض في القائمة النشطة.
            </p>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsArchiveConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={archivePatientMutation.isPending}
                onClick={() =>
                  archivePatientMutation.mutate(selectedPatient.id)
                }
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {archivePatientMutation.isPending
                  ? "جاري الأرشفة..."
                  : "تأكيد الأرشفة"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* نافذة تعديل بيانات المريض (Edit Modal) */}
      {isEditModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl font-bold text-white">
                تعديل بيانات المريض
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.phone_number}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  النوع
                </label>
                <select
                  value={editFormData.gender}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, gender: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Male">ذكر</option>
                  <option value="Female">أنثى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  التنبيهات الطبية (حساسية / أمراض مزمنة)
                </label>
                <textarea
                  rows="2"
                  value={editFormData.medical_alerts}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      medical_alerts: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updatePatientMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {updatePatientMutation.isPending
                    ? "جاري التحديث..."
                    : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
