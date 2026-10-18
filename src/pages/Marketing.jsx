import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Megaphone,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RefreshCw,
  Sparkles,
  Loader2,
  Check,
  X,
  Layers,
} from "lucide-react";

export default function Marketing({ showToast }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tomorrow"); // tomorrow | six_months | incomplete_plan | no_show | templates

  // قوالب الرسائل والتعديل
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateBody, setTemplateBody] = useState("");
  const [pendingWhatsAppAction, setPendingWhatsAppAction] = useState(null);
  // ==========================================
  // 1. استعلام تذكيرات الغد
  // ==========================================
  const {
    data: tomorrowData = { reminders: [], count: 0 },
    isLoading: isLoadingTomorrow,
    refetch: refetchTomorrow,
  } = useQuery({
    queryKey: ["recall-tomorrow"],
    queryFn: async () => {
      const res = await api.get("/recall/tomorrow-reminders");
      return res.data || { reminders: [], count: 0 };
    },
    enabled: activeTab === "tomorrow",
  });

  // ==========================================
  // 2. استعلام حملات الـ Recall الذكية
  // ==========================================
  const {
    data: recallData = { candidates: [], count: 0 },
    isLoading: isLoadingRecall,
    refetch: refetchRecall,
  } = useQuery({
    queryKey: ["recall-candidates", activeTab],
    queryFn: async () => {
      const res = await api.get(`/recall/candidates?type=${activeTab}`);
      return res.data || { candidates: [], count: 0 };
    },
    enabled: ["six_months", "incomplete_plan", "no_show"].includes(activeTab),
  });

  // ==========================================
  // 3. استعلام قوالب الرسائل
  // ==========================================
  const {
    data: templatesData = { templates: [] },
    isLoading: isLoadingTemplates,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ["recall-templates"],
    queryFn: async () => {
      const res = await api.get("/recall/templates");
      return res.data || { templates: [] };
    },
    enabled: activeTab === "templates",
  });

  // Mutation تسجيل إرسال رسالة
  const logActionMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/recall/log", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recall-tomorrow"] });
      queryClient.invalidateQueries({ queryKey: ["recall-candidates"] });
    },
  });

  // Mutation حفظ وتعديل القالب
  const updateTemplateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/recall/templates", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recall-templates"] });
      setEditingTemplate(null);
      if (showToast) showToast("تم تحديث قالب الرسالة بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل تحديث القالب", "error");
    },
  });

  // فتح الواتساب للمريض وتوثيق الإرسال فوراً
  const handleSendWhatsApp = (item, recallType) => {
    if (!item.wa_url) {
      if (showToast) {
        showToast("رقم هاتف المريض غير صالح لفتح واتساب", "error");
      }
      return;
    }

    if (pendingWhatsAppAction) {
      if (showToast) {
        showToast("أكد أو ألغِ عملية الإرسال الحالية أولًا", "error");
      }
      return;
    }

    const whatsappWindow = window.open(item.wa_url, "_blank");

    if (!whatsappWindow) {
      if (showToast) {
        showToast(
          "المتصفح منع فتح واتساب. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.",
          "error",
        );
      }
      return;
    }

    // لا نسجل الإرسال هنا؛ ننتظر تأكيد الموظف بعد الرجوع من واتساب.
    setPendingWhatsAppAction({ item, recallType });
  };

  const confirmWhatsAppSent = () => {
    if (!pendingWhatsAppAction || logActionMutation.isPending) {
      return;
    }

    const { item, recallType } = pendingWhatsAppAction;

    logActionMutation.mutate(
      {
        patient_id: item.patient_id,
        appointment_id: item.appointment_id || null,
        recall_type: recallType,
        notes: `أكد الموظف يدويًا إرسال رسالة واتساب للمريض ${item.patient_name}`,
      },
      {
        onSuccess: () => {
          setPendingWhatsAppAction(null);

          if (showToast) {
            showToast(
              "تم تسجيل تأكيدك للإرسال، دون تحقق مباشر من واتساب.",
              "success",
            );
          }
        },
        onError: (err) => {
          if (showToast) {
            showToast(
              err.response?.data?.error || "فشل تسجيل تأكيد الإرسال",
              "error",
            );
          }
        },
      },
    );
  };

  // فتح مودال تعديل القالب
  const handleOpenEditTemplate = (tpl) => {
    setEditingTemplate(tpl);
    setTemplateBody(tpl.body);
  };

  const handleSaveTemplate = (e) => {
    e.preventDefault();
    if (!templateBody.trim()) return;
    updateTemplateMutation.mutate({
      type: editingTemplate.type,
      name: editingTemplate.name,
      body: templateBody,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 🌟 1. هيدر الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-4 sm:p-5 rounded-[var(--radius-card)] border border-[var(--border-default)] shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-[var(--primary-base)]" />
            التسويق واستدعاء المرضى الذكي (Recall)
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            أتمتة تذكيرات مواعيد الغد، استدعاء الغائبين والفحص الدوري، وزيادة
            دخل العيادة بنقرة واحدة عبر الواتساب.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-2 rounded-lg border border-[var(--border-default)]">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span>يعمل بدون Cron jobs بنظام الاستعلام اللحظي عند الطلب.</span>
        </div>
      </div>

      {/* 🌟 2. تبويبات التنقل */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-default)] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("tomorrow")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            activeTab === "tomorrow"
              ? "border-teal-500 text-teal-400 bg-teal-500/10"
              : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>تذكيرات مواعيد الغد</span>
          {tomorrowData.count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-teal-500/20 text-teal-300 font-mono">
              {tomorrowData.count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("six_months")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            activeTab === "six_months"
              ? "border-teal-500 text-teal-400 bg-teal-500/10"
              : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>فحص دوري (6 أشهر)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("incomplete_plan")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            activeTab === "incomplete_plan"
              ? "border-teal-500 text-teal-400 bg-teal-500/10"
              : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>خطط علاج غير مكتملة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("no_show")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            activeTab === "no_show"
              ? "border-teal-500 text-teal-400 bg-teal-500/10"
              : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>تعويض الغياب (No-Show)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-all border-b-2 mr-auto ${
            activeTab === "templates"
              ? "border-teal-500 text-teal-400 bg-teal-500/10"
              : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>قوالب الرسائل</span>
        </button>
      </div>

      {/* 🌟 3. محتوى التبويب الأول: تذكيرات الغد */}
      {activeTab === "tomorrow" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1527] p-4 rounded-xl border border-[var(--border-default)]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                مواعيد الغد المجدولة ({tomorrowData.count} موعد)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                اضغط على زر الواتساب لإرسال تذكير الموعد مجهزاً بالوقت واسم
                الطبيب.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetchTomorrow()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث القائمة</span>
            </button>
          </div>

          {isLoadingTomorrow ? (
            <div className="py-20 flex justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            </div>
          ) : tomorrowData.reminders.length === 0 ? (
            <div className="py-16 text-center text-xs bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 space-y-2">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-1 opacity-50" />
              <p className="text-white font-semibold">
                لا توجد مواعيد مجدولة للغد حتى الآن.
              </p>
              <p className="text-slate-400">
                يمكنك مراجعة التقويم لحجز مواعيد جديدة.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[var(--text-muted)] text-[11px]">
                    <tr>
                      <th className="p-3.5 sm:px-4 font-medium">الوقت</th>
                      <th className="p-3.5 sm:px-4 font-medium">المريض</th>
                      <th className="p-3.5 sm:px-4 font-medium">رقم الهاتف</th>
                      <th className="p-3.5 sm:px-4 font-medium">
                        الطبيب المعالج
                      </th>
                      <th className="p-3.5 sm:px-4 font-medium">
                        حالة التذكير
                      </th>
                      <th className="p-3.5 sm:px-4 font-medium text-left">
                        إجراء
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)] text-slate-200">
                    {tomorrowData.reminders.map((r) => (
                      <tr
                        key={r.appointment_id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3.5 sm:px-4 font-mono font-bold text-teal-300">
                          {r.formatted_time}
                        </td>
                        <td className="p-3.5 sm:px-4 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{r.patient_name}</span>
                            {r.marketing_opt_out && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                title="المريض لا يفضل العروض التسويقية (لكنه يستلم تذكيرات مواعيده المؤكدة)"
                              >
                                لا يفضل العروض
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 sm:px-4 font-mono text-slate-400">
                          {r.patient_phone || "غير مسجل"}
                        </td>
                        <td className="p-3.5 sm:px-4 text-slate-300">
                          د. {r.doctor_name}
                        </td>
                        <td className="p-3.5 sm:px-4">
                          {r.is_already_sent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                              <Check className="w-3 h-3" />
                              تم الإرسال مسبقاً
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-medium">
                              لم يتم التذكير بعد
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 sm:px-4 text-left">
                          <button
                            type="button"
                            onClick={() =>
                              handleSendWhatsApp(r, "reminder_tomorrow")
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                              r.is_already_sent
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {r.is_already_sent
                                ? "إعادة إرسال واتساب"
                                : "إرسال تذكير واتساب"}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🌟 4. محتوى تبويبات الاستدعاء (فحص 6 أشهر، خطط غير مكتملة، No-Show) */}
      {["six_months", "incomplete_plan", "no_show"].includes(activeTab) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1527] p-4 rounded-xl border border-[var(--border-default)]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                {activeTab === "six_months" &&
                  "مرضى الفحص الدوري وتنظيف الجير (أكثر من 6 أشهر)"}
                {activeTab === "incomplete_plan" &&
                  "مرضى لديهم خطط علاجية نشطة لم تكتمل"}
                {activeTab === "no_show" &&
                  "مرضى تغيبوا عن آخر موعد ولم يعيدوا الحجز"}
                <span className="text-xs font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                  {recallData.count} مريض مؤهل
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                يتم تطبيق فترة Cooldown ذكية وتصفية المرضى الذين طلبوا عدم
                إزعاجهم تلقائياً.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetchRecall()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث القائمة</span>
            </button>
          </div>

          {isLoadingRecall ? (
            <div className="py-20 flex justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            </div>
          ) : recallData.candidates.length === 0 ? (
            <div className="py-16 text-center text-xs bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-1 opacity-70" />
              <p className="text-white font-semibold">
                ممتاز! لا يوجد مرضى مستحقين للاستدعاء في هذه القائمة حالياً.
              </p>
              <p className="text-slate-400">
                تم التواصل مع المستحقين حديثاً أو لا توجد حالات معلقة مطابقة
                للشروط.
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] text-[var(--text-muted)] text-[11px]">
                    <tr>
                      <th className="p-3.5 sm:px-4 font-medium">المريض</th>
                      <th className="p-3.5 sm:px-4 font-medium">رقم الهاتف</th>
                      <th className="p-3.5 sm:px-4 font-medium">
                        {activeTab === "six_months" && "تاريخ آخر زيارة"}
                        {activeTab === "incomplete_plan" &&
                          "الخطة العلاجية والبنود المعلقة"}
                        {activeTab === "no_show" && "تاريخ الموعد الفائت"}
                      </th>
                      <th className="p-3.5 sm:px-4 font-medium">
                        آخر تواصل سابق
                      </th>
                      <th className="p-3.5 sm:px-4 font-medium text-left">
                        إجراء الاستدعاء
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)] text-slate-200">
                    {recallData.candidates.map((c) => (
                      <tr
                        key={c.patient_id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3.5 sm:px-4 font-semibold text-white">
                          {c.patient_name}
                        </td>
                        <td className="p-3.5 sm:px-4 font-mono text-slate-400">
                          {c.patient_phone || "غير مسجل"}
                        </td>
                        <td className="p-3.5 sm:px-4 text-slate-300">
                          {activeTab === "six_months" && (
                            <span className="font-mono">
                              {c.last_visit_date
                                ? new Date(
                                    c.last_visit_date,
                                  ).toLocaleDateString("ar-EG")
                                : "لا توجد زيارة سابقة"}
                            </span>
                          )}
                          {activeTab === "incomplete_plan" && (
                            <div>
                              <p className="font-semibold text-teal-300">
                                {c.plan_title}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {c.pending_items_count} إجراءات متبقية
                              </span>
                            </div>
                          )}
                          {activeTab === "no_show" && (
                            <span className="font-mono text-rose-300">
                              {new Date(
                                c.missed_appointment_date,
                              ).toLocaleDateString("ar-EG")}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 sm:px-4 text-slate-400 font-mono text-[11px]">
                          {c.last_contacted_at
                            ? new Date(c.last_contacted_at).toLocaleDateString(
                                "ar-EG",
                              )
                            : "لم يتم التواصل مسبقاً"}
                        </td>
                        <td className="p-3.5 sm:px-4 text-left">
                          <button
                            type="button"
                            onClick={() =>
                              handleSendWhatsApp(
                                c,
                                activeTab === "six_months"
                                  ? "recall_6_months"
                                  : activeTab === "incomplete_plan"
                                    ? "recall_treatment_plan"
                                    : "recall_no_show",
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm shadow-emerald-600/20"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>استدعاء بالواتساب</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🌟 5. محتوى تبويب قوالب الرسائل */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="bg-[#0d1527] p-4 rounded-xl border border-[var(--border-default)]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-teal-400" />
              قوالب رسائل الواتساب المعتمدة للعيادة
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              يمكنك تخصيص نص الرسائل مع الحفاظ على المتغيرات التلقائية مثل:{" "}
              <code className="text-teal-300 font-mono">
                {"{{patient_name}}"}
              </code>
              ، <code className="text-teal-300 font-mono">{"{{date}}"}</code>،{" "}
              <code className="text-teal-300 font-mono">{"{{time}}"}</code>،{" "}
              <code className="text-teal-300 font-mono">
                {"{{clinic_name}}"}
              </code>
              .
            </p>
          </div>

          {isLoadingTemplates ? (
            <div className="py-20 flex justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templatesData.templates.map((tpl) => (
                <div
                  key={tpl.type}
                  className="bg-[var(--bg-surface)] p-4 sm:p-5 rounded-xl border border-[var(--border-default)] space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">
                        {tpl.name}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono border border-teal-500/20">
                        {tpl.type}
                      </span>
                    </div>
                    <pre className="p-3 bg-[#080d19] rounded-lg border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {tpl.body}
                    </pre>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditTemplate(tpl)}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل نص القالب</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {pendingWhatsAppAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whatsapp-confirm-title"
            className="w-full max-w-md space-y-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-2xl"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-400" />
              <h3
                id="whatsapp-confirm-title"
                className="text-sm font-bold text-[var(--text-main)]"
              >
                تأكيد إرسال رسالة واتساب
              </h3>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
              المريض: <strong>{pendingWhatsAppAction.item.patient_name}</strong>
            </p>

            <p className="text-xs leading-6 text-[var(--text-muted)]">
              ارجع من واتساب بعد مراجعة الرسالة، ثم أكد إذا كنت ضغطت على زر
              الإرسال. لن يتم تسجيل الإرسال أو تفعيل فترة منع التكرار قبل
              تأكيدك. لا يستطيع Curosta التحقق مباشرةً من نجاح الإرسال عبر رابط
              wa.me.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={logActionMutation.isPending}
                onClick={() => setPendingWhatsAppAction(null)}
                className="flex-1 rounded-lg border border-[var(--border-default)] py-2 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-50"
              >
                لم أرسل / إلغاء
              </button>

              <button
                type="button"
                disabled={logActionMutation.isPending}
                onClick={confirmWhatsAppSent}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {logActionMutation.isPending
                  ? "جاري التسجيل..."
                  : "أرسلت الرسالة"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🌟 6. مودال تعديل نص القالب */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-lg w-full rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-400" />
                تعديل: {editingTemplate.name}
              </h4>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  نص رسالة الواتساب *
                </label>
                <textarea
                  rows="7"
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="w-full bg-[#080d19] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition leading-relaxed font-sans"
                />
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-teal-300">
                  المتغيرات المتاحة لهذا القالب:
                </p>
                <p className="font-mono text-[10px]">
                  {editingTemplate.type === "reminder_tomorrow" &&
                    "{{patient_name}}, {{clinic_name}}, {{doctor_name}}, {{date}}, {{time}}"}
                  {editingTemplate.type === "recall_6_months" &&
                    "{{patient_name}}, {{clinic_name}}, {{date}}"}
                  {editingTemplate.type === "recall_treatment_plan" &&
                    "{{patient_name}}, {{clinic_name}}, {{plan_title}}"}
                  {editingTemplate.type === "recall_no_show" &&
                    "{{patient_name}}, {{clinic_name}}, {{date}}"}
                  {editingTemplate.type === "custom" &&
                    "{{patient_name}}, {{clinic_name}}"}
                </p>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="flex-1 py-2 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updateTemplateMutation.isPending}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-teal-600/20"
                >
                  {updateTemplateMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ التعديل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
