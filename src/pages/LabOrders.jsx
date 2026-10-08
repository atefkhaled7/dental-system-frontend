import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
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

  // Pagination المعامل
  const [page, setPage] = useState(1);
  const limit = 10;

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

  // 1. جلب طلبات المعمل مع الـ Pagination
  const { data, isLoading } = useQuery({
    queryKey: [
      "labOrders",
      { page, limit, statusFilter, selectedLabFilter, searchTerm },
    ],
    queryFn: async () => {
      const res = await api.get("/lab-orders", {
        params: {
          page,
          limit,
          status: statusFilter || undefined, // إرسال late للباك إند مباشرة
          lab_name: selectedLabFilter || undefined,
          search: searchTerm.trim() || undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const labOrders = data?.lab_orders || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };
  const displayedOrders = labOrders;

  // لو المستخدم في صفحة أعلى من 1 والصفحة فضيت، يرجع تلقائياً للصفحة السابقة
  useEffect(() => {
    if (!isLoading && page > 1 && labOrders.length === 0) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [isLoading, page, labOrders.length]);

  // 2. جلب المرضى
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients");
      return res.data.patients || [];
    },
  });

  // 3. جلب الأطباء
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

  // 5. تحديث حالة الطلب السريعة
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

  // حساب أيام التأخير
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

  // جلب كل أسامي المعامل للعيادة بغض النظر عن الصفحة
  const { data: labsData } = useQuery({
    queryKey: ["distinct-labs"],
    queryFn: async () => {
      const res = await api.get("/lab-orders/labs");
      return res.data.labs || [];
    },
  });
  const uniqueLabs = labsData || [];

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setEditFormData({
      lab_name: order.lab_name || "",
      case_number: order.case_number || "",
      design_software: order.design_software || "",
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

  // البادجات مطابقة تماماً لنظام الـ Semantic Tokens بنسبة شفافية 10%
  const statusConfig = {
    sent_to_lab: {
      label: "عند المعمل",
      color:
        "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/20",
    },
    ready: {
      label: "جاهز للاستلام",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/20",
    },
    received: {
      label: "تم الاستلام بالعيادة",
      color:
        "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]/20",
    },
    cancelled: {
      label: "ملغي",
      color:
        "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-text)]/20",
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
      {/* 🌟 الهيدر العلوي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-main)] flex items-center gap-2.5">
            <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--primary-base)]" />
            طلبات المعامل والتركيبات
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">
            متابعة التركيبات، الفينير، وحالات الـ CAD/CAM مع المعامل بدقة
          </p>
        </div>

        <button
          onClick={() => {
            setFormData(defaultFormState);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2.5 rounded-[var(--radius-btn)] font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>إرسال طلب جديد للمعمل</span>
        </button>
      </div>

      {/* 🌟 شريط البحث والفلترة المتقدمة */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* خانة البحث */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث بالمريض، #Case، أو المعمل..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-btn)] pr-10 pl-4 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
          />
        </div>

        {/* فلاتر المعامل والحالات */}
        <div className="w-full md:w-auto flex flex-wrap gap-2 items-center">
          {uniqueLabs.length > 0 && (
            <select
              value={selectedLabFilter}
              onChange={(e) => {
                setSelectedLabFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] focus:text-[var(--text-main)] text-xs rounded-[var(--radius-btn)] px-3 py-2 focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
            >
              <option value="">جميع المعامل</option>
              {uniqueLabs.map((lab) => (
                <option key={lab} value={lab}>
                  {lab}
                </option>
              ))}
            </select>
          )}

          {/* تبويبات الحالات */}
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
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium whitespace-nowrap transition-colors border ${
                  statusFilter === tab.value
                    ? tab.highlight
                      ? "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-text)]/40 font-semibold"
                      : "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/40 font-semibold"
                    : tab.highlight
                    ? "bg-[var(--bg-surface)] text-[var(--danger-text)]/80 border-[var(--border-default)] hover:bg-[var(--danger-bg)]"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🌟 جدول طلبات المعمل */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
            <span className="text-sm">جاري تحميل طلبات المعامل...</span>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-[var(--bg-elevated)] rounded-[var(--radius-card)] text-[var(--text-muted)] border border-[var(--border-default)]">
              <FlaskConical className="w-10 h-10" />
            </div>
            <div>
              <p className="text-[var(--text-main)] font-semibold">
                لا توجد طلبات معمل مسجلة هنا
              </p>
              <p className="text-[var(--text-muted)] text-xs mt-1">
                ابدأ بإرسال أول طلب تركيبة أو كشف معملي للعيادة
              </p>
            </div>
            <button
              onClick={() => {
                setFormData(defaultFormState);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إرسال طلب جديد</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs table-fixed">
              <thead className="bg-[var(--bg-app)] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                <tr>
                  <th className="py-3 px-3.5 font-medium text-xs w-[16%]">
                    رقم الحالة (#Case)
                  </th>
                  <th className="py-3 px-3.5 font-medium text-xs w-[20%]">
                    المريض
                  </th>
                  <th className="py-3 px-3.5 font-medium text-xs w-[18%]">
                    المعمل والبرنامج
                  </th>
                  <th className="py-3 px-3.5 font-medium text-xs w-[19%]">
                    التاريخ والتأخير
                  </th>
                  <th className="py-3 px-3.5 font-medium text-xs w-[13%]">
                    حالة الطلب
                  </th>
                  <th className="py-3 px-3.5 font-medium text-xs text-center w-[14%]">
                    تغيير الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                {displayedOrders.map((order) => {
                  const delayDays = getDelayInfo(order);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[var(--bg-elevated)]/60 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetails(order)}
                    >
                      {/* رقم الحالة */}
                      <td className="py-3 px-3.5">
                        <span
                          className="font-mono font-medium text-[var(--primary-base)] bg-[var(--primary-muted)] px-2 py-0.5 rounded-[var(--radius-btn)] border border-[var(--primary-base)]/20 text-xs inline-block truncate max-w-[110px]"
                          title={order.case_number}
                        >
                          {order.case_number || "بدون كود"}
                        </span>
                        {order.notes && (
                          <p
                            className="text-[11px] text-[var(--text-muted)] mt-1 truncate max-w-[140px]"
                            title={order.notes}
                          >
                            {order.notes}
                          </p>
                        )}
                      </td>
                      {/* المريض والطبيب */}
                      <td className="py-3 px-3.5">
                        <p
                          className="font-semibold text-[var(--text-main)] truncate"
                          title={order.patient_name}
                        >
                          {order.patient_name}
                        </p>
                        <span className="text-[11px] text-[var(--text-muted)] block truncate">
                          د. {order.doctor_name}
                        </span>
                      </td>
                      {/* المعمل والبرنامج */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5 text-[var(--text-main)] font-medium text-xs truncate">
                          <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <span className="truncate">{order.lab_name}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 block truncate">
                          {order.design_software || "Exocad"}
                        </span>
                      </td>
                      {/* التاريخ مع شارة التأخير */}
                      <td className="py-3 px-3.5 text-xs font-mono">
                        <div
                          className="text-[var(--text-secondary)] text-[11px]"
                          dir="ltr"
                        >
                          أُرسل:{" "}
                          {new Date(order.sent_at).toLocaleDateString("en-GB")}
                        </div>
                        {order.expected_at && (
                          <div
                            className="text-[var(--text-muted)] text-[10px] mt-0.5"
                            dir="ltr"
                          >
                            متوقع:{" "}
                            {new Date(order.expected_at).toLocaleDateString(
                              "en-GB"
                            )}
                          </div>
                        )}
                        {/* ⚠️ شارة التأخير */}
                        {delayDays && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-[var(--radius-pill)] bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-text)]/20 text-[10px] font-medium">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            متأخر {delayDays} {delayDays === 1 ? "يوم" : "أيام"}
                          </span>
                        )}
                      </td>
                      {/* بادج الحالة الحالية */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[var(--radius-pill)] text-[11px] font-medium border whitespace-nowrap ${
                            statusConfig[order.status]?.color ||
                            "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]"
                          }`}
                        >
                          {statusConfig[order.status]?.label || order.status}
                        </span>
                      </td>
                      {/* Dropdown تغيير الحالة السريع */}
                      <td
                        className="py-3 px-3.5 text-center"
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
                          className="w-full max-w-[125px] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] focus:text-[var(--text-main)] rounded-[var(--radius-btn)] px-2 py-1 focus:outline-none focus:border-[var(--border-focus)] cursor-pointer transition-colors"
                        >
                          <option value="sent_to_lab">عند المعمل</option>
                          <option value="ready">جاهز للاستلام 📦</option>
                          <option value="received">تم الاستلام ✅</option>
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

        {/* 🌟 شريط الـ Pagination الموحد (الزراير على اليمين في الـ RTL) */}
        {!isLoading && pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)] bg-[#070b14]/50 text-sm text-[var(--text-secondary)]">
            {/* 1. الزراير على اليمين */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-[var(--radius-btn)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                السابق
              </button>
              <span className="text-xs text-[var(--text-secondary)] px-2">
                صفحة <span className="font-bold text-teal-400">{page}</span> من{" "}
                <span className="font-bold text-[var(--text-main)]">
                  {pagination.totalPages}
                </span>
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="px-3.5 py-1.5 rounded-[var(--radius-btn)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                التالي
              </button>
            </div>

            {/* 2. عرض الإجمالي على الشمال */}
            <div className="text-xs">
              عرض{" "}
              <span className="font-bold text-[var(--text-main)]">
                {displayedOrders.length}
              </span>{" "}
              من أصل{" "}
              <span className="font-bold text-[var(--text-main)]">
                {pagination.total}
              </span>{" "}
              طلب
            </div>
          </div>
        )}
      </div>
      {/* 🌟 نافذة تفاصيل وتعديل الحالة */}
      {isDetailsModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-xl w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--primary-base)]" />
                  تفاصيل الحالة: {selectedOrder.case_number || "بدون كود"}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  المريض: {selectedOrder.patient_name} | د.{" "}
                  {selectedOrder.doctor_name}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-[var(--radius-btn)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    اسم المعمل
                  </label>
                  <input
                    type="text"
                    value={editFormData.lab_name}
                    onChange={(e) =>
                      handleDetailChange("lab_name", e.target.value)
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    رقم الحالة (#Case)
                  </label>
                  <input
                    type="text"
                    value={editFormData.case_number}
                    onChange={(e) =>
                      handleDetailChange("case_number", e.target.value)
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    برنامج التصميم
                  </label>
                  <select
                    value={editFormData.design_software}
                    onChange={(e) =>
                      handleDetailChange("design_software", e.target.value)
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    <option value="">-- غير محدد --</option>
                    <option value="Exocad">Exocad</option>
                    <option value="3Shape">3Shape</option>
                    <option value="Maestro 3D">Maestro 3D</option>
                    <option value="Blue Sky Plan">Blue Sky Plan</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    تاريخ الاستلام المتوقع
                  </label>
                  <input
                    type="date"
                    value={editFormData.expected_at}
                    onChange={(e) =>
                      handleDetailChange("expected_at", e.target.value)
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  مواصفات التركيبة (Shade & Material)
                </label>
                <textarea
                  rows="2"
                  value={editFormData.notes}
                  onChange={(e) => handleDetailChange("notes", e.target.value)}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                ></textarea>
              </div>

              {/* ملاحظات المعمل */}
              <div>
                <label className="block text-xs text-[var(--warning-text)] mb-1 font-medium">
                  ملاحظات وتعديلات المعمل
                </label>
                <textarea
                  rows="2"
                  placeholder="مثال: المعمل يطلب تعديل خط التحضير، أو تم تغيير الشيد لـ A3..."
                  value={editFormData.lab_notes}
                  onChange={(e) =>
                    handleDetailChange("lab_notes", e.target.value)
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--warning-text)]/30 rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--warning-text)] transition-colors"
                ></textarea>
              </div>

              {/* أزرار الحفظ والإغلاق */}
              <div className="pt-3 border-t border-[var(--border-default)] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                >
                  إغلاق
                </button>

                {hasChanges && (
                  <button
                    type="submit"
                    disabled={updateOrderDetailsMutation.isPending}
                    className="flex items-center gap-1.5 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
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

      {/* 🌟 نافذة إرسال طلب جديد للمعمل */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-lg w-full rounded-[var(--radius-card)] p-5 sm:p-6 shadow-elevation relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-5">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[var(--primary-base)]" />
                طلب تركيبة / معمل جديد
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-[var(--radius-btn)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* اختيار المريض مع Combobox */}
              <div className="relative">
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                  المريض *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-3" />
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
                    className={`w-full bg-[var(--bg-app)] border ${
                      formData.patient_id
                        ? "border-[var(--success-text)]/50"
                        : "border-[var(--border-default)]"
                    } rounded-[var(--radius-btn)] pr-10 pl-4 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors`}
                  />
                  {formData.patient_id && (
                    <Check className="w-4 h-4 text-[var(--success-text)] absolute left-3.5 top-3" />
                  )}
                </div>

                {isPatientDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] shadow-elevation max-h-40 overflow-y-auto divide-y divide-[var(--border-default)]">
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setFormData({ ...formData, patient_id: p.id });
                          setPatientInput(p.name);
                          setIsPatientDropdownOpen(false);
                        }}
                        className="p-3 hover:bg-[var(--bg-surface)] cursor-pointer flex justify-between text-sm transition-colors"
                      >
                        <span className="text-[var(--text-main)] font-medium">
                          {p.name}
                        </span>
                        <span
                          className="text-xs text-[var(--text-muted)] font-mono"
                          dir="ltr"
                        >
                          {p.phone_number}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* الطبيب المسؤول */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                  الطبيب المسؤول *
                </label>
                <select
                  required
                  value={formData.doctor_id}
                  onChange={(e) =>
                    setFormData({ ...formData, doctor_id: e.target.value })
                  }
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] text-sm transition-colors"
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
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                    رقم الحالة (#Case)
                  </label>
                  <input
                    type="text"
                    placeholder="C-1049"
                    value={formData.case_number}
                    onChange={(e) =>
                      setFormData({ ...formData, case_number: e.target.value })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--text-main)] font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>
              </div>

              {/* برنامج التصميم وتاريخ الاستلام المتوقع */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  >
                    <option value="Exocad">Exocad</option>
                    <option value="3Shape">3Shape</option>
                    <option value="Maestro 3D">Maestro 3D</option>
                    <option value="Blue Sky Plan">Blue Sky Plan</option>
                    <option value="Other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                    تاريخ الاستلام المتوقع
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.expected_at}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_at: e.target.value })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-1.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
                  />
                </div>
              </div>

              {/* الملاحظات الفنية */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">
                  مواصفات التركيبة (Shade & Material)
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="مثال: طربوش زيركون سنة 16، شيد A2..."
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3.5 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                ></textarea>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="flex-1 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
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
