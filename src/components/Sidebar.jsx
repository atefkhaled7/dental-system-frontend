import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  FlaskConical,
  LogOut,
  X,
  UserCog,
  Building2,
  ClipboardList,
  Settings,
  MapPin,
  Phone,
  Globe,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  Building,
} from "lucide-react";

export default function Sidebar({ isMobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCopiedModal, setIsCopiedModal] = useState(false);
  const [isCopiedQuick, setIsCopiedQuick] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone_number: "",
    address: "",
    bio: "",
    slug: "",
  });

  // 🌟 1. جلب بيانات العيادة للجميع (أدمن، دكتور، ريسبشن) وتخزينها في الكاش
  const { data: clinicData, isLoading: isLoadingClinic } = useQuery({
    queryKey: ["clinic-profile", user?.clinic_id],
    queryFn: async () => {
      const res = await api.get("/clinics");
      return res.data?.clinics?.[0] || null;
    },
    enabled: !!user?.clinic_id,
    staleTime: 1000 * 60 * 15, // كاش 15 دقيقة
  });

  // تعبئة البيانات في فورم الإعدادات لو انفتحت
  useEffect(() => {
    if (clinicData) {
      setForm({
        name: clinicData.name || "",
        phone_number: clinicData.phone_number || "",
        address: clinicData.address || "",
        bio: clinicData.bio || "",
        slug: clinicData.slug || "",
      });
      setFormError("");
      setFormSuccess("");
    }
  }, [clinicData]);

  // نسخ الرابط السريع للريسبشن
  const handleCopyQuickLink = (slug) => {
    if (!slug) return;
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    setIsCopiedQuick(true);
    setTimeout(() => setIsCopiedQuick(false), 2000);
  };

  // نسخ الرابط من داخل المودال
  const handleCopyModalLink = () => {
    if (!form.slug) return;
    const url = `${window.location.origin}/c/${form.slug}`;
    navigator.clipboard.writeText(url);
    setIsCopiedModal(true);
    setTimeout(() => setIsCopiedModal(false), 2000);
  };

  // ميوتيشن حفظ التعديلات
  const updateClinicMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put(`/clinics/${user?.clinic_id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-profile"] });
      setFormSuccess("تم حفظ الإعدادات وتحديث بيانات العيادة بنجاح");
      setTimeout(() => {
        setIsSettingsOpen(false);
        setFormSuccess("");
      }, 1200);
    },
    onError: (err) => {
      setFormError(
        err.response?.data?.error || "فشل حفظ التعديلات، يرجى المحاولة لاحقاً",
      );
    },
  });

  const handleSubmitSettings = (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!form.name.trim()) {
      setFormError("اسم العيادة مطلوب");
      return;
    }
    updateClinicMutation.mutate({
      name: form.name.trim(),
      phone_number: form.phone_number?.trim() || null,
      address: form.address?.trim() || null,
      bio: form.bio?.trim() || null,
      slug: form.slug?.trim() || null,
    });
  };

  const navItems = [
    { name: "الرئيسية", path: "/", icon: LayoutDashboard },
    { name: "المرضى", path: "/patients", icon: Users },
    { name: "المواعيد", path: "/appointments", icon: Calendar },
    { name: "الفواتير والمالية", path: "/invoices", icon: CreditCard },
    { name: "طلبات المعامل", path: "/lab-orders", icon: FlaskConical },
    ...(user?.role === "ClinicAdmin"
      ? [
          { name: "سجل الرقابة", path: "/audit-logs", icon: ClipboardList },
          { name: "طاقم العمل", path: "/staff", icon: UserCog },
        ]
      : []),
    ...(user?.role === "SuperAdmin"
      ? [{ name: "إدارة العيادات", path: "/clinics", icon: Building2 }]
      : []),
  ];

  const isRouteActive = (itemPath) => {
    if (itemPath === "/") return location.pathname === "/";
    return (
      location.pathname === itemPath ||
      location.pathname.startsWith(`${itemPath}/`)
    );
  };

  const getRoleArabicName = (role) => {
    switch (role) {
      case "ClinicAdmin":
        return "مدير العيادة";
      case "Doctor":
        return "طبيب معالج";
      case "Receptionist":
        return "موظف استقبال";
      case "SuperAdmin":
        return "مدير المنصة";
      default:
        return role || "عضو العيادة";
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 bottom-0 right-0 z-50 w-72 lg:w-64 bg-[var(--bg-surface)] border-l border-[var(--border-default)] flex flex-col h-screen transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* لوجو CUROSTA + اسم العيادة الحقيقي */}
        <div className="p-5 flex items-center justify-between border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)] border border-[var(--primary-base)]/20 shadow-sm shrink-0">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2C7.5 2 4 4.5 4 8.5c0 3 1.5 6 3 9.5 1 2.3 2 4 3 4s1.5-3 2-4c.5 1 1 4 2 4s2-1.7 3-4c1.5-3.5 3-6.5 3-9.5C20 4.5 16.5 2 12 2z" />
                <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[var(--text-main)] leading-none tracking-wider">
                CUROSTA
              </h1>
              {/* 🌟 اسم العيادة الحقيقي يظهر هنا */}
              <span
                className="text-[11px] text-[var(--text-muted)] mt-1 block font-medium truncate max-w-[140px]"
                title={clinicData?.name || "إدارة العيادة"}
              >
                {clinicData?.name || "إدارة العيادة"}
              </span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* روابط التنقل */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-btn)] text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--primary-muted)] text-[var(--primary-base)] font-semibold border border-[var(--primary-base)]/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    active
                      ? "text-[var(--primary-base)]"
                      : "text-[var(--text-muted)]"
                  }`}
                />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {/* زر إعدادات العيادة للأدمن فقط */}
          {user?.role === "ClinicAdmin" && (
            <button
              onClick={() => {
                setIsSettingsOpen(true);
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-btn)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-elevated)] transition-colors border border-transparent"
            >
              <Settings className="w-4 h-4 text-[var(--text-muted)]" />
              <span>إعدادات العيادة</span>
            </button>
          )}
        </nav>

        {/* الجزء السفلي: كارت رابط الحجز أونلاين + المستخدم + الخروج */}
        <div className="p-4 border-t border-[var(--border-default)] space-y-3">
          {/* 🌟 كارت رابط الحجز أونلاين السريع (يظهر للريسبشن والدكاترة والأدمن) */}
          {clinicData?.slug && (
            <div className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-[var(--primary-base)] shrink-0" />
                <span className="text-xs font-medium text-[var(--text-main)] truncate">
                  صفحة الحجز أونلاين
                </span>
              </div>
{/* الأيقونات حرة بدون إطار (Border-free) */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyQuickLink(clinicData.slug)}
                  title={isCopiedQuick ? "تم النسخ!" : "نسخ رابط الحجز للمريض"}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary-base)] hover:bg-[var(--bg-surface)]/60 rounded-md transition-colors"
                >
                  {isCopiedQuick ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={`/c/${clinicData.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="فتح صفحة الحجز في تبويب جديد"
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary-base)] hover:bg-[var(--bg-surface)]/60 rounded-md transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* كارت المستخدم الحالي */}
          {/* 🌟 كارت المستخدم المدمج مع زرار الخروج في مربع واحد */}
          <div className="p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-main)] truncate">
                {user?.name || "مستخدم"}
              </p>
              <p className="text-[11px] font-medium text-[var(--primary-base)] mt-0.5 truncate">
                {getRoleArabicName(user?.role)}
              </p>
            </div>

            {/* زرار الخروج الصغير الملموم */}
            <button
              type="button"
              onClick={logout}
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
              className="p-2 text-[var(--danger-text)] hover:text-white bg-[var(--danger-bg)] hover:bg-rose-600 rounded-[var(--radius-btn)] transition-all border border-[var(--danger-text)]/20 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* مودال إعدادات العيادة للأدمن */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] w-full max-w-xl rounded-xl shadow-2xl p-6 relative my-8 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-lg">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-main)]">
                    إعدادات العيادة
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    إدارة بيانات التواصل، العنوان، ورابط الحجز المباشر للمرضى
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingClinic ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
                <p className="text-sm text-[var(--text-muted)]">
                  جارِ تحميل بيانات العيادة...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSettings} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger-text)]/20 text-[var(--danger-text)] text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      اسم العيادة <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute right-3 top-3 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        required
                        className="w-full pr-9 pl-3 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg focus:border-[var(--primary-base)] outline-none text-[var(--text-main)]"
                        placeholder="مثال: عيادة الأمل للأسنان"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      رقم الهاتف للتواصل
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute right-3 top-3 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        dir="ltr"
                        value={form.phone_number}
                        onChange={(e) =>
                          setForm({ ...form, phone_number: e.target.value })
                        }
                        className="w-full pr-3 pl-9 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg focus:border-[var(--primary-base)] outline-none text-[var(--text-main)] text-left"
                        placeholder="01012345678"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    عنوان العيادة التفصيلي (يظهر للمرضى في صفحة الحجز)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute right-3 top-3 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      className="w-full pr-9 pl-3 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg focus:border-[var(--primary-base)] outline-none text-[var(--text-main)]"
                      placeholder="مثال: الجيزة - الدقي - شارع التحرير - برج الأطباء الدور الرابع"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    نبذة عن العيادة وتخصصاتها
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute right-3 top-3 text-[var(--text-muted)]" />
                    <textarea
                      rows={2}
                      value={form.bio}
                      onChange={(e) =>
                        setForm({ ...form, bio: e.target.value })
                      }
                      className="w-full pr-9 pl-3 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg focus:border-[var(--primary-base)] outline-none text-[var(--text-main)] resize-none"
                      placeholder="مثال: متخصصون في زراعة وتجميل الأسنان بأحدث الأجهزة وتقنيات الليزر الحديثة"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--primary-base)] flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      <span>رابط الحجز أونلاين (Slug)</span>
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      إنجليزي وأرقام وشرطة فقط
                    </span>
                  </div>
                  <div className="flex items-center gap-2" dir="ltr">
                    <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] px-2.5 py-2 border border-[var(--border-default)] rounded-lg select-none whitespace-nowrap">
                      curosta.com/c/
                    </span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-")
                            .replace(/-+/g, "-"),
                        })
                      }
                      className="flex-1 px-3 py-2 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg focus:border-[var(--primary-base)] outline-none text-[var(--text-main)]"
                      placeholder="al-amal-clinic"
                    />
                  </div>
                  {form.slug && (
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)] text-xs">
                      <span
                        className="text-[var(--text-muted)] truncate max-w-[260px]"
                        dir="ltr"
                      >
                        {window.location.origin}/c/{form.slug}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyModalLink}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-surface)] hover:bg-[var(--border-default)] text-[var(--text-main)] rounded border border-[var(--border-default)] transition-colors"
                        >
                          {isCopiedModal ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isCopiedModal ? "تم النسخ" : "نسخ الرابط"}
                          </span>
                        </button>
                        <a
                          href={`/c/${form.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-[var(--primary-muted)] text-[var(--primary-base)] hover:opacity-80 rounded transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={updateClinicMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[var(--primary-base)] text-white hover:opacity-95 rounded-lg transition-all shadow-sm shadow-[var(--primary-base)]/20 disabled:opacity-50"
                  >
                    {updateClinicMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جارِ الحفظ...</span>
                      </>
                    ) : (
                      <span>حفظ الإعدادات</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
