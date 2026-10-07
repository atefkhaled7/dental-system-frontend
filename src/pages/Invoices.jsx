import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { printInvoice } from "../utils/printInvoice";
import {
  CreditCard,
  Plus,
  Search,
  Download,
  Receipt,
  DollarSign,
  Check,
  X,
  Trash2,
  Loader2,
  FileText,
  UserPlus,
  Wallet,
  Printer,
  Archive,
  AlertTriangle,
  Send,
  Copy,
  ExternalLink,
  Smartphone,
} from "lucide-react";

const PAYMENT_STATUS_CONFIG = {
  paid: {
    label: "مدفوع",
    badge: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20",
    icon: "✅",
  },
  pending: {
    label: "معلق",
    badge: "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/20",
    icon: "🟡",
  },
  failed: {
    label: "فشل",
    badge: "bg-[#EF4444]/10 text-[#F87171] border-[#EF4444]/20",
    icon: "❌",
  },
  cancelled: {
    label: "ملغي",
    badge: "bg-[#172033] text-[#64748B] border-[#243047]",
    icon: "⚪",
  },
  needs_review: {
    label: "تحتاج مراجعة",
    badge: "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/20",
    icon: "⚠️",
  },
  refunded: {
    label: "مسترد",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: "🔵",
  },
  expired: {
    label: "منتهي",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    icon: "⏰",
  },
};

export function PaymentStatusBadge({ status }) {
  const config = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badge}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

