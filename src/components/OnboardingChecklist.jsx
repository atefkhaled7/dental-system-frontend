import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/axios";
import {
  CheckCircle2,
  Circle,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function OnboardingChecklist() {
  // const [data, setData] = useState(null);
  // const [loading, setLoading] = useState(true);
  // const [isCollapsed, setIsCollapsed] = useState(false);

  // useEffect(() => {
  //   const fetchStatus = async () => {
  //     try {
  //       const res = await api.get("/clinics/onboarding-status");
  //       setData(res.data);
  //     } catch (err) {
  //       console.error("Failed to load onboarding status:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchStatus();
  // }, []);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const res = await api.get("/clinics/onboarding-status");
      return res.data;
    },
  });
  // لو بنحمل أو الخطوات كلها خلصت (100%) -> متظهرش حاجة
  if (loading || !data || data.is_completed) return null;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] p-4 sm:p-5 mb-6 transition-all">
      {/* 🌟 الهيدر وشريط التقدم */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">
              جاهزية العيادة للتشغيل ({data.completed_count} من{" "}
              {data.total_steps})
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              أكمل الخطوات التالية لبدء استقبال وتنظيم حجوزات المرضى بنجاح.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md hover:bg-[var(--bg-elevated)] transition"
          aria-label="طي القائمة"
        >
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* 🌟 Progress Bar */}
      <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden mb-4">
        <div
          className="bg-[var(--primary-base)] h-full transition-all duration-500 ease-out"
          style={{ width: `${data.progress_percent}%` }}
        />
      </div>

      {/* 🌟 قائمة الخطوات */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--border-default)]">
          {data.steps.map((step) => (
            <div
              key={step.key}
              className={`flex items-center justify-between p-2.5 rounded-[var(--radius-btn)] border text-xs sm:text-sm transition ${
                step.completed
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                  : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                )}
                <span
                  className={
                    step.completed
                      ? "line-through text-emerald-500/80"
                      : "font-medium"
                  }
                >
                  {step.label}
                </span>
              </div>

              {!step.completed &&
                (step.key === "has_profile" ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new Event("curosta:open-clinic-settings"),
                      )
                    }
                    className="flex items-center gap-1 text-xs text-[var(--primary-base)] hover:underline font-semibold shrink-0"
                  >
                    إكمال
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                ) : (
                  <Link
                    to={step.link}
                    className="flex items-center gap-1 text-xs text-[var(--primary-base)] hover:underline font-semibold shrink-0"
                  >
                    إكمال
                    <ArrowLeft className="w-3 h-3" />
                  </Link>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
