import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";

export default function PaymentStatus() {
  return (
    <div
      className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="max-w-md w-full bg-[#0d1527] border border-slate-800 rounded-2xl p-6 text-center shadow-xl space-y-4">
        <CreditCard className="w-14 h-14 text-teal-400 mx-auto" />

        <h1 className="text-xl font-bold">تم استلام عملية الدفع</h1>

        <p className="text-sm text-slate-300 leading-7">
          جارٍ التحقق من حالة العملية وتحديث سجل الفاتورة تلقائياً. في حالة نجاح
          الدفع، سيتم اعتماد المعاملة لدى العيادة.
        </p>

        <p className="text-xs text-slate-500">يمكنك إغلاق هذه الصفحة الآن.</p>

        <Link
          to="/login"
          className="inline-block mt-4 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 rounded-xl text-xs font-semibold transition-colors"
        >
          العودة
        </Link>
      </div>
    </div>
  );
}
