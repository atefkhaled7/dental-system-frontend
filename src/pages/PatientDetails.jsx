import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import DentalChart from "../components/DentalChart";
import TreatmentPlans from "../components/TreatmentPlans";
import MedicalImages from "../components/MedicalImages";
import PatientPrescriptions from "../components/PatientPrescriptions";
import MedicalAlertBanner from "../components/MedicalAlertBanner";
import VisitEditorModal from "../components/VisitEditorModal";
import {
  ArrowRight,
  Phone,
  Calendar,
  AlertTriangle,
  AlertOctagon,
  Loader2,
  Check,
  Edit,
  Archive,
  RotateCcw,
  X,
  Plus,
  Trash2,
  HeartPulse,
  Save,
} from "lucide-react";

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedVisitId, setSelectedVisitId] = useState(null);
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
    address: "",
    email: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_relation: "",
    referral_source: "",
    referral_note: "",
  });
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // حالة استبيان التاريخ الطبي
  const [historyAnswers, setHistoryAnswers] = useState(null);
  const [historyNotes, setHistoryNotes] = useState("");
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // حالة إضافة حساسية جديدة
  const [isAddAllergyOpen, setIsAddAllergyOpen] = useState(false);
  const [newAllergy, setNewAllergy] = useState({
    category: "medication",
    substance: "",
    reaction: "",
    severity: "severe",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleNavigateToImages = (toothNumber) => {
    setSelectedToothForImages(toothNumber);
    setActiveTab("medical_images");
  };

  const {
    data: patientData,
    isLoading: isLoadingPatient,
    isError,
  } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`);
      return res.data.patient || res.data;
    },
  });

  const patient = patientData || {};
  const alertSummary = patient.alert_summary || {
    level: "none",
    tags: [],
  };
  const allergies = patient.allergies || [];

  // تحميل التاريخ الطبي الخاص بالمريض الحالي فقط
  useEffect(() => {
    if (!patientData || patientData.id !== id) return;

    setHistoryAnswers(patientData.medical_history?.answers || {});
    setHistoryNotes(patientData.medical_history?.notes || "");
  }, [id, patientData?.id]);

  // حفظ التاريخ الطبي
  const handleSaveMedicalHistory = async () => {
    try {
      setIsSavingHistory(true);
      const res = await api.put(`/patients/${id}/medical-history`, {
        answers: historyAnswers || {},
        notes: historyNotes,
      });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      showToast(res.data.message || "تم حفظ التاريخ الطبي بنجاح", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "فشل حفظ التاريخ الطبي", "error");
    } finally {
      setIsSavingHistory(false);
    }
  };

  // إضافة حساسية جديدة
  const handleAddAllergySubmit = async (e) => {
    e.preventDefault();
    if (!newAllergy.substance.trim()) {
      showToast("يرجى كتابة اسم المادة المسببة للحساسية", "error");
      return;
    }
    try {
      await api.post(`/patients/${id}/allergies`, newAllergy);

      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsAddAllergyOpen(false);
      setNewAllergy({
        category: "medication",
        substance: "",
        reaction: "",
        severity: "severe",
      });
      showToast("تمت إضافة الحساسية بنجاح", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "فشل تسجيل الحساسية", "error");
    }
  };

  // حذف حساسية
  const handleDeleteAllergy = async (allergyId) => {
    try {
      await api.delete(`/patients/${id}/allergies/${allergyId}`);

      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      showToast("تم حذف الحساسية بنجاح", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "فشل حذف الحساسية", "error");
    }
  };

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

  // جلب سجل الزيارات السريرية للمريض
  const { data: patientVisits = [], isLoading: isLoadingVisits } = useQuery({
    queryKey: ["patient-visits", id],
    queryFn: async () => {
      const res = await api.get(`/patients/${id}/visits`);
      return res.data?.visits || [];
    },
    enabled: activeTab === "visits",
    staleTime: 0,
  });
  // 3. جلب فواتير المريض
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["patient-invoices", id],
    queryFn: async () => {
      const res = await api.get("/invoices", { params: { patient_id: id } });
      return Array.isArray(res.data) ? res.data : res.data.invoices || [];
    },
    enabled: activeTab === "invoices",
    staleTime: 0,
  });

  // 4. جلب طلبات معمل المريض
  const { data: labOrders = [], isLoading: isLoadingLabOrders } = useQuery({
    queryKey: ["patient-lab-orders", id],
    queryFn: async () => {
      const res = await api.get("/lab-orders", { params: { patient_id: id } });
      return res.data.lab_orders || [];
    },
    enabled: activeTab === "lab_orders",
    staleTime: 0,
  });

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

  const updatePatientMutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await api.put(`/patients/${id}`, updatedData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsEditModalOpen(false);
      showToast("تم تحديث بيانات المريض بنجاح", "success");
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء تعديل المريض",
        "error",
      );
    },
  });

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
        "error",
      );
    },
  });

  const handleEditOpen = () => {
    setEditFormData({
      name: patient?.name || "",
      phone_number: patient?.phone_number || "",
      gender: patient?.gender || "Male",
      date_of_birth: patient?.date_of_birth
        ? patient.date_of_birth.split("T")[0]
        : "",
      medical_alerts: patient?.medical_alerts || "",
      address: patient?.address || "",
      email: patient?.email || "",
      emergency_contact_name: patient?.emergency_contact_name || "",
      emergency_contact_phone: patient?.emergency_contact_phone || "",
      guardian_name: patient?.guardian_name || "",
      guardian_phone: patient?.guardian_phone || "",
      guardian_relation: patient?.guardian_relation || "",
      referral_source: patient?.referral_source || "",
      referral_note: patient?.referral_note || "",
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
      {/* Toast Notification */}
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

      {/* التنبيهات الطبية المنظمة */}
      <MedicalAlertBanner alertSummary={alertSummary} />

      {/* الاحتفاظ بالتنبيهات النصية القديمة للمرضى السابقين */}
      {patient.medical_alerts?.trim() && (
        <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--warning-text)]/20 bg-[var(--warning-bg)]/40 p-3 text-sm text-[var(--warning-text)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-bold">تنبيه طبي مسجل سابقًا: </span>
            <span>{patient.medical_alerts}</span>
          </div>
        </div>
      )}

      {/* كارت معلومات المريض الأساسي */}
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
                {patient.guardian_name && (
                  <span className="text-xs px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    ولي الأمر: {patient.guardian_name} ({patient.guardian_phone}
                    )
                  </span>
                )}
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
                {patient.address && (
                  <>
                    <span>•</span>
                    <span>{patient.address}</span>
                  </>
                )}
              </div>
            </div>
          </div>

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
      </div>

      {/* شريط التبويبات الفخم ملء الشاشة */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden shadow-xl">
        <div className="flex border-b border-[var(--border-default)] px-4 sm:px-6 gap-2 sm:gap-6 text-xs sm:text-sm font-medium bg-[var(--bg-app)] overflow-x-auto whitespace-nowrap">
          {[
            { id: "overview", label: "نظرة عامة" },
            { id: "visits", label: "سجل الزيارات السريري 🩺" },
            { id: "medical_history", label: "التاريخ الطبي والحساسية ⚠️" },
            { id: "dental_chart", label: "مخطط الأسنان 🦷" },
            { id: "treatment_plans", label: "خطط العلاج 📋" },
            { id: "medical_images", label: "الصور والأشعة 📸" },
            { id: "prescriptions", label: "الروشتات 💊" },
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

        {/* محتوى التبويبات */}
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
                    جهة الطوارئ
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-main)]">
                    {patient.emergency_contact_name
                      ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || "-"})`
                      : "غير مسجل"}
                  </span>
                </div>
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-4 rounded-[var(--radius-card)]">
                  <span className="text-xs text-[var(--text-muted)] block mb-1">
                    مصدر المعرفة
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-main)]">
                    {patient.referral_source || "غير محدد"}
                  </span>
                </div>
              </div>

              {/* ملخص التنبيهات في النظرة العامة */}
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-5 rounded-[var(--radius-card)] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-teal-400" />
                    الملف الطبي السريع
                  </h3>
                  <button
                    onClick={() => setActiveTab("medical_history")}
                    className="text-xs text-teal-400 hover:underline font-bold"
                  >
                    تعديل الاستبيان والحساسية ←
                  </button>
                </div>
                {alertSummary.level !== "none" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {alertSummary.tags.map((t, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                          alertSummary.level === "critical"
                            ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                            : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    لم يتم تسجيل أمراض مزمنة أو حساسية حتى الآن.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 🌟 تبويب جديد: التاريخ الطبي والحساسية (Medical History & Allergies) */}
          {activeTab === "medical_history" && (
            <div className="space-y-8 max-w-4xl" dir="rtl">
              {/* قسم 1: استبيان الأمراض المزمنة نعم/لا */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-default)] gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-teal-400" />
                      استبيان التاريخ الطبي والأمراض المزمنة
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      يُحدد مستوى الخطر تلقائياً ويطلق تنبيهاً حاسماً عند وجود
                      مميعات دم، أمراض قلب، أو حمل.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveMedicalHistory}
                    disabled={isSavingHistory}
                    className="self-start sm:self-auto flex items-center gap-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isSavingHistory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>حفظ الاستبيان</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-sm">
                  {[
                    {
                      key: "blood_thinners",
                      label:
                        "مميعات وأدوية سيولة الدم (أسبرين، بلافيكس، ماريفان)",
                      critical: true,
                    },
                    {
                      key: "heart_disease",
                      label: "أمراض القلب أو الصمامات أو جلطات سابقة",
                      critical: true,
                    },
                    {
                      key: "bleeding_disorder",
                      label: "نزيف مفرط أو اضطرابات تخثر الدم",
                      critical: true,
                    },
                    {
                      key: "pregnancy",
                      label: "الحمل والرضاعة (خاص بالإناث)",
                      critical: true,
                    },
                    {
                      key: "diabetes",
                      label: "مرض السكري (Diabetes)",
                      critical: false,
                    },
                    {
                      key: "hypertension",
                      label: "ارتفاع ضغط الدم (Hypertension)",
                      critical: false,
                    },
                    {
                      key: "asthma",
                      label: "الربو أو الحساسية الصدرية (Asthma)",
                      critical: false,
                    },
                    {
                      key: "hepatitis",
                      label: "التهاب الكبد أو مشاكل كبدية (Hepatitis)",
                      critical: false,
                    },
                    {
                      key: "kidney_disease",
                      label: "أمراض الكلى أو الغسيل الكلوي",
                      critical: false,
                    },
                  ].map((item) => {
                    const isChecked = Boolean(historyAnswers?.[item.key]);
                    return (
                      <label
                        key={item.key}
                        className={`flex items-start gap-3 p-3 rounded-[var(--radius-btn)] border cursor-pointer transition-all ${
                          isChecked
                            ? item.critical
                              ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                              : "bg-amber-500/15 border-amber-500/40 text-amber-200"
                            : "bg-[var(--bg-elevated)]/50 border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setHistoryAnswers((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked,
                            }))
                          }
                          className="mt-1 rounded accent-teal-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-xs leading-relaxed block">
                            {item.label}
                          </span>
                          {item.critical && (
                            <span className="text-[10px] text-rose-400 font-bold block mt-0.5">
                              ⚠️ حالة حرجة لتخدير وجراحة الأسنان
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    ملاحظات طبية إضافية للطبيب المعالج
                  </label>
                  <textarea
                    rows="2"
                    value={historyNotes}
                    onChange={(e) => setHistoryNotes(e.target.value)}
                    placeholder="أي أدوية منتظمة أخرى أو توصيات من طبيب الباطنة..."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-3 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                  ></textarea>
                </div>
              </div>

              {/* قسم 2: الحساسيات المسجلة (Allergies) */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-rose-400" />
                      سجل الحساسية الدوائية والمواد (Allergies)
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      تظهر في شريط التحذير وفي فحص الروشتات الطبية تلقائياً.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddAllergyOpen(true)}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-[var(--radius-btn)] text-xs font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة حساسية</span>
                  </button>
                </div>

                {allergies.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                    لا توجد حساسيات مسجلة لهذا المريض.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-[var(--border-default)] rounded-[var(--radius-btn)]">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#060a13] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">
                            المادة / الدواء
                          </th>
                          <th className="py-2.5 px-4 font-semibold">الفئة</th>
                          <th className="py-2.5 px-4 font-semibold">
                            رد الفعل (Reaction)
                          </th>
                          <th className="py-2.5 px-4 font-semibold">الشدة</th>
                          <th className="py-2.5 px-4 font-semibold text-left">
                            إجراء
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                        {allergies.map((alg) => (
                          <tr
                            key={alg.id}
                            className="hover:bg-[var(--bg-elevated)]/40"
                          >
                            <td className="py-2.5 px-4 font-bold text-rose-300">
                              {alg.substance}
                            </td>
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">
                              {alg.category === "medication"
                                ? "دواء"
                                : alg.category === "latex"
                                  ? "لاتكس"
                                  : alg.category === "food"
                                    ? "طعام"
                                    : "أخرى"}
                            </td>
                            <td className="py-2.5 px-4">
                              {alg.reaction || "-"}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  alg.severity === "severe"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {alg.severity === "severe"
                                  ? "شديدة"
                                  : alg.severity === "mild"
                                    ? "خفيفة"
                                    : "متوسطة"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-left">
                              <button
                                onClick={() => handleDeleteAllergy(alg.id)}
                                title="حذف"
                                className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

          {/* تبويب: الروشتات */}
          {activeTab === "prescriptions" && (
            <PatientPrescriptions patientId={id} patient={patient} />
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
                          key={app.appointment_id || app.id}
                          className="hover:bg-[var(--bg-elevated)]/40"
                        >
                          <td className="py-3 px-4 font-medium text-[var(--text-main)] font-mono">
                            {new Date(app.appointment_date).toLocaleString(
                              "ar-EG",
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
                          <td className="py-3 px-4 font-mono text-[var(--text-main)]">
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
                            {order.case_number || `#${order.id.slice(0, 8)}`}
                          </td>
                          <td className="py-3 px-4">{order.lab_name}</td>
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
          {/* تبويب: سجل الزيارات السريري */}
          {activeTab === "visits" && (
            <div className="space-y-4">
              {isLoadingVisits ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
                </div>
              ) : patientVisits.length === 0 ? (
                <div className="text-center py-14 text-slate-400 text-sm">
                  لا توجد زيارات سريرية مسجلة لهذا المريض بعد. يتم فتح الزيارة
                  من موعد المريض في التقويم.
                </div>
              ) : (
                <div className="space-y-3">
                  {patientVisits.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVisitId(v.id)}
                      className="p-4 rounded-2xl bg-[#0d1527]/70 hover:bg-[#0d1527] border border-white/10 hover:border-teal-500/30 cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/15 px-2.5 py-1 rounded-lg">
                            {new Date(v.visit_date).toLocaleDateString("ar-EG")}
                          </span>
                          <span className="text-xs text-slate-300">
                            الطبيب:{" "}
                            <b className="text-white">د. {v.doctor_name}</b>
                          </span>
                        </div>
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                            v.status === "final"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {v.status === "final" ? "معتمد ومغلق" : "مسودة"}
                        </span>
                      </div>

                      {v.diagnosis && (
                        <p className="text-xs text-slate-200">
                          <b className="text-teal-400">التشخيص:</b>{" "}
                          {v.diagnosis}
                        </p>
                      )}

                      {Array.isArray(v.procedures) &&
                        v.procedures.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {v.procedures.map((p, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
                              >
                                {p.procedure_name}{" "}
                                {p.tooth_number ? `(#${p.tooth_number})` : ""}
                                {p.surface ? ` [${p.surface}]` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <VisitEditorModal
            isOpen={!!selectedVisitId}
            visitId={selectedVisitId}
            onClose={() => setSelectedVisitId(null)}
            showToast={showToast}
          />
        </div>
      </div>

      {/* مودال إضافة حساسية */}
      {isAddAllergyOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 shadow-2xl space-y-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-400" />
                تسجيل حساسية جديدة
              </h3>
              <button
                onClick={() => setIsAddAllergyOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAllergySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  المادة المسببة للحساسية (مثل: بنسلين، سلفا، تخدير) *
                </label>
                <input
                  type="text"
                  required
                  value={newAllergy.substance}
                  onChange={(e) =>
                    setNewAllergy({ ...newAllergy, substance: e.target.value })
                  }
                  placeholder="بنسلين (Penicillin)"
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    الفئة
                  </label>
                  <select
                    value={newAllergy.category}
                    onChange={(e) =>
                      setNewAllergy({ ...newAllergy, category: e.target.value })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                  >
                    <option value="medication">دواء / علاج</option>
                    <option value="latex">لاتكس (قفازات)</option>
                    <option value="food">طعام</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    درجة الشدة
                  </label>
                  <select
                    value={newAllergy.severity}
                    onChange={(e) =>
                      setNewAllergy({ ...newAllergy, severity: e.target.value })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                  >
                    <option value="severe">شديدة (حرجة)</option>
                    <option value="moderate">متوسطة</option>
                    <option value="mild">خفيفة</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  رد الفعل والتحسس (Reaction)
                </label>
                <input
                  type="text"
                  value={newAllergy.reaction}
                  onChange={(e) =>
                    setNewAllergy({ ...newAllergy, reaction: e.target.value })
                  }
                  placeholder="طفح جلدي، ضيق تنفس، تورم بالوجه..."
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsAddAllergyOpen(false)}
                  className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-[var(--radius-btn)] text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-[var(--radius-btn)] text-xs font-semibold"
                >
                  تسجيل الحساسية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تعديل بيانات المريض الموسع */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-xl w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation relative max-h-[90vh] overflow-y-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-4">
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
                updatePatientMutation.mutate(editFormData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    اسم المريض *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--border-focus)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                  >
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--border-focus)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[var(--bg-elevated)]/40 rounded-[var(--radius-btn)] border border-[var(--border-default)]">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    اسم ولي الأمر
                  </label>
                  <input
                    type="text"
                    value={editFormData.guardian_name}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        guardian_name: e.target.value,
                      })
                    }
                    placeholder="إن وجد"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    هاتف ولي الأمر
                  </label>
                  <input
                    type="text"
                    value={editFormData.guardian_phone}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        guardian_phone: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    جهة الطوارئ
                  </label>
                  <input
                    type="text"
                    value={editFormData.emergency_contact_name}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        emergency_contact_name: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    هاتف الطوارئ
                  </label>
                  <input
                    type="text"
                    value={editFormData.emergency_contact_phone}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        emergency_contact_phone: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  العنوان
                </label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      address: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)]"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-[var(--radius-btn)] text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updatePatientMutation.isPending}
                  className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs font-medium disabled:opacity-50"
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

      {/* نافذة تأكيد الأرشفة */}
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
                className="flex-1 px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-[var(--radius-btn)] text-xs font-medium"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={archivePatientMutation.isPending}
                onClick={() => archivePatientMutation.mutate()}
                className="flex-1 bg-[var(--danger-text)] hover:opacity-90 text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs font-medium disabled:opacity-50"
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
