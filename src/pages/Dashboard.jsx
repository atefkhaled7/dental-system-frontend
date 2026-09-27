import { useAuth } from "../context/AuthContext";
import { Activity, LogOut, User, Shield } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* هيدر الترحيب */}
        <div className="flex items-center justify-between bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                عيادة الأسنان - لوحة التحكم
              </h1>
              <p className="text-slate-400 text-sm">مرحباً بك يا دكتور!</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>

        {/* كارت بيانات المستخدم اللي دخل */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <User className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">اسم المستخدم</span>
            </div>
            <p className="text-xl font-bold text-white">
              {user?.name || "غير معروف"}
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">الصلاحية (Role)</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">
              {user?.role || "Doctor"}
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">حالة الاتصال</span>
            </div>
            <p className="text-xl font-bold text-purple-400">
              متصل بالباك-إند 🟢
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
