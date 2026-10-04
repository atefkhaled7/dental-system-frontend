import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import DentalChart from "../components/DentalChart";
import TreatmentPlans from "../components/TreatmentPlans";
import MedicalImages from "../components/MedicalImages";
import {
  ArrowRight,
  Phone,
  Calendar,
  AlertTriangle,
  Clock,
  Receipt,
  Package,
  Loader2,
  Check,
  Edit,
  Archive,
  RotateCcw,
  X,
} from "lucide-react";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview"); // overview | dental_chart | treatment_plans | medical_images | appointments | invoices | lab_orders
  const [selectedToothForImages, setSelectedToothForImages] = useState(null);
  const [toast, setToast] = useState(null);

  // نوافذ التعديل والتأكيد
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
    date_of_birth: "",
    medical_alerts: "",
  });
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleNavigateToImages = (toothNumber) => {
    setSelectedToothForImages(toothNumber);
    setActiveTab("medical_images");
  };

  // 1. جلب بيانات المريض من الـ ID
  const {
    data: patient,
    isLoading: isLoadingPatient,
    isError,
  } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`);
      return res.data.patient || res.data;
    },
  });

  // 2. جلب مواعيد المريض
  const { data: appointments = [], isLoading: isLoadingAppointments } =
    useQuery({
      queryKey: ["patient-appointments", id],
      queryFn: async () => {
        const res = await api.get("/appointments", {
          params: { patient_id: id },
        });
        return res.data.appointments || [];
      },
      enabled: activeTab === "appointments",
      staleTime: 0,
    });

  // 3. جلب فواتير المريض
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["patient-invoices", id],
    queryFn: async () => {
      const res = await api.get("/invoices", {
        params: { patient_id: id },
      });
      return Array.isArray(res.data) ? res.data : res.data.invoices || [];
    },
    enabled: activeTab === "invoices",
    staleTime: 0,
  });

  // 4. جلب طلبات معمل المريض
  const { data: labOrders = [], isLoading: isLoadingLabOrders } = useQuery({
    queryKey: ["patient-lab-orders", id],
    queryFn: async () => {
      const res = await api.get("/lab-orders", {
        params: { patient_id: id },
      });
      return res.data.lab_orders || [];
    },
    enabled: activeTab === "lab_orders",
    staleTime: 0,
  });

  // ترجمة الشارات
  const STATUS_MAP = {
    paid: {
      label: "مدفوعة",
      color:
        "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]/20",
    },
    pending: {
      label: "معلقة",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/20",
    },
    needs_review: {
      label: "تحتاج مراجعة",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/20",
    },
    partially_paid: {
      label: "مدفوعة جزئياً",
      color:
        "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/20",
    },
    cancelled: {
      label: "ملغاة",
      color:
        "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-text)]/20",
    },
    scheduled: {
      label: "مجدول",
      color:
        "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/20",
    },
    confirmed: {
      label: "مؤكد",
      color:
        "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]/20",
    },
    completed: {
      label: "مكتمل",
      color:
        "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-default)]",
    },
    no_show: {
      label: "لم يحضر",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/20",
    },
    sent: {
      label: "تم الإرسال للمعمل",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/20",
    },
    in_progress: {
      label: "قيد التنفيذ",
      color:
        "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/20",
    },
    ready: {
      label: "جاهز للتسليم",
      color:
        "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/20",
    },
    received: {
      label: "تم الاستلام بالعيادة",
      color:
        "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]/20",
    },
    unpaid: {
      label: "غير مدفوعة",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/20",
    },
    sent_to_lab: {
      label: "عند المعمل",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/20",
    },
  };

  const renderStatusBadge = (status) => {
    if (!status) return "-";
    const normalized = status.toLowerCase().trim();
    const config = STATUS_MAP[normalized] || {
      label: status,
      color:
        "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]",
    };
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-[var(--radius-pill)] border text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  // تعديل بيانات المريض
  const updatePatientMutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await api.put(`/patients/${id}`, updatedData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
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

  // أرشفة المريض
  const archivePatientMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/patients/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      showToast("تم أرشفة ملف المريض بنجاح", "success");
      navigate("/patients");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "حدث خطأ أثناء الأرشفة", "error");
    },
  });

  // استعادة المريض
  const restorePatientMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/patients/${id}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      showToast("تمت استعادة المريض بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء الاستعادة",
        "error"
      );
    },
  });

  const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

  const handleEditOpen = () => {
    setEditFormData({
      name: patient?.name || "",
      phone_number: patient?.phone_number || "",
      gender: patient?.gender || "Male",
      date_of_birth: patient?.date_of_birth
        ? patient.date_of_birth.split("T")[0]
        : "",
      medical_alerts: patient?.medical_alerts || "",
    });
    setIsEditModalOpen(true);
  };

  if (isLoadingPatient) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[var(--primary-base)]" />
        <span className="text-sm font-medium">جاري فتح ملف المريض...</span>
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="w-10 h-10 text-[var(--danger-text)]" />
        <h2 className="text-lg font-bold text-[var(--text-main)]">
          لم يتم العثور على المريض
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          قد يكون تم حذفه أو أن الرابط غير صحيح
        </p>
        <button
          onClick={() => navigate("/patients")}
          className="mt-2 px-4 py-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
        >
          العودة لقائمة المرضى
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* 🌟 Toast Notification */}
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

      {/* 🌟 شريط العودة + كارت معلومات المريض الأساسي (Header Bar) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <button
              onClick={() => navigate("/patients")}
              title="العودة لقائمة المرضى"
              className="p-2.5 rounded-[var(--radius-btn)] bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors shrink-0"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-[var(--radius-card)] bg-[var(--primary-muted)] border border-[var(--primary-base)]/25 flex items-center justify-center text-[var(--primary-base)] font-bold text-xl shrink-0">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-[var(--text-main)]">
                  {patient.name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                  {patient.gender === "Female" ? "أنثى" : "ذكر"}
                </span>
                {patient.is_active === false && (
                  <span className="text-xs px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-text)]/25">
                    مؤرشف
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] mt-1.5">
                <span className="flex items-center gap-1.5 font-mono" dir="ltr">
                  <Phone className="w-3.5 h-3.5" />
                  {patient.phone_number}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {patient.date_of_birth
                    ? `${patient.date_of_birth.split("T")[0]} (${
                        new Date().getFullYear() -
                        new Date(patient.date_of_birth).getFullYear()
                      } سنة)`
                    : "تاريخ الميلاد غير محدد"}
                </span>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات على المريض */}
          <div className="flex items-center gap-2.5 self-end lg:self-center">
            {patient.is_active === false ? (
              <button
                onClick={() => restorePatientMutation.mutate()}
                disabled={restorePatientMutation.isPending}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[var(--success-text)] hover:bg-[var(--success-bg)] border border-[var(--success-text)]/30 rounded-[var(--radius-btn)] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>استعادة المريض</span>
              </button>
            ) : (
              <button
                onClick={() => setIsArchiveConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)] border border-[var(--danger-text)]/30 rounded-[var(--radius-btn)] transition-colors"
              >
                <Archive className="w-4 h-4" />
                <span>أرشفة الملف</span>
              </button>
            )}
            <button
              onClick={handleEditOpen}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white rounded-[var(--radius-btn)] transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4" />
              <span>تعديل البيانات</span>
            </button>
          </div>
        </div>

        {/* تنبيه طبي سريع لو موجود */}
        {patient.medical_alerts && (
          <div className="mt-4 pt-3.5 border-t border-[var(--border-default)] flex items-center gap-2 text-xs text-[var(--warning-text)] bg-[var(--warning-bg)]/40 p-2.5 rounded-[var(--radius-btn)] border border-[var(--warning-text)]/20">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">تنبيه طبي:</span>
            <span>{patient.medical_alerts}</span>
          </div>
        )}
      </div>

      {/* 🌟 شريط التبويبات الفخم ملء الشاشة */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden shadow-xl">
        <div className="flex border-b border-[var(--border-default)] px-4 sm:px-6 gap-2 sm:gap-6 text-xs sm:text-sm font-medium bg-[var(--bg-app)] overflow-x-auto whitespace-nowrap">
          {[
            { id: "overview", label: "نظرة عامة" },
            { id: "dental_chart", label: "مخطط الأسنان 🦷" },
            { id: "treatment_plans", label: "خطط العلاج 📋" },
            { id: "medical_images", label: "الصور والأشعة 📸" },
            { id: "appointments", label: "المواعيد" },
            { id: "invoices", label: "الفواتير" },
            { id: "lab_orders", label: "طلبات المعمل" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3.5 px-3 sm:px-2 border-b-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? "border-[var(--primary-base)] text-[var(--primary-base)] font-bold"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 🌟 محتوى التبويبات بمساحة مريحة جداً */}
        <div className="p-4 sm:p-6 min-h-[500px]">
          {/* تبويب: نظرة عامة */}
          {activeTab === "overview" && (
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-4 rounded-[var(--radius-card)]">
                  <span className="text-xs text-[var(--text-muted)] block mb-1">
                    السن وتاريخ الميلاد
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-main)]">
                    {patient.date_of_birth
                      ? patient.date_of_birth.split("T")[0]
                      : "غير مسجل"}
                  </span>
                </div>
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-4 rounded-[var(--radius-card)]">
                  <span className="text-xs text-[var(--text-muted)] block mb-1">
                    النوع
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-main)]">
                    {patient.gender === "Female" ? "أنثى" : "ذكر"}
                  </span>
                </div>
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-4 rounded-[var(--radius-card)]">
                  <span className="text-xs text-[var(--text-muted)] block mb-1">
                    تاريخ فتح الملف
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-main)] font-mono">
                    {patient.created_at
                      ? new Date(patient.created_at).toLocaleDateString("ar-EG")
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-5 rounded-[var(--radius-card)] space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--warning-text)]" />
                  التنبيهات الطبية والحساسية
                </h3>
                {patient.medical_alerts ? (
                  <p className="text-sm text-[var(--warning-text)] font-medium">
                    {patient.medical_alerts}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    لا توجد تنبيهات طبية أو حساسية مسجلة لهذا المريض.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* تبويب: مخطط الأسنان */}
          {activeTab === "dental_chart" && (
            <DentalChart
              patientId={id}
              showToast={showToast}
              onNavigateToImages={handleNavigateToImages}
            />
          )}

          {/* تبويب: خطط العلاج */}
          {activeTab === "treatment_plans" && (
            <TreatmentPlans
              patientId={id}
              showToast={showToast}
              isArchived={patient.is_active === false}
            />
          )}

          {/* تبويب: الصور والأشعة */}
          {activeTab === "medical_images" && (
            <MedicalImages
              key={`${id}-${selectedToothForImages || "all"}`}
              patientId={id}
              showToast={showToast}
              initialToothFilter={selectedToothForImages}
            />
          )}

          {/* تبويب: المواعيد */}
          {activeTab === "appointments" && (
            <div>
              {isLoadingAppointments ? (
                <div className="py-12 flex justify-center text-[var(--text-secondary)]">
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--primary-base)]" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-muted)] text-sm">
                  لا توجد مواعيد مسجلة لهذا المريض حتى الآن.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[var(--border-default)] rounded-[var(--radius-btn)]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[var(--bg-app)] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                      <tr>
                        <th className="py-3 px-4 font-medium">تاريخ الموعد</th>
                        <th className="py-3 px-4 font-medium">الطبيب</th>
                        <th className="py-3 px-4 font-medium">الحالة</th>
                        <th className="py-3 px-4 font-medium">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                      {appointments.map((app) => (
                        <tr
                          key={app.appointment_id}
                          className="hover:bg-[var(--bg-elevated)]/40"
                        >
                          <td className="py-3 px-4 font-medium text-[var(--text-main)] font-mono">
                            {new Date(app.appointment_date).toLocaleString(
                              "ar-EG"
                            )}
                          </td>
                          <td className="py-3 px-4">د. {app.doctor_name}</td>
                          <td className="py-3 px-4">
                            {renderStatusBadge(app.status)}
                          </td>
                          <td className="py-3 px-4 text-[var(--text-muted)]">
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

          {/* تبويب: الفواتير */}
          {activeTab === "invoices" && (
            <div>
              {isLoadingInvoices ? (
                <div className="py-12 flex justify-center text-[var(--text-secondary)]">
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--primary-base)]" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-muted)] text-sm">
                  لا توجد فواتير صادرة لهذا المريض حتى الآن.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[var(--border-default)] rounded-[var(--radius-btn)]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#060a13] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                      <tr>
                        <th className="py-3 px-4 font-medium">رقم الفاتورة</th>
                        <th className="py-3 px-4 font-medium">الإجمالي</th>
                        <th className="py-3 px-4 font-medium">المدفوع</th>
                        <th className="py-3 px-4 font-medium">المتبقي</th>
                        <th className="py-3 px-4 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="hover:bg-[var(--bg-elevated)]/40"
                        >
                          <td
                            className="py-3 px-4 font-mono text-[var(--text-main)]"
                            title={inv.id}
                          >
                            #{String(inv.id).slice(0, 8)}
                          </td>
                          <td className="py-3 px-4 font-medium text-[var(--text-main)]">
                            {inv.total_amount} ج.م
                          </td>
                          <td className="py-3 px-4 text-[var(--success-text)] font-mono">
                            {inv.paid_amount} ج.م
                          </td>
                          <td className="py-3 px-4 text-[var(--warning-text)] font-mono">
                            {inv.remaining_amount} ج.م
                          </td>
                          <td className="py-3 px-4">
                            {renderStatusBadge(inv.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* تبويب: طلبات المعمل */}
          {activeTab === "lab_orders" && (
            <div>
              {isLoadingLabOrders ? (
                <div className="py-12 flex justify-center text-[var(--text-secondary)]">
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--primary-base)]" />
                </div>
              ) : labOrders.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-muted)] text-sm">
                  لا توجد طلبات معمل مسجلة لهذا المريض حتى الآن.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[var(--border-default)] rounded-[var(--radius-btn)]">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#060a13] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                      <tr>
                        <th className="py-3 px-4 font-medium">رقم الحالة</th>
                        <th className="py-3 px-4 font-medium">اسم المعمل</th>
                        <th className="py-3 px-4 font-medium">
                          برنامج التصميم
                        </th>
                        <th className="py-3 px-4 font-medium">الطبيب</th>
                        <th className="py-3 px-4 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                      {labOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-[var(--bg-elevated)]/40"
                        >
                          <td className="py-3 px-4 font-mono text-[var(--text-main)]">
                            {order.case_number || `#${order.id}`}
                          </td>
                          <td className="py-3 px-4">{order.lab_name}</td>
                          <td className="py-3 px-4 text-[var(--primary-base)] font-mono">
                            {order.design_software || "-"}
                          </td>
                          <td className="py-3 px-4">د. {order.doctor_name}</td>
                          <td className="py-3 px-4">
                            {renderStatusBadge(order.status)}
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
      </div>

      {/* 🌟 نافذة تعديل بيانات المريض (Edit Modal) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-lg w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-5">
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                تعديل بيانات المريض
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] p-1 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();

                // التحقق من رقم الهاتف
                if (!PHONE_REGEX.test(editFormData.phone_number.trim())) {
                  showToast(
                    "رقم الهاتف غير صالح (أرقام فقط من 10 إلى 15 رقم)",
                    "error"
                  );
                  return;
                }

                // التحقق من تاريخ الميلاد
                if (editFormData.date_of_birth) {
                  const selectedDate = new Date(editFormData.date_of_birth);

                  if (selectedDate > new Date()) {
                    showToast(
                      "تاريخ الميلاد لا يمكن أن يكون في المستقبل",
                      "error"
                    );
                    return;
                  }
                }

                updatePatientMutation.mutate(editFormData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
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
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    النوع
                  </label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        gender: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    تاريخ الميلاد
                  </label>
                  <input
                    type="date"
                    value={editFormData.date_of_birth}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        date_of_birth: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
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
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                ></textarea>
              </div>
              <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs sm:text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updatePatientMutation.isPending}
                  className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
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

      {/* 🌟 نافذة تأكيد الأرشفة */}
      {isArchiveConfirmOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation space-y-4">
            <div className="flex items-center gap-3 text-[var(--danger-text)]">
              <div className="p-2.5 bg-[var(--danger-bg)] rounded-[var(--radius-btn)] border border-[var(--danger-text)]/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-main)]">
                  تأكيد أرشفة المريض
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  هذا الإجراء ينقل المريض إلى الأرشيف
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              هل أنت متأكد من رغبتك في أرشفة ملف المريض{" "}
              <span className="font-semibold text-[var(--text-main)]">
                "{patient.name}"
              </span>
              ؟ لن يظهر في القائمة النشطة.
            </p>
            <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setIsArchiveConfirmOpen(false)}
                className="flex-1 px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs sm:text-sm font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={archivePatientMutation.isPending}
                onClick={() => archivePatientMutation.mutate()}
                className="flex-1 bg-[var(--danger-text)] hover:opacity-90 text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
              >
                {archivePatientMutation.isPending
                  ? "جاري الأرشفة..."
                  : "تأكيد الأرشفة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
