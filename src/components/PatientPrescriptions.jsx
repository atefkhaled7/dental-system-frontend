import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";

// قوالب أدوية شائعة لعيادات الأسنان في مصر لتسريع الإدخال
const DENTAL_DRUG_PRESETS = [
  {
    name: "Augmentin 1g",
    dosage: "قرص كل 12 ساعة بعد الأكل",
    duration: "لمدة 5 أيام",
  },
  {
    name: "Cataflam 50mg",
    dosage: "قرص كل 8 ساعات عند اللزوم بعد الأكل",
    duration: "لمدة 3 أيام",
  },
  {
    name: "Flagyl 500mg",
    dosage: "قرص كل 8 ساعات بعد الأكل",
    duration: "لمدة 5 أيام",
  },
  {
    name: "Brufen 600mg",
    dosage: "كيس فوار أو قرص كل 8 ساعات بعد الأكل",
    duration: "لمدة 3 أيام",
  },
  {
    name: "Chlohex Mouthwash",
    dosage: "مضمضة مرتين يومياً بدون بلع أو شطف بعدها",
    duration: "لمدة أسبوع",
  },
  {
    name: "Orex Spray",
    dosage: "بختين بالفم 3 مرات يومياً",
    duration: "لمدة 5 أيام",
  },
];

