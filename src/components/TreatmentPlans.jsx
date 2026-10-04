import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  Receipt,
  AlertTriangle,
  Loader2,
  X,
  Check,
  ChevronDown,
} from "lucide-react";

// أرقام الأسنان الـ 32 بنظام FDI للاختيار في الفورم
const FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
  45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

// حالات البنود بنظام الشفافية 10% والـ Tokens
const ITEM_STATUS_CONFIG = {
  planned: {
    label: "مخطط له",
    badge:
      "bg-[var(--primary-muted)] text-[var(--primary-base)] border border-[var(--primary-base)]/20",
  },
  in_progress: {
    label: "قيد التنفيذ",
    badge:
      "bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-text)]/20",
  },
  completed: {
    label: "مكتمل",
    badge:
      "bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-text)]/20",
  },
};

export default function TreatmentPlans({
  patientId,
  showToast,
  isArchived = false,
}) {
  const queryClient = useQueryClient();

  // مودالات الإضافة
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [newPlanData, setNewPlanData] = useState({ title: "", notes: "" });
  const [activePlanForNewItem, setActivePlanForNewItem] = useState(null);
  const [newItemData, setNewItemData] = useState({
    tooth_number: "",
    diagnosis: "",
    procedure_name: "",
    estimated_cost: "",
  });

  // البنود المحددة لإصدار فاتورة بها (Checkboxes)
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // 1. جلب خطط العلاج الخاصة بهذا المريض
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["treatment-plans", patientId],
    queryFn: async () => {
      const res = await api.get(`/treatment-plans/patients/${patientId}`);
      return res.data.plans || [];
    },
    enabled: !!patientId,
  });

  // 2. Mutation إنشاء خطة جديدة
  const createPlanMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(
        `/treatment-plans/patients/${patientId}`,
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["treatment-plans", patientId],
      });
      setIsNewPlanModalOpen(false);
      setNewPlanData({ title: "", notes: "" });
      if (showToast) showToast("تم إنشاء خطة العلاج بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل إنشاء الخطة", "error");
    },
  });

  // 3. Mutation إضافة بند للخطة
  const addItemMutation = useMutation({
    mutationFn: async ({ planId, payload }) => {
      const res = await api.post(`/treatment-plans/${planId}/items`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["treatment-plans", patientId],
      });
      setActivePlanForNewItem(null);
      setNewItemData({
        tooth_number: "",
        diagnosis: "",
        procedure_name: "",
        estimated_cost: "",
      });
      if (showToast)
        showToast("تمت إضافة الإجراء لخطة العلاج بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل إضافة الإجراء", "error");
    },
  });

  // 4. Mutation تحديث حالة البند
  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }) => {
      const res = await api.patch(`/treatment-plans/items/${itemId}/status`, {
        status,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["treatment-plans", patientId],
      });
      if (showToast) showToast("تم تحديث حالة الإجراء بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل تحديث الحالة", "error");
    },
  });

  // 5. Mutation تحويل البنود المكتملة إلى فاتورة
  const invoiceMutation = useMutation({
    mutationFn: async (itemIds) => {
      const res = await api.post(
        `/treatment-plans/patients/${patientId}/invoice`,
        { itemIds }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["treatment-plans", patientId],
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setSelectedItemIds([]);
      if (showToast)
        showToast("تم إصدار الفاتورة وتأمين بنود العلاج بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل إصدار الفاتورة", "error");
    },
  });

  const toggleItemSelection = (id) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center text-[var(--text-secondary)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🌟 1. هيدر القسم وزرار إنشاء خطة جديدة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 sm:p-4 rounded-[var(--radius-card)] border border-[var(--border-default)]">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[var(--primary-base)]" />
            خطط العلاج المعتمدة للمريض
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            ربط تشخيص الأسنان بالإجراءات الطبية وجدولة الفواتير بدقة
          </p>
        </div>
        {!isArchived && (
          <button
            type="button"
            onClick={() => setIsNewPlanModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-3.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>خطة علاج جديدة</span>
          </button>
        )}
      </div>

      {/* 🌟 2. عرض خطط العلاج */}
      {plans.length === 0 ? (
        <div className="py-12 text-center text-xs bg-[var(--bg-surface)] rounded-[var(--radius-card)] border border-[var(--border-default)] p-6 space-y-2">
          <ClipboardList className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-1" />
          <p className="text-[var(--text-main)] font-semibold">
            لا توجد خطط علاج مسجلة لهذا المريض حتى الآن.
          </p>
          <p className="text-[var(--text-muted)]">
            اضغط على "خطة علاج جديدة" للبدء في تنظيم الإجراءات والأسعار.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {plans.map((plan) => {
            const completedUnbilledItems = plan.items.filter(
              (i) => i.status === "completed" && !i.invoice_id
            );
            const totalEstimated = plan.items.reduce(
              (sum, i) => sum + parseFloat(i.estimated_cost || 0),
              0
            );

            return (
              <div
                key={plan.id}
                className="bg-[var(--bg-surface)] rounded-[var(--radius-card)] border border-[var(--border-default)] overflow-hidden"
              >
                {/* هيدر الخطة */}
                <div className="p-3.5 sm:p-4 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[var(--text-main)]">
                        {plan.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--primary-muted)] text-[var(--primary-base)] border border-[var(--primary-base)]/20 font-medium">
                        {plan.status === "active" ? "نشطة" : plan.status}
                      </span>
                    </div>
                    {plan.notes && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {plan.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      إجمالي الخطة:{" "}
                      <strong className="text-[var(--text-main)] font-bold">
                        {totalEstimated.toLocaleString("en-US")} ج.م
                      </strong>
                    </span>
                    {!isArchived && (
                      <button
                        type="button"
                        onClick={() => setActivePlanForNewItem(plan)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--border-default)] text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs font-medium border border-[var(--border-default)] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة إجراء</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* جدول بنود الخطة */}
                {plan.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    لم تتم إضافة أي إجراءات طبية لهذه الخطة بعد. اضغط على "إضافة
                    إجراء".
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[var(--bg-app)] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                        <tr>
                          <th className="py-2.5 px-3 w-8">#</th>
                          <th className="py-2.5 px-3 font-medium">السن</th>
                          <th className="py-2.5 px-3 font-medium">
                            التشخيص الطبي
                          </th>
                          <th className="py-2.5 px-3 font-medium">
                            الإجراء المطلوب
                          </th>
                          <th className="py-2.5 px-3 font-medium font-mono">
                            التكلفة
                          </th>
                          <th className="py-2.5 px-3 font-medium">الحالة</th>
                          <th className="py-2.5 px-3 font-medium text-center">
                            الفوترة
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                        {plan.items.map((item) => {
                          const statusCfg =
                            ITEM_STATUS_CONFIG[item.status] ||
                            ITEM_STATUS_CONFIG.planned;
                          const isInvoiced = !!item.invoice_id;
                          const isEligibleForInvoice =
                            item.status === "completed" && !isInvoiced;

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-[var(--bg-elevated)]/40 transition-colors"
                            >
                              {/* Checkbox للفوترة */}
                              <td className="py-2.5 px-3">
                                {isEligibleForInvoice ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedItemIds.includes(item.id)}
                                    onChange={() =>
                                      toggleItemSelection(item.id)
                                    }
                                    className="w-3.5 h-3.5 rounded-[var(--radius-btn)] bg-[var(--bg-app)] border-[var(--border-default)] text-[var(--primary-base)] focus:ring-0 cursor-pointer accent-[var(--primary-base)]"
                                  />
                                ) : (
                                  <span className="text-[var(--text-muted)]">
                                    -
                                  </span>
                                )}
                              </td>

                              {/* رقم السن */}
                              <td className="py-2.5 px-3 font-mono font-medium">
                                {item.tooth_number ? (
                                  <span className="px-1.5 py-0.5 rounded-[var(--radius-btn)] bg-[var(--primary-muted)] border border-[var(--primary-base)]/20 text-[var(--primary-base)]">
                                    #{item.tooth_number}
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)] text-[11px]">
                                    عام
                                  </span>
                                )}
                              </td>

                              {/* التشخيص */}
                              <td className="py-2.5 px-3 text-[var(--text-muted)]">
                                {item.diagnosis || "-"}
                              </td>

                              {/* الإجراء الطبي */}
                              <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">
                                {item.procedure_name}
                              </td>

                              {/* التكلفة */}
                              <td className="py-2.5 px-3 font-mono text-[var(--text-main)] font-medium">
                                {parseFloat(item.estimated_cost).toLocaleString(
                                  "en-US"
                                )}{" "}
                                ج.م
                              </td>

                              {/* الحالة والتعديل السريع */}
                              <td className="py-2.5 px-3">
                                {isInvoiced ? (
                                  <span className="px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-default)]">
                                    مكتمل ومغلق
                                  </span>
                                ) : isArchived ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-medium border ${statusCfg.badge}`}
                                  >
                                    {statusCfg.label}
                                  </span>
                                ) : (
                                  <select
                                    value={item.status}
                                    onChange={(e) =>
                                      updateStatusMutation.mutate({
                                        itemId: item.id,
                                        status: e.target.value,
                                      })
                                    }
                                    className={`px-2 py-0.5 rounded-[var(--radius-btn)] text-[11px] font-medium border bg-[var(--bg-app)] focus:outline-none cursor-pointer transition-colors ${statusCfg.badge}`}
                                  >
                                    <option value="planned">مخطط له</option>
                                    <option value="in_progress">
                                      قيد التنفيذ
                                    </option>
                                    <option value="completed">مكتمل ✓</option>
                                  </select>
                                )}
                              </td>

                              {/* حالة الفاتورة */}
                              <td className="py-2.5 px-3 text-center">
                                {isInvoiced ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-text)]/20 text-[10px] font-medium">
                                    <Check className="w-3 h-3" />
                                    تمت الفوترة
                                  </span>
                                ) : item.status === "completed" ? (
                                  <span className="text-[10px] text-[var(--warning-text)] font-medium">
                                    جاهز للفوترة
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    لم يكتمل بعد
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* فوتر الخطة وزرار إصدار الفاتورة */}
                {!isArchived && completedUnbilledItems.length > 0 && (
                  <div className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-[var(--text-secondary)]">
                      يوجد{" "}
                      <strong className="text-[var(--text-main)] font-semibold">
                        {completedUnbilledItems.length}
                      </strong>{" "}
                      إجراءات مكتملة لم تصدر لها فواتير بعد.
                    </span>
                    <button
                      type="button"
                      disabled={
                        selectedItemIds.length === 0 ||
                        invoiceMutation.isPending
                      }
                      onClick={() => invoiceMutation.mutate(selectedItemIds)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-40"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>
                        {invoiceMutation.isPending
                          ? "جاري الإصدار..."
                          : `إصدار فاتورة (${selectedItemIds.length}) بنود مختارة`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 3. مودال إنشاء خطة علاج جديدة */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 shadow-elevation space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h4 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[var(--primary-base)]" />
                إنشاء خطة علاج جديدة
              </h4>
              <button
                onClick={() => setIsNewPlanModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-[var(--radius-btn)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPlanMutation.mutate(newPlanData);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  عنوان خطة العلاج *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خطة علاج الجذور والتركيبات، علاج اللثة..."
                  value={newPlanData.title}
                  onChange={(e) =>
                    setNewPlanData({ ...newPlanData, title: e.target.value })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  ملاحظات عامة
                </label>
                <textarea
                  rows="2"
                  placeholder="ملاحظات الطبيب حول الحالة أو تفضيلات المريض..."
                  value={newPlanData.notes}
                  onChange={(e) =>
                    setNewPlanData({ ...newPlanData, notes: e.target.value })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              <div className="flex gap-2.5 pt-2 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPlanMutation.isPending}
                  className="flex-1 py-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {createPlanMutation.isPending
                    ? "جاري الإنشاء..."
                    : "إنشاء الخطة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 4. مودال إضافة إجراء / بند في خطة علاج */}
      {activePlanForNewItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 shadow-elevation space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h4 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--primary-base)]" />
                إضافة إجراء طبي إلى: {activePlanForNewItem.title}
              </h4>
              <button
                onClick={() => setActivePlanForNewItem(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-[var(--radius-btn)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addItemMutation.mutate({
                  planId: activePlanForNewItem.id,
                  payload: newItemData,
                });
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                {/* رقم السن */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    السن (FDI)
                  </label>
                  <select
                    value={newItemData.tooth_number}
                    onChange={(e) =>
                      setNewItemData({
                        ...newItemData,
                        tooth_number: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  >
                    <option value="">-- إجراء عام (بدون سن) --</option>
                    {FDI_TEETH.map((num) => (
                      <option key={num} value={num}>
                        السن #{num}
                      </option>
                    ))}
                  </select>
                </div>
                {/* التكلفة التقديرية */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    التكلفة التقديرية (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="500"
                    value={newItemData.estimated_cost}
                    onChange={(e) =>
                      setNewItemData({
                        ...newItemData,
                        estimated_cost: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              </div>
              {/* التشخيص */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  التشخيص الطبي
                </label>
                <input
                  type="text"
                  placeholder="مثال: تسوس عميق، التهاب عصب حاد..."
                  value={newItemData.diagnosis}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      diagnosis: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              {/* الإجراء المطلوب */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  اسم الإجراء الطبي المطلوب *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حشو كومبوزيت ضوئي، علاج جذور، كراون زركونيا..."
                  value={newItemData.procedure_name}
                  onChange={(e) =>
                    setNewItemData({
                      ...newItemData,
                      procedure_name: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>
              <div className="flex gap-2.5 pt-2 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setActivePlanForNewItem(null)}
                  className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="flex-1 py-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {addItemMutation.isPending
                    ? "جاري الإضافة..."
                    : "إضافة الإجراء للخطة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
