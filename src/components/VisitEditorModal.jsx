import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import MedicalAlertBanner from "./MedicalAlertBanner";
import PatientPrescriptions from "./PatientPrescriptions";
import {
  X,
  Stethoscope,
  Plus,
  Trash2,
  Save,
  Lock,
  Unlock,
  Printer,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  BookmarkPlus,
  ShieldAlert,
} from "lucide-react";

// الأسطح الستة المعتمدة تشريحياً وفق الميجريشن والكنترولر الجديد (M, O, D, B, L, I)
const TOOTH_SURFACES = [
  { code: "O", label: "إطباقي (Occlusal)" },
  { code: "M", label: "أنسي (Mesial)" },
  { code: "D", label: "وحشي (Distal)" },
  { code: "B", label: "شفوي/خدي (Buccal)" },
  { code: "L", label: "لساني/حنكي (Lingual)" },
  { code: "I", label: "قاطعي (Incisal)" },
];

// التحقق السريع من رقم السن بنظام FDI في الفرونت إند
const isValidFdiTooth = (val) => {
  if (val === "" || val === null || val === undefined) return true;
  const n = Number(val);
  if (!Number.isInteger(n)) return false;
  return (
    (n >= 11 && n <= 18) ||
    (n >= 21 && n <= 28) ||
    (n >= 31 && n <= 38) ||
    (n >= 41 && n <= 48) ||
    (n >= 51 && n <= 55) ||
    (n >= 61 && n <= 65) ||
    (n >= 71 && n <= 75) ||
    (n >= 81 && n <= 85)
  );
};

