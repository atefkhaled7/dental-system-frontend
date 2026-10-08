import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Calendar,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  MessageCircle,
  Check,
} from "lucide-react";

const getCairoToday = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
};

export default function PublicClinicProfile() {
  const { slug } = useParams();

  // بيانات الحجز
  const [selectedService, setSelectedService] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState(getCairoToday());
  const [selectedSlot, setSelectedSlot] = useState(null); // { time, iso }
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientFax, setPatientFax] = useState("");
  const [notes, setNotes] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // 1. جلب بيانات العيادة والأطباء والخدمات
  const {
    data: clinicData,
    isLoading: isClinicLoading,
    isError: isClinicError,
  } = useQuery({
    queryKey: ["public-clinic", slug],
    queryFn: async () => {
      const res = await api.get(`/public/clinics/${slug}`);
      return res.data;
    },
    retry: 1,
  });

  const clinic = clinicData?.clinic;
  const doctors = clinicData?.doctors || [];
  const services = clinicData?.services || [];

  // 2. جلب الـ Slots المتاحة بناءً على الدكتور والخدمة والتاريخ المختارين
  const { data: slotsData, isLoading: isSlotsLoading } = useQuery({
    queryKey: [
      "public-slots",
      slug,
      selectedDoctor,
      selectedDate,
      selectedService,
    ],
    queryFn: async () => {
      if (!selectedDoctor || !selectedDate) return null;
      const res = await api.get(`/public/clinics/${slug}/slots`, {
        params: {
          doctor_id: selectedDoctor,
          date: selectedDate,
          procedure_id: selectedService || undefined,
        },
      });
      return res.data;
    },
    enabled: !!selectedDoctor && !!selectedDate,
  });

  const availableSlots = slotsData?.slots || [];

  // 3. إرسال طلب الحجز
  const bookingMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(
        `/public/clinics/${slug}/booking-requests`,
        payload
      );
      return res.data;
    },
    onSuccess: (data) => {
      setBookingSuccess(data.booking_request);
      setErrorMessage("");
    },
    onError: (err) => {
      setErrorMessage(
        err.response?.data?.error ||
          "حدث خطأ أثناء إرسال طلب الحجز، يرجى المحاولة مرة أخرى."
      );
    },
  });

  const handleSubmitBooking = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedDoctor) {
      setErrorMessage("يرجى اختيار الطبيب المعالج");
      return;
    }
    if (!selectedSlot) {
      setErrorMessage("يرجى اختيار الوقت المناسب من المواعيد المتاحة");
      return;
    }
    if (!patientName.trim() || patientName.trim().length < 2) {
      setErrorMessage("يرجى إدخال اسم المريض بشكل صحيح");
      return;
    }
    const cleanPhone = patientPhone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setErrorMessage("يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)");
      return;
    }

    bookingMutation.mutate({
      doctor_id: selectedDoctor,
      procedure_id: selectedService || null,
      requested_date: selectedSlot.iso,
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim(),
      notes: notes.trim() || null,
      fax_number: patientFax,
    });
  };

  if (isClinicLoading) {
    return (
      <div
        className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-400 gap-3"
        dir="rtl"
      >
        <Loader2 className="w-9 h-9 animate-spin text-teal-400" />
        <span className="text-sm font-medium">جاري تحميل صفحة العيادة...</span>
      </div>
    );
  }

  if (isClinicError || !clinic) {
    return (
      <div
        className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 text-center text-slate-300"
        dir="rtl"
      >
        <div className="w-14 h-14 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">
          العيادة غير موجودة أو الرابط غير صالح
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          تأكد من كتابة الرابط بشكل صحيح، أو تواصل مع إدارة العيادة للحصول على
          الرابط الرسمي للحجز.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-slate-900 border border-slate-800 text-teal-400 text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  // 🌟 شاشة النجاح وتأكيد الحجز
  if (bookingSuccess) {
    return (
      <div
        className="min-h-screen bg-[#070b14] flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="bg-[#0d1527] border border-teal-500/30 max-w-lg w-full rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-bold text-teal-400 tracking-wider uppercase">
              تم استلام طلبك بنجاح
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              شكراً لك، {bookingSuccess.patient_name}
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              طلب الحجز الخاص بك في{" "}
              <strong className="text-white">{clinic.name}</strong> قيد المراجعة
              حالياً. سيقوم فريق العيادة بالتواصل معك لتأكيد الموعد.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs text-right space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">العيادة:</span>
              <span className="text-white font-semibold">{clinic.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الموعد المطلوب:</span>
              <span className="text-teal-400 font-mono font-bold">
                {new Date(bookingSuccess.requested_date).toLocaleString(
                  "ar-EG",
                  {
                    timeZone: "Africa/Cairo",
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">طريقة الدفع:</span>
              <span className="text-emerald-400 font-bold">
                نقداً في مقر العيادة (Cash at Clinic)
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {clinic.phone_number && (
              <a
                href={`https://wa.me/2${clinic.phone_number.replace(
                  /\D/g,
                  ""
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>مراسلة العيادة واتساب</span>
              </a>
            )}
            <button
              onClick={() => {
                setBookingSuccess(null);
                setSelectedSlot(null);
                setPatientName("");
                setPatientPhone("");
                setNotes("");
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-colors"
            >
              حجز موعد آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between"
      dir="rtl"
    >
      {/* 🌟 1. الهيدر العام للعيادة */}
      <header className="border-b border-slate-800/80 bg-[#0a0f1d]/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-md shadow-teal-500/10 font-bold text-lg">
              {clinic.name[0]}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
                {clinic.name}
              </h1>
              <p className="text-[11px] text-teal-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                حجز موعد أونلاين
              </p>
            </div>
          </div>

          {clinic.phone_number && (
            <a
              href={`tel:${clinic.phone_number}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs transition-colors font-mono"
              dir="ltr"
            >
              <Phone className="w-3.5 h-3.5 text-teal-400" />
              <span>{clinic.phone_number}</span>
            </a>
          )}
        </div>
      </header>

      {/* 🌟 2. المحتوى الرئيسي والفورم */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 w-full space-y-6">
        {/* كارت نبذة العيادة */}
        <div className="bg-[#0d1527] border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              مرحباً بكم في {clinic.name}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              {clinic.bio}
            </p>
          </div>
          {clinic.address && (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 shrink-0">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{clinic.address}</span>
            </div>
          )}
        </div>

        {/* فورم خطوات الحجز */}
        <form
          onSubmit={handleSubmitBooking}
          className="bg-[#0d1527] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6"
        >
          <div className="border-b border-slate-800/80 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              احجز موعدك في خطوات بسيطة
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              اختر الخدمة والطبيب والوقت المناسب، والدفع يتم نقداً عند الحضور
              للعيادة.
            </p>
          </div>
          {/* الخطوة 1: اختيار الخدمة / الإجراء */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              1. اختر نوع الكشف أو الخدمة:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              <div
                onClick={() => {
                  setSelectedService("");
                  setSelectedSlot(null);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                  selectedService === ""
                    ? "bg-teal-500/10 border-teal-500/50 text-teal-300 shadow-sm shadow-teal-500/10"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <div>
                  <p className="font-semibold text-white">كشف واستشارة عامة</p>
                  <span className="text-[10px] text-slate-400">
                    فحص شامل للأسنان
                  </span>
                </div>
                {selectedService === "" && (
                  <Check className="w-4 h-4 text-teal-400 shrink-0" />
                )}
              </div>

              {services.map((svc) => (
                <div
                  key={svc.id}
                  onClick={() => {
                    setSelectedService(svc.id);
                    setSelectedSlot(null);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    selectedService === svc.id
                      ? "bg-teal-500/10 border-teal-500/50 text-teal-300 shadow-sm shadow-teal-500/10"
                      : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-white">
                      {svc.description}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {svc.duration_minutes
                        ? `${svc.duration_minutes} دقيقة • `
                        : ""}
                      {Number(svc.default_price).toLocaleString("en-US")} ج.م
                    </span>
                  </div>
                  {selectedService === svc.id && (
                    <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* الخطوة 2: اختيار الطبيب المعالج */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              2. اختر الطبيب المعالج:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctor(doc.id);
                    setSelectedSlot(null);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    selectedDoctor === doc.id
                      ? "bg-teal-500/10 border-teal-500/50 text-teal-300 shadow-sm shadow-teal-500/10"
                      : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-teal-400 flex items-center justify-center font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">د. {doc.name}</p>
                      <span className="text-[10px] text-slate-400">
                        طبيب أسنان متخصص
                      </span>
                    </div>
                  </div>
                  {selectedDoctor === doc.id && (
                    <Check className="w-4 h-4 text-teal-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* الخطوة 3: اختيار التاريخ والموعد المتاح */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              3. اختر تاريخ وتوقيت الكشف:
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="date"
                min={getCairoToday()}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 transition-colors cursor-pointer"
              />
              <span className="text-xs text-slate-500">
                {selectedDoctor
                  ? "اختر يوماً لمشاهدة المواعيد المتاحة لدى الطبيب"
                  : "يرجى اختيار الطبيب أولاً لإظهار المواعيد"}
              </span>
            </div>

            {/* الأوقات المتاحة */}
            {selectedDoctor && (
              <div className="pt-2">
                {isSlotsLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span>جاري حساب الأوقات المتاحة...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-amber-400/90">
                    {slotsData?.reason ||
                      "لا توجد مواعيد متاحة في هذا اليوم، يرجى اختيار تاريخ آخر أو طبيب آخر."}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableSlots.map((slot, index) => {
                      const isSelected = selectedSlot?.iso === slot.iso;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-1 text-center rounded-xl border text-xs font-mono font-medium transition-all ${
                            isSelected
                              ? "bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-md shadow-teal-500/20 scale-[1.02]"
                              : "bg-slate-900/80 border-slate-800 text-slate-200 hover:border-teal-500/40 hover:bg-slate-800"
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* الخطوة 4: بيانات المريض */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <label className="block text-xs font-semibold text-slate-300">
              4. بيانات المريض للتواصل:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  الاسم بالكامل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="محمد أحمد عبد الرحمن"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-colors placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  رقم الهاتف (موبايل) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 transition-colors placeholder-slate-600"
                  dir="ltr"
                />
              </div>
            </div>
            {/* حقل فخ البوتات - مخفي تماماً */}
            <div style={{ display: "none" }} aria-hidden="true">
              <input
                type="text"
                name="fax_number"
                value={patientFax}
                onChange={(e) => setPatientFax(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                ملاحظات أو شكوى الأسنان (اختياري)
              </label>
              <textarea
                rows="2"
                placeholder="مثال: ألم في الضرس العلوي، متابعة تقويم، تنظيف جير..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-colors placeholder-slate-600"
              ></textarea>
            </div>
          </div>
          {/* رسائل الخطأ */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {/* زر التأكيد */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={bookingMutation.isPending}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {bookingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>جاري إرسال طلب الحجز...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد طلب الحجز (الدفع كاش في العيادة)</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-2">
              الحجز مجاني وبدون دفع إلكتروني مسبق. يتم تحصيل الرسوم في مقر
              العيادة عند الزيارة.
            </p>
          </div>
        </form>
      </main>

      {/* 🌟 3. الفوتر البسيط */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        مدعوم بواسطة منصة{" "}
        <a
          href="https://curosta.com"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-teal-400 hover:text-teal-300 hover:underline transition-colors inline-block"
        >
          CUROSTA
        </a>{" "}
        لإدارة عيادات الأسنان
      </footer>
    </div>
  );
}
