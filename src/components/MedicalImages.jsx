import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
  Trash2,
  Eye,
  AlertTriangle,
  
} from "lucide-react";

// تصنيفات الصور الطبية
const CATEGORIES = {
  xray_periapical: {
    label: "أشعة سن (موضعية)",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  xray_panoramic: {
    label: "أشعة بانوراما",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  photo_before: {
    label: "صورة قبل العلاج",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  photo_after: {
    label: "صورة بعد العلاج",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  other: {
    label: "مستند طبي / أخرى",
    badge: "bg-slate-800 text-slate-300 border-slate-700",
  },
};

const FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
  45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

// 🔒 مكوّن عرض الصورة مع تنظيف الـ Memory Leak فورياً
function AuthenticatedImage({ imageId, alt, className }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentBlobUrl = null;
    let isMounted = true;

    api
      .get(`/patient-images/${imageId}/file`, { responseType: "blob" })
      .then((res) => {
        if (isMounted) {
          const url = URL.createObjectURL(res.data);
          currentBlobUrl = url; // 👈 حفظ الرابط في الـ Effect Scope
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load secure image:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      // تنظيف الـ Blob URL فورياً عند إزالة المكوّن أو تغيير الصورة
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [imageId]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-950 text-slate-600 ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-950 text-slate-600 text-xs ${className}`}
      >
        فشل تحميل الصورة
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}

export default function MedicalImages({
  patientId,
  showToast,
  initialToothFilter = null,
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // الفلاتر
  const [categoryFilter, setCategoryFilter] = useState("");
  const [toothFilter, setToothFilter] = useState(initialToothFilter || "");
  const [showArchived, setShowArchived] = useState(false);

  // المودالات
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [archiveConfirmImage, setArchiveConfirmImage] = useState(null);

  // حالة فورم الرفع
  const [uploadData, setUploadData] = useState({
    file: null,
    previewUrl: null,
    tooth_number: initialToothFilter || "",
    category: "xray_periapical",
    description: "",
  });



  // 1. جلب صور المريض
  const { data: images = [], isLoading } = useQuery({
    queryKey: [
      "patient-images",
      patientId,
      categoryFilter,
      toothFilter,
      showArchived,
    ],
    queryFn: async () => {
      const res = await api.get(`/patient-images/patients/${patientId}`, {
        params: {
          category: categoryFilter || undefined,
          tooth_number: toothFilter || undefined,
          archived: showArchived,
        },
      });
      return res.data.images || [];
    },
    enabled: !!patientId,
  });

  // 2. Mutation رفع الصورة
  const uploadImageMutation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post(
        `/patient-images/patients/${patientId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-images", patientId],
      });
      handleCloseUploadModal();
      setUploadData({
        file: null,
        previewUrl: null,
        tooth_number: "",
        category: "xray_periapical",
        description: "",
      });
      if (showToast) showToast("تم رفع وتوثيق الصورة الطبية بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل رفع الصورة", "error");
    },
  });

  // 3. Mutation أرشفة الصورة
  const archiveImageMutation = useMutation({
    mutationFn: async (imageId) => {
      const res = await api.patch(`/patient-images/${imageId}/archive`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-images", patientId],
      });
      setArchiveConfirmImage(null);
      if (showToast)
        showToast(
          "تمت أرشفة الصورة الطبية بنجاح مع الحفاظ على السجل",
          "success"
        );
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل أرشفة الصورة", "error");
    },
  });

  const handleCloseUploadModal = () => {
    // تنظيف رابط المعاينة فورياً لتفريغ الذاكرة
    if (uploadData.previewUrl) {
      URL.revokeObjectURL(uploadData.previewUrl);
    }
    setUploadData({
      file: null,
      previewUrl: null,
      tooth_number: "",
      category: "xray_periapical",
      description: "",
    });
    setIsUploadModalOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        if (showToast)
          showToast("حجم الصورة يتجاوز الحد المسموح (10 ميجابايت)", "error");
        return;
      }

      // تنظيف المعاينة القديمة لو المستخدم اختار صورة تانية
      if (uploadData.previewUrl) {
        URL.revokeObjectURL(uploadData.previewUrl);
      }

      setUploadData((prev) => ({
        ...prev,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadData.file) {
      if (showToast) showToast("يرجى اختيار ملف الصورة أولاً", "error");
      return;
    }

    const formData = new FormData();
    formData.append("image", uploadData.file);
    formData.append("category", uploadData.category);
    if (uploadData.tooth_number)
      formData.append("tooth_number", uploadData.tooth_number);
    if (uploadData.description)
      formData.append("description", uploadData.description);

    uploadImageMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      {/* 🌟 1. شريط التحكم والأزرار العلوية */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            الأشعة والملفات الطبية
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            أشعة الأسنان البانورامية والموضعية والصور السريرية قبل وبعد العلاج
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* زر تبديل الأرشيف */}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showArchived
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {showArchived ? "الصور النشطة" : "الأرشيف"}
          </button>

          {/* زر رفع صورة جديدة */}
          {!showArchived && (
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>رفع أشعة / صورة</span>
            </button>
          )}
        </div>
      </div>

      {/* 🌟 2. شريط الفلاتر (التصنيفات والأسنان) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 text-xs">
        {/* أزرار سريعة للتصنيفات */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-2.5 py-1 rounded-lg transition-colors border ${
              categoryFilter === ""
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            كل الصور ({images.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`px-2.5 py-1 rounded-lg transition-colors border ${
                categoryFilter === key
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* فلترة برقم السن */}
        <div className="flex items-center gap-2">
          <select
            value={toothFilter}
            onChange={(e) => setToothFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="">كل الأسنان</option>
            {FDI_TEETH.map((num) => (
              <option key={num} value={num}>
                سن #{num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🌟 3. معرض الصور (Gallery Grid) */}
      {isLoading ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : images.length === 0 ? (
        <div className="py-14 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
          <ImageIcon className="w-9 h-9 text-slate-600 mx-auto mb-1" />
          <p className="text-slate-300 font-medium">
            لا توجد صور طبية مسجلة مطابقة للفلاتر.
          </p>
          <p className="text-slate-500">
            اضغط على "رفع أشعة / صورة" لإضافة أول صورة طبية للمريض.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
          {images.map((img) => {
            const catCfg = CATEGORIES[img.category] || CATEGORIES.other;

            return (
              <div
                key={img.id}
                className="group bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg flex flex-col hover:border-slate-700 transition-all"
              >
                {/* الحاوية المعاينة للصورة مع زرار التكبير */}
                <div
                  onClick={() => setLightboxImage(img)}
                  className="relative aspect-video w-full bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  <AuthenticatedImage
                    imageId={img.id}
                    alt={img.description || img.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* طبقة التكبير عند التحويم */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-2 bg-slate-900/80 rounded-xl text-white backdrop-blur-sm">
                      <Eye className="w-4 h-4" />
                    </span>
                  </div>

                  {/* شارة رقم السن لو مرتبطة بسن معين */}
                  {img.tooth_number && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-blue-600/90 text-white font-mono text-[11px] font-bold shadow-md">
                      #{img.tooth_number}
                    </span>
                  )}
                </div>

                {/* تفاصيل الصورة */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${catCfg.badge}`}
                      >
                        {catCfg.label}
                      </span>
                      <span
                        className="text-[10px] text-slate-500 font-mono"
                        dir="ltr"
                      >
                        {new Date(img.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>

                    {img.description ? (
                      <p className="text-white font-medium text-xs line-clamp-2">
                        {img.description}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs truncate">
                        {img.file_name}
                      </p>
                    )}
                  </div>

                  {/* الفوتر: اسم الدكتور وزر الأرشفة */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">
                      د. {img.doctor_name || "العيادة"}
                    </span>

                    {/* زر الأرشفة (للأطباء ومديري العيادة فقط وللصور غير المؤرشفة) */}
                    {!showArchived &&
                      ["ClinicAdmin", "Doctor"].includes(user?.role) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiveConfirmImage(img);
                          }}
                          className="text-red-400/80 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="أرشفة السجل الطبي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 4. مستعرض الصور المكبر (Lightbox Modal) */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[80]">
          <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
            {/* هيدر المستعرض */}
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {lightboxImage.description || lightboxImage.file_name}
                </span>
                {lightboxImage.tooth_number && (
                  <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono text-xs">
                    سن #{lightboxImage.tooth_number}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* الصورة المكبرة */}
            <div className="flex-1 bg-black/60 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <AuthenticatedImage
                imageId={lightboxImage.id}
                alt={lightboxImage.file_name}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* فوتر المستعرض مع البيانات الكاملة */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-3">
                <span>
                  النوع:{" "}
                  <strong className="text-white">
                    {CATEGORIES[lightboxImage.category]?.label}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  الحجم:{" "}
                  <strong className="text-white font-mono">
                    {(lightboxImage.file_size / 1024).toFixed(1)} KB
                  </strong>
                </span>
                <span>•</span>
                <span>
                  التاريخ:{" "}
                  <strong className="text-white font-mono">
                    {new Date(lightboxImage.created_at).toLocaleString("ar-EG")}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 5. نافذة رفع صورة طبية جديدة (Upload Modal) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[75]">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                رفع صورة أو أشعة جديدة
              </h4>
              <button
                onClick={handleCloseUploadModal}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              {/* منطقة اختيار ومعاينة الملف */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ملف الصورة / الأشعة * (JPG, PNG, WEBP - بحد أقصى 10MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-950 p-2 rounded-xl border border-slate-800"
                />

                {/* معاينة الصورة المرفوعة */}
                {uploadData.previewUrl && (
                  <div className="mt-2 relative aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img
                      src={uploadData.previewUrl}
                      alt="معاينة"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* التصنيف */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    تصنيف الصورة *
                  </label>
                  <select
                    value={uploadData.category}
                    onChange={(e) =>
                      setUploadData({ ...uploadData, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(CATEGORIES).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ربط بسن معين (اختياري) */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    السن المرتبط (اختياري)
                  </label>
                  <select
                    value={uploadData.tooth_number}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        tooth_number: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="">-- بدون سن (أشعة عامة) --</option>
                    {FDI_TEETH.map((num) => (
                      <option key={num} value={num}>
                        سن #{num}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* الوصف */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  وصف الصورة أو ملاحظات الطبيب
                </label>
                <textarea
                  rows="2"
                  placeholder="مثال: أشعة طرفية للتأكد من حشو العصب، تسوس ممتد..."
                  value={uploadData.description}
                  onChange={(e) =>
                    setUploadData({
                      ...uploadData,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseUploadModal}
                  className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploadImageMutation.isPending}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {uploadImageMutation.isPending
                    ? "جاري الرفع..."
                    : "تأكيد ورفع الملف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 6. نافذة تأكيد أرشفة السجل الطبي */}
      {archiveConfirmImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[85]">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-white">
                تأكيد أرشفة الصورة الطبية
              </h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من أرشفة هذا السجل الطبي؟ سيتم إخفاء الصورة من العرض
              الطبي مع الحفاظ على السجل القانوني في الخادم.
            </p>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setArchiveConfirmImage(null)}
                className="flex-1 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={archiveImageMutation.isPending}
                onClick={() =>
                  archiveImageMutation.mutate(archiveConfirmImage.id)
                }
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {archiveImageMutation.isPending
                  ? "جاري الأرشفة..."
                  : "تأكيد الأرشفة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
