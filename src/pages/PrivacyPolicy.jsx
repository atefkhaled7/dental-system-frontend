import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Database,
  ArrowRight,
  EyeOff,
  FileText,
} from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div
      className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] py-10 px-4 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto">
        {/* زر العودة */}
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة لتسجيل الدخول
          </Link>
        </div>

        {/* الهيدر */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[var(--primary-muted)] text-[var(--primary-base)] rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                سياسة الخصوصية وحماية البيانات
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                منصة كوروستا لإدارة عيادات الأسنان (CUROSTA)
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            نلتزم في منصة كوروستا بأعلى معايير الأمان والخصوصية وفقاً لأحكام{" "}
            <b>قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020</b>،
            وأخلاقيات الحفاظ على السرية الطبية. توضح هذه الوثيقة كيفية معالجة
            وحماية بيانات العيادات والمرضى.
          </p>
        </div>

        {/* بنود الخصوصية */}
        <div className="space-y-6">
          {/* بند 1 */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-[var(--text-main)]">
              <Database className="w-5 h-5 text-[var(--primary-base)]" />
              <h2>1. طبيعة الأدوار والمسؤوليات (Controller vs Processor)</h2>
            </div>
            <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside leading-relaxed">
              <li>
                <b>العيادة الطبية (المتحكم في البيانات):</b>
                تحدد العيادة، بحسب طبيعة استخدامها للنظام، أغراض معالجة بيانات
                المرضى وتتحمل مسؤولياتها المتعلقة بها.
              </li>

              <li>
                <b>منصة كوروستا (معالج البيانات):</b>
                توفر المنصة الخدمات التقنية اللازمة لمعالجة البيانات لصالح
                العيادة، وفقًا لطبيعة الخدمة والاتفاق بين الطرفين والالتزامات
                القانونية المنطبقة على كل منهما.
              </li>
            </ul>
          </div>

          {/* بند 2 */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-[var(--text-main)]">
              <EyeOff className="w-5 h-5 text-emerald-400" />
              <h2>2. عدم مشاركة أو بيع البيانات الطبية</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              لا تبيع كوروستا بيانات المرضى أو تستخدمها لأغراض إعلانية. وقد تتم
              معالجة أو تخزين البيانات من خلال مزودي الخدمات التقنية اللازمين
              لتشغيل المنصة، مثل الاستضافة وقاعدة البيانات وتخزين الملفات، وذلك
              في حدود تقديم الخدمة والالتزامات المعمول بها. ويتم توضيح مزودي
              الخدمة المعنيين ومواقع معالجة البيانات وفقًا لإعدادات المنصة
              الفعلية.
            </p>
          </div>

          {/* بند 3 */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-[var(--text-main)]">
              <Lock className="w-5 h-5 text-amber-400" />
              <h2>3. إجراءات الأمان والعزل البرمجي (Security & Isolation)</h2>
            </div>
            <ul className="text-sm text-[var(--text-secondary)] space-y-2 list-disc list-inside leading-relaxed">
              <li>
                عزل بيانات العيادات باستخدام معرف العيادة (clinic_id) والتحقق من
                الصلاحيات للوصول إلى البيانات.
              </li>

              <li>
                تخزين كلمات المرور باستخدام تقنيات التجزئة الآمنة (Password
                Hashing) بدلًا من تخزينها كنص واضح، مع استخدام اتصال آمن عبر
                HTTPS/TLS عند توفره وفرضه في بيئة التشغيل.
              </li>

              <li>
                تخزين الصور والملفات الطبية عبر خدمات التخزين المعتمدة في
                النظام، مع تطبيق ضوابط الوصول المناسبة.
              </li>

              <li>
                تسجيل العمليات الحساسة التي يدعم النظام تتبعها، مثل بعض العمليات
                المالية وتصدير البيانات وتعديل الحسابات.
              </li>
            </ul>
          </div>

          {/* بند 4 */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3 text-lg font-semibold text-[var(--text-main)]">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2>
                4. حقوق العيادة في نقل واسترجاع البيانات (Data Portability)
              </h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              للطبيب والعيادة الحق الكامل في استخراج وتصدير كامل بيانات المرضى
              والفواتير بتنسيق (CSV) في أي وقت، حتى لو انتهت الفترة التجريبية أو
              الاشتراك، ولا تقوم كوروستا باحتجاز أو منع الوصول للبيانات كأداة
              ضغط مالي.
            </p>
          </div>
        </div>

        {/* الفوتر */}
        <div className="mt-8 text-center text-xs text-[var(--text-muted)]">
          آخر تحديث: أكتوبر 2026 | منصة كوروستا - جمهورية مصر العربية
        </div>
      </div>
    </div>
  );
}
