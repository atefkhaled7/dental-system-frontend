import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  ShieldAlert,
  History,
  Filter,
  User,
  Calendar,
  Clock,
  RefreshCw,
  FileText,
  CreditCard,
  UserCheck,
  AlertCircle,
  CalendarCheck,
  Ban,
  Archive,
  RefreshCcw,
} from "lucide-react";
// Mapping عربي موحد لجميع العمليات الحالية في النظام
const ACTION_CONFIG = {
  // المرضى
  CREATE_PATIENT: {
    label: "إضافة مريض جديد",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: UserCheck,
  },
  UPDATE_PATIENT: {
    label: "تعديل بيانات مريض",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    icon: FileText,
  },
  ARCHIVE_PATIENT: {
    label: "أرشفة مريض",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Ban,
  },
  RESTORE_PATIENT: {
    label: "استرجاع مريض مؤرشف",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    icon: RefreshCcw,
  },
  EXPORT_PATIENTS: {
    label: "تصدير قاعدة بيانات المرضى",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: FileText,
  },

  // الفواتير والمدفوعات
  CREATE_INVOICE: {
    label: "إنشاء فاتورة جديدة",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    icon: FileText,
  },
  RECORD_PAYMENT: {
    label: "تحصيل دفعة",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: CreditCard,
  },
  ONLINE_PAYMENT_CONFIRMED: {
    label: "دفع إلكتروني معتمد (Paymob)",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: CreditCard,
  },
  CANCEL_INVOICE: {
    label: "إلغاء فاتورة",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Ban,
  },
  ARCHIVE_INVOICE: {
    label: "أرشفة فاتورة",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: Archive,
  },
  EXPORT_INVOICES: {
    label: "تصدير تقرير الفواتير المالي",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: FileText,
  },

  // المواعيد
  CREATE_APPOINTMENT: {
    label: "حجز موعد جديد",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    icon: Calendar,
  },
  UPDATE_APPOINTMENT_STATUS: {
    label: "تحديث حالة الموعد",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    icon: CalendarCheck,
  },
  RESCHEDULE_APPOINTMENT: {
    label: "تعديل موعد (إعادة جدولة)",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: RefreshCw,
  },
  CANCEL_APPOINTMENT: {
    label: "إلغاء موعد",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Ban,
  },
  DELETE_APPOINTMENT: {
    label: "حذف موعد نهائياً",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Ban,
  },

  // المعامل والصور الطبية
  CREATE_LAB_ORDER: {
    label: "إنشاء طلب معمل",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    icon: FileText,
  },
  UPDATE_LAB_ORDER_STATUS: {
    label: "تحديث حالة طلب معمل",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    icon: RefreshCw,
  },
  UPLOAD_PATIENT_IMAGE: {
    label: "رفع صورة طبية / أشعة",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    icon: FileText,
  },
  ARCHIVE_PATIENT_IMAGE: {
    label: "أرشفة صورة طبية",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Ban,
  },

  // المستخدمين والأمان
  CHANGE_PASSWORD: {
    label: "تغيير كلمة المرور",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: RefreshCw,
  },
  ENABLE_STAFF: {
    label: "تفعيل حساب موظف",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: UserCheck,
  },
  DISABLE_STAFF: {
    label: "إيقاف حساب موظف",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Ban,
  },
  RESET_STAFF_PASSWORD: {
    label: "إعادة تعيين كلمة مرور",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: RefreshCw,
  },
  UPDATE_TREATMENT_PLAN_STATUS: {
    label: "تحديث حالة خطة علاج",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    icon: RefreshCw,
  },
  DELETE_TREATMENT_PLAN_ITEM: {
    label: "حذف بند من خطة علاج",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    icon: Ban,
  },
};

// طرق الدفع المعتمدة في النظام وقاعدة البيانات
const PAYMENT_METHOD_LABELS = {
  cash: "نقداً (كاش)",
  card: "بطاقة بنكية",
  visa: "بطاقة بنكية (فيزا/ماستر)",
  transfer: "تحويل بنكي (InstaPay)",
  bank_transfer: "تحويل بنكي",
  vodafone_cash: "فودافون كاش",
  wallet: "محفظة إلكترونية",
};

