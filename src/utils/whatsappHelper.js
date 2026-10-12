import api from "../api/axios";

const openWhatsAppLink = async (request, errorMessage) => {
  // فتح التبويب فور ضغط المستخدم لتجنب حظر النوافذ المنبثقة
  const popup = window.open("about:blank", "_blank");

  try {
    const res = await request();
    const url = res.data?.url;

    if (!url) {
      throw new Error("لم يتم إنشاء رابط واتساب صالح");
    }

    if (popup && !popup.closed) {
      popup.location.href = url;
    } else {
      alert(
        "المتصفح منع فتح نافذة جديدة. اسمح بالنوافذ المنبثقة وحاول مرة أخرى.",
      );
    }
  } catch (err) {
    // إغلاق التبويب الفارغ لو فشل طلب الـAPI
    if (popup && !popup.closed) {
      popup.close();
    }

    alert(err.response?.data?.error || err.message || errorMessage);
  }
};

// فتح واتساب موعد
export const sendAppointmentWhatsApp = (appointmentId, type = "confirmation") =>
  openWhatsAppLink(
    () =>
      api.get("/whatsapp/appointment-link", {
        params: {
          appointment_id: appointmentId,
          type,
        },
      }),
    "تعذر إنشاء رابط الواتساب",
  );

// فتح واتساب فاتورة
export const sendInvoiceWhatsApp = (invoiceId) =>
  openWhatsAppLink(
    () =>
      api.get("/whatsapp/invoice-link", {
        params: { invoice_id: invoiceId },
      }),
    "تعذر إنشاء رابط الواتساب للفاتورة",
  );
