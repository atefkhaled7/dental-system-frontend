import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { Clock, History, User, Loader2, Save, Camera } from "lucide-react";
// تعريف الحالات والألوان
const CONDITIONS = {
  sound: {
    label: "سليم",
    color: "#94a3b8",
    fill: "#1e293b",
    badge: "bg-slate-800 text-slate-300 border-slate-700",
  },
  caries: {
    label: "تسوس",
    color: "#ef4444",
    fill: "#450a0a",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  filled: {
    label: "محشو",
    color: "#38bdf8",
    fill: "#0c4a6e",
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  rct: {
    label: "علاج عصب",
    color: "#f59e0b",
    fill: "#78350f",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  crown: {
    label: "تركيبة / تاج",
    color: "#c084fc",
    fill: "#581c87",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  },
  implant: {
    label: "زراعة",
    color: "#10b981",
    fill: "#064e3b",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  missing: {
    label: "مخلوع",
    color: "#475569",
    fill: "#0f172a",
    badge: "bg-slate-900 text-slate-500 border-slate-800",
  },
};

const getToothCategory = (num) => {
  const lastDigit = num % 10;
  if (lastDigit === 1 || lastDigit === 2) return "incisor";
  if (lastDigit === 3) return "canine";
  if (lastDigit === 4 || lastDigit === 5) return "premolar";
  return "molar";
};

const getToothArabicName = (num) => {
  const q = Math.floor(num / 10);
  const d = num % 10;
  const names = {
    1: "القاطع المركزي",
    2: "القاطع الجانبي",
    3: "الناب",
    4: "الضاحك الأول",
    5: "الضاحك الثاني",
    6: "الضرس الأول",
    7: "الضرس الثاني",
    8: "ضرس العقل",
  };
  const quadNames = {
    1: "علوي أيمن",
    2: "علوي أيسر",
    3: "سفلي أيسر",
    4: "سفلي أيمن",
  };
  return `${names[d] || "سن"} (${quadNames[q] || ""})`;
};

// رسم السن التشريحي كـ SVG دقيق
function AnatomicalToothSVG({
  toothNumber,
  condition = "sound",
  isUpper = true,
}) {
  const type = getToothCategory(toothNumber);
  const cfg = CONDITIONS[condition] || CONDITIONS.sound;
  const isMissing = condition === "missing";
  const isCaries = condition === "caries";
  const isFilled = condition === "filled";
  const isRCT = condition === "rct";
  const isCrown = condition === "crown";
  const isImplant = condition === "implant";

  const strokeColor = isMissing ? "#475569" : cfg.color;
  const crownFill = isCrown ? "#7e22ce" : isMissing ? "#090d16" : "#1e293b";

  return (
    <svg
      viewBox="0 0 36 68"
      className={`w-full h-full transition-all duration-200 ${
        isMissing ? "opacity-35" : ""
      }`}
      style={{
        transform: isUpper ? "none" : "rotate(180deg)",
      }}
    >
      {/* 1. الجذور الأطول */}
      {isImplant ? (
        <g stroke="#10b981" strokeWidth="1.5" fill="none">
          <path d="M14 6 L22 6 M13 13 L23 13 M14 20 L22 20 M14 27 L22 27 M15 34 L21 34 M18 36 L18 6" />
          <polygon
            points="12,4 24,4 20,36 16,36"
            fill="#064e3b"
            stroke="#10b981"
          />
        </g>
      ) : type === "molar" ? (
        <path
          d="M10 36 C8 22 6 8 9 3 C12 7 15 20 18 27 C21 20 24 7 27 3 C30 8 28 22 26 36 Z"
          fill={isMissing ? "none" : "#0f172a"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      ) : type === "premolar" ? (
        <path
          d="M12 36 C10 22 12 7 15 3 C17 6 18 18 19 25 C20 18 21 6 23 3 C25 8 24 22 22 36 Z"
          fill={isMissing ? "none" : "#0f172a"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      ) : (
        <path
          d="M13 36 C12 20 15 6 18 2 C21 6 24 20 23 36 Z"
          fill={isMissing ? "none" : "#0f172a"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      )}

      {/* خط قنوات العصب */}
      {isRCT && !isImplant && (
        <path
          d={
            type === "molar" ? "M11 5 Q14 20 18 32 Q22 20 25 5" : "M18 4 L18 34"
          }
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="2 1"
          fill="none"
        />
      )}

      {/* 2. التاج الأطول والأكثر وضوحاً */}
      {type === "molar" ? (
        <path
          d="M6 36 C6 31 10 31 18 31 C26 31 30 31 30 36 C31 45 31 59 28 63 C24 66 12 66 8 63 C5 59 5 45 6 36 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      ) : type === "canine" ? (
        <path
          d="M9 36 C10 31 14 31 18 31 C22 31 26 31 27 36 C28 47 27 58 18 65 C9 58 8 47 9 36 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      ) : type === "incisor" ? (
        <path
          d="M10 36 C10 31 14 31 18 31 C22 31 26 31 26 36 C27 45 27 59 26 63 C23 64 13 64 10 63 C9 59 9 45 10 36 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      ) : (
        <path
          d="M8 36 C8 31 13 31 18 31 C23 31 28 31 28 36 C29 45 29 59 26 63 C22 65 14 65 10 63 C7 59 7 45 8 36 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      )}

      {/* تأثيرات الحالات */}
      {isCaries && (
        <ellipse
          cx="18"
          cy="48"
          rx="5.5"
          ry="4.5"
          fill="#ef4444"
          opacity="0.9"
        />
      )}
      {isFilled && (
        <path
          d="M13 44 Q18 42 23 44 Q21 53 18 54 Q15 53 13 44 Z"
          fill="#0284c7"
          stroke="#38bdf8"
          strokeWidth="0.8"
        />
      )}
      {isCrown && (
        <path
          d="M10 38 L26 38 M12 46 L24 46 M14 54 L22 54"
          stroke="#f3e8ff"
          strokeWidth="1"
          opacity="0.6"
        />
      )}
      {isMissing && (
        <g stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="10" x2="30" y2="58" />
          <line x1="30" y1="10" x2="6" y2="58" />
        </g>
      )}
    </svg>
  );
}

// أرباع الأسنان بنظام FDI
const QUAD_1 = [18, 17, 16, 15, 14, 13, 12, 11];
const QUAD_2 = [21, 22, 23, 24, 25, 26, 27, 28];
const QUAD_4 = [48, 47, 46, 45, 44, 43, 42, 41];
const QUAD_3 = [31, 32, 33, 34, 35, 36, 37, 38];

// 🌟 انحناء القوس المتزن (يحافظ على كامل الفكين في الرؤية بدون سكرول)
const DESKTOP_ARCH_PROFILE = {
  1: { y: 0, rot: 0 },
  2: { y: 2, rot: 1.5 },
  3: { y: 5, rot: 3.5 },
  4: { y: 9, rot: 6 },
  5: { y: 13, rot: 8.5 },
  6: { y: 17, rot: 10.5 },
  7: { y: 21, rot: 12 },
  8: { y: 24, rot: 13 },
};

export default function DentalChart({
  patientId,
  showToast,
  onNavigateToImages,
}) {
  const queryClient = useQueryClient();
  const [selectedTooth, setSelectedTooth] = useState(16);
  const [mobileArchTab, setMobileArchTab] = useState("upper");

  const [toothForm, setToothForm] = useState({
    condition: "sound",
    procedure_name: "",
    notes: "",
  });

  const { data: patientImages = [] } = useQuery({
    queryKey: ["patient-images", patientId],
    queryFn: async () => {
      const res = await api.get(`/patient-images/patients/${patientId}`);
      return res.data.images || [];
    },
    enabled: !!patientId,
  });

  const teethWithImages = new Set(
    patientImages
      .filter((img) => img.tooth_number)
      .map((img) => Number(img.tooth_number))
  );

  const selectedToothImagesCount = patientImages.filter(
    (img) => Number(img.tooth_number) === selectedTooth
  ).length;

  const { data: teeth = [], isLoading } = useQuery({
    queryKey: ["patient-teeth", patientId],
    queryFn: async () => {
      const res = await api.get(`/dental-chart/patients/${patientId}`);
      return res.data.teeth || [];
    },
    enabled: !!patientId,
  });

  const teethMap = teeth.reduce((acc, t) => {
    acc[t.tooth_number] = t;
    return acc;
  }, {});

  const { data: toothHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["tooth-history", patientId, selectedTooth],
    queryFn: async () => {
      if (!selectedTooth) return [];
      const res = await api.get(
        `/dental-chart/patients/${patientId}/teeth/${selectedTooth}/history`
      );
      return res.data.history || [];
    },
    enabled: !!patientId && !!selectedTooth,
  });

  const handleSelectTooth = (toothNumber) => {
    setSelectedTooth(toothNumber);
    const existing = teethMap[toothNumber];
    setToothForm({
      condition: existing?.condition || "sound",
      procedure_name: "",
      notes: existing?.notes || "",
    });
  };

  const updateToothMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put(
        `/dental-chart/patients/${patientId}/teeth/${selectedTooth}`,
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-teeth", patientId] });
      queryClient.invalidateQueries({
        queryKey: ["tooth-history", patientId, selectedTooth],
      });
      if (showToast) showToast("تم تحديث السن بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل تحديث السن", "error");
    },
  });

  const handleSubmitTooth = (e) => {
    e.preventDefault();
    updateToothMutation.mutate(toothForm);
  };

  // مكوّن السن للموبايل (محافظ على التجاوب التام)
  const renderMobileTooth = (toothNum, isUpper) => {
    const toothData = teethMap[toothNum];
    const condition = toothData?.condition || "sound";
    const isSelected = selectedTooth === toothNum;

    return (
      <div
        key={toothNum}
        onClick={() => handleSelectTooth(toothNum)}
        className={`flex-1 flex flex-col items-center cursor-pointer transition-all active:scale-95 ${
          isSelected ? "z-20 scale-105" : ""
        }`}
      >
        {isUpper && (
          <div className="relative flex items-center gap-1">
            <span
              className={`text-[10px] font-mono font-bold ${
                isSelected ? "text-blue-400" : "text-slate-400"
              }`}
            >
              {toothNum}
            </span>

            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 w-4 h-4 text-purple-400"
                title="يوجد أشعة لهذا السن"
              />
            )}
          </div>
        )}

        {/* تكبير السن باعتدال للأناقة والوضوح (44px x 76px) */}
        <div
          className={`w-10 lg:w-[44px] h-[70px] lg:h-[76px] p-1 rounded-xl transition-all duration-200 ${
            isSelected
              ? "bg-blue-950/60 ring-2 ring-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.6)]"
              : "hover:bg-slate-900/60"
          }`}
        >
          <AnatomicalToothSVG
            toothNumber={toothNum}
            condition={condition}
            isUpper={isUpper}
          />
        </div>

        {!isUpper && (
          <div className="relative flex items-center gap-1">
            <span
              className={`text-[11px] font-mono font-bold ${
                isSelected ? "text-blue-400" : "text-slate-400"
              }`}
            >
              {toothNum}
            </span>

            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 w-4 h-4 text-purple-400"
                title="يوجد أشعة لهذا السن"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // 🌟 مكوّن السن للديسكتوب (أكبر، أوضح، وأطول: 42px x 68px)
  const renderDesktopTooth = (toothNum, isUpper) => {
    const toothData = teethMap[toothNum];
    const condition = toothData?.condition || "sound";
    const isSelected = selectedTooth === toothNum;
    const digit = toothNum % 10;
    const q = Math.floor(toothNum / 10);
    const profile = DESKTOP_ARCH_PROFILE[digit] || { y: 0, rot: 0 };
    const translateY = isUpper ? profile.y : -profile.y;

    let rot = 0;
    if (q === 1) rot = -profile.rot;
    else if (q === 2) rot = profile.rot;
    else if (q === 4) rot = profile.rot;
    else if (q === 3) rot = -profile.rot;

    return (
      <div
        key={toothNum}
        onClick={() => handleSelectTooth(toothNum)}
        style={{ transform: `translateY(${translateY}px) rotate(${rot}deg)` }}
        className={`group flex flex-col items-center cursor-pointer transition-transform duration-200 select-none ${
          isSelected ? "z-30 scale-110" : "hover:scale-105 z-10"
        }`}
      >
        {isUpper && (
          <div className="relative flex items-center gap-1 mb-1">
            <span
              className={`text-[11px] font-mono font-bold transition-colors ${
                isSelected
                  ? "text-blue-400 font-extrabold"
                  : "text-slate-400 group-hover:text-slate-200"
              }`}
            >
              {toothNum}
            </span>

            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 w-4 h-4 text-purple-400"
                title="يوجد أشعة لهذا السن"
              />
            )}
          </div>
        )}

        {/* كبّرنا الحاوية إلى 42px x 68px */}
        <div
          className={`w-10 lg:w-[44px] h-[78px] lg:h-[84px] p-0.5 sm:p-1 rounded-xl transition-all duration-200 ${
            isSelected
              ? "bg-blue-950/60 ring-2 ring-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.6)]"
              : "hover:bg-slate-900/60"
          }`}
        >
          <AnatomicalToothSVG
            toothNumber={toothNum}
            condition={condition}
            isUpper={isUpper}
          />
        </div>

        {!isUpper && (
          <div className="relative flex items-center gap-1 mt-1">
            <span
              className={`text-[11px] font-mono font-bold transition-colors ${
                isSelected
                  ? "text-blue-400 font-extrabold"
                  : "text-slate-400 group-hover:text-slate-200"
              }`}
            >
              {toothNum}
            </span>

            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 w-4 h-4 text-purple-400"
                title="يوجد أشعة لهذا السن"
              />
            )}
          </div>
        )}
      </div>
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
    <div className="space-y-4">
      {/* 🌟 1. دليل الحالات المختصر */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-950/70 p-2.5 sm:px-4 sm:py-2 rounded-xl border border-slate-800 text-[10px] sm:text-[11px]">
        <span className="text-slate-400 font-medium">دليل الحالات:</span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {Object.entries(CONDITIONS).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full border border-slate-700"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-slate-300 font-medium">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🌟 2.A: لوحة الموبايل (أرباع الفك - لا تغيير فيها) */}
      <div className="block md:hidden bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileArchTab("upper")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mobileArchTab === "upper"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            الفك العلوي (18 → 28)
          </button>
          <button
            type="button"
            onClick={() => setMobileArchTab("lower")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              mobileArchTab === "lower"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            الفك السفلي (48 → 38)
          </button>
        </div>

        {mobileArchTab === "upper" ? (
          <div className="space-y-3">
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-blue-400 block mb-1.5 font-bold">
                يمين المريض R (الربع الأول: 18 ← 11)
              </span>
              <div className="flex justify-between items-center gap-0.5">
                {QUAD_1.map((num) => renderMobileTooth(num, true))}
              </div>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-blue-400 block mb-1.5 font-bold">
                يسار المريض L (الربع الثاني: 21 → 28)
              </span>
              <div className="flex justify-between items-center gap-0.5">
                {QUAD_2.map((num) => renderMobileTooth(num, true))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-blue-400 block mb-1.5 font-bold">
                يمين المريض R (الربع الرابع: 48 ← 41)
              </span>
              <div className="flex justify-between items-center gap-0.5">
                {QUAD_4.map((num) => renderMobileTooth(num, false))}
              </div>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-blue-400 block mb-1.5 font-bold">
                يسار المريض L (الربع الثالث: 31 → 38)
              </span>
              <div className="flex justify-between items-center gap-0.5">
                {QUAD_3.map((num) => renderMobileTooth(num, false))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🌟 2.B: لوحة الديسكتوب المتطورة (العنصر الرئيسي مع أسنان واضحة والفكان في مجال الرؤية) */}
      <div className="hidden md:block bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 px-3 mb-1 select-none">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-500/50"></span>
            يمين المريض (R)
          </span>
          <span className="text-slate-600 font-medium text-[10px] tracking-widest uppercase">
            Adult Dentition (32 Teeth)
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            يسار المريض (L)
            <span className="w-2 h-2 rounded-full bg-blue-500/50"></span>
          </span>
        </div>

        {/* الفك العلوي - مسافة مريحة عند خط الإطباق */}
        <div className="pt-2 pb-10 border-b border-slate-900">
          <div className="flex justify-center items-end">
            <div className="flex items-end gap-1.5">
              {QUAD_1.map((num) => renderDesktopTooth(num, true))}
            </div>
            <div className="w-[1px] h-9 bg-blue-500/20 mx-1 self-end mb-2 shrink-0" />
            <div className="flex items-end gap-1.5">
              {QUAD_2.map((num) => renderDesktopTooth(num, true))}
            </div>
          </div>
        </div>

        {/* الفك السفلي - مسافة مريحة عند خط الإطباق */}
        <div className="pt-10 pb-2">
          <div className="flex justify-center items-start">
            <div className="flex items-start gap-1.5">
              {QUAD_4.map((num) => renderDesktopTooth(num, false))}
            </div>
            <div className="w-[1px] h-9 bg-blue-500/20 mx-1 self-start mt-2 shrink-0" />
            <div className="flex items-start gap-1.5">
              {QUAD_3.map((num) => renderDesktopTooth(num, false))}
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 3. فحص السن وتاريخه (ملموم ومتمركز بشكل أنيق في المنتصف) */}
      {selectedTooth && (
        <div className="max-w-full md:max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          {/* عمود الفورم الملموم */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>السن:</span>

                <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono text-xs">
                  #{selectedTooth}
                </span>

                <span className="text-[11px] text-slate-400 font-normal truncate">
                  {getToothArabicName(selectedTooth)}
                </span>
              </h3>

              <div className="flex items-center gap-2">
                {selectedToothImagesCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToImages?.(selectedTooth)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>أشعة السن ({selectedToothImagesCount})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateToImages?.(selectedTooth)}
                    className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-slate-300 text-[11px] transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                    <span>+ إضافة أشعة</span>
                  </button>
                )}

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    CONDITIONS[teethMap[selectedTooth]?.condition || "sound"]
                      ?.badge
                  }`}
                >
                  {
                    CONDITIONS[teethMap[selectedTooth]?.condition || "sound"]
                      ?.label
                  }
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitTooth} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  تغيير حالة السن *
                </label>
                <select
                  value={toothForm.condition}
                  onChange={(e) =>
                    setToothForm({ ...toothForm, condition: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(CONDITIONS).map(([val, cfg]) => (
                    <option key={val} value={val}>
                      {cfg.label} ({val})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  اسم الإجراء الطبي (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: حشو كومبوزيت، علاج جذور..."
                  value={toothForm.procedure_name}
                  onChange={(e) =>
                    setToothForm({
                      ...toothForm,
                      procedure_name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  ملاحظات السن
                </label>
                <textarea
                  rows="2"
                  placeholder="ملاحظات السن..."
                  value={toothForm.notes}
                  onChange={(e) =>
                    setToothForm({ ...toothForm, notes: e.target.value })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={updateToothMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-md shadow-blue-600/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {updateToothMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ وتوثيق الحالة"}
                </span>
              </button>
            </form>
          </div>

          {/* عمود الـ Timeline */}
          <div className="md:col-span-7 flex flex-col border-t md:border-t-0 md:border-r border-slate-800/80 pt-3 md:pt-0 md:pr-4">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800/80 pb-2 shrink-0">
              <History className="w-3.5 h-3.5 text-purple-400" />
              سجل تطور السن #{selectedTooth} (Timeline)
            </h4>

            {isLoadingHistory ? (
              <div className="py-8 flex justify-center text-slate-400 my-auto">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : toothHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/80 my-auto">
                لا توجد حركات مسجلة سابقاً لهذا السن.
              </div>
            ) : (
              <div className="space-y-2 flex-1 max-h-[340px] md:max-h-[380px] overflow-y-auto pr-1">
                {toothHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          CONDITIONS[h.condition]?.badge
                        }`}
                      >
                        {CONDITIONS[h.condition]?.label}
                      </span>
                      <span
                        className="text-[10px] text-slate-400 font-mono"
                        dir="ltr"
                      >
                        {new Date(h.created_at).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    {h.procedure_name && (
                      <p className="font-semibold text-white text-xs">
                        {h.procedure_name}
                      </p>
                    )}
                    {h.notes && (
                      <p className="text-slate-400 text-[11px]">{h.notes}</p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>د. {h.doctor_name || "العيادة"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
