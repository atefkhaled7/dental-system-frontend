import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const redirectPath =
        result.user?.role === "SuperAdmin" ? "/clinics" : "/";

      navigate(redirectPath, { replace: true });
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] relative overflow-hidden flex items-center justify-center p-4">
      {/* توهج جمالي هادئ في الخلفية (Ambient Glowing Orbs) */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* كارت تسجيل الدخول الأساسي */}
      <div className="relative max-w-md w-full bg-[#0d1527]/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/60 p-8 border border-teal-500/20">
        {/* ترويسة اللوجو والبراند */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-4 shadow-lg shadow-teal-500/10">
            {/* لوجو CUROSTA المخصص (رمز السن مع نبض الرعاية) */}
            <svg
              className="w-9 h-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2C7.5 2 4 4.5 4 8.5c0 3 1.5 6 3 9.5 1 2.3 2 4 3 4s1.5-3 2-4c.5 1 1 4 2 4s2-1.7 3-4c1.5-3.5 3-6.5 3-9.5C20 4.5 16.5 2 12 2z" />
              <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0" />
            </svg>
          </div>

          <h1 className="text-2xl font-black tracking-wider text-white">
            CUROSTA
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            نظام إدارة العيادات والمراكز الطبية
          </p>
        </div>

        {/* رسالة الخطأ لو البيانات غير صحيحة */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-3 text-rose-400 text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* فورم تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 text-right">
              البريد الإلكتروني
            </label>
            <div className="relative" dir="ltr">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-teal-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@curosta.com"
                className="w-full bg-[#080d19]/80 border border-slate-700/80 rounded-xl px-4 py-3 pl-11 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 text-right">
              كلمة المرور
            </label>
            <div className="relative" dir="ltr">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-teal-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#080d19]/80 border border-slate-700/80 rounded-xl px-4 py-3 pl-11 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all text-sm"
              />
            </div>
          </div>

          {/* زر الدخول المتدرج بألوان Muted Teal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] border border-[var(--primary-base)] hover:border-[var(--primary-hover)] text-white font-semibold py-3.5 rounded-[var(--radius-btn)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>
        </form>
        {/* روابط الشروط والخصوصية */}
        <p className="text-xs text-center text-slate-400 mt-4 leading-relaxed">
          بتسجيل الدخول، أنت توافق على{" "}
          <Link
            to="/terms"
            className="underline hover:text-white transition-colors"
          >
            شروط الاستخدام
          </Link>{" "}
          و{" "}
          <Link
            to="/privacy"
            className="underline hover:text-white transition-colors"
          >
            سياسة الخصوصية
          </Link>
        </p>
        {/* فوتر بسيط */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            © 2026 CUROSTA جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
