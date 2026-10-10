import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import api from "../api/axios";
import {
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageCircle,
  Filter,
} from "lucide-react";

export default function BookingRequestsView({ showToast }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [statusFilter, setStatusFilter] = useState("pending");

  // 1. جلب طلبات الحجز مع الـ Pagination والفلترة
  const { data, isLoading } = useQuery({
    queryKey: ["booking-requests", { page, limit, statusFilter }],
    queryFn: async () => {
      const params = {
        page,
        limit,
        status: statusFilter === "all" ? undefined : statusFilter,
      };
      const res = await api.get("/booking-requests", { params });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const requests = data?.booking_requests || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  // 2. الموافقة على طلب الحجز
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/booking-requests/${id}/approve`);
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      showToast(
        resData.message || "تم تأكيد الحجز وإضافته لجدول المواعيد بنجاح",
        "success"
      );
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل تأكيد طلب الحجز", "error");
    },
  });

  // 3. رفض طلب الحجز
  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.patch(`/booking-requests/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      showToast("تم رفض طلب الحجز", "success");
    },
    onError: (err) => {
      showToast(err.response?.data?.error || "فشل رفض طلب الحجز", "error");
    },
  });

  // تنسيق التاريخ والوقت بتوقيت القاهرة
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("ar-EG", {
      timeZone: "Africa/Cairo",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const statusConfig = {
    pending: {
      label: "قيد الانتظار ⏳",
      color:
        "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-text)]/30",
    },
    approved: {
      label: "تمت الموافقة ✅",
      color:
        "bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-text)]/30",
    },
    rejected: {
      label: "مرفوض ❌",
      color:
        "bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-text)]/30",
    },
    expired: {
      label: "منتهي الصلاحية ⏱️",
      color:
        "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]",
    },
  };

  return (
    <div className="space-y-4">
      {/* 🌟 شريط فلاتر الحالات */}
      <div className="flex items-center justify-between gap-3 bg-[var(--bg-app)] p-3 rounded-[var(--radius-card)] border border-[var(--border-default)] flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--primary-base)]" />
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            حالة الطلبات:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: "قيد الانتظار", value: "pending" },
              { label: "المؤكدة", value: "approved" },
              { label: "المرفوضة", value: "rejected" },
              { label: "المنتهية", value: "expired" },
              { label: "الكل", value: "all" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-[var(--radius-btn)] text-xs font-medium transition-colors border ${
                  statusFilter === tab.value
                    ? "bg-[var(--primary-muted)] text-[var(--primary-base)] border-[var(--primary-base)]/40 font-semibold"
                    : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          إجمالي الطلبات:{" "}
          <span className="font-bold text-[var(--text-main)]">
            {pagination.total}
          </span>
        </div>
      </div>

      {/* 🌟 جدول طلبات الحجز */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-card)] overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-[var(--text-secondary)] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-base)]" />
            <span className="text-sm">جاري تحميل طلبات الحجز...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
            <Calendar className="w-10 h-10 stroke-1" />
            <p className="text-sm text-[var(--text-main)] font-semibold">
              لا توجد طلبات حجز مطابقة
            </p>
            <p className="text-xs">
              أي طلب حجز يرسله المريض من صفحة العيادة العامة سيظهر هنا فوراً.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs table-fixed">
              <thead className="bg-[var(--bg-app)] text-[var(--text-table-headers)] border-b border-[var(--border-default)]">
                <tr>
                  <th className="py-3 px-3.5 w-[20%]">بيانات المريض</th>
                  <th className="py-3 px-3.5 w-[18%]">الطبيب المطلوب</th>
                  <th className="py-3 px-3.5 w-[18%]">الخدمة والمدة</th>
                  <th className="py-3 px-3.5 w-[20%]">الموعد المطلوب</th>
                  <th className="py-3 px-3.5 w-[12%]">الحالة</th>
                  <th className="py-3 px-3.5 text-center w-[12%]">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-secondary)]">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-[var(--bg-elevated)]/60 transition-colors"
                  >
                    {/* المريض والتواصل */}
                    <td className="py-3 px-3.5">
                      <p className="font-semibold text-[var(--text-main)] truncate">
                        {req.patient_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="font-mono text-[11px] text-[var(--text-muted)]"
                          dir="ltr"
                        >
                          {req.patient_phone}
                        </span>
                        <a
                          href={`https://wa.me/${
                            req.patient_phone.replace(/\D/g, "").startsWith("2")
                              ? req.patient_phone.replace(/\D/g, "")
                              : `2${req.patient_phone.replace(/\D/g, "")}`
                          }`}
                          target="_blank"
                          rel="noreferrer"
                          title="مراسلة سريعة عبر واتساب"
                          className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      {req.notes && (
                        <p
                          className="text-[10px] text-[var(--text-muted)] mt-1 truncate"
                          title={req.notes}
                        >
                          ملاحظة: {req.notes}
                        </p>
                      )}
                    </td>

                    {/* الطبيب */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5 text-[var(--text-main)] font-medium">
                        <User className="w-3.5 h-3.5 text-[var(--primary-base)] shrink-0" />
                        <span className="truncate">د. {req.doctor_name}</span>
                      </div>
                    </td>

                    {/* الخدمة */}
                    <td className="py-3 px-3.5">
                      <p className="font-medium text-[var(--text-main)] truncate">
                        {req.service_name || "كشف عيادة عام"}
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                        المدة: {req.duration_minutes} دقيقة
                      </span>
                    </td>

                    {/* الموعد المطلوب */}
                    <td className="py-3 px-3.5 text-xs font-mono">
                      <div className="text-[var(--text-main)] font-medium">
                        {formatDateTime(req.requested_date)}
                      </div>
                      {req.status === "pending" && (
                        <span className="text-[10px] text-amber-400 block mt-0.5 font-sans">
                          ينتهي:{" "}
                          {new Date(req.expires_at).toLocaleTimeString(
                            "ar-EG",
                            {
                              timeZone: "Africa/Cairo",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      )}
                    </td>

                    {/* الحالة */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-[var(--radius-pill)] text-[11px] font-medium border whitespace-nowrap ${
                          statusConfig[req.status]?.color || ""
                        }`}
                      >
                        {statusConfig[req.status]?.label || req.status}
                      </span>
                    </td>

                    {/* الإجراءات (موافقة أو رفض) */}
                    <td className="py-3 px-3.5 text-center">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="قبول الحجز وتأكيد الموعد"
                            disabled={
                              approveMutation.isPending ||
                              rejectMutation.isPending
                            }
                            onClick={() => approveMutation.mutate(req.id)}
                            className="p-1.5 hover:bg-[var(--success-bg)] text-[var(--success-text)] rounded-[var(--radius-btn)] transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="رفض طلب الحجز"
                            disabled={
                              approveMutation.isPending ||
                              rejectMutation.isPending
                            }
                            onClick={() => rejectMutation.mutate(req.id)}
                            className="p-1.5 hover:bg-[var(--danger-bg)] text-[var(--danger-text)] rounded-[var(--radius-btn)] transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 🌟 شريط الـ Pagination الموحد */}
        {!isLoading && pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-default)] bg-[#070b14]/50 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-[var(--radius-btn)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                السابق
              </button>
              <span className="text-xs text-[var(--text-secondary)] px-2">
                صفحة <span className="font-bold text-teal-400">{page}</span> من{" "}
                <span className="font-bold text-[var(--text-main)]">
                  {pagination.totalPages}
                </span>
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="px-3.5 py-1.5 rounded-[var(--radius-btn)] border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                التالي
              </button>
            </div>
            <div className="text-xs">
              عرض{" "}
              <span className="font-bold text-[var(--text-main)]">
                {requests.length}
              </span>{" "}
              من أصل{" "}
              <span className="font-bold text-[var(--text-main)]">
                {pagination.total}
              </span>{" "}
              طلب
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
