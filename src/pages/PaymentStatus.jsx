import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, CreditCard } from "lucide-react";

export default function PaymentStatus() {
  const [searchParams] = useSearchParams();

  // قراءة المعاملات الشائعة من بوابات الدفع (Paymob / غيرها)
  const successParam = searchParams.get("success");
  const pendingParam = searchParams.get("pending");
  const txnId = searchParams.get("id") || searchParams.get("transaction_id");
  const errorMessage =
    searchParams.get("data.message") ||
    searchParams.get("message") ||
    searchParams.get("txn_response_code");

  // تصنيف الحالة
  const isSuccess = successParam === "true";
  const isFailed =
    successParam === "false" || searchParams.get("error_occured") === "true";
  const isPending = pendingParam === "true";

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  return (
    <div
      className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4 font-sans"
      dir="rtl"
    >
      <div className="max-w-md w-full bg-[#0d1527] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5">
        {/* 1. حالة النجاح */}
        {isSuccess && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h1 className="text-2xl font-bold text-white">تم الدفع بنجاح</h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              تم تأكيد العملية بنجاح واعتماد سداد الفاتورة لدى العيادة.
            </p>

            {txnId && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400">
                <span>رقم المعاملة: </span>
                <span className="font-mono text-slate-200">#{txnId}</span>
              </div>
            )}

            <p className="text-xs text-slate-500">
              شكراً لثقتكم، يمكنك إغلاق هذه الصفحة الآن بأمان.
            </p>

            <button
              onClick={handleClose}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20"
            >
              إغلاق النافذة
            </button>
          </>
        )}

        {/* 2. حالة الفشل */}
        {isFailed && (
          <>
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-10 h-10" />
            </div>

            <h1 className="text-2xl font-bold text-white">
              لم تكتمل عملية الدفع
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              تم رفض العملية أو تعذر إتمام المعاملة من قِبل البنك المصدر
              للبطاقة.
              {errorMessage && (
                <span className="block mt-2 text-rose-300 text-xs font-mono">
                  السبب: {errorMessage}
                </span>
              )}
            </p>

            <p className="text-xs text-slate-500">
              يرجى إعادة المحاولة ببطاقة أخرى، أو التواصل مع إدارة العيادة
              لتسديد الفاتورة.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.history.back()}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-all"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={handleClose}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all"
              >
                إغلاق
              </button>
            </div>
          </>
        )}

        {/* 3. حالة الانتظار أو الحالة العامة */}
        {!isSuccess && !isFailed && (
          <>
            <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mx-auto text-teal-400">
              {isPending ? (
                <Clock className="w-10 h-10 animate-pulse" />
              ) : (
                <CreditCard className="w-10 h-10" />
              )}
            </div>

            <h1 className="text-xl font-bold text-white">
              {isPending ? "العملية قيد المعالجة" : "تفاصيل المعاملة"}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {isPending
                ? "جاري تأكيد عملية الدفع من البنك. سيتم تحديث حالة الفاتورة تلقائياً لدى العيادة فور التأكيد."
                : "جارٍ التحقق من حالة المعاملة. يمكنك مراجعة العيادة للتأكد من حالة السداد."}
            </p>

            <p className="text-xs text-slate-500">
              يمكنك إغلاق هذه الصفحة الآن.
            </p>

            <button
              onClick={handleClose}
              className="w-full mt-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all"
            >
              إغلاق
            </button>
          </>
        )}
      </div>
    </div>
  );
}
