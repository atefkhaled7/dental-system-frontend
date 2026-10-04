import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  History,
  User,
  Loader2,
  Save,
  Camera,
  Stethoscope,
  ArrowDown,
} from "lucide-react";

// تعريف الحالات والألوان
const CONDITIONS = {
  sound: {
    label: "سليم",
    color: "#94A3B8",
    fill: "#111827",
    badge: "bg-slate-800 text-slate-300 border border-slate-700",
  },
  caries: {
    label: "تسوس",
    color: "#F87171",
    fill: "#450a0a",
    badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  },
  filled: {
    label: "محشو",
    color: "#0D9488",
    fill: "#042F2E",
    badge: "bg-teal-500/10 text-teal-300 border border-teal-500/20",
  },
  rct: {
    label: "علاج عصب",
    color: "#FBBF24",
    fill: "#78350f",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
  crown: {
    label: "تركيبة / تاج",
    color: "#C084FC",
    fill: "#581c87",
    badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },
  implant: {
    label: "زراعة",
    color: "#34D399",
    fill: "#064e3b",
    badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  missing: {
    label: "مخلوع",
    color: "#64748B",
    fill: "#080D18",
    badge: "bg-slate-900 text-slate-400 border border-[var(--border-default)]",
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
  const strokeColor = isMissing ? "#64748B" : cfg.color;
  const crownFill = isCrown ? "#581c87" : isMissing ? "#080D18" : "#111827";

  return (
    <svg
      viewBox="0 0 36 68"
      className={`w-full h-full transition-all duration-150 ${
        isMissing ? "opacity-35" : ""
      }`}
      style={{
        transform: isUpper ? "none" : "rotate(180deg)",
      }}
    >
      {/* 1. الجذور */}
      {isImplant ? (
        <g stroke="#34D399" strokeWidth="1.5" fill="none">
          <path d="M14 6 L22 6 M13 13 L23 13 M14 20 L22 20 M14 27 L22 27 M15 34 L21 34 M18 36 L18 6" />
          <polygon
            points="12,4 24,4 20,36 16,36"
            fill="#064e3b"
            stroke="#34D399"
          />
        </g>
      ) : type === "molar" ? (
        <path
          d="M10 36 C8 22 6 8 9 3 C12 7 15 20 18 27 C21 20 24 7 27 3 C30 8 28 22 26 36 Z"
          fill={isMissing ? "none" : "#080D18"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      ) : type === "premolar" ? (
        <path
          d="M12 36 C10 22 12 7 15 3 C17 6 18 18 19 25 C20 18 21 6 23 3 C25 8 24 22 22 36 Z"
          fill={isMissing ? "none" : "#080D18"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      ) : (
        <path
          d="M13 36 C12 20 15 6 18 2 C21 6 24 20 23 36 Z"
          fill={isMissing ? "none" : "#080D18"}
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
          stroke="#FBBF24"
          strokeWidth="2"
          strokeDasharray="2 1"
          fill="none"
        />
      )}

      {/* 2. التاج */}
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
          fill="#F87171"
          opacity="0.9"
        />
      )}
      {isFilled && (
        <path
          d="M13 44 Q18 42 23 44 Q21 53 18 54 Q15 53 13 44 Z"
          fill="#042F2E"
          stroke="#0D9488"
          strokeWidth="0.8"
        />
      )}
      {isCrown && (
        <path
          d="M10 38 L26 38 M12 46 L24 46 M14 54 L22 54"
          stroke="#F3E8FF"
          strokeWidth="1"
          opacity="0.6"
        />
      )}
      {isMissing && (
        <g stroke="#F87171" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="10" x2="30" y2="58" />
          <line x1="30" y1="10" x2="6" y2="58" />
        </g>
      )}
    </svg>
  );
}

// أرباع الأسنان بنظام FDI القياسي
const QUAD_1 = [18, 17, 16, 15, 14, 13, 12, 11];
const QUAD_2 = [21, 22, 23, 24, 25, 26, 27, 28];
const QUAD_4 = [48, 47, 46, 45, 44, 43, 42, 41];
const QUAD_3 = [31, 32, 33, 34, 35, 36, 37, 38];

const DESKTOP_ARCH_PROFILE = {
  1: { y: 0, rot: 0 },
  2: { y: 2, rot: 1.5 },
  3: { y: 5, rot: 3 },
  4: { y: 8, rot: 5 },
  5: { y: 12, rot: 7 },
  6: { y: 16, rot: 9 },
  7: { y: 20, rot: 11 },
  8: { y: 23, rot: 12 },
};

export default function DentalChart({
  patientId,
  showToast,
  onNavigateToImages,
}) {
  const queryClient = useQueryClient();
  const [selectedTooth, setSelectedTooth] = useState(16);
  const [mobileArchTab, setMobileArchTab] = useState("upper");
  const toothDetailsRef = useRef(null); // مرجع للنزول التلقائي

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

  // اختيار سن + النزول السلس التلقائي للوحة التحكم
  const handleSelectTooth = (toothNumber) => {
    setSelectedTooth(toothNumber);
    const existing = teethMap[toothNumber];
    setToothForm({
      condition: existing?.condition || "sound",
      procedure_name: "",
      notes: existing?.notes || "",
    });

    // سكرول ناعم جداً لتحت
    setTimeout(() => {
      toothDetailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
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
      if (showToast) showToast("تم حفظ وتوثيق حالة السن بنجاح", "success");
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

  // مكوّن السن للموبايل
  const renderMobileTooth = (toothNum, isUpper) => {
    const toothData = teethMap[toothNum];
    const condition = toothData?.condition || "sound";
    const isSelected = selectedTooth === toothNum;

    return (
      <div
        key={toothNum}
        onClick={() => handleSelectTooth(toothNum)}
        className={`min-w-0 flex-1 flex flex-col items-center cursor-pointer transition-all active:scale-95 ${
          isSelected ? "z-20 scale-105" : ""
        }`}
      >
        {isUpper && (
          <div className="relative flex items-center gap-1">
            <span
              className={`text-[10px] font-mono font-bold ${
                isSelected ? "text-teal-400" : "text-slate-400"
              }`}
            >
              {toothNum}
            </span>
            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 w-3 h-3 text-teal-400"
                title="يوجد أشعة لهذا السن"
              />
            )}
          </div>
        )}
        <div
          className={`w-9 sm:w-10 h-[68px] sm:h-[72px] p-0.5 rounded-lg border transition-all ${
            isSelected
              ? "bg-teal-500/10 border-teal-500/40"
              : "border-transparent hover:bg-slate-800/40"
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
              className={`text-[10px] font-mono font-bold ${
                isSelected ? "text-teal-400" : "text-slate-400"
              }`}
            >
              {toothNum}
            </span>
            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 w-3 h-3 text-teal-400"
                title="يوجد أشعة لهذا السن"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // مكوّن السن لشاشات الديسكتوب (مفرود ومريح وكبير)
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
        className={`group flex flex-col items-center cursor-pointer transition-all duration-150 select-none ${
          isSelected ? "z-30 scale-110" : "hover:scale-105 z-10"
        }`}
      >
        {isUpper && (
          <div className="relative flex items-center gap-1 mb-1.5">
            <span
              className={`text-xs font-mono font-bold transition-colors ${
                isSelected
                  ? "text-teal-400"
                  : "text-slate-400 group-hover:text-white"
              }`}
            >
              {toothNum}
            </span>
            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0.5 w-3.5 h-3.5 text-teal-400"
                title="يوجد أشعة لهذا السن"
              />
            )}
          </div>
        )}
        <div
          className={`w-9 lg:w-11 h-[76px] lg:h-[88px] p-1 rounded-xl border transition-all ${
            isSelected
              ? "bg-teal-500/10 border-teal-500/50 ring-2 ring-teal-500/30"
              : "border-transparent hover:bg-slate-800/40"
          }`}
        >
          <AnatomicalToothSVG
            toothNumber={toothNum}
            condition={condition}
            isUpper={isUpper}
          />
        </div>
        {!isUpper && (
          <div className="relative flex items-center gap-1 mt-1.5">
            <span
              className={`text-xs font-mono font-bold transition-colors ${
                isSelected
                  ? "text-teal-400"
                  : "text-slate-400 group-hover:text-white"
              }`}
            >
              {toothNum}
            </span>
            {teethWithImages.has(toothNum) && (
              <Camera
                className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 w-3.5 h-3.5 text-teal-400"
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
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-xs">جاري تحميل مخطط الأسنان...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* 🌟 1. دليل الحالات المختصر في شريط أفقي أنيق */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-chart-legend)] px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-xs">
        <span className="text-[var(--text-secondary)] font-medium text-[11px]">
          دليل الحالات:
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(CONDITIONS).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-[var(--text-secondary)] text-[11px] font-medium">
                {cfg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🌟 2. المخطط التشريحي للأسنان واخد عرض الشاشة بالكامل (Full Width Hero) */}
      <div className="bg-[var(--bg-chart)] rounded-xl border border-[var(--border-default)] p-5 lg:p-6 shadow-xl w-full">
        {/* هيدر المخطط */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-default)] text-xs">
          <span className="font-semibold text-white flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span className="text-sm">مخطط الأسنان التشريحي (32 سن)</span>
          </span>
          <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              يمين المريض (R)
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              يسار المريض (L)
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            </span>
          </div>
        </div>

        {/* عرض الموبايل (أرباع الفك) */}
        <div className="block md:hidden pt-4 space-y-3">
          <div className="flex bg-[var(--bg-chart-input)] p-1 rounded-lg border border-[var(--border-default)] text-xs font-medium">
            <button
              type="button"
              onClick={() => setMobileArchTab("upper")}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mobileArchTab === "upper"
                  ? "bg-teal-600 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              الفك العلوي (18 ← 28)
            </button>
            <button
              type="button"
              onClick={() => setMobileArchTab("lower")}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mobileArchTab === "lower"
                  ? "bg-teal-600 text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              الفك السفلي (48 ← 38)
            </button>
          </div>

          {mobileArchTab === "upper" ? (
            <div className="space-y-2">
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع الأول: يمين المريض (18 ← 11)
                </span>
                <div className="grid grid-cols-8 gap-0.5">
                  {QUAD_1.map((num) => renderMobileTooth(num, true))}
                </div>
              </div>
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع الثاني: يسار المريض (21 → 28)
                </span>
                <div className="grid grid-cols-8 gap-0.5">
                  {QUAD_2.map((num) => renderMobileTooth(num, true))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع الرابع: يمين المريض (48 ← 41)
                </span>
                <div className="grid grid-cols-8 gap-0.5">
                  {QUAD_4.map((num) => renderMobileTooth(num, false))}
                </div>
              </div>
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع الثالث: يسار المريض (31 → 38)
                </span>
                <div className="grid grid-cols-8 gap-0.5">
                  {QUAD_3.map((num) => renderMobileTooth(num, false))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* عرض الشاشات الأكبر (مفرود بكامل العرض بدون أي تداخل) */}
        <div className="hidden md:block py-6 overflow-x-auto">
          <div className="min-w-[800px] flex flex-col items-center justify-center">
            {/* الفك العلوي */}
            <div className="pb-6 border-b border-slate-800/80 w-full flex justify-center">
              <div className="flex items-end justify-center gap-1.5 lg:gap-2">
                {QUAD_1.map((num) => renderDesktopTooth(num, true))}
                <div className="w-[1px] h-12 bg-teal-500/30 mx-2 self-end mb-2 shrink-0" />
                {QUAD_2.map((num) => renderDesktopTooth(num, true))}
              </div>
            </div>

            {/* الفك السفلي */}
            <div className="pt-6 w-full flex justify-center">
              <div className="flex items-start justify-center gap-1.5 lg:gap-2">
                {QUAD_4.map((num) => renderDesktopTooth(num, false))}
                <div className="w-[1px] h-12 bg-teal-500/30 mx-2 self-start mt-2 shrink-0" />
                {QUAD_3.map((num) => renderDesktopTooth(num, false))}
              </div>
            </div>
          </div>
        </div>

        {/* تلميح سفلي جذاب */}
        <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <span>
            انقر على أي سن لتعديل حالته واستعراض تاريخه الإكلينيكي في الأسفل
          </span>
          <ArrowDown className="w-3.5 h-3.5 text-teal-400 animate-bounce" />
        </div>
      </div>

      {/* 🌟 3. لوحة فحص وتعديل السن المختار + الـ Timeline (تحت المخطط بعرض كامل) */}
      <div ref={toothDetailsRef} className="scroll-mt-6">
        {selectedTooth ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* الفورم وإجراءات السن (5 أجزاء) */}
            <div className="lg:col-span-5 bg-[#0d1527] rounded-xl border border-[var(--border-default)] p-5 space-y-4 shadow-xl">
              {/* ترويسة السن */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 font-mono text-base font-bold">
                    #{selectedTooth}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {getToothArabicName(selectedTooth)}
                    </h3>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                      {getToothCategory(selectedTooth)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedToothImagesCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => onNavigateToImages?.(selectedTooth)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>أشعة ({selectedToothImagesCount})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigateToImages?.(selectedTooth)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>+ إضافة أشعة</span>
                    </button>
                  )}

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
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

              {/* فورم تعديل الحالة */}
              <form onSubmit={handleSubmitTooth} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    حالة السن التشخيصية *
                  </label>
                  <select
                    value={toothForm.condition}
                    onChange={(e) =>
                      setToothForm({ ...toothForm, condition: e.target.value })
                    }
                    className="w-full bg-[var(--bg-chart-input)] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  >
                    {Object.entries(CONDITIONS).map(([val, cfg]) => (
                      <option key={val} value={val}>
                        {cfg.label} ({val})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    اسم الإجراء الطبي (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: حشو كومبوزيت، علاج جذور جلسة ثانية..."
                    value={toothForm.procedure_name}
                    onChange={(e) =>
                      setToothForm({
                        ...toothForm,
                        procedure_name: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-chart-input)] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ملاحظات وتوصيات السن
                  </label>
                  <textarea
                    rows="3"
                    placeholder="أي ملاحظات سريرية تخص هذا السن..."
                    value={toothForm.notes}
                    onChange={(e) =>
                      setToothForm({ ...toothForm, notes: e.target.value })
                    }
                    className="w-full bg-[var(--bg-chart-input)] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateToothMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {updateToothMutation.isPending
                      ? "جاري التوثيق..."
                      : "حفظ وتوثيق الحالة في الملف"}
                  </span>
                </button>
              </form>
            </div>

            {/* الـ Timeline وسجل تطور السن (7 أجزاء مفرودة ونظيفة) */}
            <div className="lg:col-span-7 bg-[#0d1527] rounded-xl border border-[var(--border-default)] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)] text-xs">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-teal-400" />
                  <span>
                  سجل السن
                  </span>
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {toothHistory.length} إجراء مسجل
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                </div>
              ) : toothHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs bg-[var(--bg-chart-input)] rounded-xl border border-[var(--border-default)]">
                  لا توجد إجراءات سابقة مسجلة لهذا السن حتى الآن.
                </div>
              ) : (
                <div className="relative border-r border-[var(--border-default)] pr-5 mr-2 space-y-3.5 max-h-[360px] overflow-y-auto">
                  {toothHistory.map((h) => (
                    <div key={h.id} className="relative group">
                      {/* نقطة المسار الزمني */}
                      <div className="absolute -right-[25px] top-2 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-slate-900" />

                      <div className="p-3.5 rounded-xl bg-[var(--bg-chart-input)] border border-[var(--border-default)] text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              CONDITIONS[h.condition]?.badge
                            }`}
                          >
                            {CONDITIONS[h.condition]?.label}
                          </span>
                          <span
                            className="text-[11px] text-slate-400 font-mono"
                            dir="ltr"
                          >
                            {new Date(h.created_at).toLocaleString("en-US")}
                          </span>
                        </div>

                        {h.procedure_name && (
                          <p className="font-bold text-white text-xs pt-1">
                            {h.procedure_name}
                          </p>
                        )}

                        {h.notes && (
                          <p className="text-slate-400 text-xs leading-relaxed">
                            {h.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1.5 border-t border-slate-800/80">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>د. {h.doctor_name || "العيادة"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500 text-xs bg-[#0d1527] rounded-xl border border-[var(--border-default)]">
            اختر سناً من المخطط أعلاه لعرض حالته وإجراءاته.
          </div>
        )}
      </div>
    </div>
  );
}
