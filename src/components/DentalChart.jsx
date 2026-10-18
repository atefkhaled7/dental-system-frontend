import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  History,
  User,
  Loader2,
  Save,
  Camera,
  Stethoscope,
  ArrowDown,
  Printer,
  Sparkles,
  Layers,
  Baby,
  UserCheck,
} from "lucide-react";

// تعريف الحالات الـ 9 والألوان والبادجات
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
  fracture: {
    label: "كسر",
    color: "#FB7185",
    fill: "#4c0519",
    badge: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  },
  sealant: {
    label: "سيلانت وقائي",
    color: "#38BDF8",
    fill: "#082f49",
    badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  },
};

const MATERIALS = [
  { value: "", label: "-- بدون مادة محددة --" },
  { value: "composite", label: "كومبوزيت ضوئي (Composite)" },
  { value: "amalgam", label: "أملغم فضي (Amalgam)" },
  { value: "gic", label: "حشو زجاجي (GIC)" },
  { value: "temporary", label: "حشو مؤقت (Temporary)" },
  { value: "zirconia", label: "زيركون (Zirconia)" },
  { value: "pfm", label: "بورسلين بمعدن (PFM)" },
  { value: "emax", label: "إيماكس (E-Max)" },
  { value: "resin_sealant", label: "راتنج سيلانت (Resin Sealant)" },
];

const getToothCategory = (num) => {
  const lastDigit = num % 10;
  if (lastDigit === 1 || lastDigit === 2) return "incisor";
  if (lastDigit === 3) return "canine";
  if (lastDigit === 4 || lastDigit === 5) {
    return num >= 51 ? "molar" : "premolar";
  }
  return "molar";
};

const getToothArabicName = (num) => {
  const q = Math.floor(num / 10);
  const d = num % 10;
  const isDeciduous = num >= 51;

  const adultNames = {
    1: "القاطع المركزي",
    2: "القاطع الجانبي",
    3: "الناب",
    4: "الضاحك الأول",
    5: "الضاحك الثاني",
    6: "الضرس الأول",
    7: "الضرس الثاني",
    8: "ضرس العقل",
  };

  const deciduousNames = {
    1: "القاطع المركزي اللبني",
    2: "القاطع الجانبي اللبني",
    3: "الناب اللبني",
    4: "الضرس الأول اللبني",
    5: "الضرس الثاني اللبني",
  };

  const quadNames = {
    1: "علوي أيمن (دائم)",
    2: "علوي أيسر (دائم)",
    3: "سفلي أيسر (دائم)",
    4: "سفلي أيمن (دائم)",
    5: "علوي أيمن (لبني)",
    6: "علوي أيسر (لبني)",
    7: "سفلي أيسر (لبني)",
    8: "سفلي أيمن (لبني)",
  };

  const baseName = isDeciduous ? deciduousNames[d] : adultNames[d];
  return `${baseName || "سن"} (${quadNames[q] || ""})`;
};

