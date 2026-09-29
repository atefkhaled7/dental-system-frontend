import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  FlaskConical,
  Plus,
  Search,
  Building2,
  AlertTriangle,
  X,
  Check,
  Loader2,
  Save,
  FileText,
} from "lucide-react";

export default function LabOrders() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLabFilter, setSelectedLabFilter] = useState("");

  // النوافذ
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Combobox المريض
  const [patientInput, setPatientInput] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  const defaultFormState = {
    patient_id: "",
    doctor_id: "",
    lab_name: "",
    design_software: "Exocad",
    case_number: "",
    expected_at: "",
    notes: "",
    lab_notes: "",
  };

  const [formData, setFormData] = useState(defaultFormState);

  // 1. جلب طلبات المعمل
  const { data: labOrders = [], isLoading } = useQuery({
    queryKey: ["labOrders", statusFilter, selectedLabFilter, searchTerm],
    queryFn: async () => {
      const res = await api.get("/lab-orders", {
        params: {
          status:
            statusFilter === "late" ? undefined : statusFilter || undefined,
          lab_name: selectedLabFilter || undefined,
          search: searchTerm || undefined,
        },
      });
      return res.data.lab_orders || [];
    },
  });

  // 2. جلب المرضى
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients");
      return res.data.patients || [];
    },
  });

  // 3. جلب الدكاترة
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await api.get("/auth/doctors");
      return res.data.doctors || [];
    },
  });

  // 4. إنشاء طلب جديد
  const createOrderMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/lab-orders", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labOrders"] });
      setIsCreateModalOpen(false);
      setFormData(defaultFormState);
      setPatientInput("");
    },
    onError: (err) => {
      alert(err.response?.data?.error || "حدث خطأ أثناء إرسال طلب المعمل");
    },
  });

  // 5. تحديث حالة الطلب السريعة (Dropdown)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/lab-orders/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labOrders"] });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "حدث خطأ أثناء تحديث حالة طلب المعمل");
    },
  });

  // 6. حفظ تعديلات تفاصيل الحالة
  const updateOrderDetailsMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/lab-orders/${id}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["labOrders"] });
      setSelectedOrder(data.lab_order);
      setHasChanges(false);
      alert("تم تطبيق التعديلات بنجاح!");
    },
    onError: (err) => {
      alert(err.response?.data?.error || "فشل حفظ التعديلات");
    },
  });

  // حساب هل الحالة متأخرة وكم يوم؟
  const getDelayInfo = (order) => {
    if (
      order.status === "received" ||
      order.status === "cancelled" ||
      !order.expected_at
    ) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(order.expected_at);
    expected.setHours(0, 0, 0, 0);

    const diffTime = today - expected;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return diffDays;
    }
    return null;
  };

  // فلترة الطلبات المعروضة (بما فيها فلتر المتأخرة)
  const displayedOrders = labOrders.filter((order) => {
    if (statusFilter === "late") {
      return getDelayInfo(order) !== null;
    }
    return true;
  });

  // قائمة المعامل الفريدة للفلتر
  const uniqueLabs = [
    ...new Set(labOrders.map((o) => o.lab_name).filter(Boolean)),
  ];

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setEditFormData({
      lab_name: order.lab_name || "",
      case_number: order.case_number || "",
      design_software: order.design_software || "Exocad",
      expected_at: order.expected_at ? order.expected_at.split("T")[0] : "",
      notes: order.notes || "",
      lab_notes: order.lab_notes || "",
    });
    setHasChanges(false);
    setIsDetailsModalOpen(true);
  };

  const handleDetailChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveDetails = (e) => {
    e.preventDefault();
    updateOrderDetailsMutation.mutate({
      id: selectedOrder.id,
      data: editFormData,
    });
  };

  const statusConfig = {
    sent_to_lab: {
      label: "عند المعمل",
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    ready: {
      label: "جاهز للاستلام",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    received: {
      label: "تم الاستلام بالعيادة",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    cancelled: {
      label: "ملغي",
      color: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientInput.toLowerCase()) ||
      p.phone_number.includes(patientInput)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
  
    if (!formData.patient_id) {
      alert("يرجى اختيار المريض من قائمة المرضى");
      return;
    }
  
    createOrderMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* الهيدر العلوي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-blue-500" />
            طلبات المعامل والتركيبات
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            متابعة التركيبات، الفينير، وحالات الـ CAD/CAM مع المعامل
          </p>
        </div>

        <button
          onClick={() => {
            setFormData(defaultFormState);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>إرسال طلب جديد للمعمل</span>
        </button>
      </div>

      {/* شريط البحث والفلترة المتقدمة */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* خانة البحث بالاسم أو رقم الحالة أو المعمل */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
          <input
            type="text"
            placeholder="بحث بالمريض، #Case، أو المعمل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* فلتر اختيار معمل محدد */}
        <div className="w-full md:w-auto flex gap-2">
          {uniqueLabs.length > 0 && (
            <select
              value={selectedLabFilter}
              onChange={(e) => setSelectedLabFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">جميع المعامل</option>
              {uniqueLabs.map((lab) => (
                <option key={lab} value={lab}>
                  {lab}
                </option>
              ))}
            </select>
          )}

          {/* فلاتر الحالات (بما فيها المتأخرة) */}
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { label: "الكل", value: "" },
              { label: "عند المعمل", value: "sent_to_lab" },
              { label: "جاهزة", value: "ready" },
              { label: "مستلمة", value: "received" },
              { label: "متأخرة ⚠️", value: "late", highlight: true },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${
                  statusFilter === tab.value
                    ? tab.highlight
                      ? "bg-red-600 text-white border-red-500"
                      : "bg-blue-600 text-white border-blue-500"
                    : tab.highlight
                    ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* جدول طلبات المعمل */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span>جاري تحميل طلبات المعامل...</span>
          </div>
        ) : displayedOrders.length === 0 ? (
          /* Empty State مع زرار إرسال طلب جديد في النص */
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-slate-800/60 rounded-2xl text-slate-500">
              <FlaskConical className="w-10 h-10" />
            </div>
            <div>
              <p className="text-white font-medium">
                لا توجد طلبات معمل مسجلة هنا
              </p>
              <p className="text-slate-500 text-xs mt-1">
                ابدأ بإرسال أول طلب تركيبة أو كشف معملي
              </p>
            </div>
            <button
              onClick={() => {
                setFormData(defaultFormState);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-medium transition-all shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>إرسال طلب جديد</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 font-semibold">
                    رقم الحالة (#Case)
                  </th>
                  <th className="py-4 px-6 font-semibold">المريض</th>
                  <th className="py-4 px-6 font-semibold">المعمل والبرنامج</th>
                  <th className="py-4 px-6 font-semibold">التاريخ والتأخير</th>
                  <th className="py-4 px-6 font-semibold">حالة الطلب</th>
                  <th className="py-4 px-6 font-semibold text-center">
                    تغيير الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {displayedOrders.map((order) => {
                  const delayDays = getDelayInfo(order);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetails(order)}
                    >
                      {/* رقم الحالة والضغط للفتح */}
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 text-xs">
                          {order.case_number || "بدون كود"}
                        </span>
                        {order.notes && (
                          <p className="text-xs text-slate-400 mt-1 max-w-xs truncate">
                            {order.notes}
                          </p>
                        )}
                      </td>

                      {/* المريض والدكتور */}
                      <td className="py-4 px-6">
                        <p className="font-medium text-white">
                          {order.patient_name}
                        </p>
                        <span className="text-xs text-slate-500">
                          د. {order.doctor_name}
                        </span>
                      </td>

                      {/* المعمل والبرنامج */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-white font-medium text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.lab_name}</span>
                        </div>
                        <span className="text-[11px] text-purple-400 font-mono mt-0.5 block">
                          {order.design_software || "Exocad"}
                        </span>
                      </td>

                      {/* التاريخ مع شارة التأخير الذكية */}
                      <td className="py-4 px-6 text-xs font-mono">
                        <div className="text-slate-400" dir="ltr">
                          أُرسل:{" "}
                          {new Date(order.sent_at).toLocaleDateString("en-GB")}
                        </div>
                        {order.expected_at && (
                          <div className="text-slate-300 mt-0.5" dir="ltr">
                            متوقع:{" "}
                            {new Date(order.expected_at).toLocaleDateString(
                              "en-GB"
                            )}
                          </div>
                        )}
                        {/* ⚠️ شارة التأخير */}
                        {delayDays && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            متأخر {delayDays} {delayDays === 1 ? "يوم" : "أيام"}
                          </span>
                        )}
                      </td>

                      {/* بادج الحالة الحالية */}
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${
                            statusConfig[order.status]?.color ||
                            "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {statusConfig[order.status]?.label || order.status}
                        </span>
                      </td>

                      {/* Dropdown تغيير الحالة السريع (بما فيها الإلغاء) */}
                      <td
                        className="py-4 px-6 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={order.status}
                          disabled={updateStatusMutation.isPending}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              id: order.id,
                              status: e.target.value,
                            })
                          }
                          className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="sent_to_lab">عند المعمل</option>
                          <option value="ready">جاهز للاستلام 📦</option>
                          <option value="received">
                            تم الاستلام بالعيادة ✅
                          </option>
                          <option value="cancelled">إلغاء الطلب 🚫</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة تفاصيل وتعديل الحالة القابلة للحفظ المباشر */}
      {isDetailsModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-xl w-full rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  تفاصيل الحالة: {selectedOrder.case_number || "بدون كود"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  المريض: {selectedOrder.patient_name} | د.{" "}
                  {selectedOrder.doctor_name}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    اسم المعمل
                  </label>
                  <input
                    type="text"
                    value={editFormData.lab_name}
                    onChange={(e) =>
                      handleDetailChange("lab_name", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    رقم الحالة (#Case)
                  </label>
                  <input
                    type="text"
                    value={editFormData.case_number}
                    onChange={(e) =>
                      handleDetailChange("case_number", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    برنامج التصميم
                  </label>
                  <select
                    value={editFormData.design_software}
                    onChange={(e) =>
                      handleDetailChange("design_software", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Exocad">Exocad</option>
                    <option value="3Shape">3Shape</option>
                    <option value="Maestro 3D">Maestro 3D</option>
                    <option value="Blue Sky Plan">Blue Sky Plan</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    تاريخ الاستلام المتوقع
                  </label>
                  <input
                    type="date"
                    value={editFormData.expected_at}
                    onChange={(e) =>
                      handleDetailChange("expected_at", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  مواصفات التركيبة (Shade & Material)
                </label>
                <textarea
                  rows="2"
                  value={editFormData.notes}
                  onChange={(e) => handleDetailChange("notes", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              {/* خانة ملاحظات المعمل (Lab Notes) */}
              <div>
                <label className="block text-xs text-amber-400 mb-1 font-medium">
                  ملاحظات وتعديلات المعمل
                </label>
                <textarea
                  rows="2"
                  placeholder="مثال: المعمل يطلب تعديل خط التحضير، أو تم تغيير الشيد لـ A3..."
                  value={editFormData.lab_notes}
                  onChange={(e) =>
                    handleDetailChange("lab_notes", e.target.value)
                  }
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              {/* زرار تطبيق التعديلات (يظهر فقط لو غيرت حاجة!) */}
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-400 rounded-xl text-xs hover:text-white"
                >
                  إغلاق
                </button>

                {hasChanges && (
                  <button
                    type="submit"
                    disabled={updateOrderDetailsMutation.isPending}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30"
                  >
                    <Save className="w-4 h-4" />
                    <span>تطبيق التعديلات</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إرسال طلب جديد للمعمل */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-blue-500" />
                طلب تركيبة / معمل جديد
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* المريض */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  المريض *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={patientInput}
                    onFocus={() => setIsPatientDropdownOpen(true)}
                    onChange={(e) => {
                      setPatientInput(e.target.value);
                      setFormData({ ...formData, patient_id: "" });
                      setIsPatientDropdownOpen(true);
                    }}
                    className={`w-full bg-slate-950 border ${
                      formData.patient_id
                        ? "border-emerald-500/50"
                        : "border-slate-700"
                    } rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500`}
                  />
                  {formData.patient_id && (
                    <Check className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  )}
                </div>

                {isPatientDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto divide-y divide-slate-800">
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setFormData({ ...formData, patient_id: p.id });
                          setPatientInput(p.name);
                          setIsPatientDropdownOpen(false);
                        }}
                        className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between text-sm"
                      >
                        <span className="text-white font-medium">{p.name}</span>
                        <span
                          className="text-xs text-slate-400 font-mono"
                          dir="ltr"
                        >
                          {p.phone_number}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* الطبيب المعالج */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  الطبيب المسؤول *
                </label>
                <select
                  required
                  value={formData.doctor_id}
                  onChange={(e) =>
                    setFormData({ ...formData, doctor_id: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="">-- اختر الطبيب المعالج --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      د. {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* اسم المعمل ورقم الحالة */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    اسم المعمل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="معمل الأهرام"
                    value={formData.lab_name}
                    onChange={(e) =>
                      setFormData({ ...formData, lab_name: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    رقم الحالة (#Case)
                  </label>
                  <input
                    type="text"
                    placeholder="C-1049"
                    value={formData.case_number}
                    onChange={(e) =>
                      setFormData({ ...formData, case_number: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* برنامج التصميم وتاريخ الاستلام المتوقع */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    برنامج الـ CAD
                  </label>
                  <select
                    value={formData.design_software}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        design_software: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="Exocad">Exocad</option>
                    <option value="3Shape">3Shape</option>
                    <option value="Maestro 3D">Maestro 3D</option>
                    <option value="Blue Sky Plan">Blue Sky Plan</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    تاريخ الاستلام المتوقع
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.expected_at}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_at: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* الملاحظات الفنية */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  مواصفات التركيبة (Shade & Material)
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="مثال: طربوش زيركون سنة 16، شيد A2..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold"
                >
                  {createOrderMutation.isPending
                    ? "جاري الإرسال..."
                    : "إرسال للمعمل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
