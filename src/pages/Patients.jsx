import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  AlertTriangle,
  AlertOctagon,
  X,
  Loader2,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";

export default function Patients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState(null);

  // أقسام المودال القابلة للطي
  const [openSections, setOpenSections] = useState({
    guardian: false,
    emergency: false,
    additional: false,
  });

  // فحص تكرار رقم الهاتف اللحظي
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // فورم إضافة مريض موسع
  const [formData, setFormData] = useState({
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
    guardian_relation: "والد",
    referral_source: "",
    referral_note: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // حساب عمر المريض لمعرفة هل تحت 18 سنة
  const calculateAge = (dobString) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const isMinor =
    formData.date_of_birth &&
    calculateAge(formData.date_of_birth) !== null &&
    calculateAge(formData.date_of_birth) < 18;

  // فتح قسم ولي الأمر تلقائياً لو المريض تحت 18 سنة
  useEffect(() => {
    if (isMinor) {
      setOpenSections((prev) => ({ ...prev, guardian: true }));
    }
  }, [isMinor]);

  // فحص تكرار الهاتف في الباك إند مع Debounce
  useEffect(() => {
    const phone = formData.phone_number.trim();
    let cancelled = false;

    if (phone.length < 10) {
      setDuplicateWarning(null);
      setIsCheckingPhone(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (cancelled) return;

      setIsCheckingPhone(true);

      try {
        const res = await api.get("/patients/check-phone", {
          params: { phone },
        });

        // تجاهل نتيجة أي رقم قديم
        if (cancelled) return;

        if (res.data?.exists) {
          setDuplicateWarning(
            `رقم الهاتف مسجل بالفعل للمريض (${res.data.patient.name})`,
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Phone check error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingPhone(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.phone_number]);

  const handleExportPatients = async () => {
    try {
      setIsExporting(true);
      const res = await api.get("/patients/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `patients_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err) {
      showToast(
        err.response?.data?.error || "فشل تصدير بيانات المرضى",
        "error",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleContent =
      "\uFEFFاسم المريض,رقم الهاتف,النوع,تاريخ الميلاد,التنبيهات الطبية\n" +
      "أحمد محمد علي,01012345678,ذكر,1990-05-15,حساسية بنسلين\n" +
      "سارة محمود,01123456789,أنثى,1995-10-20,مريضة سكر\n" +
      "عمر خالد,01234567890,ذكر,,لا يوجد\n";

    const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curosta_patients_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showToast("يرجى اختيار ملف CSV أولاً", "error");
      return;
    }
    try {
      setIsImporting(true);
      const data = new FormData();
      data.append("file", importFile);
      const res = await api.post("/patients/import", data);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setImportResult(res.data);
      showToast(res.data.message || "تم استيراد المرضى بنجاح", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "فشل استيراد الملف", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleTabChange = (status) => {
    setShowArchived(status);
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["patients", { page, limit, search, showArchived }],
    queryFn: async () => {
      const res = await api.get("/patients", {
        params: {
          page,
          limit,
          search: search.trim() || undefined,
          archived: showArchived ? "true" : undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const patients = data?.patients || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  const addPatientMutation = useMutation({
    mutationFn: async (newPatient) => {
      const res = await api.post("/patients", newPatient);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsModalOpen(false);
      setFormData({
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
        guardian_relation: "والد",
        referral_source: "",
        referral_note: "",
      });
      setDuplicateWarning(null);
      showToast("تمت إضافة المريض بنجاح", "success");
      if (data?.patient?.id) {
        navigate(`/patients/${data.patient.id}`);
      }
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء إضافة المريض",
        "error",
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

    if (isMinor) {
      if (!formData.guardian_name.trim()) {
        showToast(
          "اسم ولي الأمر إلزامي لأن عمر المريض أقل من 18 عاماً",
          "error",
        );
        return;
      }
      if (!formData.guardian_phone.trim()) {
        showToast(
          "رقم هاتف ولي الأمر إلزامي لأن عمر المريض أقل من 18 عاماً",
          "error",
        );
        return;
      }
    }

    addPatientMutation.mutate(formData);
  };

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

      {/* الهيدر وزر الإضافة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-main)] flex items-center gap-2.5">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--primary-base)]" />
            سجل المرضى
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">
            إدارة ملفات المرضى وتاريخهم الطبي والخطط العلاجية
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {user?.role === "ClinicAdmin" && (
            <>
              <button
                onClick={() => {
                  setImportFile(null);
                  setImportResult(null);
                  setIsImportModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] px-3 py-2 rounded-[var(--radius-btn)] font-medium text-sm transition-colors"
              >
                <Upload className="w-4 h-4 text-teal-400" />
                <span>استيراد CSV</span>
              </button>

              <button
                onClick={handleExportPatients}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] px-3 py-2 rounded-[var(--radius-btn)] font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-base)]" />
                ) : (
                  <Download className="w-4 h-4 text-[var(--primary-base)]" />
                )}
                <span>تصدير CSV</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 rounded-[var(--radius-btn)] font-medium text-sm transition-colors shadow-md shadow-[var(--primary-base)]/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مريض جديد</span>
          </button>
        </div>
      </div>

      {/* شريط البحث وتصفية الأرشيف */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-btn)] pr-10 pl-4 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>
        <button
          onClick={() => handleTabChange(!showArchived)}
          className={`px-3.5 py-2 rounded-[var(--radius-btn)] text-xs font-medium border transition-colors ${
            showArchived
              ? "bg-[var(--warning-bg)] border-[var(--warning-text)]/30 text-[var(--warning-text)] hover:bg-[var(--warning-bg)]/80"
              : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]"
          }`}
        >
          {showArchived ? "العودة للمرضى النشطين" : "عرض الأرشيف"}
        </button>
      </div>

      {/* جدول المرضى */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
            <span className="text-sm">جاري تحميل بيانات المرضى...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            {search ? (
              <>
                <Search className="w-8 h-8 text-[var(--text-muted)] mb-1" />
                <p className="text-[var(--text-main)] font-semibold">
                  لا توجد نتائج بحث
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  لم نجد أي مريض يطابق بحثك عن: "{search}"
                </p>
              </>
            ) : (
              <>
                <Users className="w-8 h-8 text-[var(--text-muted)] mb-1" />
                <p className="text-[var(--text-main)] font-semibold">
                  لا يوجد مرضى مسجلين حتى الآن
                </p>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  اضغط على "إضافة مريض جديد" في الأعلى لإضافة أول مريض للعيادة.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#060a13] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                <tr>
                  <th className="py-3.5 px-5 font-medium text-xs">
                    اسم المريض
                  </th>
                  <th className="py-3.5 px-5 font-medium text-xs">
                    رقم الهاتف
                  </th>
                  <th className="py-3.5 px-5 font-medium text-xs">النوع</th>
                  <th className="py-3.5 px-5 font-medium text-xs">
                    الحالة الصحية / التنبيهات
                  </th>
                  <th className="py-3.5 px-5 font-medium text-xs text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                {patients.map((patient) => {
                  const isCritical = patient.alert_level === "critical";
                  const isModerate = patient.alert_level === "moderate";

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="hover:bg-[var(--bg-elevated)]/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-base)] transition-colors">
                        <div className="flex items-center gap-2">
                          <span>{patient.name}</span>
                          {patient.guardian_name && (
                            <span className="text-[11px] text-[var(--text-muted)] font-normal">
                              (ولي الأمر: {patient.guardian_name})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs">
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <Phone className="w-3.5 h-3.5" />
                          <span dir="ltr">{patient.phone_number}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {patient.gender === "Female" ? "أنثى" : "ذكر"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                            تنبيه حرج
                          </span>
                        ) : isModerate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            تنبيه صحي
                          </span>
                        ) : patient.medical_alerts ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-text)]/20 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {patient.medical_alerts}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">
                            لا يوجد
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-left text-[var(--text-muted)] group-hover:text-[var(--primary-base)]">
                        <ChevronLeft className="w-4 h-4 inline-block transition-transform group-hover:-translate-x-1" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🌟 نافذة إضافة مريض موسع (Modal) بالأقسام القابلة للطي */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-xl w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--primary-base)]" />
                إضافة ملف مريض جديد
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] p-1 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-right"
              dir="rtl"
            >
              {/* البيانات الأساسية */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                    اسم المريض *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="محمد أحمد علي"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                      رقم الهاتف *
                    </label>
                    {isCheckingPhone && (
                      <span className="text-[11px] text-teal-400 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> جاري التحقق
                        من الرقم...
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="01012345678"
                    className={`w-full bg-[var(--bg-app)] border rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none font-mono transition-colors ${
                      duplicateWarning
                        ? "border-amber-500/80 focus:border-amber-400"
                        : "border-[var(--border-default)] focus:border-[var(--border-focus)]"
                    }`}
                  />
                  {duplicateWarning && (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{duplicateWarning}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                      النوع
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                    >
                      <option value="Male">ذكر</option>
                      <option value="Female">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                        تاريخ الميلاد
                      </label>
                      {formData.date_of_birth &&
                        calculateAge(formData.date_of_birth) !== null && (
                          <span className="text-[11px] font-semibold text-teal-400">
                            {calculateAge(formData.date_of_birth)} سنة
                          </span>
                        )}
                    </div>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          date_of_birth: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                    تنبيه طبي مبدئي (حساسية بنسلين / سكر / سيولة)
                  </label>
                  <input
                    type="text"
                    value={formData.medical_alerts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        medical_alerts: e.target.value,
                      })
                    }
                    placeholder="سيتم تفصيله لاحقاً في تبويب التاريخ الطبي"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              </div>

              {/* قسم 1: بيانات ولي الأمر (إلزامي تحت 18 سنة) */}
              <div className="border border-[var(--border-default)] rounded-[var(--radius-btn)] overflow-hidden bg-[var(--bg-elevated)]/40">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((s) => ({ ...s, guardian: !s.guardian }))
                  }
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>بيانات ولي الأمر</span>
                    {isMinor && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                        إلزامي (عمر المريض أقل من 18 سنة)
                      </span>
                    )}
                  </div>
                  {openSections.guardian ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {openSections.guardian && (
                  <div className="p-3.5 border-t border-[var(--border-default)] space-y-3 bg-[var(--bg-app)]/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          اسم ولي الأمر {isMinor && "*"}
                        </label>
                        <input
                          type="text"
                          required={isMinor}
                          value={formData.guardian_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              guardian_name: e.target.value,
                            })
                          }
                          placeholder="أحمد علي"
                          className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          رقم هاتف ولي الأمر {isMinor && "*"}
                        </label>
                        <input
                          type="text"
                          required={isMinor}
                          value={formData.guardian_phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              guardian_phone: e.target.value,
                            })
                          }
                          placeholder="01xxxxxxxxx"
                          className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--border-focus)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        صلة القرابة
                      </label>
                      <input
                        type="text"
                        value={formData.guardian_relation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            guardian_relation: e.target.value,
                          })
                        }
                        placeholder="والد، والدة، أخ أكبر..."
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* قسم 2: جهة الطوارئ */}
              <div className="border border-[var(--border-default)] rounded-[var(--radius-btn)] overflow-hidden bg-[var(--bg-elevated)]/40">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((s) => ({ ...s, emergency: !s.emergency }))
                  }
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <span>جهة الاتصال في الطوارئ (اختياري)</span>
                  {openSections.emergency ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {openSections.emergency && (
                  <div className="p-3.5 border-t border-[var(--border-default)] grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--bg-app)]/50">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        اسم جهة الطوارئ
                      </label>
                      <input
                        type="text"
                        value={formData.emergency_contact_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergency_contact_name: e.target.value,
                          })
                        }
                        placeholder="محمود (شقيق)"
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        هاتف الطوارئ
                      </label>
                      <input
                        type="text"
                        value={formData.emergency_contact_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergency_contact_phone: e.target.value,
                          })
                        }
                        placeholder="01xxxxxxxxx"
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--border-focus)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* قسم 3: تفاصيل العنوان ومصدر المعرفة */}
              <div className="border border-[var(--border-default)] rounded-[var(--radius-btn)] overflow-hidden bg-[var(--bg-elevated)]/40">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((s) => ({
                      ...s,
                      additional: !s.additional,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <span>العنوان ومصدر المعرفة (اختياري)</span>
                  {openSections.additional ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {openSections.additional && (
                  <div className="p-3.5 border-t border-[var(--border-default)] space-y-3 bg-[var(--bg-app)]/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          البريد الإلكتروني
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="patient@gmail.com"
                          className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          مصدر المعرفة بالعيادة
                        </label>
                        <select
                          value={formData.referral_source}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              referral_source: e.target.value,
                            })
                          }
                          className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                        >
                          <option value="">-- اختر المصدر --</option>
                          <option value="facebook">فيسبوك (Facebook)</option>
                          <option value="instagram">
                            إنستجرام (Instagram)
                          </option>
                          <option value="recommendation">
                            ترشيح من صديق / مريض
                          </option>
                          <option value="doctor">تحويل من طبيب آخر</option>
                          <option value="walk_in">
                            مرور بالشارع (Walk-in)
                          </option>
                          <option value="google">بحث جوجل وموقع العيادة</option>
                          <option value="other">مصدر آخر</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        تفاصيل مصدر المعرفة (اختياري)
                      </label>

                      <textarea
                        rows={2}
                        value={formData.referral_note}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            referral_note: e.target.value,
                          })
                        }
                        placeholder="مثال: ترشيح من المريض أحمد، أو اسم الطبيب المحوِّل"
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                        العنوان السكني
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder="الجيزة، الدقي، شارع التحرير"
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs sm:text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addPatientMutation.isPending}
                  className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
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

      {/* شريط الـ Pagination */}
      {!isLoading && pagination.total > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#070b14]/50 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
            >
              السابق
            </button>

            <span className="text-xs text-slate-400 px-2">
              صفحة <span className="font-bold text-teal-400">{page}</span> من{" "}
              <span className="font-bold text-slate-200">
                {pagination.totalPages}
              </span>
            </span>

            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page >= pagination.totalPages}
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
            >
              التالي
            </button>
          </div>
          <div>
            عرض{" "}
            <span className="font-bold text-slate-200">{patients.length}</span>{" "}
            من أصل{" "}
            <span className="font-bold text-slate-200">{pagination.total}</span>{" "}
            مريض
          </div>
        </div>
      )}

      {/* نافذة استيراد المرضى */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-xl w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-400" />
                استيراد المرضى من ملف CSV
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] p-1 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importResult ? (
              <form onSubmit={handleImportSubmit} className="space-y-4">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  يمكنك استيراد قاعدة بيانات المرضى الحالية دفعة واحدة. تأكد أن
                  الملف بصيغة{" "}
                  <span className="font-mono text-teal-400 font-bold">
                    .csv
                  </span>{" "}
                  ويحتوي على الأعمدة المطلوبة.
                </p>

                <div className="bg-[var(--bg-elevated)] p-3 rounded-[var(--radius-btn)] border border-[var(--border-default)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>تحميل نموذج ملف فارغ وجاهز للتعبئة:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="text-xs text-teal-400 hover:underline font-semibold"
                  >
                    تحميل القالب (.csv)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    اختر ملف CSV *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".csv,text/csv"
                    onChange={(e) => setImportFile(e.target.files[0] || null)}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)] file:mr-2 file:py-1.5 file:px-3 file:rounded-[var(--radius-btn)] file:border-0 file:text-xs file:font-semibold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20 cursor-pointer"
                  />
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || !importFile}
                    className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري المعالجة والاستيراد...</span>
                      </>
                    ) : (
                      <span>بدء الاستيراد</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] border border-[var(--border-default)]">
                    <p className="text-[var(--text-muted)] mb-1">
                      إجمالي الصفوف
                    </p>
                    <p className="text-base font-bold text-slate-100">
                      {importResult.summary?.total_rows || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-[var(--radius-btn)] border border-emerald-500/20">
                    <p className="text-emerald-400 mb-1">تم بنجاح ✅</p>
                    <p className="text-base font-bold text-emerald-400">
                      {importResult.summary?.imported_count || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-[var(--radius-btn)] border border-rose-500/20">
                    <p className="text-rose-400 mb-1">تم تخطيهم ⚠️</p>
                    <p className="text-base font-bold text-rose-400">
                      {importResult.summary?.skipped_count || 0}
                    </p>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-rose-400 mb-2">
                      تفاصيل الصفوف التي بها مشاكل:
                    </h4>
                    <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-[var(--radius-btn)] bg-slate-900/60 divide-y divide-slate-800 text-xs">
                      {importResult.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="text-teal-400 font-bold ml-1.5">
                              صف {err.row}:
                            </span>
                            <span className="text-slate-200">
                              {err.name || "بدون اسم"}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px] mr-2">
                              ({err.phone})
                            </span>
                          </div>
                          <span className="text-rose-400 text-[11px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 whitespace-nowrap">
                            {err.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-[var(--border-default)]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportResult(null);
                    }}
                    className="w-full bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                  >
                    إغلاق وتحديث القائمة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
