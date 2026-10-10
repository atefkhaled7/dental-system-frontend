import React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  AlertTriangle,
  Scale,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function TermsOfService() {
  return (
    <div
      className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] py-10 px-4 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة لتسجيل الدخول
          </Link>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">شروط وأحكام استخدام الخدمة</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                اتفاقية استخدام منصة كوروستا (CUROSTA)
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            باستخدامك لمنصة كوروستا، فإنك تقر وتوافق كطبيب أو منشأة طبية على
            الالتزام بالشروط والبنود الموضحة أدناه، والتي تحكم العلاقة القانونية
            والتقنية بين العيادة والمنصة.
          </p>
        </div>

        <div className="space-y-6">
          {/* إخلاء المسؤولية الطبية */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2>1. إخلاء المسؤولية الطبية الصريح (Medical Disclaimer)</h2>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              منصة كوروستا هي{" "}
              <b>نظام لإدارة السجلات وتنظيم المواعيد والحسابات فقط</b> وليست
              منشأة طبية ولا تقدم تشخيصاً طبياً. القرارات الطبية وتحديد العلاج
              والجرعات تقع على المسؤولية المهنية والقانونية الكاملة للطبيب
              المرخص له بمزاولة مهنة طب وجراحة الفم والأسنان في مصر. المنصة لا
              تتحمل أي مسؤولية عن أي قرارات طبية أو تشخيصات مسجلة على النظام.
            </p>
          </div>

          {/* مسؤولية الحسابات */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-[var(--text-main)]">
              <CheckCircle2 className="w-5 h-5 text-[var(--primary-base)]" />
              <h2>2. مسؤولية إدارة حسابات الطاقم الطبي</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              تتحمل إدارة العيادة (ClinicAdmin) المسؤولية الكاملة عن إنشاء
              وتفويض حسابات الأطباء والرسبشن، وعن إيقاف حسابات أي موظف ينتهي
              عمله بالعيادة. ويلتزم كل مستخدم بالحفاظ على سرية كلمة المرور
              الخاصة به.
            </p>
          </div>

          {/* فترات التجربة والاشتراك */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-[var(--text-main)]">
              <Clock className="w-5 h-5 text-purple-400" />
              <h2>3. قواعد الفترة التجريبية وتجديد الاشتراك</h2>
            </div>
            <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside leading-relaxed">
              <li>
                يحق للعيادة الجديدة فترة تجريبية مجانية (Trial) لمدة 14 يوماً
                بكامل مميزات النظام.
              </li>
              <li>
                عند انتهاء الفترة التجريبية دون تجديد، يتحول النظام تلقائياً إلى{" "}
                <b>وضع القراءة فقط (Read-Only)</b>؛ حيث يتاح للعيادة تصفح وتصدير
                بياناتها دون إمكانية إضافة مرضى أو مواعيد جديدة حتى إتمام
                التجديد.
              </li>
              <li>
                يتم تجميد خدمة الحجز الإلكتروني العام تلقائياً فور انتهاء صلاحية
                الاشتراك لحماية سمعة العيادة ومنع حجز مواعيد غير مؤكدة.
              </li>
            </ul>
          </div>

          {/* الاستخدام القانوني والنزاعات */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-[var(--text-main)]">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2>4. القانون الواجب التطبيق والاختصاص القضائي</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              تخضع هذه الاتفاقية وتفسر وفقاً لأحكام القوانين السارية في جمهورية
              مصر العربية، وتختص المحاكم المصرية بنظر أي نزاع قد ينشأ بخصوص
              استخدام المنصة.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-[var(--text-muted)]">
          منصة كوروستا (CUROSTA) - كود الأنظمة الطبية الرقمية | curosta.com
        </div>
      </div>
    </div>
  );
}