// حالات المواعيد بالعربي
const APPOINTMENT_STATUS_LABELS = {
  scheduled: "مجدول",
  confirmed: "مؤكد",
  completed: "مكتمل",
  cancelled: "ملغي",
  no_show: "لم يحضر",
};

// ترجمة أدوار الموظفين
const ROLE_LABELS = {
  SuperAdmin: "مدير النظام العام",
  ClinicAdmin: "مدير العيادة",
  Doctor: "طبيب",
  Receptionist: "استقبال",
};

export default function AuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [entityType, setEntityType] = useState("all");

  const fetchLogs = useCallback(async () => {
    // التحقق من الصلاحية قبل الاستدعاء
    if (user?.role !== "ClinicAdmin") return;

    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
      };

      if (entityType && entityType !== "all") {
        params.entity_type = entityType;
      }

      const res = await api.get("/audit-logs", { params });

      // معالجة البيانات والـ Pagination
      const responseData = res.data;

      const logsData = Array.isArray(responseData?.logs)
        ? responseData.logs
        : [];

      const total = Number(responseData?.pagination?.total || 0);

      setLogs(logsData);
      setTotalCount(total);
    } catch (err) {
      console.error("فشل جلب سجل الرقابة:", err);
      setError(
        err.response?.data?.error ||
          "حدث خطأ أثناء تحميل سجل النشاطات. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, entityType, user?.role]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // حظر الوصول للمستخدمين بخلاف ClinicAdmin
  if (user?.role !== "ClinicAdmin") {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center p-6"
        dir="rtl"
      >
        <div className="bg-[#0d1527] border border-slate-800 max-w-md w-full rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">صلاحية غير كافية</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            سجل الرقابة والنشاطات متاح حصرياً لمدير العيادة (ClinicAdmin) لضمان
            الأمان والخصوصية.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // تنسيق التاريخ والوقت بتوقيت القاهرة
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";

    const d = new Date(dateStr);

    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleString("ar-EG", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // رندر البيانات الإضافية من الـ metadata بشكل نظيف
  const renderMetadataDetails = (action, meta) => {
    if (!meta || typeof meta !== "object" || Object.keys(meta).length === 0) {
      return null;
    }

    switch (action) {
      case "RECORD_PAYMENT": {
        const method =
          PAYMENT_METHOD_LABELS[meta.payment_method] ||
          meta.payment_method ||
          "غير محدد";
        const amt = meta.amount
          ? Number(meta.amount).toLocaleString("en-US")
          : "0";
        return (
          <div className="inline-flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <span className="text-emerald-400 font-semibold">
              المبلغ: {amt} ج.م
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">طريقة الدفع: {method}</span>
          </div>
        );
      }

      case "CREATE_APPOINTMENT": {
        const dateDisplay = meta.appointment_date
          ? formatDateTime(meta.appointment_date)
          : null;
        return (
          <div className="inline-flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
            {dateDisplay && <span>الموعد: {dateDisplay}</span>}
            {meta.duration_minutes && (
              <>
                <span className="text-slate-600">•</span>
                <span>المدة: {meta.duration_minutes} دقيقة</span>
              </>
            )}
          </div>
        );
      }

      case "UPDATE_APPOINTMENT_STATUS": {
        const oldSt =
          APPOINTMENT_STATUS_LABELS[meta.old_status] || meta.old_status || "-";
        const newSt =
          APPOINTMENT_STATUS_LABELS[meta.new_status] || meta.new_status || "-";
        return (
          <div className="inline-flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <span className="text-slate-400">الحالة السابقة: {oldSt}</span>
            <span className="text-slate-500">⬅️</span>
            <span className="text-teal-400 font-medium">الحالية: {newSt}</span>
          </div>
        );
      }

      case "RESCHEDULE_APPOINTMENT": {
        const oldDate = meta.old_appointment_date
          ? formatDateTime(meta.old_appointment_date)
          : null;
        const newDate = meta.new_appointment_date
          ? formatDateTime(meta.new_appointment_date)
          : null;

        const hasDurationChange =
          meta.old_duration_minutes &&
          meta.new_duration_minutes &&
          meta.old_duration_minutes !== meta.new_duration_minutes;

        return (
          <div className="flex flex-col gap-1 mt-1.5 text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 max-w-fit">
            {(oldDate || newDate) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">الموعد: {oldDate || "-"}</span>
                <span className="text-slate-500">⬅️</span>
                <span className="text-amber-400 font-medium">
                  {newDate || "-"}
                </span>
              </div>
            )}
            {hasDurationChange ? (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>المدة: {meta.old_duration_minutes} دقيقة</span>
                <span className="text-slate-500">⬅️</span>
                <span className="text-teal-400 font-medium">
                  {meta.new_duration_minutes} دقيقة
                </span>
              </div>
            ) : meta.new_duration_minutes ? (
              <div className="text-slate-400">
                المدة: {meta.new_duration_minutes} دقيقة
              </div>
            ) : null}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-teal-400" />
            سجل نشاطات العيادة (Audit Trail)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سجل رقابي يوثق العمليات الحساسة التي تمت داخل العيادة.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-[#0d1527] hover:bg-slate-800/80 border border-slate-800 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          تحديث السجل
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0d1527] border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-xs text-slate-400 font-medium">
            تصفية حسب الكيان:
          </span>

          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1); // إعادة التعيين للصفحة الأولى
            }}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-teal-500 transition-colors"
          >
            <option value="all">جميع النشاطات</option>
            <option value="patient">المرضى (Patients)</option>
            <option value="appointment">المواعيد (Appointments)</option>
            {/* في الـ Backend: المدفوعات والفواتير كلها تسجل تحت كيان invoice */}
            <option value="invoice">
              الفواتير والمدفوعات (Invoices & Payments)
            </option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          إجمالي السجلات:{" "}
          <span className="font-bold text-slate-200">{totalCount}</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table / List View */}
      <div className="bg-[#0d1527] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs table-fixed">
            <thead className="bg-[#111827]/70 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="px-4 py-3.5 w-[20%]">العملية</th>
                <th className="px-4 py-3.5 w-[42%]">التفاصيل والوصف</th>
                <th className="px-4 py-3.5 w-[20%]">الموظف المسؤول</th>
                <th className="px-4 py-3.5 w-[18%]">التوقيت (القاهرة)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 text-teal-400 animate-spin" />
                      <span>جاري تحميل سجل النشاطات...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    لا توجد نشاطات مسجلة تطابق التصفية المحددة.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionMeta = ACTION_CONFIG[log.action] || {
                    label: log.action || "إجراء غير محدد",
                    color: "text-slate-400 bg-slate-800 border-slate-700",
                    icon: History,
                  };
                  const ActionIcon = actionMeta.icon;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* نوع العملية */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${actionMeta.color}`}
                          >
                            <ActionIcon className="w-3.5 h-3.5" />
                            {actionMeta.label}
                          </span>
                        </div>
                      </td>

                      {/* التفاصيل والـ Metadata */}
                      <td className="px-4 py-3.5 align-top">
                        <p className="text-slate-200 font-normal leading-relaxed">
                          {log.description}
                        </p>
                        {renderMetadataDetails(log.action, log.metadata)}
                      </td>

                      {/* الموظف المنفذ والدور */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-teal-400 text-xs font-semibold">
                            {log.user_name ? (
                              log.user_name[0]
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="text-slate-200 font-medium text-xs">
                              {log.user_name || "مستخدم غير معروف"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {ROLE_LABELS[log.user_role] ||
                                log.user_role ||
                                "نظام"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* تاريخ العملية */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDateTime(log.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (الزراير على اليمين في الـ RTL) */}
        {!loading && totalCount > 0 && (
          <div className="bg-[#111827]/60 border-t border-slate-800 px-6 py-4 flex items-center justify-between text-sm text-slate-400">
            {/* 1. الزراير على اليمين */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                السابق
              </button>
              <span className="text-xs text-slate-400 px-2">
                صفحة <span className="font-bold text-teal-400">{page}</span> من{" "}
                <span className="font-bold text-slate-200">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                التالي
              </button>
            </div>

            {/* 2. عرض الإجمالي على الشمال */}
            <div className="text-xs">
              عرض{" "}
              <span className="font-bold text-slate-200">{logs.length}</span> من
              أصل <span className="font-bold text-slate-200">{totalCount}</span>{" "}
              نشاط
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
