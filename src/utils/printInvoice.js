export const escapeHtml = (str) => {
  if (str === null || str === undefined) return "";

  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const printInvoice = (inv, clinic = {}) => {
  if (!inv) return false;

  const printWindow = window.open("", "_blank", "width=850,height=900");

  if (!printWindow) {
    alert(
      "المتصفح منع فتح نافذة الطباعة. من فضلك اسمح بالنوافذ المنبثقة لهذا الموقع من إعدادات المتصفح ثم حاول تاني."
    );
    return false;
  }

  // بيانات العيادة الحالية
  const rawClinicName =
    inv.clinic_name || clinic.name || "عيادة طب وجراحة الأسنان";

  const rawClinicPhone = inv.clinic_phone || clinic.phone || "";

  const rawClinicAddress = inv.clinic_address || clinic.address || "";

  const safeClinicName = escapeHtml(rawClinicName);
  const safeClinicPhone = escapeHtml(rawClinicPhone);
  const safeClinicAddress = escapeHtml(rawClinicAddress);

  // بيانات الفاتورة
  const safePatientName = escapeHtml(inv.patient_name);
  const safePatientPhone = escapeHtml(inv.patient_phone || "-");
  const safeDoctorName = escapeHtml(inv.doctor_name || "كشف عام");
  const safeInvoiceId = escapeHtml(inv.id);

  // حالة الفاتورة
  const safeStatus =
    inv.status === "paid"
      ? "مدفوعة بالكامل"
      : inv.status === "partially_paid"
      ? "مدفوعة جزئياً"
      : inv.status === "cancelled"
      ? "ملغاة"
      : "غير مدفوعة";

  // تاريخ الفاتورة بتوقيت القاهرة
  const invoiceDate = new Date(inv.created_at);

  const formattedInvoiceDate = Number.isNaN(invoiceDate.getTime())
    ? "-"
    : invoiceDate.toLocaleDateString("en-GB", {
        timeZone: "Africa/Cairo",
      });

  // التأكد أن items عبارة عن Array
  const invoiceItems =
    Array.isArray(inv.items) && inv.items.length > 0
      ? inv.items
      : [
          {
            description: "كشف وعلاج أسنان",
            quantity: 1,
            unit_price: inv.total_amount,
            total_price: inv.total_amount,
          },
        ];

  // بيانات الأرقام
  const totalAmount = Number(inv.total_amount) || 0;
  const paidAmount = Number(inv.paid_amount) || 0;
  const remainingAmount = Number(inv.remaining_amount) || 0;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>فاتورة علاج #${safeInvoiceId}</title>

        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #0f172a;
            margin: 0;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }

          .clinic-name {
            font-size: 26px;
            font-weight: bold;
            color: #0f766e;
            margin-bottom: 4px;
          }

          .clinic-contact {
            font-size: 13px;
            color: #475569;
            margin-bottom: 8px;
            font-weight: 500;
          }

          .sub {
            font-size: 13px;
            color: #64748b;
          }

          .meta-box {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 25px;
            font-size: 13px;
            line-height: 1.8;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
          }

          th,
          td {
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 14px;
            text-align: right;
            font-size: 13px;
          }

          th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
          }

          .summary {
            width: 320px;
            margin-right: auto;
            margin-left: 0;
            font-size: 14px;
            margin-top: 20px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #cbd5e1;
          }

          .total {
            font-weight: bold;
            font-size: 17px;
            color: #0f766e;
            border-top: 2px solid #0f172a;
            border-bottom: none;
            padding-top: 10px;
            margin-top: 6px;
          }

          .footer {
            text-align: center;
            margin-top: 50px;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            line-height: 1.6;
          }

          .branding {
            font-size: 10px;
            color: #cbd5e1;
            margin-top: 6px;
          }

          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div class="clinic-name">
            ${safeClinicName}
          </div>

          ${
            safeClinicPhone || safeClinicAddress
              ? `
                <div class="clinic-contact">
                  ${
                    safeClinicPhone
                      ? `<span>هاتف / واتساب: ${safeClinicPhone}</span>`
                      : ""
                  }

                  ${safeClinicPhone && safeClinicAddress ? " • " : ""}

                  ${
                    safeClinicAddress
                      ? `<span>العنوان: ${safeClinicAddress}</span>`
                      : ""
                  }
                </div>
              `
              : ""
          }

          <div class="sub">
            فاتورة علاج رقم #${safeInvoiceId}
            • بتاريخ ${formattedInvoiceDate}
          </div>
        </div>

        <div class="meta-box">
          <div>
            <strong>اسم المريض:</strong>
            ${safePatientName}
            <br />

            <strong>رقم الهاتف:</strong>
            ${safePatientPhone}
            <br />
          </div>

          <div>
            <strong>الطبيب المعالج:</strong>
            د. ${safeDoctorName}
            <br />

            <strong>حالة الفاتورة:</strong>
            ${safeStatus}
            <br />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>البند / الخدمة</th>
              <th style="text-align: center;">
                الكمية
              </th>
              <th style="text-align: left;">
                سعر الوحدة
              </th>
              <th style="text-align: left;">
                الإجمالي
              </th>
            </tr>
          </thead>

          <tbody>
            ${invoiceItems
              .map((it) => {
                const quantity = Number(it.quantity) || 1;

                const unitPrice = Number(it.unit_price) || 0;

                const totalPrice = Number(it.total_price) || 0;

                return `
                  <tr>
                    <td>
                      ${escapeHtml(it.description || "-")}
                    </td>

                    <td style="text-align: center;">
                      ${quantity}
                    </td>

                    <td style="text-align: left;">
                      ${unitPrice.toLocaleString("en-US")} ج.م
                    </td>

                    <td
                      style="
                        text-align: left;
                        font-weight: bold;
                      "
                    >
                      ${totalPrice.toLocaleString("en-US")} ج.م
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>إجمالي الفاتورة:</span>

            <span>
              ${totalAmount.toLocaleString("en-US")} ج.م
            </span>
          </div>

          <div
            class="summary-row"
            style="color: #059669;"
          >
            <span>المدفوع:</span>

            <span>
              ${paidAmount.toLocaleString("en-US")} ج.م
            </span>
          </div>

          <div
            class="summary-row total"
            style="color: #dc2626;"
          >
            <span>المتبقي:</span>

            <span>
              ${remainingAmount.toLocaleString("en-US")} ج.م
            </span>
          </div>
        </div>

        <div class="footer">
          <div>
            نتمنى لكم دوام الصحة والعافية •
            نسعد دائماً بخدمتكم
          </div>

          <div class="branding">
            تم الإصدار عبر منصة CUROSTA لإدارة العيادات
          </div>
        </div>

        <script>
          window.onload = function () {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();

  return true;
};
