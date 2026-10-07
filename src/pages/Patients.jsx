import { useState } from "react";
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
  X,
  Loader2,
  Check,
  ChevronLeft,
  Download,
} from "lucide-react";

export default function Patients() {
  const { user } = useAuth();
  // دالة التحميل المباشرة:
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPatients = async () => {
    try {
      setIsExporting(true);
      const res = await api.get("/patients/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `patients_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      showToast(
        err.response?.data?.error || "فشل تصدير بيانات المرضى",
        "error"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const [page, setPage] = useState(1);
  const limit = 10; // عدد العناصر في الصفحة

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [toast, setToast] = useState(null);

  // فورم إضافة مريض جديد
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
    date_of_birth: "",
    medical_alerts: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // لما المستخدم يكتب في السيرش نرجعه للصفحة الأولى
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // لما يغير التبويب بين النشط والمؤرشف نرجعه للصفحة الأولى
  const handleTabChange = (status) => {
    setShowArchived(status);
    setPage(1);
  };

  // 1. جلب قائمة المرضى
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

  // 2. إضافة مريض جديد
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
      });
      showToast("تمت إضافة المريض بنجاح", "success");
      // اختياري: لو حابب تفتحه مباشرة بعد الإضافة:
      if (data?.patient?.id) {
        navigate(`/patients/${data.patient.id}`);
      }
    },
    onError: (err) => {
      showToast(
        err.response?.data?.error || "حدث خطأ أثناء إضافة المريض",
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

      {/* 🌟 الهيدر وزر الإضافة */}
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
            <button
              onClick={handleExportPatients}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] px-4 py-2.5 rounded-[var(--radius-btn)] font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-base)]" />
              ) : (
                <Download className="w-4 h-4 text-[var(--primary-base)]" />
              )}

              <span>تصدير Excel</span>
            </button>
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

      {/* 🌟 شريط البحث وتصفية الأرشيف */}
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

      {/* 🌟 جدول المرضى بنظام (هيدر غامق + داتا فاتحة) مع الانتقال بالضغط */}
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
                    التنبيهات الطبية
                  </th>
                  <th className="py-3.5 px-5 font-medium text-xs text-left"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    className="hover:bg-[var(--bg-elevated)]/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-5 font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-base)] transition-colors">
                      {patient.name}
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
                      {patient.medical_alerts ? (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🌟 نافذة إضافة مريض جديد (Modal) فقط */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-lg w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-5">
              <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--primary-base)]" />
                إضافة مريض جديد
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] p-1 hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
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
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
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
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    النوع
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
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
                    value={formData.date_of_birth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date_of_birth: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  التنبيهات الطبية (حساسية بنج / أمراض مزمنة)
                </label>
                <textarea
                  rows="2"
                  value={formData.medical_alerts}
                  onChange={(e) =>
                    setFormData({ ...formData, medical_alerts: e.target.value })
                  }
                  placeholder="مثال: حساسية من البنسلين، مريض سكر..."
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                ></textarea>
              </div>
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
          {/* 1. الزراير دلوقتي هتبقى على اليمين */}
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
    </div>
  );
}