export default function VisitEditorModal({
  isOpen,
  onClose,
  appointmentId = null,
  visitId = null,
  showToast,
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [visit, setVisit] = useState(null);
  const [loadingVisit, setLoadingVisit] = useState(false);

  // حقول الزيارة السريرية
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");
  const [anesthesiaNotes, setAnesthesiaNotes] = useState("");
  const [postOpInstructions, setPostOpInstructions] = useState("");
  const [procedures, setProcedures] = useState([]);

  // فتح التعديل الاستثنائي لـ ClinicAdmin مع سبب التعديل الإلزامي (amendment_reason)
  const [isAdminAmending, setIsAdminAmending] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");

  // الأقسام القابلة للطي
  const [openSections, setOpenSections] = useState({
    clinical: true,
    proceduresTable: true,
    notesAndAnesthesia: true,
    prescriptions: false,
  });

  // مودال حفظ قالب سريري مهيكل جديد
  const [newTemplateModal, setNewTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    category: "general",
    chief_complaint: "",
    diagnosis: "",
    procedure_notes: "",
    anesthesia_notes: "",
    post_op_instructions: "",
    is_clinic_wide: false,
  });

  // طباعة ملخص الزيارة
  const [isPrintingVisit, setIsPrintingVisit] = useState(false);
  const [autoOpenPrescription, setAutoOpenPrescription] = useState(false);
  const handlePrescriptionAutoOpenHandled = useCallback(() => {
    setAutoOpenPrescription(false);
  }, []);

  const notify = (msg, type = "success") => {
    if (showToast) showToast(msg, type);
    else if (type === "error") alert(msg);
  };

  // 1. فتح أو جلب بيانات الزيارة عند فتح المودال
  useEffect(() => {
    if (!isOpen) return;

    const initVisit = async () => {
      try {
        setLoadingVisit(true);
        let v = null;
        if (appointmentId) {
          const res = await api.post(`/appointments/${appointmentId}/visit`);
          v = res.data?.visit;
        } else if (visitId) {
          const res = await api.get(`/visits/${visitId}`);
          v = res.data?.visit;
        }

        if (v) {
          setVisit(v);
          setChiefComplaint(v.chief_complaint || "");
          setDiagnosis(v.diagnosis || "");
          setProcedureNotes(v.procedure_notes || "");
          setAnesthesiaNotes(v.anesthesia_notes || "");
          setPostOpInstructions(v.post_op_instructions || "");
          setProcedures(
            Array.isArray(v.procedures) && v.procedures.length > 0
              ? v.procedures.map((p) => ({
                  procedure_code_id: p.procedure_code_id || "",
                  procedure_name:
                    p.procedure_name || p.procedure_description || "",
                  tooth_number:
                    p.tooth_number !== null && p.tooth_number !== undefined
                      ? String(p.tooth_number)
                      : "",
                  surface: p.surface || "",
                  cost:
                    p.cost !== null && p.cost !== undefined
                      ? String(p.cost)
                      : "0",
                  notes: p.notes || "",
                }))
              : [],
          );
          setIsAdminAmending(false);
          setAmendmentReason("");
        }
      } catch (err) {
        notify(
          err.response?.data?.error || "تعذر فتح سجل الزيارة السريري",
          "error",
        );
        onClose();
      } finally {
        setLoadingVisit(false);
      }
    };

    initVisit();
  }, [isOpen, appointmentId, visitId]);

  // 2. جلب بيانات المريض الكاملة لعرض شريط التنبيه الطبي وفحص الحساسية
  const { data: fullPatientData } = useQuery({
    queryKey: ["patient", visit?.patient_id],
    queryFn: async () => {
      const res = await api.get(`/patients/${visit.patient_id}`);
      return res.data?.patient || res.data;
    },
    enabled: isOpen && !!visit?.patient_id,
  });

  // 3. جلب قائمة أكواد الإجراءات والخدمات في العيادة
  const { data: procedureCodes = [] } = useQuery({
    queryKey: ["procedure-codes"],
    queryFn: async () => {
      const res = await api.get("/procedure-codes");
      return Array.isArray(res.data)
        ? res.data
        : res.data?.procedure_codes || res.data?.procedures || [];
    },
    enabled: isOpen,
  });

  // 4. جلب القوالب السريرية المهيكلة للطبيب والعيادة
  const { data: noteTemplatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ["note-templates"],
    queryFn: async () => {
      const res = await api.get("/note-templates");
      return res.data?.templates || [];
    },
    enabled: isOpen,
  });
  const noteTemplates = noteTemplatesData || [];

  // تطبيق قالب سريري كامل بضغطة زر
  const handleApplyTemplate = (tpl) => {
    if (tpl.chief_complaint) {
      setChiefComplaint((prev) =>
        prev ? `${prev}\n${tpl.chief_complaint}` : tpl.chief_complaint,
      );
    }
    if (tpl.diagnosis) {
      setDiagnosis((prev) =>
        prev ? `${prev} - ${tpl.diagnosis}` : tpl.diagnosis,
      );
    }
    if (tpl.procedure_notes) {
      setProcedureNotes((prev) =>
        prev ? `${prev}\n${tpl.procedure_notes}` : tpl.procedure_notes,
      );
    }
    if (tpl.anesthesia_notes) {
      setAnesthesiaNotes((prev) => prev || tpl.anesthesia_notes);
    }
    if (tpl.post_op_instructions) {
      setPostOpInstructions((prev) => prev || tpl.post_op_instructions);
    }
    notify(`تم تطبيق قالب "${tpl.title}" بنجاح`, "success");
  };

  // التحقق من صحة الإجراءات قبل الإرسال للباك إند
  const validateProceduresBeforeSave = () => {
    for (const p of procedures) {
      if (p.tooth_number && !isValidFdiTooth(p.tooth_number)) {
        notify(
          `رقم السن (${p.tooth_number}) غير صالح. استخدم ترقيم FDI (11-48 للدائم أو 51-85 للبني)`,
          "error",
        );
        return false;
      }
    }
    if (visit?.status === "final") {
      if (user?.role !== "ClinicAdmin") {
        notify("تعديل الزيارة المعتمدة متاح لمدير العيادة فقط", "error");
        return false;
      }
      if (!amendmentReason || amendmentReason.trim().length < 5) {
        notify(
          "يرجى كتابة سبب التعديل الإداري (5 أحرف على الأقل) لتوثيقه في سجل التدقيق",
          "error",
        );
        return false;
      }
    }

    // التأكد من أن كل صف إجراء مكتمل قبل الإرسال
    for (const p of procedures) {
      const hasCost =
        p.cost !== undefined &&
        p.cost !== null &&
        String(p.cost).trim() !== "" &&
        (!Number.isFinite(Number(p.cost)) || Number(p.cost) !== 0);

      const hasDetails = Boolean(
        String(p.tooth_number ?? "").trim() ||
        String(p.surface ?? p.surfaces ?? "").trim() ||
        String(p.notes ?? "").trim() ||
        hasCost,
      );

      const hasProcedure = Boolean(
        String(p.procedure_name ?? "").trim() ||
        String(p.procedure_code_id ?? "").trim(),
      );

      if (hasDetails && !hasProcedure) {
        notify("يرجى تحديد اسم الإجراء أو اختياره من الكتالوج لكل صف", "error");
        return false;
      }
    }
    return true;
  };

  // حفظ تعديلات الزيارة
  const saveVisitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put(`/visits/${visit.id}`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      setVisit(data.visit);
      setIsAdminAmending(false);
      setAmendmentReason("");
      queryClient.invalidateQueries({ queryKey: ["patient-visits"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      notify("تم حفظ بيانات الزيارة السريرية بنجاح", "success");
    },
    onError: (err) => {
      notify(err.response?.data?.error || "حدث خطأ أثناء حفظ الزيارة", "error");
    },
  });

  // اعتماد وإغلاق الزيارة نهائياً (Finalize)
  const finalizeVisitMutation = useMutation({
    mutationFn: async () => {
      // 1. نحفظ البيانات أولاً وهي ما زالت draft
      await api.put(`/visits/${visit.id}`, {
        chief_complaint: chiefComplaint,
        diagnosis,
        procedure_notes: procedureNotes,
        anesthesia_notes: anesthesiaNotes,
        post_op_instructions: postOpInstructions,
        procedures,
      });
      // 2. نعتمد الزيارة ونحولها لـ final
      const res = await api.post(`/visits/${visit.id}/finalize`);
      return res.data;
    },
    onSuccess: (data) => {
      setVisit(data.visit);
      setIsAdminAmending(false);
      queryClient.invalidateQueries({ queryKey: ["patient-visits"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      notify(
        "تم اعتماد وإغلاق سجل الزيارة رسمياً وتحويل الموعد لمكتمل",
        "success",
      );
    },
    onError: (err) => {
      notify(err.response?.data?.error || "فشل اعتماد سجل الزيارة", "error");
    },
  });

  // إنشاء قالب سريري جديد (من بيانات الزيارة الحالية أو المودال)
  const createTemplateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/note-templates", payload);
      return res.data;
    },
    onSuccess: () => {
      refetchTemplates();
      setNewTemplateModal(false);
      notify("تم حفظ القالب السريري السريع بنجاح", "success");
    },
    onError: (err) => {
      notify(err.response?.data?.error || "فشل حفظ القالب", "error");
    },
  });

  // حذف قالب مخصص
  const deleteTemplateMutation = useMutation({
    mutationFn: async (tplId) => {
      const res = await api.delete(`/note-templates/${tplId}`);
      return res.data;
    },
    onSuccess: () => {
      refetchTemplates();
      notify("تم حذف القالب", "success");
    },
    onError: (err) => {
      notify(err.response?.data?.error || "تعذر حذف القالب", "error");
    },
  });

  // إضافة سطر إجراء جديد
  const handleAddProcedureRow = () => {
    setProcedures([
      ...procedures,
      {
        procedure_code_id: "",
        procedure_name: "",
        tooth_number: "",
        surface: "",
        cost: "",
        notes: "",
      },
    ]);
  };

  // تبديل سطح السن داخل النص (مثلاً "MOD")
  const handleToggleSurface = (rowIndex, surfaceCode) => {
    const updated = [...procedures];
    const currentStr = String(updated[rowIndex].surface || "").toUpperCase();
    const chars = currentStr.split("").filter(Boolean);

    if (chars.includes(surfaceCode)) {
      updated[rowIndex].surface = chars
        .filter((c) => c !== surfaceCode)
        .join("");
    } else {
      updated[rowIndex].surface = [...chars, surfaceCode].join("");
    }
    setProcedures(updated);
  };

  const handlePrintVisitSummary = () => {
    setIsPrintingVisit(true);
    setTimeout(() => {
      window.print();
      setIsPrintingVisit(false);
    }, 150);
  };

  if (!isOpen) return null;

  const isLocked = visit?.status === "final" && !isAdminAmending;

  return (
    <div className="fixed inset-0 z-50 bg-[#04070e]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        dir="rtl"
        className="relative w-full max-w-4xl bg-[#0d1527]/90 backdrop-blur-2xl border border-teal-500/25 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-right"
      >
        {/* الهيدر الزجاجي */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/10 bg-[#070b14]/70 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  سجل الزيارة السريري والروشتة
                </h2>
                {visit?.status === "final" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Lock className="w-3 h-3" /> معتمد ومغلق قانونياً
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    مسودة قيد التحرير
                  </span>
                )}
              </div>
              {visit && (
                <p className="text-xs text-slate-400 mt-0.5">
                  المريض: <b className="text-slate-200">{visit.patient_name}</b>{" "}
                  • الطبيب:{" "}
                  <b className="text-teal-300">د. {visit.doctor_name}</b>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {visit && (
              <button
                type="button"
                onClick={handlePrintVisitSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition"
              >
                <Printer className="w-3.5 h-3.5 text-teal-400" />
                <span>طباعة السجل</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* المحتوى */}
        {loadingVisit || !visit ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <span className="text-sm">جاري فتح الملف السريري للزيارة...</span>
          </div>
        ) : (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* شريط التنبيه الطبي الحاسم */}
            <MedicalAlertBanner alertSummary={fullPatientData?.alert_summary} />

            {/* شريط حالة الاعتماد والتعديل الاستثنائي لـ ClinicAdmin */}
            {visit.status === "final" && (
              <div className="p-4 rounded-xl bg-indigo-500/15 border border-indigo-400/30 space-y-3 text-xs text-indigo-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-semibold">
                      هذه الزيارة معتمدة ونهائية.{" "}
                      {user?.role === "ClinicAdmin"
                        ? "بصفتك مدير العيادة، يمكنك إجراء تعديل استثنائي موثق في سجل التدقيق."
                        : "لا يمكن تعديل السجل بعد اعتماده إلا بواسطة مدير العيادة."}
                    </span>
                  </div>
                  {user?.role === "ClinicAdmin" && !isAdminAmending && (
                    <button
                      type="button"
                      onClick={() => setIsAdminAmending(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 transition"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>فتح التعديل الاستثنائي</span>
                    </button>
                  )}
                </div>

                {isAdminAmending && (
                  <div className="pt-2 border-t border-indigo-400/20">
                    <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      سبب التعديل الإداري على الزيارة المعتمدة (إلزامي - 5 أحرف
                      على الأقل) *
                    </label>
                    <input
                      type="text"
                      required
                      value={amendmentReason}
                      onChange={(e) => setAmendmentReason(e.target.value)}
                      placeholder="مثال: تصحيح رقم السن المعالج بناءً على مراجعة الأشعة..."
                      className="w-full bg-[#070b14] border border-amber-500/40 rounded-xl p-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* شريط القوالب السريرية الجاهزة (يملأ الشكوى والتشخيص والإجراء والتخدير والتعليمات) */}
            {!isLocked && (
              <div className="p-3.5 rounded-2xl bg-[#070b14]/80 border border-teal-500/20 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    قوالب الزيارات السريعة (اضغط لملء الحقول السريرية تلقائياً):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateForm({
                        title: "",
                        category: "general",
                        chief_complaint: chiefComplaint,
                        diagnosis: diagnosis,
                        procedure_notes: procedureNotes,
                        anesthesia_notes: anesthesiaNotes,
                        post_op_instructions: postOpInstructions,
                        is_clinic_wide: false,
                      });
                      setNewTemplateModal(true);
                    }}
                    className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>+ حفظ البيانات الحالية كقالب جديد</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {noteTemplates.map((tpl) => {
                    const isCustom = !String(tpl.id).startsWith("default-");
                    return (
                      <div
                        key={tpl.id}
                        className="inline-flex items-center rounded-xl bg-white/5 hover:bg-teal-500/15 border border-white/10 hover:border-teal-500/30 transition overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(tpl)}
                          className="px-3 py-1.5 text-xs text-slate-200 hover:text-teal-300 font-medium"
                        >
                          ⚡ {tpl.title}
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteTemplateMutation.mutate(tpl.id)
                            }
                            title="حذف هذا القالب"
                            className="px-2 py-1.5 text-slate-500 hover:text-rose-400 border-r border-white/10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 1. قسم الشكوى والتشخيص (قابل للطي) */}
            <div className="border border-white/10 rounded-2xl bg-[#070b14]/60 overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSections((s) => ({ ...s, clinical: !s.clinical }))
                }
                className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-teal-300 bg-white/[0.02] hover:bg-white/[0.05] transition"
              >
                <span>
                  1. شكوى المريض والتشخيص السريري (Chief Complaint & Diagnosis)
                </span>
                {openSections.clinical ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {openSections.clinical && (
                <div className="p-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      شكوى المريض (Chief Complaint)
                    </label>
                    <textarea
                      rows={2}
                      disabled={isLocked}
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="مثال: ألم حاد مستمر في الضرس السفلي الأيمن مع المشروبات الباردة..."
                      className="w-full bg-[#0d1527] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-teal-400 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      التشخيص السريري (Diagnosis)
                    </label>
                    <textarea
                      rows={2}
                      disabled={isLocked}
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="مثال: التهاب عصب غير رجعي (Irreversible Pulpitis) بالضرس #46..."
                      className="w-full bg-[#0d1527] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-teal-400 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. جدول إجراءات الزيارة والأسنان والأسطح والتكلفة */}
            <div className="border border-white/10 rounded-2xl bg-[#070b14]/60 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between bg-white/[0.02] border-b border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((s) => ({
                      ...s,
                      proceduresTable: !s.proceduresTable,
                    }))
                  }
                  className="text-xs sm:text-sm font-bold text-teal-300 flex items-center gap-2"
                >
                  <span>2. الإجراءات المنفذة وأرقام الأسنان (FDI) والأسطح</span>
                </button>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleAddProcedureRow}
                    className="inline-flex items-center gap-1 text-xs bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 px-3 py-1 rounded-xl font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة إجراء بالزيارة</span>
                  </button>
                )}
              </div>

              {openSections.proceduresTable && (
                <div className="p-4 space-y-3">
                  {procedures.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">
                      لم يتم تسجيل إجراءات محددة بعد. اضغط "إضافة إجراء
                      بالزيارة" لتوثيق الخدمة ورقم السن والأسطح.
                    </p>
                  ) : (
                    procedures.map((proc, idx) => {
                      const toothInvalid =
                        proc.tooth_number &&
                        !isValidFdiTooth(proc.tooth_number);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#0d1527]/90 border border-white/10 space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            {/* اختيار من كتالوج العيادة */}
                            <div className="sm:col-span-4">
                              <label className="block text-[11px] text-slate-400 mb-1">
                                اختر من كتالوج الخدمات
                              </label>
                              <select
                                disabled={isLocked}
                                value={proc.procedure_code_id}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  const found = procedureCodes.find(
                                    (pc) => pc.id === selectedId,
                                  );
                                  const updated = [...procedures];
                                  updated[idx].procedure_code_id = selectedId;
                                  if (found) {
                                    updated[idx].procedure_name =
                                      found.description;
                                    updated[idx].cost = String(
                                      found.default_price ?? 0,
                                    );
                                  }
                                  setProcedures(updated);
                                }}
                                className="w-full bg-[#070b14] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                              >
                                <option value="">
                                  -- اختر خدمة أو اكتب يدوياً --
                                </option>
                                {procedureCodes.map((pc) => (
                                  <option key={pc.id} value={pc.id}>
                                    {pc.description} ({pc.code}) -{" "}
                                    {pc.default_price} ج.م
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* اسم الإجراء */}
                            <div className="sm:col-span-3">
                              <label className="block text-[11px] text-slate-400 mb-1">
                                اسم الإجراء *
                              </label>
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="مثال: حشو كومبوزيت"
                                value={proc.procedure_name}
                                onChange={(e) => {
                                  const updated = [...procedures];
                                  updated[idx].procedure_name = e.target.value;
                                  setProcedures(updated);
                                }}
                                className="w-full bg-[#070b14] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                              />
                            </div>

                            {/* رقم السن FDI */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] text-slate-400 mb-1">
                                رقم السن (FDI)
                              </label>
                              <input
                                type="number"
                                disabled={isLocked}
                                placeholder="11-48 / 51-85"
                                value={proc.tooth_number}
                                onChange={(e) => {
                                  const updated = [...procedures];
                                  updated[idx].tooth_number = e.target.value;
                                  setProcedures(updated);
                                }}
                                className={`w-full bg-[#070b14] border rounded-lg p-2 text-xs text-white font-mono text-center focus:outline-none ${
                                  toothInvalid
                                    ? "border-rose-500 text-rose-300"
                                    : "border-white/10 focus:border-teal-400"
                                }`}
                              />
                            </div>

                            {/* التكلفة */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] text-slate-400 mb-1">
                                التكلفة (ج.م)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                disabled={isLocked}
                                placeholder="0"
                                value={proc.cost}
                                onChange={(e) => {
                                  const updated = [...procedures];
                                  updated[idx].cost = e.target.value;
                                  setProcedures(updated);
                                }}
                                className="w-full bg-[#070b14] border border-white/10 rounded-lg p-2 text-xs text-teal-300 font-mono text-center focus:border-teal-400 focus:outline-none"
                              />
                            </div>

                            {/* حذف السطر */}
                            <div className="sm:col-span-1 flex justify-end">
                              {!isLocked && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProcedures(
                                      procedures.filter((_, i) => i !== idx),
                                    )
                                  }
                                  className="p-2 text-rose-400 hover:bg-rose-500/15 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* أزرار الأسطح الستة + الملاحظات */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
                            <div className="sm:col-span-6 flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400 ml-1 shrink-0">
                                الأسطح:
                              </span>
                              {TOOTH_SURFACES.map((sf) => {
                                const active = String(proc.surface || "")
                                  .toUpperCase()
                                  .includes(sf.code);
                                return (
                                  <button
                                    key={sf.code}
                                    type="button"
                                    disabled={isLocked}
                                    title={sf.label}
                                    onClick={() =>
                                      handleToggleSurface(idx, sf.code)
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                                      active
                                        ? "bg-teal-500 text-slate-950 border-teal-400 shadow"
                                        : "bg-[#070b14] text-slate-400 border-white/10 hover:text-white"
                                    }`}
                                  >
                                    {sf.code}
                                  </button>
                                );
                              })}
                              {proc.surface && (
                                <span className="text-xs font-mono font-bold text-teal-400 mr-1">
                                  ({proc.surface})
                                </span>
                              )}
                            </div>

                            <div className="sm:col-span-6">
                              <input
                                type="text"
                                disabled={isLocked}
                                placeholder="ملاحظات خاصة بهذا السن/الإجراء (اختياري)..."
                                value={proc.notes}
                                onChange={(e) => {
                                  const updated = [...procedures];
                                  updated[idx].notes = e.target.value;
                                  setProcedures(updated);
                                }}
                                className="w-full bg-[#070b14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-teal-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 3. تفاصيل الإجراء والتخدير والتعليمات */}
            <div className="border border-white/10 rounded-2xl bg-[#070b14]/60 overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSections((s) => ({
                    ...s,
                    notesAndAnesthesia: !s.notesAndAnesthesia,
                  }))
                }
                className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-teal-300 bg-white/[0.02] hover:bg-white/[0.05] transition"
              >
                <span>3. تفاصيل الجلسة، التخدير، وتعليمات ما بعد الكشف</span>
                {openSections.notesAndAnesthesia ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {openSections.notesAndAnesthesia && (
                <div className="p-4 border-t border-white/10 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      تفاصيل الإجراء السريري (Procedure Notes)
                    </label>
                    <textarea
                      rows={3}
                      disabled={isLocked}
                      value={procedureNotes}
                      onChange={(e) => setProcedureNotes(e.target.value)}
                      placeholder="اكتب خطوات الجلسة أو اضغط على أحد القوالب السريعة بالأعلى..."
                      className="w-full bg-[#0d1527] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-teal-400 focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        ملاحظات التخدير (Anesthesia Notes)
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={anesthesiaNotes}
                        onChange={(e) => setAnesthesiaNotes(e.target.value)}
                        placeholder="مثال: 1 كربولة Articaine 4% 1:100,000 (IANB)"
                        className="w-full bg-[#0d1527] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-teal-400 focus:outline-none disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        تعليمات ما بعد الجلسة للمريض (Post-Op Instructions)
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={postOpInstructions}
                        onChange={(e) => setPostOpInstructions(e.target.value)}
                        placeholder="مثال: عدم الأكل لمدة ساعتين، كمادات باردة..."
                        className="w-full bg-[#0d1527] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-teal-400 focus:outline-none disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. قسم الروشتة السريعة المدمج مع الزيارة */}
            <div className="border border-teal-500/30 rounded-2xl bg-[#070b14]/80 overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSections((s) => ({
                    ...s,
                    prescriptions: !s.prescriptions,
                  }))
                }
                className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-teal-300 bg-teal-500/10 hover:bg-teal-500/15 transition"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>4. الروشتة السريعة وطباعة الأدوية لهذه الزيارة 💊</span>
                </span>
                {openSections.prescriptions ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {openSections.prescriptions && (
                <div className="p-4 border-t border-teal-500/20">
                  <PatientPrescriptions
                    patientId={visit.patient_id}
                    patient={
                      fullPatientData || {
                        name: visit.patient_name,
                        phone_number: visit.patient_phone,
                      }
                    }
                    initialDiagnosis={diagnosis}
                    initialDoctorId={visit.doctor_id}
                    autoOpenNew={autoOpenPrescription}
                    onAutoOpenHandled={handlePrescriptionAutoOpenHandled}
                    showToast={showToast}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* فوتر الحفظ والاعتماد */}
        {visit && (
          <div className="px-6 py-4 border-t border-white/10 bg-[#070b14]/85 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setOpenSections((s) => ({ ...s, prescriptions: true }));
                setAutoOpenPrescription(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition"
            >
              <FileText className="w-4 h-4" />
              <span>إصدار وطباعة روشتة سريعة</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                إغلاق
              </button>

              {!isLocked && (
                <>
                  <button
                    type="button"
                    disabled={
                      saveVisitMutation.isPending ||
                      finalizeVisitMutation.isPending
                    }
                    onClick={() => {
                      if (!validateProceduresBeforeSave()) return;
                      saveVisitMutation.mutate({
                        chief_complaint: chiefComplaint,
                        diagnosis,
                        procedure_notes: procedureNotes,
                        anesthesia_notes: anesthesiaNotes,
                        post_op_instructions: postOpInstructions,
                        procedures,
                        amendment_reason:
                          visit.status === "final"
                            ? amendmentReason.trim()
                            : undefined,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-teal-400" />
                    <span>
                      {saveVisitMutation.isPending
                        ? "جاري الحفظ..."
                        : visit.status === "final"
                          ? "حفظ التعديل الموثق"
                          : "حفظ كمسودة"}
                    </span>
                  </button>

                  {visit.status !== "final" && (
                    <button
                      type="button"
                      disabled={
                        saveVisitMutation.isPending ||
                        finalizeVisitMutation.isPending
                      }
                      onClick={() => {
                        if (!validateProceduresBeforeSave()) return;
                        finalizeVisitMutation.mutate();
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {finalizeVisitMutation.isPending
                          ? "جاري الاعتماد..."
                          : "اعتماد وإغلاق الزيارة"}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* مودال حفظ قالب سريري مهيكل جديد */}
      {newTemplateModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#0d1527] border border-teal-500/30 rounded-2xl max-w-lg w-full p-5 space-y-3.5 text-right shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-white">
                حفظ قالب زيارة سريرية سريع
              </h4>
              <button
                type="button"
                onClick={() => setNewTemplateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  عنوان القالب *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خلع ضرس عقل جراحي"
                  value={templateForm.title}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, title: e.target.value })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  التصنيف
                </label>
                <select
                  value={templateForm.category}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      category: e.target.value,
                    })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white"
                >
                  <option value="general">عام (General)</option>
                  <option value="restorative">حشو وترميم (Restorative)</option>
                  <option value="endodontics">علاج جذور (Endodontics)</option>
                  <option value="surgery">جراحة وخلع (Surgery)</option>
                  <option value="prosthodontics">
                    تركيبات (Prosthodontics)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                الشكوى الافتراضية
              </label>
              <input
                type="text"
                value={templateForm.chief_complaint}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    chief_complaint: e.target.value,
                  })
                }
                className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                التشخيص الافتراضي
              </label>
              <input
                type="text"
                value={templateForm.diagnosis}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    diagnosis: e.target.value,
                  })
                }
                className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                تفاصيل الإجراء السريري
              </label>
              <textarea
                rows={2}
                value={templateForm.procedure_notes}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    procedure_notes: e.target.value,
                  })
                }
                className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  ملاحظات التخدير
                </label>
                <input
                  type="text"
                  value={templateForm.anesthesia_notes}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      anesthesia_notes: e.target.value,
                    })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  تعليمات ما بعد الجلسة
                </label>
                <input
                  type="text"
                  value={templateForm.post_op_instructions}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      post_op_instructions: e.target.value,
                    })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2 text-xs text-white"
                />
              </div>
            </div>

            {user?.role === "ClinicAdmin" && (
              <label className="flex items-center gap-2 text-xs text-teal-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={templateForm.is_clinic_wide}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      is_clinic_wide: e.target.checked,
                    })
                  }
                  className="rounded accent-teal-500 w-4 h-4"
                />
                <span>إتاحة هذا القالب كقالب عام لجميع أطباء العيادة</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setNewTemplateModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 text-xs text-slate-300"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={createTemplateMutation.isPending}
                onClick={() => {
                  const title = templateForm.title.trim();

                  if (!title) {
                    notify("عنوان القالب مطلوب", "error");
                    return;
                  }

                  createTemplateMutation.mutate({
                    ...templateForm,
                    title,
                  });
                }}
                className="px-4 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold disabled:opacity-50"
              >
                {createTemplateMutation.isPending
                  ? "جاري الحفظ..."
                  : "حفظ القالب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ورقة طباعة سجل الزيارة السريري (Print CSS) */}
      {isPrintingVisit && visit && (
        <div
          className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999]"
          dir="rtl"
        >
          <div className="border-b-2 border-black pb-4 mb-4 flex justify-between">
            <div>
              <h1 className="text-xl font-bold">{visit.clinic_name}</h1>
              <p className="text-xs text-gray-600">{visit.clinic_address}</p>
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold">تقرير زيارة سريرية</h2>
              <p className="text-xs text-gray-600">د. {visit.doctor_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 border rounded text-xs mb-4">
            <div>
              <b>المريض:</b> {visit.patient_name}
            </div>
            <div>
              <b>الهاتف:</b> {visit.patient_phone}
            </div>
            <div>
              <b>التاريخ:</b>{" "}
              {new Date(visit.visit_date).toLocaleDateString("ar-EG")}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {chiefComplaint && (
              <div>
                <b>شكوى المريض:</b> {chiefComplaint}
              </div>
            )}
            {diagnosis && (
              <div>
                <b>التشخيص:</b> {diagnosis}
              </div>
            )}
            {procedures.length > 0 && (
              <div>
                <b>الإجراءات المنفذة:</b>
                <table className="w-full border border-gray-300 mt-1 text-right text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-1.5 border">الإجراء</th>
                      <th className="p-1.5 border">رقم السن</th>
                      <th className="p-1.5 border">الأسطح</th>
                      <th className="p-1.5 border">التكلفة</th>
                      <th className="p-1.5 border">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procedures.map((p, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 border">{p.procedure_name}</td>
                        <td className="p-1.5 border font-mono">
                          {p.tooth_number || "-"}
                        </td>
                        <td className="p-1.5 border font-mono">
                          {p.surface || "-"}
                        </td>
                        <td className="p-1.5 border font-mono">
                          {p.cost ? `${p.cost} ج.م` : "-"}
                        </td>
                        <td className="p-1.5 border">{p.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {anesthesiaNotes && (
              <div>
                <b>التخدير:</b> {anesthesiaNotes}
              </div>
            )}
            {procedureNotes && (
              <div>
                <b>تفاصيل الجلسة:</b>
                <p className="mt-1 whitespace-pre-wrap">{procedureNotes}</p>
              </div>
            )}
            {postOpInstructions && (
              <div>
                <b>تعليمات ما بعد الكشف:</b> {postOpInstructions}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