// رسم السن التشريحي كـ SVG
function AnatomicalToothSVG({
  toothNumber,
  condition = "sound",
  isUpper = true,
  surfaces = [],
}) {
  const type = getToothCategory(toothNumber);
  const cfg = CONDITIONS[condition] || CONDITIONS.sound;
  const isMissing = condition === "missing";
  const isCaries = condition === "caries";
  const isFilled = condition === "filled";
  const isRCT = condition === "rct";
  const isCrown = condition === "crown";
  const isImplant = condition === "implant";
  const isFracture = condition === "fracture";
  const isSealant = condition === "sealant";
  const strokeColor = isMissing ? "#64748B" : cfg.color;
  const crownFill = isCrown ? "#581c87" : isMissing ? "#080D18" : "#111827";

  const hasSurface = (sCode) => surfaces.some((s) => s.surface === sCode);

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

      {/* تأثيرات الحالات العامة والأسطح */}
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
      {isSealant && (
        <path
          d="M12 47 Q18 45 24 47"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      {isFracture && (
        <path
          d="M8 58 L16 48 L20 53 L28 42"
          stroke="#FB7185"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
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

      {/* نقاط مميزة للأسطح المسجلة إذا كانت متوفرة */}
      {surfaces.length > 0 && !isMissing && !isCrown && (
        <g opacity="0.85">
          {hasSurface("O") && <circle cx="18" cy="48" r="2.5" fill="#14B8A6" />}
          {hasSurface("I") && <circle cx="18" cy="60" r="2" fill="#14B8A6" />}
          {hasSurface("M") && <circle cx="11" cy="48" r="2" fill="#14B8A6" />}
          {hasSurface("D") && <circle cx="25" cy="48" r="2" fill="#14B8A6" />}
          {hasSurface("B") && <circle cx="18" cy="38" r="2" fill="#14B8A6" />}
          {hasSurface("L") && <circle cx="18" cy="58" r="2" fill="#14B8A6" />}
        </g>
      )}
    </svg>
  );
}

// أرباع الأسنان الدائمة (FDI 11–48)
const QUAD_1 = [18, 17, 16, 15, 14, 13, 12, 11];
const QUAD_2 = [21, 22, 23, 24, 25, 26, 27, 28];
const QUAD_4 = [48, 47, 46, 45, 44, 43, 42, 41];
const QUAD_3 = [31, 32, 33, 34, 35, 36, 37, 38];

// أرباع الأسنان اللبنية للأطفال (FDI 51–85)
const PED_QUAD_5 = [55, 54, 53, 52, 51];
const PED_QUAD_6 = [61, 62, 63, 64, 65];
const PED_QUAD_8 = [85, 84, 83, 82, 81];
const PED_QUAD_7 = [71, 72, 73, 74, 75];

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

const EMPTY_CHART_DATA = {
  teeth: [],
  default_dentition: "permanent",
};

export default function DentalChart({
  patientId,
  showToast,
  onNavigateToImages,
}) {
  const { user } = useAuth();
  const canEdit = ["ClinicAdmin", "Doctor"].includes(user?.role);

  const queryClient = useQueryClient();
  const [dentitionTab, setDentitionTab] = useState("permanent"); // permanent | deciduous
  const [selectedTooth, setSelectedTooth] = useState(16);
  const [mobileArchTab, setMobileArchTab] = useState("upper");
  const toothDetailsRef = useRef(null);

  // حالة الفورم الرئيسي للسن
  const [toothForm, setToothForm] = useState({
    condition: "sound",
    procedure_name: "",
    notes: "",
    material: "",
  });

  // الأسطح المختارة وحالة كل سطح
  const [selectedSurfaces, setSelectedSurfaces] = useState({
    M: { selected: false, condition: "sound", material: "" },
    O: { selected: false, condition: "sound", material: "" },
    D: { selected: false, condition: "sound", material: "" },
    B: { selected: false, condition: "sound", material: "" },
    L: { selected: false, condition: "sound", material: "" },
    I: { selected: false, condition: "sound", material: "" },
  });

  // جلب صور الأشعة
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
      .map((img) => Number(img.tooth_number)),
  );

  const selectedToothImagesCount = patientImages.filter(
    (img) => Number(img.tooth_number) === selectedTooth,
  ).length;

  // جلب مخطط الأسنان من الباك إند
  const { data: chartData = EMPTY_CHART_DATA, isLoading } = useQuery({
    queryKey: ["patient-teeth", patientId],
    queryFn: async () => {
      const res = await api.get(`/dental-chart/patients/${patientId}`);
      return res.data || { teeth: [], default_dentition: "permanent" };
    },
    enabled: !!patientId,
  });

  const teeth = chartData.teeth || EMPTY_CHART_DATA.teeth;

  // ضبط نوع التسنين الافتراضي حسب عمر المريض تلقائياً عند أول تحميل
  useEffect(() => {
    if (chartData.default_dentition) {
      setDentitionTab(chartData.default_dentition);
      setSelectedTooth(chartData.default_dentition === "deciduous" ? 55 : 16);
    }
  }, [chartData.default_dentition]);

  const teethMap = teeth.reduce((acc, t) => {
    acc[t.tooth_number] = t;
    return acc;
  }, {});
  useEffect(() => {
    const existing = teeth.find(
      (t) => Number(t.tooth_number) === Number(selectedTooth),
    );

    const newSurfacesState = {
      M: { selected: false, condition: "sound", material: "" },
      O: { selected: false, condition: "sound", material: "" },
      D: { selected: false, condition: "sound", material: "" },
      B: { selected: false, condition: "sound", material: "" },
      L: { selected: false, condition: "sound", material: "" },
      I: { selected: false, condition: "sound", material: "" },
    };

    if (Array.isArray(existing?.surfaces)) {
      for (const s of existing.surfaces) {
        if (newSurfacesState[s.surface]) {
          newSurfacesState[s.surface] = {
            selected: true,
            condition: s.condition || existing.condition || "sound",
            material: s.material || "",
          };
        }
      }
    }

    setToothForm({
      condition: existing?.condition || "sound",
      procedure_name: "",
      notes: existing?.notes || "",
      material: "",
    });

    setSelectedSurfaces(newSurfacesState);
  }, [selectedTooth, teeth]);
  // جلب سجل تاريخ السن
  const { data: toothHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["tooth-history", patientId, selectedTooth],
    queryFn: async () => {
      if (!selectedTooth) return [];
      const res = await api.get(
        `/dental-chart/patients/${patientId}/teeth/${selectedTooth}/history`,
      );
      return res.data.history || [];
    },
    enabled: !!patientId && !!selectedTooth,
  });

  // عند اختيار سن من المخطط
  const handleSelectTooth = (toothNumber) => {
    setSelectedTooth(toothNumber);
    const existing = teethMap[toothNumber];
    const category = getToothCategory(toothNumber);
    const isAnterior = category === "incisor" || category === "canine";

    setToothForm({
      condition: existing?.condition || "sound",
      procedure_name: "",
      notes: existing?.notes || "",
      material: "",
    });

    // تحديث خريطة الأسطح بناءً على البيانات المحفوظة
    const newSurfacesState = {
      M: { selected: false, condition: "sound", material: "" },
      O: { selected: false, condition: "sound", material: "" },
      D: { selected: false, condition: "sound", material: "" },
      B: { selected: false, condition: "sound", material: "" },
      L: { selected: false, condition: "sound", material: "" },
      I: { selected: false, condition: "sound", material: "" },
    };

    if (existing?.surfaces && Array.isArray(existing.surfaces)) {
      for (const s of existing.surfaces) {
        if (newSurfacesState[s.surface]) {
          newSurfacesState[s.surface] = {
            selected: true,
            condition: s.condition || existing.condition || "filled",
            material: s.material || "",
          };
        }
      }
    }

    setSelectedSurfaces(newSurfacesState);

    setTimeout(() => {
      toothDetailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // تبديل اختيار سطح معين في لوحة التحكم
  const toggleSurface = (sCode) => {
    setSelectedSurfaces((prev) => ({
      ...prev,
      [sCode]: {
        ...prev[sCode],
        selected: !prev[sCode].selected,
        condition: !prev[sCode].selected ? toothForm.condition : "sound",
      },
    }));
  };

  const updateSurfaceCondition = (sCode, condition) => {
    setSelectedSurfaces((prev) => ({
      ...prev,
      [sCode]: {
        ...prev[sCode],
        condition,
      },
    }));
  };

  // Mutation تحديث السن
  const updateToothMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put(
        `/dental-chart/patients/${patientId}/teeth/${selectedTooth}`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-teeth", patientId] });
      queryClient.invalidateQueries({
        queryKey: ["tooth-history", patientId, selectedTooth],
      });
      if (showToast)
        showToast("تم حفظ وتوثيق حالة السن والأسطح بنجاح", "success");
    },
    onError: (err) => {
      if (showToast)
        showToast(err.response?.data?.error || "فشل تحديث السن", "error");
    },
  });

  const handleSubmitTooth = (e) => {
    e.preventDefault();

    // تجميع الأسطح النشطة
    const activeSurfaces = Object.entries(selectedSurfaces)
      .filter(([_, data]) => data.selected)
      .map(([sCode, data]) => ({
        surface: sCode,
        condition: data.condition || toothForm.condition,
        material: data.material || toothForm.material || null,
      }));

    const payload = {
      condition: toothForm.condition,
      procedure_name: toothForm.procedure_name,
      notes: toothForm.notes,
      material: toothForm.material || null,
      surfaces: activeSurfaces.length > 0 ? activeSurfaces : undefined,
      clear_surfaces: activeSurfaces.length === 0,
    };

    updateToothMutation.mutate(payload);
  };

  // طباعة الشارت
  const handlePrintChart = () => {
    window.print();
  };

  // تحديد نوع السن المختار وهل السطح الأوسط قاطع I أو إطباقي O
  const selectedCategory = selectedTooth
    ? getToothCategory(selectedTooth)
    : "molar";
  const isAnteriorTooth =
    selectedCategory === "incisor" || selectedCategory === "canine";
  const centerSurfaceCode = isAnteriorTooth ? "I" : "O";

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
            surfaces={toothData?.surfaces || []}
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

  // مكوّن السن لشاشات الديسكتوب
  const renderDesktopTooth = (toothNum, isUpper) => {
    const toothData = teethMap[toothNum];
    const condition = toothData?.condition || "sound";
    const isSelected = selectedTooth === toothNum;
    const digit = toothNum % 10;
    const q = Math.floor(toothNum / 10);
    const profile = DESKTOP_ARCH_PROFILE[digit] || { y: 0, rot: 0 };
    const translateY = isUpper ? profile.y : -profile.y;
    let rot = 0;
    if (q === 1 || q === 5) rot = -profile.rot;
    else if (q === 2 || q === 6) rot = profile.rot;
    else if (q === 4 || q === 8) rot = profile.rot;
    else if (q === 3 || q === 7) rot = -profile.rot;

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
            surfaces={toothData?.surfaces || []}
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
      {/* 🌟 1. هيدر التحكم بنوع التسنين والطباعة ودليل الحالات */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--bg-chart-legend)] px-4 py-3 rounded-xl border border-[var(--border-default)] text-xs">
        <div className="flex items-center gap-2">
          {/* تبديل الأسنان الدائمة / اللبنية */}
          <div className="flex bg-[#080d19] p-1 rounded-lg border border-slate-700 font-medium">
            <button
              type="button"
              onClick={() => {
                setDentitionTab("permanent");
                setSelectedTooth(16);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                dentitionTab === "permanent"
                  ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>الأسنان الدائمة (البالغين 11–48)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDentitionTab("deciduous");
                setSelectedTooth(55);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                dentitionTab === "deciduous"
                  ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              <span>الأسنان اللبنية (الأطفال 51–85)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrintChart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors font-medium"
            title="طباعة تقرير الشارت"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طباعة الشارت</span>
          </button>
        </div>

        {/* دليل الحالات */}
        <div className="flex flex-wrap items-center gap-2.5">
          {Object.entries(CONDITIONS).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-[var(--text-secondary)] text-[11px] font-medium">
                {cfg.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🌟 2. المخطط التشريحي للأسنان */}
      <div className="bg-[var(--bg-chart)] rounded-xl border border-[var(--border-default)] p-5 lg:p-6 shadow-xl w-full">
        {/* هيدر المخطط */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-default)] text-xs">
          <span className="font-semibold text-white flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span className="text-sm">
              {dentitionTab === "permanent"
                ? "مخطط الأسنان الدائمة للبالغين (32 سن)"
                : "مخطط الأسنان اللبنية للأطفال (20 سن)"}
            </span>
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

        {/* عرض الموبايل */}
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
              الفك العلوي
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
              الفك السفلي
            </button>
          </div>

          {dentitionTab === "permanent" ? (
            mobileArchTab === "upper" ? (
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
            )
          ) : mobileArchTab === "upper" ? (
            <div className="space-y-2">
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع الخامس: يمين الطفل (55 ← 51)
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {PED_QUAD_5.map((num) => renderMobileTooth(num, true))}
                </div>
              </div>
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع السادس: يسار الطفل (61 → 65)
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {PED_QUAD_6.map((num) => renderMobileTooth(num, true))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع الثامن: يمين الطفل (85 ← 81)
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {PED_QUAD_8.map((num) => renderMobileTooth(num, false))}
                </div>
              </div>
              <div className="bg-[#080d19] p-2.5 rounded-lg border border-[var(--border-default)]">
                <span className="text-[10px] text-teal-400 block mb-1 font-medium">
                  الربع السابع: يسار الطفل (71 → 75)
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {PED_QUAD_7.map((num) => renderMobileTooth(num, false))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* عرض الشاشات الأكبر */}
        <div className="hidden md:block py-6 overflow-x-auto">
          <div className="min-w-[800px] flex flex-col items-center justify-center">
            {dentitionTab === "permanent" ? (
              <>
                {/* الفك العلوي الدائم */}
                <div className="pb-6 border-b border-slate-800/80 w-full flex justify-center">
                  <div className="flex items-end justify-center gap-1.5 lg:gap-2">
                    {QUAD_1.map((num) => renderDesktopTooth(num, true))}
                    <div className="w-[1px] h-12 bg-teal-500/30 mx-2 self-end mb-2 shrink-0" />
                    {QUAD_2.map((num) => renderDesktopTooth(num, true))}
                  </div>
                </div>

                {/* الفك السفلي الدائم */}
                <div className="pt-6 w-full flex justify-center">
                  <div className="flex items-start justify-center gap-1.5 lg:gap-2">
                    {QUAD_4.map((num) => renderDesktopTooth(num, false))}
                    <div className="w-[1px] h-12 bg-teal-500/30 mx-2 self-start mt-2 shrink-0" />
                    {QUAD_3.map((num) => renderDesktopTooth(num, false))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* الفك العلوي اللبني */}
                <div className="pb-6 border-b border-slate-800/80 w-full flex justify-center">
                  <div className="flex items-end justify-center gap-2.5 lg:gap-4">
                    {PED_QUAD_5.map((num) => renderDesktopTooth(num, true))}
                    <div className="w-[1px] h-12 bg-teal-500/30 mx-3 self-end mb-2 shrink-0" />
                    {PED_QUAD_6.map((num) => renderDesktopTooth(num, true))}
                  </div>
                </div>

                {/* الفك السفلي اللبني */}
                <div className="pt-6 w-full flex justify-center">
                  <div className="flex items-start justify-center gap-2.5 lg:gap-4">
                    {PED_QUAD_8.map((num) => renderDesktopTooth(num, false))}
                    <div className="w-[1px] h-12 bg-teal-500/30 mx-3 self-start mt-2 shrink-0" />
                    {PED_QUAD_7.map((num) => renderDesktopTooth(num, false))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* تلميح سفلي */}
        <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <span>
            انقر على أي سن لتحديد أسطحه الخمسة وحالته الفردية في الأسفل
          </span>
          <ArrowDown className="w-3.5 h-3.5 text-teal-400 animate-bounce" />
        </div>
      </div>

      {/* 🌟 3. لوحة فحص وتعديل السن المختار + الأسطح الخمسة + الـ Timeline */}
      <div ref={toothDetailsRef} className="scroll-mt-6">
        {selectedTooth ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* الفورم وإجراءات السن والأسطح (6 أجزاء) */}
            <div className="lg:col-span-6 bg-[#0d1527] rounded-xl border border-[var(--border-default)] p-5 space-y-4 shadow-xl">
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
                      {selectedTooth >= 51
                        ? "DECIDUOUS (أطفال)"
                        : "PERMANENT (بالغين)"}
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
                      <span>+ أشعة</span>
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

              {/* مجسم الأسطح الخمسة التفاعلي (Interactive 5-Surface Cross Graphic) */}
              <div className="p-3.5 bg-[#080d19] rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-teal-400" />
                    تحديد الأسطح المصابة / المعالجة (5 Surfaces)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    B: شفوي | L: لساني | M: أنسي | D: وحشي | {centerSurfaceCode}
                    : {isAnteriorTooth ? "قاطع" : "إطباقي"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* المجسم التفاعلي للأسطح */}
                  <div className="relative w-32 h-32 shrink-0 bg-[#070b14] p-1.5 rounded-xl border border-slate-700 flex flex-col justify-between select-none">
                    {/* B - شفوي / دهليزي */}
                    <button
                      type="button"
                      onClick={() => toggleSurface("B")}
                      className={`w-full py-1.5 text-[10px] font-bold rounded transition-all border ${
                        selectedSurfaces.B.selected
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      B (شفوي)
                    </button>

                    {/* الصف الأوسط (M, O/I, D) */}
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSurface("M")}
                        className={`flex-1 py-3 text-[10px] font-bold rounded transition-all border ${
                          selectedSurfaces.M.selected
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        M (أنسي)
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSurface(centerSurfaceCode)}
                        className={`flex-1 py-3 text-[11px] font-black rounded transition-all border ${
                          selectedSurfaces[centerSurfaceCode].selected
                            ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md font-extrabold"
                            : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {centerSurfaceCode}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSurface("D")}
                        className={`flex-1 py-3 text-[10px] font-bold rounded transition-all border ${
                          selectedSurfaces.D.selected
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        D (وحشي)
                      </button>
                    </div>

                    {/* L - لساني / حنكي */}
                    <button
                      type="button"
                      onClick={() => toggleSurface("L")}
                      className={`w-full py-1.5 text-[10px] font-bold rounded transition-all border ${
                        selectedSurfaces.L.selected
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                      }`}
                    >
                      L (لساني)
                    </button>
                  </div>

                  {/* قائمة تفاصيل الأسطح المختارة */}
                  <div className="flex-1 w-full space-y-1.5 text-xs">
                    {Object.entries(selectedSurfaces).filter(
                      ([k, v]) => v.selected,
                    ).length === 0 ? (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        انقر على أي سطح في المجسم أعلاه (أو الإطباقي/المركزي)
                        لتسجيل حشو أو تسوس على سطح محدد بدقة.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {Object.entries(selectedSurfaces)
                          .filter(([_, data]) => data.selected)
                          .map(([sCode, data]) => (
                            <div
                              key={sCode}
                              className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]"
                            >
                              <span className="font-bold text-teal-300">
                                سطح {sCode}
                              </span>
                              <select
                                value={data.condition}
                                onChange={(e) =>
                                  updateSurfaceCondition(sCode, e.target.value)
                                }
                                className="bg-[#070b14] border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none"
                              >
                                {Object.entries(CONDITIONS).map(
                                  ([val, cfg]) => (
                                    <option key={val} value={val}>
                                      {cfg.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* فورم تعديل الحالة العامة للسن */}
              {canEdit && (
                <form onSubmit={handleSubmitTooth} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        حالة السن العامة *
                      </label>
                      <select
                        value={toothForm.condition}
                        onChange={(e) =>
                          setToothForm({
                            ...toothForm,
                            condition: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--bg-chart-input)] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
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
                        مادة العلاج / الحشو
                      </label>
                      <select
                        value={toothForm.material}
                        onChange={(e) =>
                          setToothForm({
                            ...toothForm,
                            material: e.target.value,
                          })
                        }
                        className="w-full bg-[var(--bg-chart-input)] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
                      >
                        {MATERIALS.map((mat) => (
                          <option key={mat.value} value={mat.value}>
                            {mat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      اسم الإجراء الطبي (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: حشو كمبوزيت ضوئي، علاج جذور، كراون زركونيا..."
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
                      rows="2"
                      placeholder="أي ملاحظات سريرية تخص هذا السن أو الأسطح..."
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
                        : "حفظ وتوثيق الحالة في شارت الأسنان"}
                    </span>
                  </button>
                </form>
              )}
            </div>

            {/* الـ Timeline وسجل تطور السن (6 أجزاء) */}
            <div className="lg:col-span-6 bg-[#0d1527] rounded-xl border border-[var(--border-default)] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)] text-xs">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-teal-400" />
                  <span>السجل الطبي للسن #{selectedTooth}</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {toothHistory.length} إجراء موثق
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
                <div className="relative border-r border-[var(--border-default)] pr-5 mr-2 space-y-3.5 max-h-[420px] overflow-y-auto">
                  {toothHistory.map((h) => (
                    <div key={h.id} className="relative group">
                      <div className="absolute -right-[25px] top-2 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-slate-900" />

                      <div className="p-3.5 rounded-xl bg-[var(--bg-chart-input)] border border-[var(--border-default)] text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                CONDITIONS[h.condition]?.badge
                              }`}
                            >
                              {CONDITIONS[h.condition]?.label}
                            </span>
                            {h.surface && (
                              <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-mono">
                                أسطح: {h.surface}
                              </span>
                            )}
                            {h.material && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]">
                                {h.material}
                              </span>
                            )}
                          </div>
                          <span
                            className="text-[11px] text-slate-400 font-mono shrink-0"
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
            اختر سناً من المخطط أعلاه لعرض أسطحه وإجراءاته.
          </div>
        )}
      </div>
    </div>
  );
}
