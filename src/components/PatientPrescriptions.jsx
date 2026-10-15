import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  X,
  Sparkles,
  AlertOctagon,
} from "lucide-react";
import MedicalAlertBanner from "./MedicalAlertBanner";

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

export default function PatientPrescriptions({
  patientId,
  patient,
  initialDiagnosis = "",
  initialDoctorId = "",
  autoOpenNew = false,
  onAutoOpenHandled,
  showToast,
}) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(autoOpenNew);
  const [printItem, setPrintItem] = useState(null);

  // تحذيرات الحساسية الدوائية الراجعة من الباك إند بعد الحفظ
  const [allergyWarnings, setAllergyWarnings] = useState([]);
  // const [pendingPrintAfterWarning, setPendingPrintAfterWarning] =
  //   useState(null);

  const [prescriptionToDelete, setPrescriptionToDelete] = useState(null);
  const [isDeletingPrescription, setIsDeletingPrescription] = useState(false);

  const notify = (message, type = "success") => {
    if (typeof showToast === "function") {
      showToast(message, type);
    } else if (type === "error") {
      alert(message);
    }
  };

  // فورم إضافة روشتة
  const [formData, setFormData] = useState({
    doctor_id: initialDoctorId || "",
    prescription_date: new Date().toISOString().split("T")[0],
    diagnosis: initialDiagnosis || "",
    instructions:
      "الالتزام بمواعيد الجرعات بعد الأكل - كمادات باردة عند اللزوم",
    medications: [{ name: "", dosage: "", duration: "", notes: "" }],
  });
  const [submitting, setSubmitting] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState("");

  // مزامنة التشخيص والطبيب القادم من محرر الزيارة
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      diagnosis: initialDiagnosis || prev.diagnosis,
      doctor_id: initialDoctorId || prev.doctor_id,
    }));
  }, [initialDiagnosis, initialDoctorId]);

  useEffect(() => {
    if (!autoOpenNew) return;

    setIsModalOpen(true);
    onAutoOpenHandled?.();
  }, [autoOpenNew, onAutoOpenHandled]);

  // جلب روشتات المريض
  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patientId}/prescriptions`);

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.prescriptions || [];

      setPrescriptions(list);
      return list;
    } catch (err) {
      console.error("فشل جلب الروشتات:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchPrescriptions();
  }, [patientId]);

  useEffect(() => {
    if (!isModalOpen) return;

    let cancelled = false;

    const loadDoctors = async () => {
      setLoadingDoctors(true);
      setDoctorsError("");

      try {
        const res = await api.get("/auth/doctors");
        const activeDoctors = res.data?.doctors || [];
        if (!cancelled) {
          setDoctors(activeDoctors);
          if (activeDoctors.length > 0) {
            setFormData((prev) => ({
              ...prev,
              doctor_id:
                prev.doctor_id || initialDoctorId || activeDoctors[0].id,
            }));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDoctorsError("فشل تحميل قائمة الأطباء");
        }
      } finally {
        if (!cancelled) {
          setLoadingDoctors(false);
        }
      }
    };
    loadDoctors();

    return () => {
      cancelled = true;
    };
  }, [isModalOpen, initialDoctorId]);

  const handleAddMedication = () => {
    setFormData({
      ...formData,
      medications: [
        ...formData.medications,
        { name: "", dosage: "", duration: "", notes: "" },
      ],
    });
  };

  const handleApplyPreset = (preset) => {
    const meds = [...formData.medications];
    if (meds.length === 1 && !meds[0].name) {
      meds[0] = { ...preset, notes: "" };
    } else {
      meds.push({ ...preset, notes: "" });
    }
    setFormData({ ...formData, medications: meds });
  };

  const handleRemoveMedication = (index) => {
    if (formData.medications.length === 1) return;
    setFormData({
      ...formData,
      medications: formData.medications.filter((_, i) => i !== index),
    });
  };

  const handlePrint = (item) => {
    setPrintItem(item);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // حفظ الروشتة مع فحص تحذيرات الحساسية
  const savePrescription = async (
    shouldPrintImmediately = false,
    overrideWarning = false,
  ) => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        confirm_allergy_warnings: overrideWarning,
      };

      const res = await api.post(
        `/patients/${patientId}/prescriptions`,
        payload,
      );
      const createdPrescription = res.data;

      const refreshedPrescriptions = await fetchPrescriptions();
      const prescriptionForPrint =
        refreshedPrescriptions?.find(
          (p) => String(p.id) === String(createdPrescription.id),
        ) || createdPrescription;

      // إغلاق وتصفير فقط عند نجاح الحفظ الفعلي
      setIsModalOpen(false);
      setAllergyWarnings([]);
      setFormData({
        doctor_id: initialDoctorId || "",
        prescription_date: new Date().toISOString().split("T")[0],
        diagnosis: initialDiagnosis || "",
        instructions:
          "الالتزام بمواعيد الجرعات بعد الأكل - كمادات باردة عند اللزوم",
        medications: [{ name: "", dosage: "", duration: "", notes: "" }],
      });

      notify("تم حفظ الروشتة بنجاح", "success");

      if (shouldPrintImmediately) {
        handlePrint(prescriptionForPrint);
      }
    } catch (err) {
      // 🚨 اعتراض تعارض الحساسية قبل الحفظ!
      if (
        err.response?.status === 409 &&
        (err.response?.data?.requires_allergy_confirmation ||
          err.response?.data?.can_override)
      ) {
        setAllergyWarnings(err.response.data.warnings || []);
      } else {
        notify(
          err.response?.data?.error || "حدث خطأ أثناء حفظ الروشتة",
          "error",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    savePrescription(false);
  };

  const handleDelete = (id) => {
    setPrescriptionToDelete(id);
  };

  const confirmDeletePrescription = async () => {
    const id = prescriptionToDelete;
    if (!id || isDeletingPrescription) return;

    setIsDeletingPrescription(true);

    try {
      await api.delete(`/prescriptions/${id}`);
      await fetchPrescriptions();

      setPrescriptionToDelete(null);
      notify("تم حذف الروشتة بنجاح", "success");
    } catch (err) {
      notify(err.response?.data?.error || "فشل حذف الروشتة", "error");
    } finally {
      setIsDeletingPrescription(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* الهيدر وزرار الإضافة */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--primary-base)]" />
            سجل الروشتات الطبية
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            إنشاء وطباعة روشتات الأدوية مع فحص الحساسية التلقائي.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-teal-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          روشتة سريعة جديدة
        </button>
      </div>

      {/* قائمة الروشتات */}
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
            اضغط على "روشتة سريعة جديدة" لإضافة أول وصفة طبية.
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
                className="bg-[#0d1527]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 rounded-lg">
                      {new Date(item.prescription_date).toLocaleDateString(
                        "ar-EG",
                      )}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      الطبيب:{" "}
                      <b className="text-white">
                        د. {item.doctor_name || "طبيب العيادة"}
                      </b>
                    </span>
                    {item.diagnosis && (
                      <span className="text-xs text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10">
                        التشخيص: {item.diagnosis}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrint(item)}
                      className="inline-flex items-center gap-1.5 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                      title="طباعة الروشتة"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      طباعة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-xl transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-400 block">
                    الأدوية الموصوفة (℞):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {meds.map((m, idx) => (
                      <div
                        key={idx}
                        className="bg-[#070b14]/70 p-2.5 rounded-xl border border-white/10 text-xs flex flex-col justify-between"
                      >
                        <span className="font-bold text-white">{m.name}</span>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                          <span>{m.dosage}</span>
                          {m.duration && (
                            <span className="text-teal-400">{m.duration}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {item.instructions && (
                  <p className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/10">
                    💡 <b>تعليمات إضافية:</b> {item.instructions}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal إنشاء روشتة جديدة */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-[#04070e]/75 backdrop-blur-md flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-[#0d1527]/95 backdrop-blur-2xl border border-teal-500/25 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                تحرير روشتة طبية سريعة للمريض
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MedicalAlertBanner
              alertSummary={patient?.alert_summary}
              className="mb-4"
            />
            {/* 🚨 بانر التحذير يظهر هنا داخل المودال إذا اكتشف السيرفر تعارض حساسية قبل الحفظ */}
            {allergyWarnings.length > 0 && (
              <div className="mb-4 p-4 rounded-2xl bg-rose-500/20 border-2 border-rose-500/60 text-rose-100 space-y-3 shadow-xl animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <AlertOctagon className="w-5 h-5 animate-pulse shrink-0" />
                    <span>
                      تحذير: تم اكتشاف تعارض دوائي مع حساسية المريض المسجلة!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllergyWarnings([])}
                    className="text-rose-300 hover:text-white p-1"
                    title="إغلاق التنبيه"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* قائمة الأدوية المتعارضة */}
                <ul className="space-y-1.5 text-xs pr-2">
                  {allergyWarnings.map((w, idx) => (
                    <li
                      key={idx}
                      className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 font-semibold"
                    >
                      ⚠️ {w.message}
                    </li>
                  ))}
                </ul>

                {/* أزرار اتخاذ القرار الطبي */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-rose-500/30">
                  <span className="text-[11px] text-rose-300">
                    💡 يمكنك تعديل اسم الدواء بالأسفل، أو المتابعة إذا كانت هناك
                    ضرورة طبية:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => savePrescription(false, true)} // 👈 حفظ بتجاوز التحذير
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
                    >
                      تأكيد وحفظ على مسؤوليتي
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => savePrescription(true, true)} // 👈 حفظ وطباعة بتجاوز التحذير
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>تأكيد وطباعة فوراً</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 p-3.5 bg-[#070b14]/70 rounded-xl border border-white/10">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                إضافة سريعة لأدوية الأسنان الشائعة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DENTAL_DRUG_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="text-xs bg-white/5 hover:bg-teal-500/15 hover:border-teal-500/40 hover:text-teal-300 border border-white/10 px-2.5 py-1 rounded-lg text-slate-200 transition"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    الطبيب المسؤول
                  </label>
                  <select
                    value={formData.doctor_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        doctor_id: e.target.value,
                      })
                    }
                    disabled={loadingDoctors}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                  >
                    <option value="">
                      {loadingDoctors ? "جاري التحميل..." : "اختر الطبيب"}
                    </option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        د. {doctor.name}
                      </option>
                    ))}
                  </select>
                  {doctorsError && (
                    <p className="text-xs text-rose-400 mt-1">{doctorsError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
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
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white font-mono focus:border-teal-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    التشخيص (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: خلع ضرس عقل، التهاب عصب..."
                    value={formData.diagnosis}
                    onChange={(e) =>
                      setFormData({ ...formData, diagnosis: e.target.value })
                    }
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* قائمة الأدوية */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white">
                    قائمة الأدوية (℞):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="text-xs text-teal-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة دواء يدوي
                  </button>
                </div>

                {formData.medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[#070b14]/70 rounded-xl border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-400">
                        دواء #{index + 1}
                      </span>
                      {formData.medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(index)}
                          className="text-rose-400 hover:text-rose-300 text-xs"
                        >
                          حذف الدواء
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="اسم الدواء والتركيز (Augmentin 1g)*"
                        value={med.name}
                        onChange={(e) => {
                          const meds = [...formData.medications];
                          meds[index].name = e.target.value;
                          setFormData({ ...formData, medications: meds });
                        }}
                        className="bg-[#0d1527] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="الجرعة (قرص كل 12 ساعة)*"
                        value={med.dosage}
                        onChange={(e) => {
                          const meds = [...formData.medications];
                          meds[index].dosage = e.target.value;
                          setFormData({ ...formData, medications: meds });
                        }}
                        className="bg-[#0d1527] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-400 focus:outline-none"
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
                        className="bg-[#0d1527] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  تعليمات ونصائح للمريض
                </label>
                <textarea
                  rows={2}
                  placeholder="تعليمات بعد الجراحة أو أثناء تناول العلاج..."
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-white resize-none focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ فقط"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => savePrescription(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-teal-500/20 disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>حفظ وطباعة فوراً</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {prescriptionToDelete && (
        <div
          className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-prescription-title"
            className="w-full max-w-md bg-[#0d1527] border border-rose-500/30 rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <div>
              <h3
                id="delete-prescription-title"
                className="text-base font-bold text-white"
              >
                تأكيد حذف الروشتة
              </h3>

              <p className="text-sm text-slate-300 mt-2">
                هل أنت متأكد من حذف الروشتة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingPrescription}
                onClick={() => setPrescriptionToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isDeletingPrescription}
                onClick={confirmDeletePrescription}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {isDeletingPrescription ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ورقة الطباعة الصامتة */}
      {printItem && (
        <div
          id="printable-prescription"
          className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[9999]"
          dir="rtl"
        >
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
                د. {printItem.doctor_name || "طبيب العيادة"}
              </h2>
              <p className="text-xs text-gray-600">طب وجراحة الفم والأسنان</p>
            </div>
          </div>

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

          <div className="text-3xl font-serif font-black mb-4 select-none">
            ℞
          </div>

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

          {printItem.instructions && (
            <div className="border border-dashed border-gray-300 p-3 rounded text-xs mb-8">
              <b>تعليمات وإرشادات:</b> {printItem.instructions}
            </div>
          )}

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