export default function PatientPrescriptions({ patientId, patient }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printItem, setPrintItem] = useState(null);

  // فورم إضافة روشتة
  const [formData, setFormData] = useState({
    prescription_date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    instructions:
      "الالتزام بمواعيد الجرعات بعد الأكل - كمادات باردة عند اللزوم",
    medications: [{ name: "", dosage: "", duration: "", notes: "" }],
  });
  const [submitting, setSubmitting] = useState(false);

  // جلب روشتات المريض
  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patientId}/prescriptions`);
      setPrescriptions(res.data);
    } catch (err) {
      console.error("فشل جلب الروشتات:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchPrescriptions();
  }, [patientId]);

  // إضافة دواء جديد للفورم
  const handleAddMedication = () => {
    setFormData({
      ...formData,
      medications: [
        ...formData.medications,
        { name: "", dosage: "", duration: "", notes: "" },
      ],
    });
  };

  // تطبيق قالب دواء جاهز
  const handleApplyPreset = (preset) => {
    // لو أول سطر فاضي نملأه، غير كده نضيف سطر جديد
    const meds = [...formData.medications];
    if (meds.length === 1 && !meds[0].name) {
      meds[0] = { ...preset, notes: "" };
    } else {
      meds.push({ ...preset, notes: "" });
    }
    setFormData({ ...formData, medications: meds });
  };

  // حذف دواء من الفورم
  const handleRemoveMedication = (index) => {
    if (formData.medications.length === 1) return;
    setFormData({
      ...formData,
      medications: formData.medications.filter((_, i) => i !== index),
    });
  };

  // حفظ الروشتة
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/patients/${patientId}/prescriptions`, formData);
      setIsModalOpen(false);
      setFormData({
        prescription_date: new Date().toISOString().split("T")[0],
        diagnosis: "",
        instructions:
          "الالتزام بمواعيد الجرعات بعد الأكل - كمادات باردة عند اللزوم",
        medications: [{ name: "", dosage: "", duration: "", notes: "" }],
      });
      fetchPrescriptions();
    } catch (err) {
      alert(err.response?.data?.error || "حدث خطأ أثناء حفظ الروشتة");
    } finally {
      setSubmitting(false);
    }
  };

  // حذف روشتة
  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الروشتة؟")) return;
    try {
      await api.delete(`/prescriptions/${id}`);
      fetchPrescriptions();
    } catch (err) {
      alert("فشل حذف الروشتة");
    }
  };

  // تشغيل الطباعة
  const handlePrint = (item) => {
    setPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* 🌟 الهيدر وزرار الإضافة */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--primary-base)]" />
            سجل الروشتات الطبية
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            إنشاء وطباعة روشتات الأدوية وتعليمات العلاج للمريض.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-[var(--primary-base)] hover:opacity-90 text-white px-3.5 py-2 rounded-[var(--radius-btn)] font-semibold text-xs transition"
        >
          <Plus className="w-4 h-4" />
          روشتة جديدة
        </button>
      </div>

      {/* 🌟 قائمة الروشتات */}
      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          جاري تحميل الروشتات...
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-10 text-center space-y-2">
          <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            لم يتم إصدار أي روشتة لهذا المريض بعد.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            اضغط على "روشتة جديدة" لإضافة أول وصفة طبية.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((item) => {
            const meds = Array.isArray(item.medications)
              ? item.medications
              : [];
            return (
              <div
                key={item.id}
                className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[var(--primary-base)] bg-[var(--primary-muted)] px-2.5 py-1 rounded-md">
                      {new Date(item.prescription_date).toLocaleDateString(
                        "ar-EG",
                      )}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      الطبيب المعالج:{" "}
                      <b>{item.doctor_name || "طبيب العيادة"}</b>
                    </span>
                    {item.diagnosis && (
                      <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-default)]">
                        التشخيص: {item.diagnosis}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrint(item)}
                      className="inline-flex items-center gap-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-main)] px-3 py-1.5 rounded-md text-xs font-medium transition"
                      title="طباعة الروشتة"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      طباعة
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* الأدوية الموصوفة */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] block">
                    الأدوية الموصوفة (℞):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {meds.map((m, idx) => (
                      <div
                        key={idx}
                        className="bg-[var(--bg-elevated)] p-2.5 rounded-md border border-[var(--border-default)] text-xs flex flex-col justify-between"
                      >
                        <span className="font-bold text-[var(--text-main)]">
                          {m.name}
                        </span>
                        <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center justify-between">
                          <span>{m.dosage}</span>
                          {m.duration && <span>{m.duration}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {item.instructions && (
                  <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)]/40 p-2 rounded border border-[var(--border-default)]/50">
                    💡 <b>تعليمات إضافية:</b> {item.instructions}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 Modal إنشاء روشتة جديدة */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] w-full max-w-2xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)] mb-4">
              <h3 className="font-bold text-base text-[var(--text-main)] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--primary-base)]" />
                تحرير روشتة طبية جديدة للمريض
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* قوالب سريعة */}
            <div className="mb-4 p-3 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-default)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                إضافة سريعة لأدوية الأسنان الشائعة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DENTAL_DRUG_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="text-xs bg-[var(--bg-surface)] hover:border-[var(--primary-base)] border border-[var(--border-default)] px-2.5 py-1 rounded-md text-[var(--text-main)] transition"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    تاريخ الروشتة
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.prescription_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        prescription_date: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    التشخيص أو سبب الزيارة (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: خلع ضرس عقل، التهاب لثة حاد..."
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)]"
                  />
                </div>
              </div>

              {/* قائمة الأدوية */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-default)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-main)]">
                    قائمة الأدوية (℞):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="text-xs text-[var(--primary-base)] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة دواء يدوي
                  </button>
                </div>

                {formData.medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[var(--bg-elevated)] rounded-md border border-[var(--border-default)] space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-muted)]">
                        دواء #{index + 1}
                      </span>
                      {formData.medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(index)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          حذف الدواء
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="اسم الدواء والشكل (Augmentin 1g)*"
                        value={med.name}
                        onChange={(e) => {
                          const meds = [...formData.medications];
                          meds[index].name = e.target.value;
                          setFormData({ ...formData, medications: meds });
                        }}
                        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded p-1.5 text-xs text-[var(--text-main)]"
                      />
                      <input
                        type="text"
                        placeholder="الجرعة والتكرار (قرص كل 12 ساعة)*"
                        value={med.dosage}
                        onChange={(e) => {
                          const meds = [...formData.medications];
                          meds[index].dosage = e.target.value;
                          setFormData({ ...formData, medications: meds });
                        }}
                        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded p-1.5 text-xs text-[var(--text-main)]"
                      />
                      <input
                        type="text"
                        placeholder="المدة (لمدة 5 أيام)"
                        value={med.duration}
                        onChange={(e) => {
                          const meds = [...formData.medications];
                          meds[index].duration = e.target.value;
                          setFormData({ ...formData, medications: meds });
                        }}
                        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded p-1.5 text-xs text-[var(--text-main)]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* تعليمات إضافية */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  تعليمات ونصائح للمريض
                </label>
                <textarea
                  rows={2}
                  placeholder="تعليمات بعد الجراحة أو أثناء تناول العلاج..."
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2 text-xs text-[var(--text-main)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-default)] rounded-[var(--radius-btn)] text-xs text-[var(--text-muted)]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[var(--primary-base)] text-white rounded-[var(--radius-btn)] text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ الروشتة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 ورقة الطباعة الصامتة (Print Sheet: تظهر فقط عند window.print) */}
      {printItem && (
        <div
          id="printable-prescription"
          className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[9999]"
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">
                {printItem.clinic_name || "عيادة الأسنان"}
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {printItem.clinic_address || ""}
              </p>
              <p className="text-xs text-gray-600">
                هاتف: {printItem.clinic_phone || ""}
              </p>
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-gray-900">
                {printItem.doctor_name || "طبيب العيادة"}
              </h2>
              <p className="text-xs text-gray-600">طب وجراحة الفم والأسنان</p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-6 grid grid-cols-3 gap-2 text-xs">
            <div>
              <b>اسم المريض:</b> {patient?.name || "مريض"}
            </div>
            <div>
              <b>التاريخ:</b>{" "}
              {new Date(printItem.prescription_date).toLocaleDateString(
                "ar-EG",
              )}
            </div>
            <div>
              <b>رقم الهاتف:</b> {patient?.phone_number || "-"}
            </div>
            {printItem.diagnosis && (
              <div className="col-span-3 mt-1">
                <b>التشخيص:</b> {printItem.diagnosis}
              </div>
            )}
          </div>

          {/* Rx Symbol */}
          <div className="text-3xl font-serif font-black mb-4 select-none">
            ℞
          </div>

          {/* Medications */}
          <div className="space-y-4 mb-8 min-h-[220px]">
            {(Array.isArray(printItem.medications)
              ? printItem.medications
              : []
            ).map((m, idx) => (
              <div key={idx} className="border-b border-gray-100 pb-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>
                    {idx + 1}. {m.name}
                  </span>
                  {m.duration && (
                    <span className="text-xs font-normal text-gray-600">
                      {m.duration}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-700 mt-0.5 pr-4">
                  {m.dosage} {m.notes ? `(${m.notes})` : ""}
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          {printItem.instructions && (
            <div className="border border-dashed border-gray-300 p-3 rounded text-xs mb-8">
              <b>تعليمات وإرشادات:</b> {printItem.instructions}
            </div>
          )}

          {/* Footer Signature */}
          <div className="flex justify-between items-end pt-6 border-t border-gray-200 text-xs">
            <div className="text-gray-400 text-[10px]">
              طبعت إلكترونياً عبر منصة كوروستا (curosta.com)
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-gray-400 mb-1"></div>
              <span>توقيع الطبيب المعالج</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
