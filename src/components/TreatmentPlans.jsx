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

const ITEM_STATUS_CONFIG = {
  planned: {
    label: "مخطط له",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  in_progress: {
    label: "قيد التنفيذ",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  completed: {
    label: "مكتمل",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

export default function TreatmentPlans({ patientId, showToast }) {
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

  // 4. Mutation تحديث حالة البند (planned -> in_progress -> completed)
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

  // تحديد / إلغاء تحديد بند للفوترة
  const toggleItemSelection = (id) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🌟 1. هيدر القسم وزرار إنشاء خطة جديدة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            خطط العلاج المعتمدة للمريض
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ربط تشخيص الأسنان بالإجراءات الطبية وجدولة الفواتير
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewPlanModalOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>خطة علاج جديدة</span>
        </button>
      </div>

      {/* 🌟 2. عرض خطط العلاج */}
      {plans.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
          <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-1" />
          <p className="text-slate-300 font-medium">
            لا توجد خطط علاج مسجلة لهذا المريض حتى الآن.
          </p>
          <p className="text-slate-500">
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
                className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl"
              >
                {/* هيدر الخطة */}
                <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        {plan.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        {plan.status === "active" ? "نشطة" : plan.status}
                      </span>
                    </div>
                    {plan.notes && (
                      <p className="text-xs text-slate-400 mt-1">
                        {plan.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-300">
                      إجمالي الخطة:{" "}
                      <strong className="text-emerald-400">
                        {totalEstimated.toLocaleString("en-US")} ج.م
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => setActivePlanForNewItem(plan)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة إجراء</span>
                    </button>
                  </div>
                </div>

                {/* جدول بنود الخطة */}
                {plan.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    لم تتم إضافة أي إجراءات طبية لهذه الخطة بعد. اضغط على "إضافة
                    إجراء".
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800/80">
                        <tr>
                          <th className="py-2.5 px-3 w-8">#</th>
                          <th className="py-2.5 px-3">السن</th>
                          <th className="py-2.5 px-3">التشخيص الطبي</th>
                          <th className="py-2.5 px-3">الإجراء المطلوب</th>
                          <th className="py-2.5 px-3 font-mono">التكلفة</th>
                          <th className="py-2.5 px-3">الحالة</th>
                          <th className="py-2.5 px-3 text-center">الفوترة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
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
                              className="hover:bg-slate-900/40 transition-colors"
                            >
                              {/* Checkbox للفوترة المجمعة */}
                              <td className="py-2.5 px-3">
                                {isEligibleForInvoice ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedItemIds.includes(item.id)}
                                    onChange={() =>
                                      toggleItemSelection(item.id)
                                    }
                                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>

                              {/* رقم السن */}
                              <td className="py-2.5 px-3 font-mono font-bold text-white">
                                {item.tooth_number ? (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-blue-400">
                                    #{item.tooth_number}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">
                                    عام
                                  </span>
                                )}
                              </td>

                              {/* التشخيص */}
                              <td className="py-2.5 px-3 text-slate-400">
                                {item.diagnosis || "-"}
                              </td>

                              {/* الإجراء الطبي */}
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {item.procedure_name}
                              </td>

                              {/* التكلفة */}
                              <td className="py-2.5 px-3 font-mono text-emerald-400 font-medium">
                                {parseFloat(item.estimated_cost).toLocaleString(
                                  "en-US"
                                )}{" "}
                                ج.م
                              </td>

                              {/* الحالة والتعديل السريع */}
                              <td className="py-2.5 px-3">
                                {isInvoiced ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                    مكتمل ومغلق
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
                                    className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-slate-900 focus:outline-none cursor-pointer ${statusCfg.badge}`}
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
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                                    <Check className="w-3 h-3" />
                                    تمت الفوترة
                                  </span>
                                ) : item.status === "completed" ? (
                                  <span className="text-[10px] text-amber-400 font-medium">
                                    جاهز للفوترة
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500">
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

                {/* فوتر الخطة وزرار إصدار الفاتورة بالبنود المحددة */}
                {completedUnbilledItems.length > 0 && (
                  <div className="p-3 bg-slate-900/40 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400">
                      يوجد{" "}
                      <strong className="text-white">
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
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 shadow-md shadow-emerald-600/20"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-400" />
                إنشاء خطة علاج جديدة
              </h4>
              <button
                onClick={() => setIsNewPlanModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPlanMutation.mutate(newPlanData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ملاحظات عامة
                </label>
                <textarea
                  rows="2"
                  placeholder="ملاحظات الطبيب حول الحالة أو تفضيلات المريض..."
                  value={newPlanData.notes}
                  onChange={(e) =>
                    setNewPlanData({ ...newPlanData, notes: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPlanMutation.isPending}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                إضافة إجراء طبي إلى: {activePlanForNewItem.title}
              </h4>
              <button
                onClick={() => setActivePlanForNewItem(null)}
                className="text-slate-400 hover:text-white"
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
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                {/* رقم السن */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* التشخيص */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* الإجراء المطلوب */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePlanForNewItem(null)}
                  className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
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
