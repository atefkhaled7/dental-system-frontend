import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 8) {
      return setErrorMessage("كلمة المرور يجب أن لا تقل عن 8 أحرف");
    }

    if (newPassword !== confirmPassword) {
      return setErrorMessage("كلمتا المرور غير متطابقتين");
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        new_password: newPassword,
      });

      setSuccessMessage(
        response.data?.message ||
          "تمت إعادة تعيين كلمة المرور بنجاح. جاري توجيهك لتسجيل الدخول...",
      );

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error ||
          "رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] relative overflow-hidden flex items-center justify-center p-4">
      {/* توهج جمالي في الخلفية */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-[#0d1527]/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/60 p-8 border border-teal-500/20">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-4 shadow-lg shadow-teal-500/10">
            <Lock className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">
            تعيين كلمة مرور جديدة
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            أدخل كلمة المرور الجديدة لحسابك
          </p>
        </div>

        {/* فحص وجود التوكن */}
        {!token ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-3 text-rose-400 text-sm text-right">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>
                رابط استعادة كلمة المرور غير صالح أو ينقصه رمز التحقق.
              </span>
            </div>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              <span>طلب رابط جديد</span>
            </Link>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-3 text-rose-400 text-sm animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 text-emerald-400 text-sm animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 text-right">
                  كلمة المرور الجديدة
                </label>
                <div className="relative" dir="ltr">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-teal-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#080d19]/80 border border-slate-700/80 rounded-xl px-4 py-3 pl-11 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 text-right">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative" dir="ltr">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-teal-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#080d19]/80 border border-slate-700/80 rounded-xl px-4 py-3 pl-11 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] border border-[var(--primary-base)] hover:border-[var(--primary-hover)] text-white font-semibold py-3.5 rounded-[var(--radius-btn)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ وتعيين كلمة المرور</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لصفحة تسجيل الدخول</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
