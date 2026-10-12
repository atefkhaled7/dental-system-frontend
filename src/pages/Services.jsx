import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  X,
  AlertCircle,
} from "lucide-react";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");

  // حالة المودال (إضافة أو تعديل)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    default_price: "",
    duration_minutes: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // جلب الخدمات من السيرفر
  const fetchServices = async () => {
    try {
      setLoading(true);
      setFetchError("");

      const res = await api.get("/procedure-codes");
      setServices(res.data);
    } catch (err) {
      console.error("فشل جلب الخدمات:", err);

      setFetchError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "تعذر تحميل الخدمات. تحقق من الاتصال وحاول مجددًا.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // فتح مودال الإضافة
  const handleOpenAdd = () => {
    setEditingService(null);
    setFormData({
      code: "",
      description: "",
      default_price: "",
      duration_minutes: 30,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // فتح مودال التعديل
  const handleOpenEdit = (item) => {
    setEditingService(item);
    setFormData({
      code: item.code,
      description: item.description,
      default_price: item.default_price,
      duration_minutes: item.duration_minutes || 30,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // حفظ (إضافة / تعديل)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      if (editingService) {
        await api.put(`/procedure-codes/${editingService.id}`, formData);
      } else {
        await api.post("/procedure-codes", formData);
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "حدث خطأ أثناء الحفظ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // حذف (تعطيل) الخدمة
  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف/تعطيل خدمة "${name}"؟`)) return;
    try {
      await api.delete(`/procedure-codes/${id}`);
      fetchServices();
    } catch (err) {
      alert(
        err.response?.data?.error || err.response?.data?.message || "حدث خطأ",
      );
    }
  };

  // فلترة بالبحث
  const filtered = services.filter(
    (s) =>
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* 🌟 الهيدر */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-[var(--primary-base)]" />
            الخدمات وأسعار الكشف
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            إدارة الإجراءات الطبية وأسعارها ومدة كل جلسة لحساب مواعيد الحجز
            بدقة.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-[var(--primary-base)] hover:opacity-90 text-white px-4 py-2.5 rounded-[var(--radius-btn)] font-semibold text-sm transition"
        >
          <Plus className="w-4 h-4" />
          إضافة خدمة جديدة
        </button>
      </div>

      {/* 🌟 شريط البحث */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-3 flex items-center gap-3">
        <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم الخدمة أو الكود (مثلاً: حشو، خلع، DENT-01)..."
          className="bg-transparent border-none outline-none text-sm text-[var(--text-main)] w-full placeholder:text-[var(--text-muted)]"
        />
      </div>

      {/* 🌟 جدول الخدمات */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            جاري تحميل الخدمات...
          </div>
        ) : fetchError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-red-400">{fetchError}</p>
            <button
              type="button"
              onClick={fetchServices}
              className="text-sm text-[var(--primary-base)] hover:underline"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Tag className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <p className="text-sm text-[var(--text-muted)]">
              {search
                ? "لا توجد خدمات مطابقة لبحثك"
                : "لم يتم إضافة أي خدمات أو أسعار بعد."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[var(--text-muted)] text-xs">
                <tr>
                  <th className="p-3.5 sm:px-6 font-medium">كود الإجراء</th>
                  <th className="p-3.5 sm:px-6 font-medium">
                    اسم الخدمة / الإجراء
                  </th>
                  <th className="p-3.5 sm:px-6 font-medium">السعر الافتراضي</th>
                  <th className="p-3.5 sm:px-6 font-medium">مدة الجلسة</th>
                  <th className="p-3.5 sm:px-6 font-medium text-left">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-main)]">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--bg-elevated)]/50 transition"
                  >
                    <td className="p-3.5 sm:px-6 font-mono text-xs font-semibold text-[var(--primary-base)]">
                      {item.code}
                    </td>
                    <td className="p-3.5 sm:px-6 font-medium">
                      {item.description}
                    </td>
                    <td className="p-3.5 sm:px-6 font-semibold">
                      {Number(item.default_price).toLocaleString("ar-EG")} ج.م
                    </td>
                    <td className="p-3.5 sm:px-6 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1.5 bg-[var(--bg-elevated)] px-2.5 py-1 rounded-md border border-[var(--border-default)]">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {item.duration_minutes || 30} دقيقة
                      </span>
                    </td>
                    <td className="p-3.5 sm:px-6 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] rounded-md transition"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(item.id, item.description)
                          }
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition"
                          title="حذف/تعطيل"
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

      {/* 🌟 Modal (إضافة / تعديل) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] w-full max-w-md p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)] mb-4">
              <h3 className="font-bold text-base text-[var(--text-main)]">
                {editingService ? "تعديل خدمة" : "إضافة خدمة جديدة"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  كود الخدمة (Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ROOT-01 أو EXT-02"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2.5 text-[var(--text-main)] outline-none focus:border-[var(--primary-base)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  اسم الإجراء / الخدمة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حشو عصب ضرس خلفي، تنظيف جير..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2.5 text-[var(--text-main)] outline-none focus:border-[var(--primary-base)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    السعر الافتراضي (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0"
                    value={formData.default_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_price: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2.5 text-[var(--text-main)] outline-none focus:border-[var(--primary-base)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    مدة الكشف (بالدقائق)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    placeholder="30"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2.5 text-[var(--text-main)] outline-none focus:border-[var(--primary-base)]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                * مدة الكشف بتحدد أوتوماتيكياً الأوقات المتاحة للمرضى في صفحة
                الحجز الأونلاين.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[var(--primary-base)] text-white rounded-[var(--radius-btn)] text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting
                    ? "جاري الحفظ..."
                    : editingService
                      ? "حفظ التعديل"
                      : "إضافة الخدمة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
