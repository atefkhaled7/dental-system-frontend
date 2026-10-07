import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-[#070b14] flex items-center justify-center p-6 text-slate-100"
      dir="rtl"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-teal-950/40">
            <Compass className="w-12 h-12 animate-pulse" />
          </div>

          <span className="absolute -bottom-2 -right-2 text-2xl font-black font-mono text-teal-400 bg-[#0d1527] px-2.5 py-0.5 rounded-lg border border-teal-500/30">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            الصفحة غير موجودة
          </h1>

          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            عذراً، الرابط الذي تحاول الوصول إليه غير صحيح أو تم نقله.
          </p>
        </div>

        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-teal-950/50"
          >
            <Home className="w-4 h-4" />
            <span>العودة للوحة التحكم</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
