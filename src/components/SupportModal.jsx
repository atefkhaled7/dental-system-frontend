import { useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import {
  LifeBuoy,
  X,
  MessageCircle,
  Send,
  AlertCircle,
  CheckCircle2,
  Bug,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export default function SupportModal({ isOpen, onClose }) {
  const location = useLocation();
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text }

  if (!isOpen) return null;

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  // رقم الواتساب بتاعك كـ SuperAdmin / Support
  const whatsappNumber = "201503076555";
  const categoryLabels = {
    bug: "مشكلة فنية أو عطل (Bug)",
    question: "استفسار أو مساعدة",
    feature: "اقتراح ميزة جديدة",
  };

  const whatsappMessage = encodeURIComponent(
    `*طلب دعم فني - منصة CUROSTA*\n` +
      `• المستخدم: ${user?.name || "غير محدد"}\n` +
      `• الدور: ${user?.role || "غير محدد"}\n` +
      `• الصفحة: ${location.pathname}\n` +
      `• نوع الطلب: ${categoryLabels[category]}\n` +
      `• الوصف: ${message || "(لم يتم كتابة تفاصيل)"}`,
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(null);
    setSubmitting(true);

    try {
      await api.post("/support/tickets", {
        category,
        message,
        page_url: location.pathname,
        browser_info: navigator.userAgent,
        contact_phone: contactPhone || null,
      });

      setStatusMsg({
        type: "success",
        text: "تم إرسال البلاغ بنجاح! سيتواصل معك الدعم الفني قريباً.",
      });
      setMessage("");
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 2000);
    } catch (err) {
      setStatusMsg({
        type: "error",
        text: err.response?.data?.error || "حدث خطأ أثناء إرسال البلاغ",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-[var(--radius-btn)]">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-main)]">
                المساعدة والدعم الفني
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                الصفحة الحالية:{" "}
                <span className="font-mono text-[var(--text-secondary)]">
                  {location.pathname}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-md text-xs flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* تصنيف الطلب */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
              نوع الطلب
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "bug", label: "مشكلة فنية", icon: Bug },
                { id: "question", label: "استفسار", icon: HelpCircle },
                { id: "feature", label: "اقتراح ميزة", icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;
                const active = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-[var(--radius-btn)] border text-xs font-medium transition ${
                      active
                        ? "bg-[var(--primary-base)] text-white border-[var(--primary-base)]"
                        : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* وصف المشكلة */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              تفاصيل المشكلة أو الطلب *
            </label>
            <textarea
              required
              rows={3}
              placeholder="اكتب هنا إيه اللي حصل معاك بالتفصيل..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2.5 text-[var(--text-main)] outline-none focus:border-[var(--primary-base)] text-xs resize-none"
            />
          </div>

          {/* رقم للتواصل */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              رقم هاتف للتواصل (اختياري للرد السريع)
            </label>
            <input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-btn)] p-2.5 text-[var(--text-main)] outline-none focus:border-[var(--primary-base)] text-xs"
            />
          </div>

          {/* أزرار الإرسال والواتساب */}
          <div className="pt-2 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-[var(--radius-btn)] text-xs font-semibold transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              تواصل فوري عبر واتساب
            </a>

            <div className="w-full sm:w-auto flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-3.5 py-2 rounded-[var(--radius-btn)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs"
              >
                إغلاق
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-1/2 sm:w-auto px-4 py-2 bg-[var(--primary-base)] hover:opacity-90 text-white rounded-[var(--radius-btn)] text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "جاري الإرسال..." : "إرسال البلاغ"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
