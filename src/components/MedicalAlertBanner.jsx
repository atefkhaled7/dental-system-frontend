import { AlertOctagon, AlertTriangle } from "lucide-react";

export default function MedicalAlertBanner({ alertSummary, className = "" }) {
  if (!alertSummary || alertSummary.level === "none") {
    return null;
  }

  const isCritical = alertSummary.level === "critical";

  return (
    <div
      dir="rtl"
      className={`rounded-[var(--radius-card)] p-3.5 sm:p-4 border transition-all ${
        isCritical
          ? "bg-rose-500/15 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/40"
          : "bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-md shadow-amber-950/30"
      } ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3">
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isCritical
              ? "bg-rose-500/20 text-rose-400"
              : "bg-amber-500/20 text-amber-400"
          }`}
        >
          {isCritical ? (
            <AlertOctagon className="w-5 h-5 animate-pulse" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isCritical
                  ? "bg-rose-500 text-white"
                  : "bg-amber-500 text-slate-900"
              }`}
            >
              {isCritical ? "تنبيه طبي حرج" : "تنبيه طبي مهم"}
            </span>
            <span className="text-xs sm:text-sm font-bold">
              {isCritical
                ? "تنبيه طبي بالغ الأهمية قبل إجراء أي تدخل جراحي أو وصف أدوية:"
                : "حالة صحية مسجلة تتطلب المتابعة:"}
            </span>
          </div>

          {alertSummary.tags && alertSummary.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {alertSummary.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2.5 py-0.5 rounded-[var(--radius-pill)] font-semibold border ${
                    isCritical
                      ? "bg-rose-500/20 border-rose-500/30 text-rose-100"
                      : "bg-amber-500/20 border-amber-500/30 text-amber-100"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
