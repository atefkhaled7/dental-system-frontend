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

// تصنيفات الصور الطبية متوافقة مع الـ Tokens وبادجات الـ Pill بشفافية 10%
const CATEGORIES = {
  xray_periapical: {
    label: "أشعة سن (موضعية)",
    badge:
      "bg-[var(--primary-muted)] text-[var(--primary-base)] border border-[var(--primary-base)]/20",
  },
  xray_panoramic: {
    label: "أشعة بانوراما",
    badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
  photo_before: {
    label: "صورة قبل العلاج",
    badge:
      "bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-text)]/20",
  },
  photo_after: {
    label: "صورة بعد العلاج",
    badge:
      "bg-[var(--success-bg)] text-[var(--success-text)] border border-[var(--success-text)]/20",
  },
  other: {
    label: "مستند طبي / أخرى",
    badge:
      "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]",
  },
};

const FDI_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46,
  45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

// 🔒 مكوّن عرض الصورة الآمن
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
          currentBlobUrl = url;
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
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [imageId]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-muted)] ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin text-[var(--primary-base)]" />
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-muted)] text-xs ${className}`}
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

  // فورم الرفع
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-3 sm:p-4 rounded-[var(--radius-card)] border border-[var(--border-default)]">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-[var(--text-main)] flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[var(--primary-base)]" />
            الأشعة والملفات الطبية
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            أشعة الأسنان البانورامية والموضعية والصور السريرية قبل وبعد العلاج
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* زر تبديل الأرشيف */}
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium border transition-colors ${
              showArchived
                ? "bg-[var(--warning-bg)] border-[var(--warning-text)]/30 text-[var(--warning-text)] hover:bg-[var(--warning-bg)]/80"
                : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--border-default)]"
            }`}
          >
            {showArchived ? "الصور النشطة" : "الأرشيف"}
          </button>

          {/* زر رفع صورة جديدة */}
          {!showArchived && (
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white px-3.5 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>رفع أشعة / صورة</span>
            </button>
          )}
        </div>
      </div>

      {/* 🌟 2. شريط الفلاتر */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[var(--bg-surface)] p-2.5 rounded-[var(--radius-btn)] border border-[var(--border-default)] text-xs">
        {/* أزرار التصنيفات */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-2.5 py-1 rounded-[var(--radius-btn)] transition-colors border ${
              categoryFilter === ""
                ? "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/40 font-semibold"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-main)] hover:bg-[var(--border-default)]"
            }`}
          >
            كل الصور ({images.length})
          </button>
          {Object.entries(CATEGORIES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`px-2.5 py-1 rounded-[var(--radius-btn)] transition-colors border ${
                categoryFilter === key
                  ? "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/40 font-semibold"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-main)] hover:bg-[var(--border-default)]"
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
            className="bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] focus:text-[var(--text-main)] rounded-[var(--radius-btn)] px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors cursor-pointer"
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
        <div className="py-16 flex justify-center text-[var(--text-secondary)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
        </div>
      ) : images.length === 0 ? (
        <div className="py-14 text-center text-xs bg-[var(--bg-surface)] rounded-[var(--radius-card)] border border-[var(--border-default)] p-6 space-y-2">
          <ImageIcon className="w-9 h-9 text-[var(--text-muted)] mx-auto mb-1" />
          <p className="text-[var(--text-main)] font-semibold">
            لا توجد صور طبية مسجلة مطابقة للفلاتر.
          </p>
          <p className="text-[var(--text-muted)]">
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
                className="group bg-[var(--bg-surface)] rounded-[var(--radius-card)] border border-[var(--border-default)] overflow-hidden flex flex-col hover:border-[var(--border-focus)]/50 transition-colors"
              >
                {/* الحاوية المعاينة للصورة */}
                <div
                  onClick={() => setLightboxImage(img)}
                  className="relative aspect-video w-full bg-[var(--bg-app)] cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  <AuthenticatedImage
                    imageId={img.id}
                    alt={img.description || img.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* زر المعاينة عند التحويم */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-2 bg-[var(--bg-elevated)]/90 rounded-[var(--radius-btn)] text-[var(--text-main)] border border-[var(--border-default)] backdrop-blur-sm">
                      <Eye className="w-4 h-4" />
                    </span>
                  </div>

                  {/* شارة رقم السن */}
                  {img.tooth_number && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-[var(--radius-btn)] bg-[var(--primary-muted)]/90 text-[var(--primary-base)] border border-[var(--primary-base)]/30 font-mono text-[11px] font-semibold backdrop-blur-sm">
                      #{img.tooth_number}
                    </span>
                  )}
                </div>

                {/* تفاصيل الصورة */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-[10px] font-medium border ${catCfg.badge}`}
                      >
                        {catCfg.label}
                      </span>
                      <span
                        className="text-[10px] text-[var(--text-muted)] font-mono"
                        dir="ltr"
                      >
                        {new Date(img.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>

                    {img.description ? (
                      <p className="text-[var(--text-main)] font-medium text-xs line-clamp-2">
                        {img.description}
                      </p>
                    ) : (
                      <p className="text-[var(--text-secondary)] text-xs truncate">
                        {img.file_name}
                      </p>
                    )}
                  </div>

                  {/* الفوتر: اسم الدكتور وزر الأرشفة */}
                  <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="truncate">
                      د. {img.doctor_name || "العيادة"}
                    </span>
                    {!showArchived &&
                      ["ClinicAdmin", "Doctor"].includes(user?.role) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiveConfirmImage(img);
                          }}
                          className="text-[var(--danger-text)]/80 hover:text-[var(--danger-text)] p-1 rounded-[var(--radius-btn)] hover:bg-[var(--danger-bg)] transition-colors"
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[80]">
          <div className="max-w-4xl w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden shadow-elevation flex flex-col max-h-[95vh]">
            <div className="p-3.5 bg-[var(--bg-elevated)] border-b border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-main)]">
                  {lightboxImage.description || lightboxImage.file_name}
                </span>
                {lightboxImage.tooth_number && (
                  <span className="px-2 py-0.5 rounded-[var(--radius-btn)] bg-[var(--primary-muted)] text-[var(--primary-base)] border border-[var(--primary-base)]/20 font-mono text-xs font-semibold">
                    سن #{lightboxImage.tooth_number}
                  </span>
                )}
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-[var(--bg-app)] p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <AuthenticatedImage
                imageId={lightboxImage.id}
                alt={lightboxImage.file_name}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-[var(--radius-btn)]"
              />
            </div>

            <div className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-default)] flex flex-wrap items-center justify-between text-xs text-[var(--text-muted)] gap-2">
              <div className="flex items-center gap-3">
                <span>
                  النوع:{" "}
                  <strong className="text-[var(--text-main)]">
                    {CATEGORIES[lightboxImage.category]?.label}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  الحجم:{" "}
                  <strong className="text-[var(--text-main)] font-mono">
                    {(lightboxImage.file_size / 1024).toFixed(1)} KB
                  </strong>
                </span>
                <span>•</span>
                <span>
                  التاريخ:{" "}
                  <strong className="text-[var(--text-main)] font-mono">
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[75]">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-md w-full rounded-[var(--radius-card)] p-5 shadow-elevation space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
              <h4 className="text-sm font-semibold text-[var(--text-main)] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[var(--primary-base)]" />
                رفع صورة أو أشعة جديدة
              </h4>
              <button
                onClick={handleCloseUploadModal}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-[var(--radius-btn)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  ملف الصورة / الأشعة * (JPG, PNG, WEBP - بحد أقصى 10MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs text-[var(--text-secondary)] file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-[var(--radius-btn)] file:border-0 file:text-xs file:font-medium file:bg-[var(--primary-base)] file:text-white hover:file:bg-[var(--primary-hover)] cursor-pointer bg-[var(--bg-app)] p-2 rounded-[var(--radius-btn)] border border-[var(--border-default)]"
                />

                {uploadData.previewUrl && (
                  <div className="mt-2.5 relative aspect-video w-full rounded-[var(--radius-btn)] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-app)]">
                    <img
                      src={uploadData.previewUrl}
                      alt="معاينة"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    تصنيف الصورة *
                  </label>
                  <select
                    value={uploadData.category}
                    onChange={(e) =>
                      setUploadData({ ...uploadData, category: e.target.value })
                    }
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    {Object.entries(CATEGORIES).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--border-focus)] font-mono transition-colors"
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

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-default)] rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={handleCloseUploadModal}
                  className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploadImageMutation.isPending}
                  className="flex-1 py-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[85]">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] max-w-sm w-full rounded-[var(--radius-card)] p-5 shadow-elevation space-y-3">
            <div className="flex items-center gap-2 text-[var(--danger-text)]">
              <div className="p-2 bg-[var(--danger-bg)] rounded-[var(--radius-btn)] border border-[var(--danger-text)]/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-main)]">
                تأكيد أرشفة الصورة الطبية
              </h4>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              هل أنت متأكد من أرشفة هذا السجل الطبي؟ سيتم إخفاء الصورة من العرض
              الطبي مع الحفاظ على السجل القانوني في الخادم.
            </p>
            <div className="flex gap-2.5 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setArchiveConfirmImage(null)}
                className="flex-1 py-2 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-[var(--radius-btn)] text-xs font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={archiveImageMutation.isPending}
                onClick={() =>
                  archiveImageMutation.mutate(archiveConfirmImage.id)
                }
                className="flex-1 py-2 bg-[var(--danger-text)] hover:opacity-90 text-white rounded-[var(--radius-btn)] text-xs font-medium transition-colors disabled:opacity-50"
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