export default function Invoices() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isExporting, setIsExporting] = useState(false);

  const handleExportInvoices = async () => {
    try {
      setIsExporting(true);

      const res = await api.get("/invoices/export", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "text/csv;charset=utf-8;" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `financial_report_${new Date().toISOString().split("T")[0]}.csv`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      alert("فشل تصدير التقرير المالي");
    } finally {
      setIsExporting(false);
    }
  };

  // 1. State الفلاتر والـ Pagination لجدول الفواتير
  const [page, setPage] = useState(1);
  const limit = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  // 2. كويري جلب الفواتير مع الـ Pagination
  const { data, isLoading } = useQuery({
    queryKey: [
      "invoices",
      { page, limit, searchTerm, statusFilter, showArchived },
    ],
    queryFn: async () => {
      const res = await api.get("/invoices", {
        params: {
          page,
          limit,
          search: searchTerm.trim() || undefined,
          status: statusFilter || undefined,
          archived: showArchived ? "true" : undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const invoices = data?.invoices || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  // باقي حالات المودالات
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [patientInput, setPatientInput] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  const [newPatientData, setNewPatientData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
  });

  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [onlineSelectedInvoice, setOnlineSelectedInvoice] = useState(null);
  const [paymentType, setPaymentType] = useState("full");
  const [customAmount, setCustomAmount] = useState("");
  const [generatedLinkData, setGeneratedLinkData] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const createOnlinePaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/payments/online/create", payload);
      return res.data;
    },
    onSuccess: (resData) => {
      setGeneratedLinkData(resData);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "فشل إنشاء رابط الدفع");
    },
  });

  const handleOpenOnlineModal = (inv) => {
    setOnlineSelectedInvoice(inv);
    setPaymentType("full");
    setCustomAmount("");
    setGeneratedLinkData(null);
    setIsCopied(false);
    setIsOnlineModalOpen(true);
  };

  const handleGenerateOnlineLink = (e) => {
    e.preventDefault();
    const remaining =
      parseFloat(onlineSelectedInvoice.remaining_amount) ||
      parseFloat(onlineSelectedInvoice.total_amount);

    const finalAmount =
      paymentType === "full" ? remaining : parseFloat(customAmount);

    if (!finalAmount || finalAmount <= 0) {
      alert("يرجى إدخال مبلغ صحيح");
      return;
    }

    createOnlinePaymentMutation.mutate({
      invoice_id: onlineSelectedInvoice.id,
      amount: finalAmount,
    });
  };

  const handleCopyLink = () => {
    if (generatedLinkData?.payment_url) {
      navigator.clipboard.writeText(generatedLinkData.payment_url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await api.get("/auth/doctors");
      return res.data.doctors || [];
    },
  });

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const defaultInvoiceState = {
    patient_id: "",
    appointment_id: "",
    doctor_id: "",
    appointment_date: getCurrentDateTimeLocal(),
    items: [
      {
        _id: crypto.randomUUID(),
        description: "كشف أسنان أولي",
        quantity: 1,
        unit_price: 200,
        procedure_code_id: null,
      },
    ],
    initial_payment: {
      amount: "",
      payment_method: "cash",
      notes: "",
    },
  };

  const [invoiceForm, setInvoiceForm] = useState(defaultInvoiceState);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  // 3. البحث المباشر عن المرضى عند الكتابة في المودال (خفيف جداً وسيرفر سايد)
  const { data: searchedPatients = [], isFetching: isSearchingPatients } =
    useQuery({
      queryKey: ["patients-invoice-search", patientInput],
      queryFn: async () => {
        if (!patientInput.trim()) return [];
        const res = await api.get("/patients", {
          params: { search: patientInput.trim(), limit: 8 },
        });
        return res.data.patients || [];
      },
      enabled:
        isCreateModalOpen &&
        isPatientDropdownOpen &&
        patientInput.trim().length > 0 &&
        !invoiceForm.patient_id,
      staleTime: 20000,
    });

  // 4. جلب مواعيد المريض المختار فقط (مش كل مواعيد العيادة!)
  const { data: patientAppointments = [], isLoading: isLoadingAppointments } =
    useQuery({
      queryKey: ["patient-appointments", invoiceForm.patient_id],
      queryFn: async () => {
        if (!invoiceForm.patient_id) return [];
        const res = await api.get("/appointments", {
          params: { patient_id: invoiceForm.patient_id },
        });
        return res.data.appointments || [];
      },
      enabled: !!invoiceForm.patient_id && isCreateModalOpen,
    });

  const { data: procedureCodes = [] } = useQuery({
    queryKey: ["procedureCodes"],
    queryFn: async () => {
      const res = await api.get("/procedure-codes");
      return res.data || [];
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/invoices", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient-appointments"] });
      setIsCreateModalOpen(false);
      setInvoiceForm(defaultInvoiceState);
      setPatientInput("");
    },
    onError: (err) => {
      alert(err.response?.data?.error || "حدث خطأ أثناء إنشاء الفاتورة");
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (p) => {
      const res = await api.post("/patients", p);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setInvoiceForm((prev) => ({ ...prev, patient_id: resData.patient.id }));
      setPatientInput(resData.patient.name);
      setIsNewPatientModalOpen(false);
      setIsPatientDropdownOpen(false);
      setNewPatientData({ name: "", phone_number: "", gender: "Male" });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "فشل إضافة المريض");
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/payments", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({
        queryKey: ["invoiceDetails", selectedInvoice?.id],
      });
      setIsPaymentModalOpen(false);
      setPaymentForm({ amount: "", payment_method: "cash", notes: "" });
      setSelectedInvoice(null);
    },
    onError: (err) => {
      alert(err.response?.data?.error || "فشل تسجيل الدفعة");
    },
  });

  const archiveInvoiceMutation = useMutation({
    mutationFn: async (invoiceId) => {
      const res = await api.patch(`/invoices/${invoiceId}/archive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setIsArchiveConfirmOpen(false);
      setIsDetailsModalOpen(false);
      alert("تم أرشفة الفاتورة بنجاح ولا يمكن التراجع عنها");
    },
    onError: (err) => {
      alert(err.response?.data?.error || "حدث خطأ أثناء أرشفة الفاتورة");
    },
  });

  const { data: invoiceDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["invoiceDetails", selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return null;
      const res = await api.get(`/invoices/${selectedInvoice.id}`);
      return res.data;
    },
    enabled: !!selectedInvoice?.id && isDetailsModalOpen,
  });

  const handleAddItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          _id: crypto.randomUUID(),
          description: "",
          quantity: 1,
          unit_price: "",
          procedure_code_id: null,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (invoiceForm.items.length === 1) return;
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSelectProcedure = (index, codeId) => {
    const selected = procedureCodes.find((c) => c.id === codeId);
    if (!selected) return;
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              description: selected.description,
              unit_price: parseFloat(selected.default_price),
              procedure_code_id: selected.id,
            }
          : item
      ),
    }));
  };

  const calculatedTotal = invoiceForm.items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmitInvoice = (e) => {
    e.preventDefault();
    if (!invoiceForm.patient_id) {
      alert("يرجى اختيار مريض");
      return;
    }

    const payload = {
      patient_id: invoiceForm.patient_id,
      appointment_id: invoiceForm.appointment_id || null,
      doctor_id: invoiceForm.doctor_id || null,
      appointment_date: invoiceForm.appointment_date
        ? new Date(invoiceForm.appointment_date).toISOString()
        : null,
      items: invoiceForm.items.map(({ _id, ...rest }) => rest),
      initial_payment: invoiceForm.initial_payment.amount
        ? invoiceForm.initial_payment
        : null,
    };

    createInvoiceMutation.mutate(payload);
  };

  const handleOpenPayment = (inv) => {
    setSelectedInvoice(inv);
    const rem =
      parseFloat(inv.remaining_amount) || parseFloat(inv.total_amount);
    setPaymentForm({
      amount: rem,
      payment_method: "cash",
      notes: "",
    });
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = (e) => {
    e.preventDefault();
    recordPaymentMutation.mutate({
      invoice_id: selectedInvoice.id,
      amount: parseFloat(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      notes: paymentForm.notes,
    });
  };

  const statusConfig = {
    unpaid: {
      label: "غير مدفوعة",
      bg: "bg-[#EF4444]/10 text-[#F87171] border-[#EF4444]/20",
    },
    partially_paid: {
      label: "مدفوعة جزئياً",
      bg: "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/20",
    },
    paid: {
      label: "مدفوعة بالكامل",
      bg: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20",
    },
    cancelled: {
      label: "ملغاة",
      bg: "bg-[#172033] text-[#64748B] border-[#243047]",
    },
  };

  const paymentMethodConfig = {
    cash: "كاش 💵",
    card: "بطاقة بنكية 💳",
    bank_transfer: "تحويل / فودافون كاش 📱",
    online: "دفع إلكتروني 🌐",
    other: "أخرى",
  };

  const handlePrintInvoice = () => {
    printInvoice(invoiceDetails || selectedInvoice);
  };

  return (
    <div className="space-y-6">
      {/* الهيدر العلوي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F8FAFC] flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-[#0D9488]" />
            الفواتير والمالية
          </h1>

          <p className="text-[#94A3B8] text-sm mt-1">
            إصدار الفواتير وتحصيل المدفوعات النقدية والإلكترونية
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {user?.role === "ClinicAdmin" && (
            <button
              onClick={handleExportInvoices}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#172033] border border-[#243047] text-[#94A3B8] hover:text-[#F8FAFC] px-4 py-2.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
              ) : (
                <Download className="w-4 h-4 text-[#0D9488]" />
              )}

              <span>تصدير التقرير المالي 📊</span>
            </button>
          )}

          <button
            onClick={() => {
              setInvoiceForm(defaultInvoiceState);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#F8FAFC] px-5 py-2.5 rounded-md font-medium text-[13px] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute right-3.5 top-3.5" />
          <input
            type="text"
            placeholder="ابحث باسم المريض أو رقمه..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            className="w-full bg-[#111827] border border-[#243047] rounded-md pr-10 pl-4 py-2 text-[13px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0D9488]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex gap-2">
            {[
              { label: "الكل", value: "" },
              { label: "غير مدفوعة", value: "unpaid" },
              { label: "مدفوعة جزئياً", value: "partially_paid" },
              { label: "مدفوعة بالكامل", value: "paid" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(setStatusFilter, tab.value)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border ${
                  statusFilter === tab.value
                    ? "bg-[#042F2E] text-[#0D9488] border-[#0D9488]"
                    : "bg-[#111827] text-[#94A3B8] border-[#243047] hover:bg-[#172033] hover:text-[#F8FAFC]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleFilterChange(setShowArchived, !showArchived)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap border transition-all ${
              showArchived
                ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#FBBF24] hover:bg-[#F59E0B]/20"
                : "bg-[#111827] border-[#243047] text-[#94A3B8] hover:bg-[#172033] hover:text-[#F8FAFC]"
            }`}
          >
            {showArchived ? "العودة للفواتير النشطة" : "الفواتير المؤرشفة"}
          </button>
        </div>
      </div>

      {/* جدول الفواتير */}
      <div className="bg-[#111827] border border-[#243047] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-[#94A3B8] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D9488]" />
            <span className="text-[13px]">جاري تحميل الفواتير...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-[#64748B] text-[13px]">
            لا توجد فواتير مطابقة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-[#080D18] text-[#CBD5E1] border-b border-[#243047]">
                <tr>
                  <th className="py-3 px-4 font-medium text-[13px]">المريض</th>
                  <th className="py-3 px-4 font-medium text-[13px]">
                    إجمالي الفاتورة
                  </th>
                  <th className="py-3 px-4 font-medium text-[13px]">المدفوع</th>
                  <th className="py-3 px-4 font-medium text-[13px]">
                    المتبقي على الحساب
                  </th>
                  <th className="py-3 px-4 font-medium text-[13px]">
                    حالة الدفع
                  </th>
                  <th className="py-3 px-4 font-medium text-[13px]">
                    تاريخ الفاتورة
                  </th>
                  <th className="py-3 px-4 font-medium text-[13px] text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#243047] text-[#94A3B8]">
                {invoices.map((inv) => {
                  const rem = parseFloat(inv.remaining_amount) || 0;
                  const paid = parseFloat(inv.paid_amount) || 0;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#172033] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#F8FAFC] text-[13px]">
                          {inv.patient_name}
                        </p>
                        <span
                          className="text-xs text-[#64748B] font-mono"
                          dir="ltr"
                        >
                          {inv.patient_phone}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[#F8FAFC] font-semibold text-[13px]">
                        {parseFloat(inv.total_amount).toLocaleString("en-US")}{" "}
                        ج.م
                      </td>

                      <td className="py-3 px-4 font-mono text-[#34D399] text-[13px]">
                        {paid.toLocaleString("en-US")} ج.م
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {rem > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#EF4444]/10 text-[#F87171] border border-[#EF4444]/20 font-semibold text-xs">
                            {rem.toLocaleString("en-US")} ج.م
                          </span>
                        ) : (
                          <span className="text-[#64748B] text-xs">
                            خالص 0 ج.م
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            statusConfig[inv.status]?.bg ||
                            "bg-[#172033] text-[#64748B] border-[#243047]"
                          }`}
                        >
                          {statusConfig[inv.status]?.label || inv.status}
                        </span>
                      </td>

                      <td
                        className="py-3 px-4 text-[#64748B] text-xs font-mono"
                        dir="ltr"
                      >
                        {new Date(inv.created_at).toLocaleDateString("en-GB")}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="عرض تفاصيل الفاتورة"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-[#111827] text-[#0D9488] rounded-md transition-colors"
                          >
                            <FileText className="w-5 h-5" />
                          </button>

                          {(inv.status === "unpaid" ||
                            inv.status === "partially_paid") && (
                            <div className="flex items-center gap-1.5">
                              <button
                                title="تسجيل دفعة (تحصيل نقدي)"
                                onClick={() => handleOpenPayment(inv)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/20 rounded-md text-xs font-medium transition-colors"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>تحصيل</span>
                              </button>

                              <button
                                title="إنشاء رابط دفع إلكتروني وواتساب"
                                onClick={() => handleOpenOnlineModal(inv)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#111827] hover:bg-[#172033] text-[#0D9488] border border-[#243047] hover:border-[#0D9488]/40 rounded-md text-xs font-medium transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>رابط دفع</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* شريط الـ Pagination */}
        {!isLoading && pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#243047] bg-[#080D18] text-sm text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-lg border border-[#243047] bg-[#111827] hover:bg-[#172033] text-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                السابق
              </button>

              <span className="text-xs text-[#94A3B8] px-2">
                صفحة <span className="font-bold text-[#0D9488]">{page}</span> من{" "}
                <span className="font-bold text-[#F8FAFC]">
                  {pagination.totalPages}
                </span>
              </span>

              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="px-3.5 py-1.5 rounded-lg border border-[#243047] bg-[#111827] hover:bg-[#172033] text-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                التالي
              </button>
            </div>

            <div>
              عرض{" "}
              <span className="font-bold text-[#F8FAFC]">
                {invoices.length}
              </span>{" "}
              من أصل{" "}
              <span className="font-bold text-[#F8FAFC]">
                {pagination.total}
              </span>{" "}
              فاتورة
            </div>
          </div>
        )}
      </div>

      {/* نافذة إنشاء فاتورة جديدة */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#172033] border border-[#243047] max-w-2xl w-full rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#243047] mb-6">
              <h2 className="text-[17px] font-semibold text-[#F8FAFC] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#0D9488]" />
                إنشاء فاتورة علاج
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInvoice} className="space-y-6">
              {/* اختيار المريض مع البحث اللحظي */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-[#CBD5E1]">
                    المريض *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewPatientModalOpen(true)}
                    className="text-xs text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 font-medium"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ مريض جديد</span>
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#64748B] absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={patientInput}
                    onFocus={() => setIsPatientDropdownOpen(true)}
                    onChange={(e) => {
                      setPatientInput(e.target.value);
                      setInvoiceForm({
                        ...invoiceForm,
                        patient_id: "",
                        appointment_id: "",
                      });
                      setIsPatientDropdownOpen(true);
                    }}
                    className={`w-full bg-[#111827] border ${
                      invoiceForm.patient_id
                        ? "border-[#10B981]/50"
                        : "border-[#243047]"
                    } rounded-md pr-10 pl-4 py-2 text-[13px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#0D9488]`}
                  />
                  {invoiceForm.patient_id && (
                    <Check className="w-4 h-4 text-[#34D399] absolute left-3.5 top-3.5" />
                  )}
                </div>

                {isPatientDropdownOpen &&
                  patientInput.trim() &&
                  !invoiceForm.patient_id && (
                    <div className="absolute z-20 w-full mt-1 border border-[#243047] bg-[#111827] rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-[#243047]">
                      {isSearchingPatients ? (
                        <div className="p-3 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                          <span>جاري البحث في قاعدة البيانات...</span>
                        </div>
                      ) : searchedPatients.length > 0 ? (
                        searchedPatients.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setInvoiceForm({
                                ...invoiceForm,
                                patient_id: p.id,
                                appointment_id: "",
                              });
                              setPatientInput(p.name);
                              setIsPatientDropdownOpen(false);
                            }}
                            className="p-3 hover:bg-[#172033] cursor-pointer flex justify-between text-[13px] transition-colors"
                          >
                            <span className="text-[#F8FAFC] font-medium">
                              {p.name}
                            </span>
                            <span
                              className="text-xs text-[#94A3B8] font-mono"
                              dir="ltr"
                            >
                              {p.phone_number}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-[#64748B]">
                          لا يوجد مريض مطابق. يمكنك الضغط على "+ مريض جديد"
                          لإضافته فوراً.
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* الطبيب وتاريخ الكشف */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#CBD5E1] mb-1.5">
                    الطبيب المعالج *
                  </label>
                  <select
                    required
                    value={invoiceForm.doctor_id}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        doctor_id: e.target.value,
                      })
                    }
                    className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[#F8FAFC] text-[13px] focus:outline-none focus:border-[#0D9488]"
                  >
                    <option value="">-- اختر الطبيب --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        د. {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#CBD5E1] mb-1.5">
                    تاريخ ووقت الكشف *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={invoiceForm.appointment_date}
                    onChange={(e) =>
                      setInvoiceForm({
                        ...invoiceForm,
                        appointment_date: e.target.value,
                      })
                    }
                    className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[#F8FAFC] font-mono text-[13px] focus:outline-none focus:border-[#0D9488]"
                  />
                </div>
              </div>

              {/* ربط بميعاد حجز سابق للمريض المختار فقط */}
              {invoiceForm.patient_id && (
                <div>
                  <label className="block text-[13px] font-medium text-[#CBD5E1] mb-1.5">
                    ربط بميعاد حجز سابق (اختياري)
                  </label>
                  {isLoadingAppointments ? (
                    <div className="p-2 text-xs text-[#94A3B8] flex items-center gap-2 bg-[#111827] rounded-md border border-[#243047]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D9488]" />
                      <span>جاري البحث عن مواعيد هذا المريض...</span>
                    </div>
                  ) : patientAppointments.length > 0 ? (
                    <select
                      value={invoiceForm.appointment_id}
                      onChange={(e) => {
                        const apptId = e.target.value;
                        const selectedApt = patientAppointments.find(
                          (a) => a.id === apptId
                        );
                        setInvoiceForm({
                          ...invoiceForm,
                          appointment_id: apptId,
                          doctor_id: selectedApt
                            ? selectedApt.doctor_id
                            : invoiceForm.doctor_id,
                        });
                      }}
                      className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[#F8FAFC] focus:outline-none focus:border-[#0D9488] text-[13px]"
                    >
                      <option value="">
                        -- كشف فوري (سيتم إنشاء ميعاد تلقائياً) --
                      </option>
                      {patientAppointments.map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          ميعاد يوم{" "}
                          {new Date(apt.appointment_date).toLocaleDateString(
                            "en-GB"
                          )}{" "}
                          مع د. {apt.doctor_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-[#080D18] border border-[#243047] rounded-md text-xs text-[#94A3B8]">
                      لا توجد مواعيد سابقة لهذا المريض (سيتم تسجيل ميعاد كشف
                      تلقائي مع الفاتورة).
                    </div>
                  )}
                </div>
              )}

              {/* بنود الفاتورة */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[#CBD5E1]">
                    بنود العلاج والعمليات *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة بند آخر</span>
                  </button>
                </div>

                {invoiceForm.items.map((item, idx) => (
                  <div
                    key={item._id}
                    className="p-3 bg-[#080D18] border border-[#243047] rounded-md space-y-3"
                  >
                    {procedureCodes.length > 0 && (
                      <select
                        onChange={(e) =>
                          handleSelectProcedure(idx, e.target.value)
                        }
                        className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] text-[#CBD5E1] focus:outline-none focus:border-[#0D9488]"
                      >
                        <option value="">
                          -- اختار إجراء جاهز من قائمة الأسعار --
                        </option>
                        {procedureCodes.map((code) => (
                          <option key={code.id} value={code.id}>
                            {code.code} - {code.description} (
                            {parseFloat(code.default_price)} ج.م)
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder="وصف الإجراء"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(idx, "description", e.target.value)
                        }
                        className="flex-1 bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", e.target.value)
                        }
                        className="w-16 bg-[#111827] border border-[#243047] rounded-md px-2 py-2 text-[13px] text-center text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="السعر"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange(idx, "unit_price", e.target.value)
                        }
                        className="w-24 bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] font-mono text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                      />
                      {invoiceForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-[#64748B] hover:text-[#F87171]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* قسم الدفع الفوري */}
              <div className="p-4 bg-[#10B981]/5 border border-[#10B981]/20 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#34D399] flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    تحصيل فوري الآن (اختياري)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setInvoiceForm({
                        ...invoiceForm,
                        initial_payment: {
                          ...invoiceForm.initial_payment,
                          amount: calculatedTotal,
                        },
                      })
                    }
                    className="text-xs text-[#34D399] hover:underline"
                  >
                    دفع المبلغ كاملاً ({calculatedTotal} ج.م)
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">
                      المبلغ المدفوع الآن
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={calculatedTotal}
                      placeholder="0.00"
                      value={invoiceForm.initial_payment.amount}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          initial_payment: {
                            ...invoiceForm.initial_payment,
                            amount: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] font-mono text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">
                      طريقة الدفع
                    </label>
                    <select
                      value={invoiceForm.initial_payment.payment_method}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          initial_payment: {
                            ...invoiceForm.initial_payment,
                            payment_method: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                    >
                      <option value="cash">نقداً (كاش 💵)</option>
                      <option value="card">بطاقة بنكية (فيزا 💳)</option>
                      <option value="bank_transfer">
                        محفظة / فودافون كاش 📱
                      </option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* شريط الإجمالي النهائي */}
              <div className="flex justify-between items-center p-4 bg-[#080D18] rounded-md border border-[#243047]">
                <span className="font-medium text-[#CBD5E1] text-[13px]">
                  إجمالي الفاتورة:
                </span>
                <span className="text-[17px] font-semibold font-mono text-[#F8FAFC]">
                  {calculatedTotal.toLocaleString("en-US")} ج.م
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-transparent border border-[#243047] hover:bg-[#111827] text-[#94A3B8] rounded-md text-[13px] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="flex-1 bg-[#0D9488] hover:bg-[#0F766E] text-[#F8FAFC] py-2.5 rounded-md text-[13px] font-medium transition-colors"
                >
                  {createInvoiceMutation.isPending
                    ? "جاري الإصدار..."
                    : "إصدار الفاتورة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تفاصيل الفاتورة الشاملة */}
      {isDetailsModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#172033] border border-[#243047] max-w-xl w-full rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047] mb-4">
              <h2 className="text-[17px] font-semibold text-[#F8FAFC] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0D9488]" />
                تفاصيل الفاتورة - {selectedInvoice.patient_name}
              </h2>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDetailsLoading ? (
              <div className="p-8 text-center text-[#94A3B8] flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" />
                <span className="text-[13px]">
                  جاري تحميل بيانات الفاتورة وسجل الدفع...
                </span>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 bg-[#080D18] rounded-md border border-[#243047] grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <span className="text-[#64748B] block mb-0.5">المريض</span>
                    <span className="text-[#F8FAFC] font-medium">
                      {invoiceDetails?.patient_name}
                    </span>
                    <span
                      className="text-[#94A3B8] block font-mono mt-0.5"
                      dir="ltr"
                    >
                      {invoiceDetails?.patient_phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block mb-0.5">
                      الطبيب المعالج
                    </span>
                    <span className="text-[#F8FAFC] font-medium">
                      {invoiceDetails?.doctor_name
                        ? `د. ${invoiceDetails.doctor_name}`
                        : "كشف عام"}
                    </span>
                    {invoiceDetails?.appointment_date && (
                      <span
                        className="text-[#94A3B8] block font-mono mt-0.5"
                        dir="ltr"
                      >
                        {new Date(
                          invoiceDetails.appointment_date
                        ).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-[#CBD5E1] mb-2">
                    بنود العلاج والعمليات
                  </h4>
                  <div className="border border-[#243047] rounded-md overflow-hidden">
                    <table className="w-full text-right text-[13px]">
                      <thead className="bg-[#111827] text-[#94A3B8] border-b border-[#243047]">
                        <tr>
                          <th className="p-2.5 font-medium">البند</th>
                          <th className="p-2.5 text-center font-medium">
                            الكمية
                          </th>
                          <th className="p-2.5 font-medium">السعر</th>
                          <th className="p-2.5 text-left font-medium">
                            الإجمالي
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#243047] text-[#CBD5E1]">
                        {invoiceDetails?.items?.map((it) => (
                          <tr key={it.id} className="bg-[#080D18]">
                            <td className="p-2.5">{it.description}</td>
                            <td className="p-2.5 text-center">{it.quantity}</td>
                            <td className="p-2.5 font-mono">
                              {parseFloat(it.unit_price)}
                            </td>
                            <td className="p-2.5 text-left font-mono font-medium text-[#F8FAFC]">
                              {parseFloat(it.total_price)} ج.م
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-[#CBD5E1] mb-2 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#0D9488]" />
                    سجل الدفعات والتحصيل
                  </h4>
                  {invoiceDetails?.payments?.length === 0 ? (
                    <div className="p-3 bg-[#080D18] rounded-md text-center text-xs text-[#64748B] border border-[#243047]">
                      لم يتم سداد أي دفعات لهذه الفاتورة حتى الآن.
                    </div>
                  ) : (
                    <div className="border border-[#243047] rounded-md overflow-hidden">
                      <table className="w-full text-right text-[12px]">
                        <thead className="bg-[#111827] text-[#94A3B8] border-b border-[#243047]">
                          <tr>
                            <th className="py-2 px-3 text-right font-medium">
                              المبلغ
                            </th>
                            <th className="py-2 px-3 text-right font-medium">
                              طريقة الدفع
                            </th>
                            <th className="py-2 px-3 text-center font-medium">
                              الحالة
                            </th>
                            <th className="py-2 px-3 text-right font-medium">
                              التاريخ
                            </th>
                            <th className="py-2 px-3 text-right font-medium">
                              ملاحظات
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#243047] text-[#CBD5E1]">
                          {invoiceDetails?.payments?.map((pm) => (
                            <tr key={pm.id} className="bg-[#080D18]">
                              <td
                                className={`py-2 px-3 font-mono font-semibold ${
                                  pm.status === "paid"
                                    ? "text-[#34D399]"
                                    : "text-[#F8FAFC]"
                                }`}
                              >
                                {parseFloat(pm.amount).toLocaleString("en-US")}{" "}
                                ج.م
                              </td>
                              <td className="py-2 px-3 text-[#94A3B8]">
                                {paymentMethodConfig[pm.payment_method] ||
                                  pm.payment_method}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <PaymentStatusBadge status={pm.status} />
                              </td>
                              <td
                                className="py-2 px-3 text-[#64748B] font-mono"
                                dir="ltr"
                              >
                                {new Date(
                                  pm.paid_at || pm.created_at
                                ).toLocaleString("ar-EG")}
                              </td>
                              <td className="py-2 px-3 text-[#64748B] text-[11px]">
                                {pm.notes || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#080D18] rounded-md border border-[#243047] space-y-2 text-[13px]">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>إجمالي الفاتورة:</span>
                    <span className="font-mono text-[#F8FAFC]">
                      {parseFloat(
                        invoiceDetails?.total_amount || 0
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                  <div className="flex justify-between text-[#34D399]">
                    <span>إجمالي المدفوع:</span>
                    <span className="font-mono">
                      {parseFloat(
                        invoiceDetails?.paid_amount || 0
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                  <div className="flex justify-between text-[#F87171] font-semibold pt-2 border-t border-[#243047]">
                    <span>المتبقي على المريض:</span>
                    <span className="font-mono text-sm">
                      {parseFloat(
                        invoiceDetails?.remaining_amount || 0
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-[#F8FAFC] rounded-md text-[13px] font-medium transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الفاتورة</span>
                  </button>

                  {!showArchived && user?.role === "ClinicAdmin" && (
                    <button
                      type="button"
                      onClick={() => setIsArchiveConfirmOpen(true)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/20 rounded-md text-[13px] font-medium transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      <span>أرشفة</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="px-5 py-2.5 bg-transparent border border-[#243047] hover:bg-[#111827] text-[#94A3B8] rounded-md text-[13px] font-medium transition-colors"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة تحصيل الدفع */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#172033] border border-[#243047] max-w-md w-full rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047] mb-4">
              <h2 className="text-[17px] font-semibold text-[#F8FAFC] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#34D399]" />
                تحصيل دفعة - {selectedInvoice.patient_name}
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="p-3 bg-[#080D18] border border-[#243047] rounded-md flex justify-between items-center text-[13px]">
                <span className="text-[#94A3B8]">المتبقي على الفاتورة:</span>
                <span className="font-semibold font-mono text-[#F87171]">
                  {parseFloat(
                    selectedInvoice.remaining_amount ||
                      selectedInvoice.total_amount
                  ).toLocaleString("en-US")}{" "}
                  ج.م
                </span>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#CBD5E1] mb-1.5">
                  المبلغ المطلوب سداده *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={
                    selectedInvoice.remaining_amount ||
                    selectedInvoice.total_amount
                  }
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  className="w-full bg-[#111827] border border-[#243047] rounded-md px-4 py-2.5 text-[#F8FAFC] font-mono text-base focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#CBD5E1] mb-1.5">
                  طريقة الدفع *
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_method: e.target.value,
                    })
                  }
                  className="w-full bg-[#111827] border border-[#243047] rounded-md px-4 py-2.5 text-[#F8FAFC] text-[13px] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="cash">نقداً (كاش 💵)</option>
                  <option value="card">بطاقة بنكية (فيزا 💳)</option>
                  <option value="bank_transfer">تحويل / فودافون كاش 📱</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#CBD5E1] mb-1.5">
                  ملاحظات التحصيل
                </label>
                <input
                  type="text"
                  placeholder="مثال: دفعة ثانية..."
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  className="w-full bg-[#111827] border border-[#243047] rounded-md px-4 py-2 text-[13px] text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-transparent border border-[#243047] hover:bg-[#111827] text-[#94A3B8] rounded-md text-[13px] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="flex-1 bg-[#0D9488] hover:bg-[#0F766E] text-[#F8FAFC] py-2.5 rounded-md text-[13px] font-medium transition-colors"
                >
                  {recordPaymentMutation.isPending
                    ? "جاري التحصيل..."
                    : "تأكيد وقبض المبلغ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة الدفع الإلكتروني */}
      {isOnlineModalOpen && onlineSelectedInvoice && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#172033] border border-[#243047] max-w-md w-full rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#243047] mb-4">
              <h2 className="text-[17px] font-semibold text-[#F8FAFC] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0D9488]" />
                <span>دفع إلكتروني - {onlineSelectedInvoice.patient_name}</span>
              </h2>
              <button
                onClick={() => setIsOnlineModalOpen(false)}
                className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedLinkData ? (
              <form onSubmit={handleGenerateOnlineLink} className="space-y-4">
                <div className="p-3 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#FBBF24] text-[12px] text-center">
                  ⚠️ إنشاء رابط دفع جديد سيُلغي أي رابط دفع إلكتروني سابق معلق.
                </div>

                <div className="bg-[#080D18] border border-[#243047] rounded-md p-3 space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-[#94A3B8]">إجمالي المتبقي:</span>
                    <span className="font-semibold font-mono text-[#F87171]">
                      {(
                        parseFloat(onlineSelectedInvoice.remaining_amount) ||
                        parseFloat(onlineSelectedInvoice.total_amount)
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                  {onlineSelectedInvoice.patient_phone && (
                    <div className="flex justify-between items-center text-[12px] pt-2 border-t border-[#243047]">
                      <span className="text-[#64748B] flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" /> رقم المريض:
                      </span>
                      <span className="font-mono text-[#CBD5E1]" dir="ltr">
                        {onlineSelectedInvoice.patient_phone}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <label className="block text-[12px] font-medium text-[#CBD5E1]">
                    قيمة الدفعة المطلوبة:
                  </label>
                  <label
                    onClick={() => setPaymentType("full")}
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                      paymentType === "full"
                        ? "bg-[#042F2E] border-[#0D9488]/40 text-[#0D9488]"
                        : "bg-[#111827] border-[#243047] text-[#94A3B8] hover:border-[#0D9488]/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={paymentType === "full"}
                        readOnly
                        className="accent-[#0D9488]"
                      />
                      <span className="text-[13px] font-medium">
                        المتبقي بالكامل
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-[13px]">
                      {(
                        parseFloat(onlineSelectedInvoice.remaining_amount) ||
                        parseFloat(onlineSelectedInvoice.total_amount)
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </label>

                  <div
                    className={`p-3 rounded-md border transition-colors ${
                      paymentType === "custom"
                        ? "bg-[#042F2E] border-[#0D9488]/40 text-[#0D9488]"
                        : "bg-[#111827] border-[#243047] text-[#94A3B8]"
                    }`}
                  >
                    <label
                      onClick={() => setPaymentType("custom")}
                      className="flex items-center gap-2 cursor-pointer mb-2"
                    >
                      <input
                        type="radio"
                        checked={paymentType === "custom"}
                        readOnly
                        className="accent-[#0D9488]"
                      />
                      <span className="text-[13px] font-medium">
                        مبلغ مخصص (عربون / دفعة)
                      </span>
                    </label>
                    {paymentType === "custom" && (
                      <div className="relative mt-2">
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max={
                            parseFloat(
                              onlineSelectedInvoice.remaining_amount
                            ) || parseFloat(onlineSelectedInvoice.total_amount)
                          }
                          placeholder="أدخل المبلغ المطلوب..."
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          required
                          autoFocus
                          className="w-full bg-[#080D18] border border-[#0D9488]/30 rounded-md px-3 py-2 text-[#F8FAFC] font-mono text-[13px] focus:outline-none focus:border-[#0D9488]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOnlineModalOpen(false)}
                    className="flex-1 py-2.5 bg-transparent border border-[#243047] hover:bg-[#111827] text-[#94A3B8] rounded-md text-[13px] transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={createOnlinePaymentMutation.isPending}
                    className="flex-1 bg-[#0D9488] hover:bg-[#0F766E] text-[#F8FAFC] py-2.5 rounded-md text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {createOnlinePaymentMutation.isPending ? (
                      <span>جاري التوليد...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>توليد الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                {generatedLinkData.is_mock && (
                  <div className="mb-3 p-3 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#FBBF24] text-xs text-center">
                    🧪 رابط دفع تجريبي (Mock Mode) — لن يتم تنفيذ عملية دفع
                    حقيقية.
                  </div>
                )}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-[#10B981]/10 border border-[#10B981]/20 text-[#34D399] rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                    ✓
                  </div>
                  <h3 className="text-[15px] font-semibold text-[#F8FAFC]">
                    تم إنشاء رابط الدفع بنجاح
                  </h3>
                  <p className="text-[13px] text-[#94A3B8]">
                    المبلغ المطلوب:{" "}
                    <span className="font-semibold text-[#F8FAFC] font-mono">
                      {generatedLinkData.amount} ج.م
                    </span>
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {generatedLinkData.whatsapp_url && (
                    <a
                      href={generatedLinkData.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-md text-[13px] transition-colors"
                    >
                      <span className="text-base">📲</span>
                      <span>إرسال عبر واتساب العيادة</span>
                    </a>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#111827] border border-[#243047] hover:border-[#64748B] text-[#CBD5E1] rounded-md text-xs font-medium transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <span className="text-[#34D399]">✓</span>
                          <span className="text-[#34D399]">تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>
                    <a
                      href={generatedLinkData.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#111827] border border-[#243047] hover:border-[#0D9488]/50 text-[#0D9488] rounded-md text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح الدفع ↗</span>
                    </a>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#243047]">
                  <button
                    type="button"
                    onClick={() => setIsOnlineModalOpen(false)}
                    className="w-full py-2.5 bg-transparent hover:bg-[#111827] text-[#94A3B8] border border-[#243047] rounded-md text-xs transition-colors font-medium"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة إضافة مريض سريع */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-[#172033] border border-[#243047] max-w-sm w-full rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative">
            <h3 className="text-[17px] font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0D9488]" />
              إضافة مريض سريعاً
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPatientMutation.mutate(newPatientData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[13px] text-[#CBD5E1] mb-1.5">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  value={newPatientData.name}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#CBD5E1] mb-1.5">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  value={newPatientData.phone_number}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#CBD5E1] mb-1.5">
                  النوع
                </label>
                <select
                  value={newPatientData.gender}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      gender: e.target.value,
                    })
                  }
                  className="w-full bg-[#111827] border border-[#243047] rounded-md px-3 py-2 text-[13px] text-[#F8FAFC] focus:outline-none focus:border-[#0D9488]"
                >
                  <option value="Male">ذكر</option>
                  <option value="Female">أنثى</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="flex-1 py-2 bg-transparent border border-[#243047] hover:bg-[#111827] text-[#94A3B8] rounded-md text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                  className="flex-1 bg-[#0D9488] hover:bg-[#0F766E] text-[#F8FAFC] py-2 rounded-md text-xs font-medium transition-colors"
                >
                  حفظ واختيار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة تأكيد أرشفة الفاتورة */}
      {isArchiveConfirmOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-[#080D18]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-[#172033] border border-[#243047] max-w-md w-full rounded-xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#EF4444]/10 rounded-md border border-[#EF4444]/20 text-[#F87171]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-[#F8FAFC]">
                  تأكيد أرشفة الفاتورة
                </h3>
                <p className="text-[12px] text-[#F87171] font-medium">
                  تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه.
                </p>
              </div>
            </div>
            <p className="text-[13px] text-[#94A3B8] leading-relaxed">
              هل أنت متأكد من أرشفة الفاتورة رقم{" "}
              <span className="font-semibold font-mono text-[#F8FAFC]">
                #{selectedInvoice.id}
              </span>{" "}
              الخاصة بالمريض{" "}
              <span className="font-semibold text-[#F8FAFC]">
                "{selectedInvoice.patient_name}"
              </span>
              ؟
            </p>
            <div className="flex gap-3 pt-3 border-t border-[#243047]">
              <button
                type="button"
                onClick={() => setIsArchiveConfirmOpen(false)}
                className="flex-1 py-2.5 bg-transparent border border-[#243047] hover:bg-[#111827] text-[#94A3B8] rounded-md text-[13px] transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={archiveInvoiceMutation.isPending}
                onClick={() =>
                  archiveInvoiceMutation.mutate(selectedInvoice.id)
                }
                className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white py-2.5 rounded-md text-[13px] font-medium transition-colors disabled:opacity-50"
              >
                {archiveInvoiceMutation.isPending
                  ? "جاري الأرشفة..."
                  : "تأكيد الأرشفة نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
