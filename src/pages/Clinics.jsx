import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Building2,
  Plus,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
  Lock,
  Copy,
  Check,
  X,
  Calendar,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function Clinics() {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // 'all', 'active', 'inactive'

  // مودال إضافة عيادة جديدة
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    phone_number: "",
    subscription_plan: "trial", // 'trial', 'monthly', 'yearly'
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });

  // مودال تجديد / ترقية اشتراك عيادة قائمة
  const [renewModal, setRenewModal] = useState({
    isOpen: false,
    clinic: null,
    plan: "monthly",
  });

  // كارت نجاح الإنشاء مع بيانات الدخول
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // نظام التوست السريع
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. جلب قائمة العيادات مع إحصائياتها وتفاصيل الاشتراك
  const {
    data: clinicsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["superadmin-clinics"],
    queryFn: async () => {
      const res = await api.get("/clinics");
      return res.data?.clinics || [];
    },
  });

  const clinics = clinicsData || [];

  // 2. Mutation إنشاء العيادة وتعيين الأدمن والخطة
  const createClinicMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/clinics", payload);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-clinics"] });
      setIsAddModalOpen(false);
      setCreatedCredentials({
        clinicName: data.clinic?.name,
        plan: variables.subscription_plan,
        email: data.admin?.email,
        password: variables.admin_password,
      });
      setAddForm({
        name: "",
        phone_number: "",
        subscription_plan: "trial",
        admin_name: "",
        admin_email: "",
        admin_password: "",
      });
      showToast("تم إنشاء العيادة وتفعيل الخطة بنجاح", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل إنشاء العيادة", "error");
    },
  });

  // 3. Mutation تجميد / تفعيل العيادة (Kill-Switch)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const res = await api.put(`/clinics/${id}`, { is_active });
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-clinics"] });
      showToast(
        variables.is_active
          ? "تم تفعيل العيادة بنجاح"
          : "تم تجميد اشتراك العيادة",
        "success"
      );
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل تعديل حالة العيادة", "error");
    },
  });

  // 4. Mutation تجديد أو ترقية الاشتراك
  const renewSubscriptionMutation = useMutation({
    mutationFn: async ({ id, plan }) => {
      const res = await api.put(`/clinics/${id}/subscription`, { plan });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-clinics"] });
      setRenewModal({ isOpen: false, clinic: null, plan: "monthly" });
      showToast("تم تحديث وتمديد اشتراك العيادة بنجاح", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل تجديد الاشتراك", "error");
    },
  });

  // تصفية العيادات حسب البحث والحالة
  const filteredClinics = clinics.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.admin_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number?.includes(searchTerm);

    const matchesStatus =
      filterActive === "all"
        ? true
        : filterActive === "active"
        ? c.is_active === true
        : c.is_active === false;

    return matchesSearch && matchesStatus;
  });

  // حساب الإحصائيات العامة
  const totalClinics = clinics.length;
  const activeClinics = clinics.filter((c) => c.is_active).length;
  const inactiveClinics = totalClinics - activeClinics;
  const totalPatientsAll = clinics.reduce(
    (sum, c) => sum + parseInt(c.patients_count || 0, 10),
    0
  );

  const planConfig = {
    trial: {
      label: "تجربة مجانية 🎁",
      badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    },
    monthly: {
      label: "اشتراك شهري 💳",
      badge: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    },
    yearly: {
      label: "اشتراك سنوي 💎",
      badge: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    },
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const planName =
      createdCredentials.plan === "yearly"
        ? "الاشتراك السنوي"
        : createdCredentials.plan === "monthly"
        ? "الاشتراك الشهري"
        : "التجربة المجانية (14 يوم)";

    const text = `مرحباً دكتور، تم تجهيز وتفعيل حساب عيادتك على منصة CUROSTA 🦷\nالخطة المفعلة: ${planName}\n\nرابط تسجيل الدخول: https://curosta.com/login\nالبريد الإلكتروني: ${createdCredentials.email}\nكلمة المرور: ${createdCredentials.password}\n\nنتمنى لك ولعيادتك عملاً موفقاً!`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* 🌟 الهيدر الرئيسي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-teal-400" />
            إدارة العيادات والاشتراكات (SuperAdmin)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            متابعة عيادات المنصة، تفعيل وتجميد الاشتراكات، وإنشاء العيادات
            الجديدة
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedCredentials(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-950/40 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عيادة جديدة</span>
        </button>
      </div>

      {/* 🌟 كروت مؤشرات المنصة (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0d1527] border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">
              إجمالي العيادات
            </span>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {totalClinics}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-[#0d1527] border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">
              عيادات نشطة
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {activeClinics}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-[#0d1527] border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">
              عيادات موقوفة
            </span>
            <div className="text-2xl font-bold font-mono text-rose-400">
              {inactiveClinics}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-[#0d1527] border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">
              إجمالي المرضى بالمنصة
            </span>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {totalPatientsAll.toLocaleString("en-US")}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 🌟 شريط البحث والفلترة */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
          <input
            type="text"
            placeholder="ابحث باسم العيادة، الدكتور، أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111827] border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {[
            { label: "كل العيادات", value: "all" },
            { label: "النشطة فقط", value: "active" },
            { label: "الموقوفة", value: "inactive" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterActive(tab.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterActive === tab.value
                  ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                  : "bg-[#111827] text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🌟 جدول العيادات */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <span className="text-sm">جاري تحميل عيادات المنصة...</span>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-rose-400">
            حدث خطأ أثناء تحميل العيادات.
          </div>
        ) : filteredClinics.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            لا توجد عيادات مطابقة للبحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#070b14] text-slate-400 border-b border-slate-800 text-xs font-semibold">
                <tr>
                  <th className="py-3.5 px-5">العيادة</th>
                  <th className="py-3.5 px-5">المسؤول (ClinicAdmin)</th>
                  <th className="py-3.5 px-5">إحصائيات الاستخدام</th>
                  <th className="py-3.5 px-5">خطة وفترة الاشتراك</th>
                  <th className="py-3.5 px-5">حالة النظام</th>
                  <th className="py-3.5 px-5 text-center">
                    إدارة الاشتراك والتحكم
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredClinics.map((c) => {
                  const now = new Date();
                  const endsAt = c.subscription_ends_at
                    ? new Date(c.subscription_ends_at)
                    : null;
                  const daysLeft = endsAt
                    ? Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24))
                    : null;

                  const isExpired = daysLeft !== null && daysLeft <= 0;
                  const plan = c.subscription_plan || "trial";

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* العيادة */}
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-slate-100">{c.name}</p>
                        {c.phone_number && (
                          <span
                            className="text-xs text-slate-500 font-mono"
                            dir="ltr"
                          >
                            {c.phone_number}
                          </span>
                        )}
                      </td>

                      {/* المسؤول */}
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-slate-200">
                          {c.admin_name || "غير محدد"}
                        </p>
                        <span className="text-xs text-teal-400 font-mono">
                          {c.admin_email || "-"}
                        </span>
                      </td>

                      {/* الإحصائيات */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3 text-xs">
                          <span
                            title="عدد الأطباء والموظفين"
                            className="text-slate-400 font-mono"
                          >
                            👨‍⚕️ {c.staff_count || 0}
                          </span>
                          <span className="text-slate-700">•</span>
                          <span
                            title="عدد المرضى"
                            className="text-slate-400 font-mono"
                          >
                            👥 {c.patients_count || 0}
                          </span>
                          <span className="text-slate-700">•</span>
                          <span
                            title="عدد الكشوفات"
                            className="text-slate-400 font-mono"
                          >
                            📅 {c.appointments_count || 0}
                          </span>
                        </div>
                      </td>

                      {/* خطة وتواريخ الاشتراك */}
                      <td className="py-3.5 px-5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              planConfig[plan]?.badge || planConfig.trial.badge
                            }`}
                          >
                            {planConfig[plan]?.label || plan}
                          </span>

                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            <div>
                              بدأ:{" "}
                              {new Date(
                                c.subscription_starts_at
                              ).toLocaleDateString("en-GB")}
                            </div>
                            <div
                              className={
                                isExpired
                                  ? "text-rose-400 font-bold"
                                  : "text-slate-300"
                              }
                            >
                              ينتهي:{" "}
                              {endsAt
                                ? endsAt.toLocaleDateString("en-GB")
                                : "-"}
                            </div>
                            <div className="text-[10px] mt-0.5 font-sans">
                              {isExpired ? (
                                <span className="text-rose-400 font-bold">
                                  منتهي الصلاحية ⚠️
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-medium">
                                  متبقي {daysLeft} يوم
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* حالة النظام (Kill-Switch) */}
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            c.is_active && !isExpired
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.is_active && !isExpired
                                ? "bg-emerald-400"
                                : "bg-rose-400"
                            }`}
                          />
                          <span>
                            {c.is_active && !isExpired
                              ? "نشط وشغال"
                              : isExpired
                              ? "منتهي الاشتراك"
                              : "مجمد 🔒"}
                          </span>
                        </span>
                      </td>

                      {/* إجراءات التحكم */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* زر التجديد والترقية */}
                          <button
                            type="button"
                            onClick={() =>
                              setRenewModal({
                                isOpen: true,
                                clinic: c,
                                plan: c.subscription_plan || "monthly",
                              })
                            }
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-all"
                            title="ترقية أو تمديد الاشتراك"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>ترقية / تجديد</span>
                          </button>

                          {/* زر التجميد والتفعيل */}
                          <button
                            type="button"
                            disabled={toggleStatusMutation.isPending}
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: c.id,
                                is_active: !c.is_active,
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              c.is_active
                                ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {c.is_active ? "تجميد 🔒" : "فك التجميد 🔓"}
                          </button>
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

      {/* 🌟 كارت رسالة الواتساب الجاهزة بعد الإنشاء */}
      {createdCredentials && (
        <div className="p-5 bg-teal-500/10 border border-teal-500/30 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <span>
                تم تجهيز بيانات الدخول لعيادة ({createdCredentials.clinicName})
              </span>
            </div>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 bg-[#070b14] border border-slate-800 rounded-xl text-xs font-mono text-slate-300 space-y-1">
            <p>
              <strong>الإيميل:</strong> {createdCredentials.email}
            </p>
            <p>
              <strong>الباسورد:</strong> {createdCredentials.password}
            </p>
          </div>

          <button
            onClick={handleCopyCredentials}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
          >
            {isCopied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>
              {isCopied
                ? "تم نسخ رسالة الواتساب!"
                : "نسخ رسالة الترحيب للواتساب"}
            </span>
          </button>
        </div>
      )}

      {/* 🌟 مودال إضافة عيادة وأدمن فوري مع اختيار الخطة */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#0d1527] border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-5">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" />
                إنشاء عيادة جديدة وتعيين الخطة
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createClinicMutation.mutate(addForm);
              }}
              className="space-y-4 text-right"
            >
              {/* اختيار الخطة أولاً */}
              <div className="space-y-2 pb-3 border-b border-slate-800/80">
                <label className="block text-xs font-bold text-teal-400 mb-1.5">
                  خطة الاشتراك الأولى للعيادة *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "trial", label: "🎁 تجربة (14 يوم)" },
                    { id: "monthly", label: "💳 شهري (شهر)" },
                    { id: "yearly", label: "💎 سنوي (سنة)" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setAddForm({ ...addForm, subscription_plan: p.id })
                      }
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        addForm.subscription_plan === p.id
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm"
                          : "bg-[#070b14] text-slate-400 border-slate-800 hover:bg-slate-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* بيانات العيادة */}
              <div className="space-y-3 pb-3 border-b border-slate-800/80">
                <h3 className="text-xs font-bold text-teal-400">
                  بيانات العيادة
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    اسم العيادة / المركز *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عيادة النور لطب الأسنان"
                    value={addForm.name}
                    onChange={(e) =>
                      setAddForm({ ...addForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    رقم هاتف العيادة (اختياري)
                  </label>
                  <input
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    value={addForm.phone_number}
                    onChange={(e) =>
                      setAddForm({ ...addForm, phone_number: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* بيانات حساب الأدمن المسؤول */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-teal-400">
                  حساب مدير العيادة (ClinicAdmin)
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    اسم الطبيب / الأدمن *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="د. أحمد علي"
                    value={addForm.admin_name}
                    onChange={(e) =>
                      setAddForm({ ...addForm, admin_name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    البريد الإلكتروني لتسجيل الدخول *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="doctor@gmail.com"
                    value={addForm.admin_email}
                    onChange={(e) =>
                      setAddForm({ ...addForm, admin_email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    كلمة المرور الأولى *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={8}
                    placeholder="كلمة مرور لا تقل عن 8 أحرف"
                    value={addForm.admin_password}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        admin_password: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm font-mono focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createClinicMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createClinicMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإنشاء...</span>
                    </>
                  ) : (
                    <span>تأكيد وإنشاء العيادة</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 مودال تجديد / ترقية الاشتراك لعيادة موجودة */}
      {renewModal.isOpen && renewModal.clinic && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#0d1527] border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                تجديد / ترقية اشتراك العيادة
              </h2>
              <button
                onClick={() =>
                  setRenewModal({
                    isOpen: false,
                    clinic: null,
                    plan: "monthly",
                  })
                }
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#070b14] border border-slate-800 rounded-xl mb-4 text-xs space-y-1">
              <p className="text-slate-300">
                العيادة:{" "}
                <span className="font-bold text-white">
                  {renewModal.clinic.name}
                </span>
              </p>
              <p className="text-slate-400">
                المسؤول: {renewModal.clinic.admin_name || "-"} (
                {renewModal.clinic.admin_email || "-"})
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                renewSubscriptionMutation.mutate({
                  id: renewModal.clinic.id,
                  plan: renewModal.plan,
                });
              }}
              className="space-y-4 text-right"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  اختر الخطة الجديدة المطلوب تفعيلها:
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "monthly",
                      title: "اشتراك شهري (شهر من اليوم) 💳",
                      desc: "تمديد الصلاحية لشهر كامل مع تفعيل الحساب فوراً",
                    },
                    {
                      id: "yearly",
                      title: "اشتراك سنوي (سنة كاملة) 💎",
                      desc: "تمديد الصلاحية لسنة كاملة (365 يوم)",
                    },
                    {
                      id: "trial",
                      title: "تمديد فترة التجربة (14 يوم إضافية) 🎁",
                      desc: "إعادة تعيين التجربة لمدة 14 يوم من اليوم",
                    },
                  ].map((option) => (
                    <label
                      key={option.id}
                      onClick={() =>
                        setRenewModal({ ...renewModal, plan: option.id })
                      }
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        renewModal.plan === option.id
                          ? "bg-teal-500/15 border-teal-500/50 text-teal-200"
                          : "bg-[#070b14] border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        checked={renewModal.plan === option.id}
                        readOnly
                        className="mt-1 accent-teal-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-100">
                          {option.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {option.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setRenewModal({
                      isOpen: false,
                      clinic: null,
                      plan: "monthly",
                    })
                  }
                  className="flex-1 py-2.5 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={renewSubscriptionMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {renewSubscriptionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التفعيل...</span>
                    </>
                  ) : (
                    <span>تأكيد وتفعيل الاشتراك</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 التوست الموحد */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-[#180a0f] border-rose-800 text-rose-300"
              : "bg-[#071916] border-teal-500/40 text-teal-300"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
