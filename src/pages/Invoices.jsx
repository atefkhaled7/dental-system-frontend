import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  CreditCard,
  Plus,
  Search,
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
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: "✅",
  },
  pending: {
    label: "معلق",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: "🟡",
  },
  failed: {
    label: "فشل",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: "❌",
  },
  cancelled: {
    label: "ملغي",
    badge: "bg-slate-700/30 text-slate-400 border-slate-700",
    icon: "⚪",
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

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // النوافذ المنبثقة
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Combobox المريض
  const [patientInput, setPatientInput] = useState("");
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // فورم إضافة مريض سريع
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
  });

  // التحكم في مودال الدفع أونلاين
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [onlineSelectedInvoice, setOnlineSelectedInvoice] = useState(null);
  const [paymentType, setPaymentType] = useState("full"); // 'full' | 'custom'
  const [customAmount, setCustomAmount] = useState("");
  const [generatedLinkData, setGeneratedLinkData] = useState(null); // تخزين نتيجة الرابط بعد توليده
  const [isCopied, setIsCopied] = useState(false);

  // Mutation توليد رابط الدفع
  const createOnlinePaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/payments/online/create", payload);
      return res.data;
    },
    onSuccess: (data) => {
      // التحول مباشرة لواجهة النجاح جوه نفس المودال
      setGeneratedLinkData(data);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "فشل إنشاء رابط الدفع");
    },
  });

  // فتح المودال وتصفير البيانات
  const handleOpenOnlineModal = (inv) => {
    setOnlineSelectedInvoice(inv);
    setPaymentType("full");
    setCustomAmount("");
    setGeneratedLinkData(null);
    setIsCopied(false);
    setIsOnlineModalOpen(true);
  };

  // إرسال طلب توليد الرابط
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

  // نسخ الرابط للـ Clipboard
  const handleCopyLink = () => {
    if (generatedLinkData?.payment_url) {
      navigator.clipboard.writeText(generatedLinkData.payment_url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // جلب الدكاترة لاختيار الطبيب المعالج
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

  // فورم إنشاء فاتورة (افتراضياً: كشف أسنان أولي بـ 200 جنيه)
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

  // فورم تسجيل الدفع
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  // حالة عرض الفواتير المؤرشفة
  const [showArchived, setShowArchived] = useState(false);

  // حالة مودال تأكيد أرشفة الفاتورة
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // 1. جلب الفواتير
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", searchTerm, statusFilter, showArchived],
    queryFn: async () => {
      const res = await api.get("/invoices", {
        params: {
          search: searchTerm || undefined,
          status: statusFilter || undefined,
          archived: showArchived,
        },
      });
      return Array.isArray(res.data) ? res.data : res.data.invoices || [];
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

  // 3. جلب المواعيد (لربط الفاتورة بميعاد ودكتور)
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await api.get("/appointments");
      return res.data.appointments || [];
    },
  });

  // 4. جلب أكواد العمليات
  const { data: procedureCodes = [] } = useQuery({
    queryKey: ["procedureCodes"],
    queryFn: async () => {
      const res = await api.get("/procedure-codes");
      return res.data || [];
    },
  });

  // 5. إنشاء فاتورة
  const createInvoiceMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/invoices", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsCreateModalOpen(false);
      setInvoiceForm(defaultInvoiceState);
      setPatientInput("");
    },
    onError: (err) => {
      alert(err.response?.data?.error || "حدث خطأ أثناء إنشاء الفاتورة");
    },
  });

  // 6. إضافة مريض سريع
  const createPatientMutation = useMutation({
    mutationFn: async (p) => {
      const res = await api.post("/patients", p);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setInvoiceForm((prev) => ({ ...prev, patient_id: data.patient.id }));
      setPatientInput(data.patient.name);
      setIsNewPatientModalOpen(false);
      setIsPatientDropdownOpen(false);
      setNewPatientData({ name: "", phone_number: "", gender: "Male" });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "فشل إضافة المريض");
    },
  });

  // 7. تحصيل دفعة
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

  // جلب تفاصيل الفاتورة كاملة (البنود والمدفوعات والدكتور)
  const { data: invoiceDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["invoiceDetails", selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice?.id) return null;
      const res = await api.get(`/invoices/${selectedInvoice.id}`);
      return res.data;
    },
    enabled: !!selectedInvoice?.id && isDetailsModalOpen,
  });

  // إضافة وحذف البنود
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
    const qty = parseInt(item.quantity) || 0;
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

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientInput.toLowerCase()) ||
      p.phone_number.includes(patientInput)
  );

  // مواعيد المريض المختار
  const patientAppointments = appointments.filter(
    (a) => a.patient_id === invoiceForm.patient_id
  );

  const statusConfig = {
    unpaid: {
      label: "غير مدفوعة",
      bg: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    partially_paid: {
      label: "مدفوعة جزئياً",
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    paid: {
      label: "مدفوعة بالكامل",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    cancelled: {
      label: "ملغاة",
      bg: "bg-slate-700/50 text-slate-400 border-slate-700",
    },
  };

  const paymentMethodConfig = {
    cash: "كاش 💵",
    card: "بطاقة بنكية 💳",
    bank_transfer: "تحويل / فودافون كاش 📱",
    other: "أخرى",
  };

  // دالة حماية من الـ XSS لتعقيم النصوص قبل طباعتها
  const escapeHtml = (str) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const handlePrintInvoice = () => {
    if (!invoiceDetails && !selectedInvoice) return;
    const inv = invoiceDetails || selectedInvoice;

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      alert(
        "المتصفح منع فتح نافذة الطباعة. من فضلك اسمح بالنوافذ المنبثقة (popups) لهذا الموقع من إعدادات المتصفح ثم حاول تاني."
      );
      return;
    }

    // تعقيم البيانات
    const safePatientName = escapeHtml(inv.patient_name);
    const safePatientPhone = escapeHtml(inv.patient_phone || "-");
    const safeDoctorName = escapeHtml(inv.doctor_name || "كشف عام");
    const safeInvoiceId = escapeHtml(inv.id);
    const safeStatus =
      inv.status === "paid"
        ? "مدفوعة بالكامل"
        : inv.status === "partially_paid"
        ? "مدفوعة جزئياً"
        : inv.status === "cancelled"
        ? "ملغاة"
        : "غير مدفوعة";

    printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="utf-8" />
              <title>فاتورة ضريبية #${safeInvoiceId}</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #0f172a; margin: 0; }
                .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
                .clinic-name { font-size: 26px; font-weight: bold; color: #1e3a8a; margin-bottom: 4px; }
                .sub { font-size: 13px; color: #64748b; }
                .meta-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 25px; font-size: 13px; line-height: 1.8; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
                th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 14px; text-align: right; font-size: 13px; }
                th { background: #f1f5f9; color: #475569; font-weight: 600; }
                .summary { width: 320px; margin-right: auto; margin-left: 0; font-size: 14px; margin-top: 20px; }
                .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
                .total { font-weight: bold; font-size: 17px; color: #1e3a8a; border-top: 2px solid #0f172a; border-bottom: none; padding-top: 10px; margin-top: 6px; }
                .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="clinic-name">عيادة الأسنان التخصصية</div>
                <div class="sub">فاتورة علاج رقم #${safeInvoiceId} • بتاريخ ${new Date(
      inv.created_at
    ).toLocaleDateString("en-GB")}</div>
              </div>
              <div class="meta-box">
                <div>
                  <strong>اسم المريض:</strong> ${safePatientName}<br/>
                  <strong>رقم الهاتف:</strong> ${safePatientPhone}<br/>
                </div>
                <div>
                  <strong>الطبيب المعالج:</strong> د. ${safeDoctorName}<br/>
                  <strong>حالة الفاتورة:</strong> ${safeStatus}<br/>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>البند / الخدمة</th>
                    <th style="text-align: center;">الكمية</th>
                    <th style="text-align: left;">سعر الوحدة</th>
                    <th style="text-align: left;">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  ${(
                    inv.items || [
                      {
                        description: "كشف وعلاج أسنان",
                        quantity: 1,
                        unit_price: inv.total_amount,
                        total_price: inv.total_amount,
                      },
                    ]
                  )
                    .map(
                      (it) => `
                    <tr>
                      <td>${escapeHtml(it.description)}</td>
                      <td style="text-align: center;">${
                        Number(it.quantity) || 1
                      }</td>
                      <td style="text-align: left;">${parseFloat(
                        it.unit_price || 0
                      ).toLocaleString("en-US")} ج.م</td>
                      <td style="text-align: left; font-weight: bold;">${parseFloat(
                        it.total_price || 0
                      ).toLocaleString("en-US")} ج.م</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              <div class="summary">
                <div class="summary-row">
                  <span>إجمالي الفاتورة:</span>
                  <span>${parseFloat(inv.total_amount || 0).toLocaleString(
                    "en-US"
                  )} ج.م</span>
                </div>
                <div class="summary-row" style="color: #059669;">
                  <span>المدفوع:</span>
                  <span>${parseFloat(inv.paid_amount || 0).toLocaleString(
                    "en-US"
                  )} ج.م</span>
                </div>
                <div class="summary-row total" style="color: #dc2626;">
                  <span>المتبقي:</span>
                  <span>${parseFloat(inv.remaining_amount || 0).toLocaleString(
                    "en-US"
                  )} ج.م</span>
                </div>
              </div>
              <div class="footer">
                نتمنى لكم دوام الصحة والعافية • نسعد دائماً بخدمتكم
              </div>
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* الهيدر العلوي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-blue-500" />
            الفواتير والمالية
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            إصدار الفواتير وتحصيل المدفوعات النقدية والإلكترونية
          </p>
        </div>

        <button
          onClick={() => {
            setInvoiceForm(defaultInvoiceState);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء فاتورة جديدة</span>
        </button>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
          <input
            type="text"
            placeholder="ابحث باسم المريض أو رقمه..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${
                  statusFilter === tab.value
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 🌟 زرار عرض الفواتير المؤرشفة / النشطة */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
              showArchived
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {showArchived ? "العودة للفواتير النشطة" : "الفواتير المؤرشفة"}
          </button>
        </div>
      </div>

      {/* جدول الفواتير مع إظهار المتبقي بوضوح */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span>جاري تحميل الفواتير...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا توجد فواتير مطابقة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 font-semibold">المريض</th>
                  <th className="py-4 px-6 font-semibold">إجمالي الفاتورة</th>
                  <th className="py-4 px-6 font-semibold">المدفوع</th>
                  <th className="py-4 px-6 font-semibold">
                    المتبقي على الحساب
                  </th>
                  <th className="py-4 px-6 font-semibold">حالة الدفع</th>
                  <th className="py-4 px-6 font-semibold">تاريخ الفاتورة</th>
                  <th className="py-4 px-6 font-semibold text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {invoices.map((inv) => {
                  const rem = parseFloat(inv.remaining_amount) || 0;
                  const paid = parseFloat(inv.paid_amount) || 0;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* المريض */}
                      <td className="py-4 px-6">
                        <p className="font-medium text-white">
                          {inv.patient_name}
                        </p>
                        <span
                          className="text-xs text-slate-400 font-mono"
                          dir="ltr"
                        >
                          {inv.patient_phone}
                        </span>
                      </td>

                      {/* الإجمالي */}
                      <td className="py-4 px-6 font-mono text-white font-bold">
                        {parseFloat(inv.total_amount).toLocaleString("en-US")}{" "}
                        ج.م
                      </td>

                      {/* المدفوع */}
                      <td className="py-4 px-6 font-mono text-emerald-400">
                        {paid.toLocaleString("en-US")} ج.م
                      </td>

                      {/* المتبقي (بلون أحمر أو بارز لو باقي عليه فلوس) */}
                      <td className="py-4 px-6 font-mono">
                        {rem > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                            {rem.toLocaleString("en-US")} ج.م
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">
                            خالص 0 ج.م
                          </span>
                        )}
                      </td>

                      {/* بادج الحالة */}
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                            statusConfig[inv.status]?.bg ||
                            "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {statusConfig[inv.status]?.label || inv.status}
                        </span>
                      </td>

                      {/* التاريخ */}
                      <td
                        className="py-4 px-6 text-slate-400 text-xs font-mono"
                        dir="ltr"
                      >
                        {new Date(inv.created_at).toLocaleDateString("en-GB")}
                      </td>

                      {/* الإجراءات */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            title="عرض تفاصيل الفاتورة"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-800 text-blue-400 rounded-lg transition-colors"
                          >
                            <FileText className="w-5 h-5" />
                          </button>

                          {(inv.status === "unpaid" ||
                            inv.status === "partially_paid") && (
                            <div className="flex items-center gap-1.5">
                              {/* الزرار اليدوي الحالي */}
                              <button
                                title="تسجيل دفعة (تحصيل نقدي)"
                                onClick={() => handleOpenPayment(inv)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>تحصيل</span>
                              </button>

                              {/* الزرار الجديد للأونلاين والواتساب */}
                              <button
                                title="إنشاء رابط دفع إلكتروني وواتساب"
                                onClick={() => handleOpenOnlineModal(inv)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-xs font-medium transition-colors"
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
      </div>

      {/* نافذة إنشاء فاتورة جديدة (مع مريض جديد + موعد دكتور + دفع فوري) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                إنشاء فاتورة علاج
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInvoice} className="space-y-6">
              {/* المريض + زرار مريض جديد */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    المريض *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewPatientModalOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ مريض جديد</span>
                  </button>
                </div>

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
                      setInvoiceForm({ ...invoiceForm, patient_id: "" });
                      setIsPatientDropdownOpen(true);
                    }}
                    className={`w-full bg-slate-950 border ${
                      invoiceForm.patient_id
                        ? "border-emerald-500/50"
                        : "border-slate-700"
                    } rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500`}
                  />
                  {invoiceForm.patient_id && (
                    <Check className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  )}
                </div>

                {isPatientDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto divide-y divide-slate-800">
                    {filteredPatients.map((p) => (
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

              {/* اختيار الدكتور وتاريخ الكشف جنب بعض */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">-- اختر الطبيب المعالج --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        د. {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>

              {/* ربط بميعاد مسبق (لو المريض عنده حجز قديم) */}
              {invoiceForm.patient_id && patientAppointments.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    ربط بميعاد حجز سابق للمريض (اختياري)
                  </label>
                  <select
                    value={invoiceForm.appointment_id}
                    onChange={(e) => {
                      const apptId = e.target.value;
                      const selectedApt = patientAppointments.find(
                        (a) => a.appointment_id === apptId
                      );
                      setInvoiceForm({
                        ...invoiceForm,
                        appointment_id: apptId,
                        // لو اختار ميعاد مسبق، يحدد دكتوره أوتوماتيك!
                        doctor_id: selectedApt
                          ? selectedApt.doctor_id
                          : invoiceForm.doctor_id,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="">
                      -- كشف فوري (سيتم إنشاء ميعاد تلقائياً) --
                    </option>
                    {patientAppointments.map((apt) => (
                      <option
                        key={apt.appointment_id}
                        value={apt.appointment_id}
                      >
                        ميعاد يوم{" "}
                        {new Date(apt.appointment_date).toLocaleDateString(
                          "en-GB"
                        )}{" "}
                        مع د. {apt.doctor_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* بنود الفاتورة (الافتراضي: كشف أسنان أولي بـ 200 ج) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    بنود العلاج والعمليات *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة بند آخر</span>
                  </button>
                </div>

                {invoiceForm.items.map((item, idx) => (
                  <div
                    key={item._id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3"
                  >
                    {procedureCodes.length > 0 && (
                      <div>
                        <select
                          onChange={(e) =>
                            handleSelectProcedure(idx, e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
                      </div>
                    )}

                    <div className="flex gap-3 items-center">
                      <input
                        type="text"
                        required
                        placeholder="وصف الإجراء"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(idx, "description", e.target.value)
                        }
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", e.target.value)
                        }
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-center text-white focus:outline-none focus:border-blue-500"
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
                        className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                      {invoiceForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* قسم الدفع الفوري (تحصيل لحظي مع إنشاء الفاتورة) */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    تحصيل فوري الآن (اختياري)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceForm({
                        ...invoiceForm,
                        initial_payment: {
                          ...invoiceForm.initial_payment,
                          amount: calculatedTotal,
                        },
                      });
                    }}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    دفع المبلغ كاملاً ({calculatedTotal} ج.م)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
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
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
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
              <div className="flex justify-between items-center p-4 bg-slate-800/60 rounded-xl border border-slate-700">
                <span className="font-medium text-slate-300">
                  إجمالي الفاتورة:
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {calculatedTotal.toLocaleString("en-US")} ج.م
                </span>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createInvoiceMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-medium"
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

      {/* نافذة تفاصيل الفاتورة الشاملة (مع سجل المدفوعات والدكتور) */}
      {isDetailsModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-xl w-full rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                تفاصيل الفاتورة - {selectedInvoice.patient_name}
              </h2>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDetailsLoading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span>جاري تحميل بيانات الفاتورة وسجل الدفع...</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* كارت معلومات المريض والدكتور */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">المريض</span>
                    <span className="text-white font-medium text-sm">
                      {invoiceDetails?.patient_name}
                    </span>
                    <span
                      className="text-slate-400 block font-mono mt-0.5"
                      dir="ltr"
                    >
                      {invoiceDetails?.patient_phone}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5">
                      الطبيب المعالج
                    </span>
                    <span className="text-white font-medium text-sm">
                      {invoiceDetails?.doctor_name
                        ? `د. ${invoiceDetails.doctor_name}`
                        : "كشف عام"}
                    </span>
                    {invoiceDetails?.appointment_date && (
                      <span
                        className="text-slate-400 block font-mono mt-0.5"
                        dir="ltr"
                      >
                        {new Date(
                          invoiceDetails.appointment_date
                        ).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                </div>

                {/* بنود الفاتورة */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">
                    بنود العلاج والعمليات
                  </h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-800 text-slate-400">
                        <tr>
                          <th className="p-2.5">البند</th>
                          <th className="p-2.5 text-center">الكمية</th>
                          <th className="p-2.5">السعر</th>
                          <th className="p-2.5 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {invoiceDetails?.items?.map((it) => (
                          <tr key={it.id}>
                            <td className="p-2.5 font-medium text-white">
                              {it.description}
                            </td>
                            <td className="p-2.5 text-center">{it.quantity}</td>
                            <td className="p-2.5 font-mono">
                              {parseFloat(it.unit_price)}
                            </td>
                            <td className="p-2.5 text-left font-mono font-bold text-emerald-400">
                              {parseFloat(it.total_price)} ج.م
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* سجل المدفوعات (إيه وإمتى وطريقة الدفع) */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    سجل الدفعات والتحصيل
                  </h4>
                  {invoiceDetails?.payments?.length === 0 ? (
                    <div className="p-3 bg-slate-950 rounded-xl text-center text-xs text-slate-500 border border-slate-800">
                      لم يتم سداد أي دفعات لهذه الفاتورة حتى الآن.
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2 px-3 text-right">المبلغ</th>
                            <th className="py-2 px-3 text-right">
                              طريقة الدفع
                            </th>
                            <th className="py-2 px-3 text-center">الحالة</th>
                            <th className="py-2 px-3 text-right">
                              تاريخ ووقت السداد
                            </th>
                            <th className="py-2 px-3 text-right">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {invoiceDetails?.payments?.map((pm) => (
                            <tr key={pm.id}>
                              <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                                {parseFloat(pm.amount).toLocaleString("en-US")}{" "}
                                ج.م
                              </td>

                              <td className="py-2 px-3 text-slate-300">
                                {paymentMethodConfig[pm.payment_method] ||
                                  pm.payment_method}
                              </td>

                              <td className="py-2 px-3 text-center">
                                <PaymentStatusBadge status={pm.status} />
                              </td>

                              <td
                                className="py-2 px-3 text-xs text-slate-400 font-mono"
                                dir="ltr"
                              >
                                {new Date(
                                  pm.paid_at || pm.created_at
                                ).toLocaleString("ar-EG")}
                              </td>

                              <td className="py-2 px-3 text-xs text-slate-400">
                                {pm.notes || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ملخص الحساب الكلي في أسفل الفاتورة */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>إجمالي الفاتورة:</span>
                    <span className="font-mono text-white">
                      {parseFloat(
                        invoiceDetails?.total_amount || 0
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>إجمالي المدفوع:</span>
                    <span className="font-mono">
                      {parseFloat(
                        invoiceDetails?.paid_amount || 0
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                  <div className="flex justify-between text-red-400 font-bold pt-2 border-t border-slate-800">
                    <span>المتبقي على المريض:</span>
                    <span className="font-mono text-base">
                      {parseFloat(
                        invoiceDetails?.remaining_amount || 0
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                </div>

                {/* أزرار الإجراءات أسفل الفاتورة */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
                  {/* 1. زر طباعة الفاتورة */}
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors shadow-lg shadow-blue-600/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الفاتورة</span>
                  </button>

                  {/* 2. زر أرشفة الفاتورة (للأدمن فقط وللفواتير النشطة) */}
                  {!showArchived && user?.role === "ClinicAdmin" && (
                    <button
                      type="button"
                      onClick={() => setIsArchiveConfirmOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-medium transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      <span>أرشفة</span>
                    </button>
                  )}

                  {/* 3. زر إغلاق */}
                  <button
                    type="button"
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                تحصيل دفعة - {selectedInvoice.patient_name}
              </h2>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center text-sm">
                <span className="text-slate-400">المتبقي على الفاتورة:</span>
                <span className="font-bold font-mono text-red-400">
                  {parseFloat(
                    selectedInvoice.remaining_amount ||
                      selectedInvoice.total_amount
                  ).toLocaleString("en-US")}{" "}
                  ج.م
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="cash">نقداً (كاش 💵)</option>
                  <option value="card">بطاقة بنكية (فيزا 💳)</option>
                  <option value="bank_transfer">تحويل / فودافون كاش 📱</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  ملاحظات التحصيل
                </label>
                <input
                  type="text"
                  placeholder="مثال: دفعة ثانية..."
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-400 rounded-xl text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium"
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

      {isOnlineModalOpen && onlineSelectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            {/* رأس المودال */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                <span>دفع إلكتروني - {onlineSelectedInvoice.patient_name}</span>
              </h2>
              <button
                onClick={() => setIsOnlineModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* الحالة 1: نموذج اختيار المبلغ وتوليد الرابط */}
            {!generatedLinkData ? (
              <form onSubmit={handleGenerateOnlineLink} className="space-y-4">
                {/* المتبقي ورقم الهاتف */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">إجمالي المتبقي:</span>
                    <span className="font-bold font-mono text-red-400 text-base">
                      {(
                        parseFloat(onlineSelectedInvoice.remaining_amount) ||
                        parseFloat(onlineSelectedInvoice.total_amount)
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                  {onlineSelectedInvoice.patient_phone && (
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        رقم المريض:
                      </span>
                      <span className="font-mono text-slate-300 dir-ltr">
                        {onlineSelectedInvoice.patient_phone}
                      </span>
                    </div>
                  )}
                </div>

                {/* خيارات تحديد المبلغ */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-medium text-slate-300">
                    قيمة الدفعة المطلوبة:
                  </label>

                  {/* الخيار 1: كامل المتبقي */}
                  <label
                    onClick={() => setPaymentType("full")}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentType === "full"
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === "full"}
                        onChange={() => setPaymentType("full")}
                        className="accent-purple-500"
                      />
                      <span className="text-sm font-medium">
                        المتبقي بالكامل
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sm">
                      {(
                        parseFloat(onlineSelectedInvoice.remaining_amount) ||
                        parseFloat(onlineSelectedInvoice.total_amount)
                      ).toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </label>

                  {/* الخيار 2: مبلغ مخصص */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      paymentType === "custom"
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <label
                      onClick={() => setPaymentType("custom")}
                      className="flex items-center gap-2 cursor-pointer mb-2"
                    >
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === "custom"}
                        onChange={() => setPaymentType("custom")}
                        className="accent-purple-500"
                      />
                      <span className="text-sm font-medium">
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
                          className="w-full bg-slate-900 border border-purple-500/30 rounded-lg px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-purple-500"
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400">
                          ج.م
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* أزرار الإجراء */}
                <div className="flex gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsOnlineModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-400 rounded-xl text-sm transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={createOnlinePaymentMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {createOnlinePaymentMutation.isPending ? (
                      <span>جاري توليد الرابط...</span>
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
              /* الحالة 2: شاشة النجاح والأزرار التفاعلية بعد التوليد */
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
                    ✓
                  </div>
                  <h3 className="text-base font-bold text-white">
                    تم إنشاء رابط الدفع بنجاح
                  </h3>
                  <p className="text-xs text-slate-400">
                    المبلغ المطلوب:{" "}
                    <span className="font-bold text-white font-mono">
                      {generatedLinkData.amount} ج.م
                    </span>
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {/* زرار الواتساب الأخضر المباشر */}
                  {generatedLinkData.whatsapp_url && (
                    <a
                      href={generatedLinkData.whatsapp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/40"
                    >
                      <span className="text-base">📲</span>
                      <span>إرسال عبر واتساب العيادة</span>
                    </a>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {/* زرار نسخ الرابط */}
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <span className="text-emerald-400">✓</span>
                          <span className="text-emerald-400">تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الرابط</span>
                        </>
                      )}
                    </button>

                    {/* زرار فتح صفحة الدفع مباشرة */}
                    <a
                      href={generatedLinkData.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-950 border border-slate-700 hover:border-slate-600 text-purple-300 rounded-xl text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح الدفع ↗</span>
                    </a>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsOnlineModalOpen(false)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
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
                <label className="block text-xs text-slate-300 mb-1">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  placeholder="محمد علي"
                  value={newPatientData.name}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={newPatientData.phone_number}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Male">ذكر</option>
                  <option value="Female">أنثى</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-medium"
                >
                  حفظ واختيار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* نافذة تأكيد أرشفة الفاتورة (لا يمكن التراجع عنها) */}
      {isArchiveConfirmOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  تأكيد أرشفة الفاتورة
                </h3>
                <p className="text-xs text-red-400 font-semibold">
                  تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه مطلقاً
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              هل أنت متأكد من أرشفة الفاتورة رقم{" "}
              <span className="font-bold font-mono text-white">
                #{selectedInvoice.id}
              </span>{" "}
              الخاصة بالمريض{" "}
              <span className="font-bold text-white">
                "{selectedInvoice.patient_name}"
              </span>
              ؟
            </p>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsArchiveConfirmOpen(false)}
                className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={archiveInvoiceMutation.isPending}
                onClick={() =>
                  archiveInvoiceMutation.mutate(selectedInvoice.id)
                }
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
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
