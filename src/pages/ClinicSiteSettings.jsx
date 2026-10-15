import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Globe,
  Save,
  Upload,
  Trash2,
  QrCode,
  Printer,
  ExternalLink,
  Image as ImageIcon,
  HelpCircle,
  Loader2,
  Check,
  AlertTriangle,
  Copy,
  RotateCcw,
  Sparkles,
  Search,
} from "lucide-react";

// ضغط الصورة في المتصفح قبل الرفع إلى Cloudinary لتسريع الرفع وتقليل الحجم
const compressImageInBrowser = (file, maxWidth = 1400, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("فشل ضغط الصورة"));
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                type: "image/webp",
              }),
            );
          },
          "image/webp",
          quality,
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const buildCleanFormData = (data) => {
  const { clinic = {}, site = {}, booking_settings = {} } = data || {};
  return {
    slug: clinic.slug || "",
    address: clinic.address || "",
    bio: clinic.bio || "",
    hero_title: site.hero_title || clinic.name || "",
    hero_subtitle: site.hero_subtitle || clinic.bio || "",
    logo_url: site.logo_url || "",
    logo_public_id: site.logo_public_id || "",
    cover_url: site.cover_url || "",
    cover_public_id: site.cover_public_id || "",
    whatsapp_number: site.whatsapp_number || clinic.phone_number || "",
    facebook_url: site.facebook_url || "",
    instagram_url: site.instagram_url || "",
    tiktok_url: site.tiktok_url || "",
    google_maps_url: site.google_maps_url || "",
    city: site.city || "",
    area: site.area || "",
    seo_title: site.seo_title || "",
    seo_description: site.seo_description || "",
    is_published: site.is_published !== false,
    booking_settings: {
      is_online_booking_enabled:
        booking_settings.is_online_booking_enabled !== false,
      min_advance_hours: booking_settings.min_advance_hours ?? 2,
      max_advance_days: booking_settings.max_advance_days ?? 30,
      booking_instructions: booking_settings.booking_instructions || "",
    },
  };
};

