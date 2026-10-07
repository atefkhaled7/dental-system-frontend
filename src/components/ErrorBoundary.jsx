import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div
            className="bg-[#0d1527] border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-5 text-center"
            dir="rtl"
          >
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-100">
                حدث خطأ غير متوقع أثناء عرض الصفحة
              </h2>

              <p className="text-xs text-slate-400 leading-relaxed">
                لا تقلق، يمكنك إعادة تحميل الصفحة والمحاولة مرة أخرى، أو العودة
                إلى لوحة التحكم.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-teal-950/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={this.handleHome}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#111827] hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
