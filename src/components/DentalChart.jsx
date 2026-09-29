import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  User,
  Loader2,
  Save,
} from "lucide-react";

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

// تحديد نوع السن
const getToothCategory = (num) => {
  const lastDigit = num % 10;
  if (lastDigit === 1 || lastDigit === 2) return "incisor";
  if (lastDigit === 3) return "canine";
  if (lastDigit === 4 || lastDigit === 5) return "premolar";
  return "molar";
};

// الاسم الطبي بالعربي
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

// مكوّن رسم السن التشريحي كـ SVG دقيق
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
      viewBox="0 0 36 60"
      className={`w-full h-full transition-all duration-200 ${
        isMissing ? "opacity-35" : ""
      }`}
      style={{
        transform: isUpper ? "none" : "rotate(180deg)",
      }}
    >
      {/* 1. الجذور (Roots) */}
      {isImplant ? (
        <g stroke="#10b981" strokeWidth="1.5" fill="none">
          <path d="M14 8 L22 8 M13 14 L23 14 M14 20 L22 20 M15 26 L21 26 M18 32 L18 8" />
          <polygon
            points="12,6 24,6 20,32 16,32"
            fill="#064e3b"
            stroke="#10b981"
          />
        </g>
      ) : type === "molar" ? (
        <path
          d="M10 32 C8 20 6 8 9 4 C12 8 15 18 18 24 C21 18 24 8 27 4 C30 8 28 20 26 32 Z"
          fill={isMissing ? "none" : "#0f172a"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      ) : type === "premolar" ? (
        <path
          d="M12 32 C10 20 12 7 15 4 C17 6 18 16 19 22 C20 16 21 6 23 4 C25 8 24 20 22 32 Z"
          fill={isMissing ? "none" : "#0f172a"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      ) : (
        <path
          d="M13 32 C12 18 15 6 18 3 C21 6 24 18 23 32 Z"
          fill={isMissing ? "none" : "#0f172a"}
          stroke={strokeColor}
          strokeWidth="1.3"
        />
      )}

      {/* خط قنوات العصب */}
      {isRCT && !isImplant && (
        <path
          d={
            type === "molar" ? "M11 6 Q14 18 18 28 Q22 18 25 6" : "M18 5 L18 30"
          }
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="2 1"
          fill="none"
        />
      )}

      {/* 2. التاج (Crown) */}
      {type === "molar" ? (
        <path
          d="M6 32 C6 28 10 28 18 28 C26 28 30 28 30 32 C31 40 31 52 28 55 C24 58 12 58 8 55 C5 52 5 40 6 32 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      ) : type === "canine" ? (
        <path
          d="M9 32 C10 28 14 28 18 28 C22 28 26 28 27 32 C28 42 27 50 18 57 C9 50 8 42 9 32 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      ) : type === "incisor" ? (
        <path
          d="M10 32 C10 28 14 28 18 28 C22 28 26 28 26 32 C27 40 27 52 26 55 C23 56 13 56 10 55 C9 52 9 40 10 32 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      ) : (
        <path
          d="M8 32 C8 28 13 28 18 28 C23 28 28 28 28 32 C29 40 29 52 26 55 C22 57 14 57 10 55 C7 52 7 40 8 32 Z"
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
      )}

      {/* تأثيرات الحالات */}
      {isCaries && (
        <ellipse cx="18" cy="42" rx="5" ry="4" fill="#ef4444" opacity="0.9" />
      )}

      {isFilled && (
        <path
          d="M13 38 Q18 36 23 38 Q21 46 18 47 Q15 46 13 38 Z"
          fill="#0284c7"
          stroke="#38bdf8"
          strokeWidth="0.8"
        />
      )}

      {isCrown && (
        <path
          d="M10 33 L26 33 M12 40 L24 40 M14 47 L22 47"
          stroke="#f3e8ff"
          strokeWidth="1"
          opacity="0.6"
        />
      )}

      {isMissing && (
        <g stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
          <line x1="6" y1="10" x2="30" y2="50" />
          <line x1="30" y1="10" x2="6" y2="50" />
        </g>
      )}
    </svg>
  );
}