export default function ClinicSiteSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("identity"); // identity | gallery | faqs | qr_poster
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // بيانات الهوية والإعدادات
  const [formData, setFormData] = useState(() => buildCleanFormData(null));
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(buildCleanFormData(null)),
  );
  const [uploadingField, setUploadingField] = useState(null);

  // إضافة صورة للمعرض
  const [galleryCategory, setGalleryCategory] = useState("general");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [afterImageState, setAfterImageState] = useState({ url: "", key: "" });
  const [beforeImageState, setBeforeImageState] = useState({
    url: "",
    key: "",
  });

  // إضافة سؤال شائع
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  // إضافة تقييم مريض
  const [testiName, setTestiName] = useState("");
  const [testiRating, setTestiRating] = useState(5);
  const [testiComment, setTestiComment] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["clinic-site-settings"],
    queryFn: async () => {
      const res = await api.get("/public/site-settings/me");
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      const clean = buildCleanFormData(data);
      setFormData(clean);
      setSavedSnapshot(JSON.stringify(clean));
    }
  }, [data]);

  // فحص هل هناك تعديلات غير محفوظة في تبويب الهوية
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(formData) !== savedSnapshot;
  }, [formData, savedSnapshot]);

  // تنبيه المستخدم لو حاول يعمل Refresh وفيه تعديلات نصية لم تُحفظ
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // حفظ إعدادات الهوية والـ SEO
  const saveSettingsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put("/public/site-settings/me", payload);
      return { resData: res.data, submittedPayload: payload };
    },
    onSuccess: ({ resData, submittedPayload }) => {
      queryClient.invalidateQueries({ queryKey: ["clinic-site-settings"] });
      const updated = {
        ...submittedPayload,
        slug: resData.slug || submittedPayload.slug,
      };
      setFormData(updated);
      setSavedSnapshot(JSON.stringify(updated));
      showToast("تم حفظ التعديلات على موقع العيادة بنجاح", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل حفظ الإعدادات", "error");
    },
  });

  // دالة رفع الصورة بعد ضغطها في المتصفح (مع حفظ تلقائي للوجو والغلاف!)
  const handleUploadImage = async (file, targetType) => {
    if (!file) return;
    try {
      setUploadingField(targetType);
      const compressed = await compressImageInBrowser(file);
      const fd = new FormData();
      fd.append("image", compressed);

      const res = await api.post("/public/site-settings/upload-image", fd);
      const { url, key } = res.data;

      if (targetType === "logo") {
        const nextForm = {
          ...formData,
          logo_url: url,
          logo_public_id: key || "",
        };
        setFormData(nextForm);
        await saveSettingsMutation.mutateAsync(nextForm);
        showToast("تم رفع وحفظ شعار العيادة تلقائياً", "success");
      } else if (targetType === "cover") {
        const nextForm = {
          ...formData,
          cover_url: url,
          cover_public_id: key || "",
        };
        setFormData(nextForm);
        await saveSettingsMutation.mutateAsync(nextForm);
        showToast("تم رفع وحفظ صورة الغلاف تلقائياً", "success");
      } else if (targetType === "gallery_after") {
        setAfterImageState({ url, key: key || "" });
        showToast("تم تجهيز الصورة — اضغط (إضافة للمعرض) لحفظها", "success");
      } else if (targetType === "gallery_before") {
        setBeforeImageState({ url, key: key || "" });
        showToast(
          "تم تجهيز صورة (قبل) — ارفع صورة (بعد) ثم اضغط إضافة",
          "success",
        );
      }
    } catch (err) {
      showToast(err.response?.data?.error || "فشل رفع الصورة", "error");
    } finally {
      setUploadingField(null);
    }
  };

  // حذف اللوجو أو الغلاف وحفظ التعديل فوراً
  const handleClearSiteImage = async (field) => {
    const nextForm =
      field === "logo"
        ? { ...formData, logo_url: "", logo_public_id: "" }
        : { ...formData, cover_url: "", cover_public_id: "" };
    setFormData(nextForm);
    await saveSettingsMutation.mutateAsync(nextForm);
  };

  // إضافة صورة للمعرض
  const addGalleryMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/public/site-settings/gallery", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-site-settings"] });
      setAfterImageState({ url: "", key: "" });
      setBeforeImageState({ url: "", key: "" });
      setGalleryCaption("");
      showToast("تمت إضافة الصورة للمعرض وحفظها بنجاح", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل إضافة الصورة", "error");
    },
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/public/site-settings/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-site-settings"] });
      showToast("تم حذف الصورة من المعرض ومن السحابة", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل حذف الصورة", "error");
    },
  });

  const addFaqMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post("/public/site-settings/faqs", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-site-settings"] });
      setFaqQuestion("");
      setFaqAnswer("");
      showToast("تمت إضافة السؤال الشائع", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل إضافة السؤال", "error");
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/public/site-settings/faqs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-site-settings"] });
      showToast("تم حذف السؤال", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل حذف السؤال", "error");
    },
  });

  const addTestimonialMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post("/public/site-settings/testimonials", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-site-settings"] });
      setTestiName("");
      setTestiComment("");
      showToast("تمت إضافة التقييم", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل إضافة التقييم", "error");
    },
  });

  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/public/site-settings/testimonials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-site-settings"] });
      showToast("تم حذف التقييم", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل حذف التقييم", "error");
    },
  });

  if (isLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-sm">جاري تحميل إعدادات موقع العيادة...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center space-y-4" dir="rtl">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-white">فشل تحميل إعدادات موقع العيادة.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const publicBase =
    import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
  const publicUrl = formData.slug ? `${publicBase}/c/${formData.slug}` : "";
  const qrImageUrl = publicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(
        publicUrl,
      )}`
    : "";

  const galleryItems = data?.gallery || [];
  const faqItems = data?.faqs || [];
  const testimonialItems = data?.testimonials || [];

  return (
    <div className="space-y-6 text-slate-100 pb-24" dir="rtl">
      {toast && (
        <div
          className={`fixed top-6 left-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold transition-all ${
            toast.type === "error"
              ? "bg-rose-950/95 border-rose-500/40 text-rose-200"
              : "bg-teal-950/95 border-teal-500/40 text-teal-200"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-teal-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* الهيدر */}
      <div className="p-5 rounded-2xl bg-[#0d1527]/75 backdrop-blur-xl border border-teal-500/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Globe className="w-6 h-6 text-teal-400" />
              <span>موقع العيادة العام والتسويق الذكي</span>
            </h1>
            {hasUnsavedChanges && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold animate-pulse">
                تعديلات غير محفوظة
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تحكم في صفحة عيادتك العامة، معرض حالات (قبل وبعد)، وبوستر الـ QR
            Code للاستقبال.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "identity" && (
            <button
              type="button"
              disabled={saveSettingsMutation.isPending || !hasUnsavedChanges}
              onClick={() => saveSettingsMutation.mutate(formData)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition shadow-lg ${
                hasUnsavedChanges
                  ? "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20"
                  : "bg-white/5 text-slate-400 border border-white/10 opacity-60 cursor-not-allowed"
              }`}
            >
              {saveSettingsMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>
                {saveSettingsMutation.isPending
                  ? "جاري الحفظ..."
                  : hasUnsavedChanges
                    ? "حفظ التعديلات"
                    : "تم الحفظ ✓"}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              showToast("تم نسخ رابط موقع العيادة", "success");
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200"
          >
            <Copy className="w-3.5 h-3.5 text-teal-400" />
            <span>نسخ الرابط</span>
          </button>

          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-teal-500/30 text-teal-300 text-xs font-bold"
          >
            <span>معاينة الموقع الحي</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex border-b border-white/10 gap-6 overflow-x-auto whitespace-nowrap px-2">
        {[
          {
            id: "identity",
            label: "الهوية وإعدادات الحجز والـ SEO",
            icon: Globe,
          },
          {
            id: "gallery",
            label: `معرض الصور وقبل/بعد (${galleryItems.length}/12)`,
            icon: ImageIcon,
          },
          {
            id: "faqs",
            label: "الأسئلة الشائعة وآراء المرضى",
            icon: HelpCircle,
          },
          {
            id: "qr_poster",
            label: "بوستر QR Code الجاهز للطباعة 🖨️",
            icon: QrCode,
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-bold border-b-2 transition ${
                activeTab === t.id
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* محتوى التبويب الأول: الهوية وإعدادات الحجز والـ SEO */}
      {activeTab === "identity" && (
        <div className="bg-[#0d1527]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
          {/* رفع اللوجو والغلاف (يحفظ تلقائياً فور الرفع) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/10">
            <div className="p-4 rounded-2xl bg-[#070b14]/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-teal-300">
                  شعار العيادة (Logo)
                </label>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  حفظ تلقائي فور الاختيار ⚡
                </span>
              </div>
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Logo"
                    className="w-16 h-16 rounded-2xl object-cover border border-teal-500/30 bg-slate-900 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#070b14] border border-white/10 flex items-center justify-center text-slate-500 text-xs shrink-0">
                    بدون شعار
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 text-xs font-bold transition">
                    {uploadingField === "logo" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    ) : (
                      <Upload className="w-4 h-4 text-teal-400" />
                    )}
                    <span>
                      {uploadingField === "logo"
                        ? "جاري الرفع والحفظ..."
                        : formData.logo_url
                          ? "تغيير الشعار"
                          : "رفع شعار العيادة"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingField !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        handleUploadImage(f, "logo");
                      }}
                    />
                  </label>
                  {formData.logo_url && (
                    <button
                      type="button"
                      onClick={() => handleClearSiteImage("logo")}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs"
                      title="حذف الشعار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#070b14]/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-teal-300">
                  صورة الغلاف العريضة (Cover Image)
                </label>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  حفظ تلقائي فور الاختيار ⚡
                </span>
              </div>
              <div className="flex items-center gap-4">
                {formData.cover_url ? (
                  <img
                    src={formData.cover_url}
                    alt="Cover"
                    className="w-28 h-16 rounded-2xl object-cover border border-teal-500/30 bg-slate-900 shrink-0"
                  />
                ) : (
                  <div className="w-28 h-16 rounded-2xl bg-[#070b14] border border-white/10 flex items-center justify-center text-slate-500 text-xs shrink-0">
                    بدون غلاف
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 text-xs font-bold transition">
                    {uploadingField === "cover" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    ) : (
                      <Upload className="w-4 h-4 text-teal-400" />
                    )}
                    <span>
                      {uploadingField === "cover"
                        ? "جاري الرفع والحفظ..."
                        : formData.cover_url
                          ? "تغيير الغلاف"
                          : "رفع صورة غلاف"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingField !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        handleUploadImage(f, "cover");
                      }}
                    />
                  </label>
                  {formData.cover_url && (
                    <button
                      type="button"
                      onClick={() => handleClearSiteImage("cover")}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs"
                      title="حذف الغلاف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* الحقول النصية والروابط */}
          <div className="space-y-5">
            {/* 1. الرابط والعنوان التسويقي */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>الرابط المختصر للعيادة (Slug)</span>
                  <span className="text-[10px] text-teal-400 font-normal">
                    محمي بتحويل 301 التلقائي
                  </span>
                </label>
                <div className="flex items-center rounded-xl border border-white/10 bg-[#070b14] overflow-hidden focus-within:border-teal-500/50 transition">
                  <span
                    className="px-3 py-2 text-xs text-slate-400 bg-white/5 border-l border-white/10 font-mono select-none"
                    dir="ltr"
                  >
                    /c/
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-"),
                      })
                    }
                    placeholder="my-dental-clinic"
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-teal-300 font-mono focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  رابط موقعك:{" "}
                  <span dir="ltr" className="font-mono text-slate-300">
                    {formData.slug ? `${publicBase}/c/${formData.slug}` : "—"}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  العنوان الرئيسي الترحيبي (Hero Title)
                </label>
                <input
                  type="text"
                  value={formData.hero_title}
                  onChange={(e) =>
                    setFormData({ ...formData, hero_title: e.target.value })
                  }
                  placeholder="مثال: مجمع ابتسامتك لطب وجراحة الأسنان"
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  النبذة التسويقية للعيادة (Hero Subtitle / Bio)
                </label>
                <textarea
                  rows={2}
                  value={formData.hero_subtitle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hero_subtitle: e.target.value,
                      bio: e.target.value,
                    })
                  }
                  placeholder="اكتب نبذة ترحيبية ومختصرة تجذب المريض فور دخوله الموقع..."
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                />
              </div>
            </div>

            {/* 2. بيانات التواصل والموقع الجغرافي */}
            <div className="pt-4 border-t border-white/5">
              <label className="block text-xs font-semibold text-teal-300 mb-3">
                بيانات التواصل والموقع الجغرافي
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    رقم الواتساب للتواصل السريع
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.whatsapp_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        whatsapp_number: e.target.value,
                      })
                    }
                    placeholder="01012345678"
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    المحافظة / المدينة
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="القاهرة / الجيزة"
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    الحي / المنطقة
                  </label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                    placeholder="الدقي / المهندسين / مدينة نصر"
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    رابط خرائط جوجل (Google Maps)
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={formData.google_maps_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        google_maps_url: e.target.value,
                      })
                    }
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    العنوان التفصيلي للعيادة
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="مثال: الجيزة - الدقي - شارع التحرير - برج الأطباء الدور الرابع"
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>
              </div>
            </div>

            {/* 3. قنوات التواصل الاجتماعي */}
            <div className="pt-4 border-t border-white/5">
              <label className="block text-xs font-semibold text-teal-300 mb-2.5">
                روابط التواصل الاجتماعي
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">
                    فيسبوك (Facebook)
                  </span>
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://facebook.com/..."
                    value={formData.facebook_url}
                    onChange={(e) =>
                      setFormData({ ...formData, facebook_url: e.target.value })
                    }
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>

                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">
                    إنستجرام (Instagram)
                  </span>
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://instagram.com/..."
                    value={formData.instagram_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instagram_url: e.target.value,
                      })
                    }
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>

                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">
                    تيك توك (TikTok)
                  </span>
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://tiktok.com/@..."
                    value={formData.tiktok_url}
                    onChange={(e) =>
                      setFormData({ ...formData, tiktok_url: e.target.value })
                    }
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>
              </div>
            </div>

            {/* 4. إعدادات محركات البحث (SEO) */}
            <div className="pt-4 border-t border-white/5">
              <label className="block text-xs font-semibold text-teal-300 mb-2.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>إعدادات الظهور في بحث جوجل (SEO)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    عنوان الصفحة في جوجل (SEO Title)
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={formData.seo_title}
                    onChange={(e) =>
                      setFormData({ ...formData, seo_title: e.target.value })
                    }
                    placeholder={`${formData.hero_title || "عيادة الأسنان"} | احجز موعدك أونلاين`}
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    وصف العيادة في نتائج البحث (Meta Description)
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={formData.seo_description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seo_description: e.target.value,
                      })
                    }
                    placeholder="أفضل عيادة زراعة وتجميل أسنان... احجز موعدك الآن بسهولة."
                    className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* إعدادات الحجز الأونلاين المتقدمة */}
          <div className="pt-5 border-t border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-teal-300">
                <input
                  type="checkbox"
                  checked={formData.booking_settings.is_online_booking_enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      booking_settings: {
                        ...formData.booking_settings,
                        is_online_booking_enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span>تفعيل استقبال طلبات الحجز الأونلاين عبر الموقع</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_published: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span>نشر الموقع للجمهور</span>
              </label>
            </div>

            <div className="bg-[#070b14]/50 p-4 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  أقل مهلة للحجز (بالساعات)
                </label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={formData.booking_settings.min_advance_hours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      booking_settings: {
                        ...formData.booking_settings,
                        min_advance_hours: Math.min(
                          168,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      },
                    })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/50 transition"
                />
                <span className="block text-[10px] text-slate-400 mt-1">
                  مثال: 2 يعني حجز موعد بعد ساعتين على الأقل.
                </span>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  أقصى فترة للحجز (بالأيام)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.booking_settings.max_advance_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      booking_settings: {
                        ...formData.booking_settings,
                        max_advance_days: Math.min(
                          365,
                          Math.max(1, Number(e.target.value) || 1),
                        ),
                      },
                    })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500/50 transition"
                />
                <span className="block text-[10px] text-slate-400 mt-1">
                  مثال: 30 يعني أقصى جدول متاح هو 30 يوماً.
                </span>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs text-slate-300 mb-1">
                  تعليمات الحجز للمرضى (تظهر في أعلى نموذج الحجز)
                </label>
                <input
                  type="text"
                  placeholder="مثال: يرجى الحضور قبل الموعد بـ 10 دقائق، والدفع يتم نقداً أو بالفيزا أو إنستا باي في العيادة."
                  value={formData.booking_settings.booking_instructions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      booking_settings: {
                        ...formData.booking_settings,
                        booking_instructions: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 transition"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={saveSettingsMutation.isPending || !hasUnsavedChanges}
                onClick={() => saveSettingsMutation.mutate(formData)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                <span>
                  {saveSettingsMutation.isPending
                    ? "جاري الحفظ..."
                    : hasUnsavedChanges
                      ? "حفظ جميع الإعدادات"
                      : "جميع الإعدادات محفوظة ✓"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الشريط العائم السفلي للتعديلات غير المحفوظة */}
      {activeTab === "identity" && hasUnsavedChanges && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl px-5 py-3.5 rounded-2xl bg-[#0d1527]/95 backdrop-blur-2xl border border-teal-500/40 shadow-2xl shadow-black/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-amber-300">
            <Sparkles className="w-4 h-4 text-teal-400 shrink-0 animate-spin" />
            <span>لديك تعديلات غير محفوظة في بيانات الموقع</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFormData(JSON.parse(savedSnapshot))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراجع</span>
            </button>
            <button
              type="button"
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate(formData)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-teal-500/30"
            >
              {saveSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ التعديلات الآن</span>
            </button>
          </div>
        </div>
      )}

      {/* تبويب 2: معرض الصور وحالات قبل وبعد */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          <div className="bg-[#0d1527]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-300">
                إضافة صورة جديدة للمعرض (أقصى حد 12 صورة — المتبقي:{" "}
                {12 - galleryItems.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  نوع الصورة
                </label>
                <select
                  value={galleryCategory}
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="general">صورة عامة للعيادة</option>
                  <option value="before_after">
                    حالة تجميل/علاج (قبل وبعد ✨)
                  </option>
                  <option value="equipment">أجهزة وتعقيم</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-300 mb-1">
                  وصف قصير للصورة أو الحالة (Caption)
                </label>
                <input
                  type="text"
                  placeholder="مثال: ابتسامة هوليود تركيبة زيركون..."
                  value={galleryCaption}
                  onChange={(e) => setGalleryCaption(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* أزرار رفع ومعاينة الصور قبل الإضافة للمعرض */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {galleryCategory === "before_after" && (
                <div className="flex items-center gap-3">
                  {beforeImageState.url && (
                    <img
                      src={beforeImageState.url}
                      alt="Before preview"
                      className="w-14 h-14 rounded-xl object-cover border border-rose-500/40"
                    />
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-xs font-bold transition">
                    {uploadingField === "gallery_before" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>
                      {beforeImageState.url
                        ? "تغيير صورة (قبل العلاج) ✓"
                        : "1. ارفع صورة (قبل العلاج) *"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        handleUploadImage(f, "gallery_before");
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="flex items-center gap-3">
                {afterImageState.url && (
                  <img
                    src={afterImageState.url}
                    alt="After preview"
                    className="w-14 h-14 rounded-xl object-cover border border-teal-500/40"
                  />
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 text-xs font-bold transition">
                  {uploadingField === "gallery_after" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {afterImageState.url
                      ? "تغيير الصورة الأساسية ✓"
                      : galleryCategory === "before_after"
                        ? "2. ارفع صورة (بعد العلاج) *"
                        : "ارفع الصورة *"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      handleUploadImage(f, "gallery_after");
                    }}
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={
                  !afterImageState.url ||
                  (galleryCategory === "before_after" &&
                    !beforeImageState.url) ||
                  uploadingField !== null ||
                  addGalleryMutation.isPending ||
                  galleryItems.length >= 12
                }
                onClick={() =>
                  addGalleryMutation.mutate({
                    image_url: afterImageState.url,
                    image_public_id: afterImageState.key,
                    before_image_url:
                      galleryCategory === "before_after"
                        ? beforeImageState.url
                        : null,
                    before_image_public_id:
                      galleryCategory === "before_after"
                        ? beforeImageState.key
                        : null,
                    caption: galleryCaption,
                    category: galleryCategory,
                  })
                }
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 disabled:opacity-40"
              >
                {addGalleryMutation.isPending
                  ? "جاري الحفظ في المعرض..."
                  : "تأكيد وإضافة للمعرض ✓"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#0d1527]/75 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                {item.category === "before_after" && item.before_image_url ? (
                  <div className="h-44 bg-slate-950 grid grid-cols-2 gap-0.5 relative">
                    <div className="relative h-full">
                      <img
                        src={item.before_image_url}
                        alt="قبل"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-rose-950/90 text-rose-200 text-[10px] font-bold">
                        قبل
                      </span>
                    </div>
                    <div className="relative h-full">
                      <img
                        src={item.image_url}
                        alt="بعد"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-teal-500 text-slate-950 text-[10px] font-black">
                        بعد
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 bg-slate-950 relative">
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-200 truncate">
                    {item.caption || "بدون عنوان"}
                  </span>
                  <button
                    onClick={() => deleteGalleryMutation.mutate(item.id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="حذف الصورة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* تبويب 3: الأسئلة الشائعة وآراء المرضى */}
      {activeTab === "faqs" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* الأسئلة الشائعة */}
          <div className="bg-[#0d1527]/75 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-teal-300">
              الأسئلة الشائعة (FAQs)
            </h3>
            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="السؤال (مثال: هل يوجد تقسيط لتقويم الأسنان؟)"
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
              <textarea
                rows={2}
                placeholder="الإجابة..."
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
              <button
                type="button"
                disabled={
                  !faqQuestion.trim() ||
                  !faqAnswer.trim() ||
                  addFaqMutation.isPending
                }
                onClick={() =>
                  addFaqMutation.mutate({
                    question: faqQuestion,
                    answer: faqAnswer,
                  })
                }
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs disabled:opacity-40"
              >
                {addFaqMutation.isPending ? "جاري الإضافة..." : "+ إضافة سؤال"}
              </button>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10">
              {faqItems.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl bg-[#070b14]/70 border border-white/5 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{f.question}</p>
                    <p className="text-slate-400 mt-0.5">{f.answer}</p>
                  </div>
                  <button
                    onClick={() => deleteFaqMutation.mutate(f.id)}
                    className="text-rose-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* آراء المرضى */}
          <div className="bg-[#0d1527]/75 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-amber-300">
              آراء وتقييمات المرضى المختارة
            </h3>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="اسم المريض (مثال: أ. سارة محمود)"
                  value={testiName}
                  onChange={(e) => setTestiName(e.target.value)}
                  className="bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
                <select
                  value={testiRating}
                  onChange={(e) => setTestiRating(Number(e.target.value))}
                  className="bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-amber-300 font-bold"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5 نجوم)</option>
                  <option value={4}>⭐⭐⭐⭐ (4 نجوم)</option>
                </select>
              </div>
              <textarea
                rows={2}
                placeholder="تعليق المريض..."
                value={testiComment}
                onChange={(e) => setTestiComment(e.target.value)}
                className="w-full bg-[#070b14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
              <button
                type="button"
                disabled={
                  !testiName.trim() ||
                  !testiComment.trim() ||
                  addTestimonialMutation.isPending
                }
                onClick={() =>
                  addTestimonialMutation.mutate({
                    patient_display_name: testiName,
                    rating: testiRating,
                    comment: testiComment,
                  })
                }
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs disabled:opacity-40"
              >
                {addTestimonialMutation.isPending
                  ? "جاري الإضافة..."
                  : "+ إضافة تقييم"}
              </button>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/10">
              {testimonialItems.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-[#070b14]/70 border border-white/5 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-amber-300">
                      {t.patient_display_name} ({t.rating}★)
                    </p>
                    <p className="text-slate-300 mt-0.5">"{t.comment}"</p>
                  </div>
                  <button
                    onClick={() => deleteTestimonialMutation.mutate(t.id)}
                    className="text-rose-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* تبويب 4: بوستر الـ QR Code الجاهز للطباعة للاستقبال */}
      {activeTab === "qr_poster" && (
        <div className="space-y-6">
          <div className="bg-[#0d1527]/75 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-400" />
                <span>بوستر الحجز الذكي لمكتب الاستقبال (A4 Poster)</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                اطبع هذا البوستر وضعه في مكتب الاستقبال أو غرفة الانتظار. يمكن
                لأي مريض توجيه كاميرا الموبايل نحو رمز الـ QR لفتح موقع عيادتك
                وحجز موعده القادم في ثوانٍ!
              </p>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-xl shadow-teal-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة بوستر الاستقبال A4 الآن</span>
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-2xl">
              <img
                src={qrImageUrl}
                alt="Clinic QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>
          </div>

          {/* البوستر المخصص للطباعة (يظهر بحجم A4 كامل عند window.print) */}
          <div
            id="clinic-qr-poster"
            className="hidden print:flex fixed inset-0 bg-white text-black z-[99999] flex-col items-center justify-between p-12 text-center"
            dir="rtl"
          >
            <div className="space-y-2 border-b-2 border-teal-600 pb-6 w-full">
              <h1 className="text-4xl font-black text-slate-900">
                {formData.hero_title || data?.clinic?.name}
              </h1>
              <p className="text-lg text-slate-600">
                {formData.hero_subtitle || "عيادة طب وجراحة وتجميل الأسنان"}
              </p>
            </div>

            <div className="space-y-6 my-auto">
              <h2 className="text-2xl font-bold text-teal-700">
                امسح الكود بكاميرا هاتفك واحجز موعدك القادم أونلاين
              </h2>
              <div className="inline-block p-6 border-4 border-slate-900 rounded-3xl">
                <img src={qrImageUrl} alt="QR" className="w-72 h-72 mx-auto" />
              </div>
              <p className="text-sm font-mono text-slate-700" dir="ltr">
                {publicUrl}
              </p>
            </div>

            <div className="w-full pt-6 border-t border-slate-300 text-xs text-slate-500 flex justify-between">
              <span>{formData.address}</span>
              <span>Powered by CUROSTA Dental System</span>
            </div>
          </div>

          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body * {
                visibility: hidden !important;
              }
              #clinic-qr-poster,
              #clinic-qr-poster * {
                visibility: visible !important;
              }
              #clinic-qr-poster {
                display: flex !important;
                position: fixed !important;
                inset: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