// أرباع الأسنان بنظام FDI
const QUAD_1 = [18, 17, 16, 15, 14, 13, 12, 11]; // علوي أيمن للمريض (يسار الشاشة)
const QUAD_2 = [21, 22, 23, 24, 25, 26, 27, 28]; // علوي أيسر للمريض (يمين الشاشة)
const QUAD_4 = [48, 47, 46, 45, 44, 43, 42, 41]; // سفلي أيمن للمريض (يسار الشاشة)
const QUAD_3 = [31, 32, 33, 34, 35, 36, 37, 38]; // سفلي أيسر للمريض (يمين الشاشة)

// 🌟 حسابات انحناء القوس الطبيعي وزوايا الميل التشريحية
const ARCH_PROFILE = {
  1: { y: 0, rot: 0 },
  2: { y: 3, rot: 2 },
  3: { y: 8, rot: 4.5 },
  4: { y: 15, rot: 7.5 },
  5: { y: 22, rot: 10.5 },
  6: { y: 30, rot: 13 },
  7: { y: 37, rot: 15 },
  8: { y: 43, rot: 16.5 },
};

export default function DentalChart({ patientId, showToast }) {
  const queryClient = useQueryClient();
  const [selectedTooth, setSelectedTooth] = useState(16);

  const [toothForm, setToothForm] = useState({
    condition: "sound",
    procedure_name: "",
    notes: "",
  });

  // 1. جلب الأسنان المسجلة
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

  // 2. جلب سجل السن المختار
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

  // 3. تحديث حالة السن
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
      if (showToast)
        showToast("تم تحديث السن وتسجيل الإجراء في التاريخ بنجاح", "success");
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

  // 🌟 مكوّن السن مع الميلان الطبيعي وانحناء القوس
  const renderArchTooth = (toothNum, isUpper) => {
    const toothData = teethMap[toothNum];
    const condition = toothData?.condition || "sound";
    const isSelected = selectedTooth === toothNum;
    const digit = toothNum % 10;
    const q = Math.floor(toothNum / 10);
    const profile = ARCH_PROFILE[digit] || { y: 0, rot: 0 };

    // الإزاحة الرأسية (القوس العلوي ينحدر لأسفل الأطراف، السفلي يرتفع لأعلى الأطراف)
    const translateY = isUpper ? profile.y : -profile.y;

    // زاوية الميلان الطبيعية حسب الربع
    let rot = 0;
    if (q === 1) rot = -profile.rot;
    else if (q === 2) rot = profile.rot;
    else if (q === 4) rot = profile.rot;
    else if (q === 3) rot = -profile.rot;

    return (
      <div
        key={toothNum}
        onClick={() => handleSelectTooth(toothNum)}
        style={{
          transform: `translateY(${translateY}px) rotate(${rot}deg)`,
        }}
        className={`group flex flex-col items-center cursor-pointer transition-transform duration-200 select-none ${
          isSelected ? "z-30 scale-110" : "hover:scale-105 z-10"
        }`}
      >
        {/* رقم السن العلوي */}
        {isUpper && (
          <span
            className={`text-[10px] font-mono font-bold mb-1 transition-colors ${
              isSelected
                ? "text-blue-400"
                : "text-slate-500 group-hover:text-slate-300"
            }`}
          >
            {toothNum}
          </span>
        )}

        {/* حاوية الـ SVG والتوهج */}
        <div
          className={`w-7 sm:w-8 md:w-9 h-12 sm:h-14 md:h-15 p-1 rounded-xl transition-all duration-200 ${
            isSelected
              ? "bg-blue-950/50 ring-2 ring-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.6)]"
              : "hover:bg-slate-900/60"
          }`}
        >
          <AnatomicalToothSVG
            toothNumber={toothNum}
            condition={condition}
            isUpper={isUpper}
          />
        </div>

        {/* رقم السن السفلي */}
        {!isUpper && (
          <span
            className={`text-[10px] font-mono font-bold mt-1 transition-colors ${
              isSelected
                ? "text-blue-400"
                : "text-slate-500 group-hover:text-slate-300"
            }`}
          >
            {toothNum}
          </span>
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
      {/* 🌟 1. دليل الحالات المدمج (Compact Legend) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 px-4 py-2 rounded-xl border border-slate-800 text-[11px]">
        <span className="text-slate-400 font-medium">دليل الحالات:</span>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(CONDITIONS).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full border border-slate-700"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-slate-300 font-medium">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 🌟 2. لوحة مخطط الأسنان المتجاوبة (Desktop Arch + Mobile Quadrants) */}
      <div className="bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* مؤشرات الاتجاهات */}
        <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold text-slate-500 px-2 mb-2 select-none">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
            يمين المريض (R)
          </span>
          <span className="text-slate-600 font-medium text-[9px] sm:text-[10px] tracking-widest uppercase">
            FDI 32 Teeth
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            يسار المريض (L)
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
          </span>
        </div>

        {/* 🦷 الفك العلوي (Maxilla) */}
        <div className="pt-2 pb-6 md:pb-12 border-b border-slate-900">
          <span className="text-[10px] text-slate-500 block text-center mb-2 font-medium md:hidden">
            الفك العلوي
          </span>
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-0">
            {/* ربع 1 (18 -> 11) */}
            <div className="flex justify-center items-end gap-1 sm:gap-1.5 w-full md:w-auto">
              {QUAD_1.map((num) => renderArchTooth(num, true))}
            </div>

            {/* فاصل خط المنتصف */}
            <div className="hidden md:block w-[1px] h-8 bg-blue-500/20 mx-1 self-end mb-2 shrink-0" />

            {/* ربع 2 (21 -> 28) */}
            <div className="flex justify-center items-end gap-1 sm:gap-1.5 w-full md:w-auto">
              {QUAD_2.map((num) => renderArchTooth(num, true))}
            </div>
          </div>
        </div>

        {/* 🦷 الفك السفلي (Mandible) */}
        <div className="pt-6 md:pt-12 pb-2">
          <span className="text-[10px] text-slate-500 block text-center mb-2 font-medium md:hidden">
            الفك السفلي
          </span>
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-0">
            {/* ربع 4 (48 -> 41) */}
            <div className="flex justify-center items-start gap-1 sm:gap-1.5 w-full md:w-auto">
              {QUAD_4.map((num) => renderArchTooth(num, false))}
            </div>

            {/* فاصل خط المنتصف */}
            <div className="hidden md:block w-[1px] h-8 bg-blue-500/20 mx-1 self-start mt-2 shrink-0" />

            {/* ربع 3 (31 -> 38) */}
            <div className="flex justify-center items-start gap-1 sm:gap-1.5 w-full md:w-auto">
              {QUAD_3.map((num) => renderArchTooth(num, false))}
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 3. فحص وتعديل السن المختار + السجل التاريخي (Tooth Inspector & Timeline) */}
      {selectedTooth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          {/* تعديل حالة السن */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>السن رقم:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono text-xs">
                    #{selectedTooth}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    {getToothArabicName(selectedTooth)}
                  </span>
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
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

            <form onSubmit={handleSubmitTooth} className="space-y-3">
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
                  placeholder="مثال: حشو كومبوزيت ضوئي، علاج جذور جلسة 1..."
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
                  placeholder="مثال: تسوس عميق، ألم مع الساخن والبارد..."
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
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-md shadow-blue-600/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {updateToothMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ الحالة وتوثيق الإجراء"}
                </span>
              </button>
            </form>
          </div>

          {/* سجل السن (Tooth Timeline) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <History className="w-3.5 h-3.5 text-purple-400" />
              سجل تطور السن #{selectedTooth} (Timeline)
            </h4>

            {isLoadingHistory ? (
              <div className="py-6 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : toothHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800/80">
                لا توجد حركات مسجلة سابقاً لهذا السن.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
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
