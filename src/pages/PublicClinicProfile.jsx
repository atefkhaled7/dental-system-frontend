import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  MessageCircle,
  Check,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  Image as ImageIcon,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
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
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
};

const ARABIC_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function PublicClinicProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // بيانات الحجز
  const [selectedService, setSelectedService] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState(getCairoToday());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientFax, setPatientFax] = useState("");
  const [notes, setNotes] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [openFaqId, setOpenFaqId] = useState(null);

  // Cloudflare Turnstile ضد البوتات
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  // 1. جلب بيانات الموقع العام للعيادة
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

  // تحويل 301 تلقائي إذا دخل المريض عبر رابط قديم في slug_history
  useEffect(() => {
    if (clinicData?.redirect_301 && clinicData.redirect_301 !== slug) {
      navigate(`/c/${clinicData.redirect_301}`, { replace: true });
    }
  }, [clinicData?.redirect_301, slug, navigate]);

  // حقن وسوم الـ SEO و JSON-LD (نوع Dentist) في المتصفح
  useEffect(() => {
    if (!clinicData?.seo) return;
    const { title, description, json_ld } = clinicData.seo;
    if (title) document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    if (description) metaDesc.content = description;

    let scriptTag = document.getElementById("clinic-json-ld");
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "clinic-json-ld";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    if (json_ld) {
      scriptTag.textContent = JSON.stringify(json_ld);
    }

    return () => {
      const existingScript = document.getElementById("clinic-json-ld");
      if (existingScript) existingScript.remove();
    };
  }, [clinicData?.seo]);

  const clinic = clinicData?.clinic;
  const doctors = clinicData?.doctors || [];
  const services = clinicData?.services || [];
  const gallery = clinicData?.gallery || [];
  const faqs = clinicData?.faqs || [];
  const testimonials = clinicData?.testimonials || [];
  const workingHours = clinicData?.working_hours || [];

  // اختيار الطبيب تلقائياً إذا كانت العيادة تضم طبيباً واحداً فقط
  useEffect(() => {
    if (doctors.length === 1 && !selectedDoctor) {
      setSelectedDoctor(doctors[0].id);
    }
  }, [doctors, selectedDoctor]);

  // إعداد وتفعيل Cloudflare Turnstile إذا كان Site Key متوفراً في البيئة
  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return;

    const renderWidget = () => {
      if (!window.turnstile || !turnstileRef.current) return;
      if (widgetIdRef.current !== null) return;

      try {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          language: "ar",
          callback: (token) => {
            setTurnstileToken(token);
            setErrorMessage("");
          },
          "expired-callback": () => {
            setTurnstileToken("");
          },
          "error-callback": () => {
            setTurnstileToken("");
          },
        });
      } catch (err) {
        console.warn("Turnstile render error:", err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const scriptId = "cf-turnstile-script";
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget);
    }

    return () => {
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [turnstileSiteKey]);

  // 2. جلب المواعيد المتاحة بناءً على محرك التعارضات والكراسي
  const { data: slotsData, isFetching: isSlotsFetching } = useQuery({
    queryKey: [
      "public-slots",
      clinic?.slug || slug,
      selectedDoctor,
      selectedDate,
      selectedService,
    ],
    queryFn: async () => {
      if (!selectedDoctor || !selectedDate) return null;
      const res = await api.get(
        `/public/clinics/${clinic?.slug || slug}/slots`,
        {
          params: {
            doctor_id: selectedDoctor,
            date: selectedDate,
            procedure_id: selectedService || undefined,
          },
        },
      );
      return res.data;
    },
    enabled: !!selectedDoctor && !!selectedDate && !!clinic,
  });

  const availableSlots = slotsData?.slots || [];

  // 3. إرسال طلب الحجز
  const bookingMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(
        `/public/clinics/${clinic?.slug || slug}/booking-requests`,
        payload,
      );
      return res.data;
    },
    onSuccess: (data) => {
      setBookingSuccess(data.booking_request);
      setErrorMessage("");
      setTurnstileToken("");
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (e) {}
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => {
      setErrorMessage(
        err.response?.data?.error ||
          "حدث خطأ أثناء إرسال طلب الحجز، يرجى المحاولة مرة أخرى.",
      );
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (e) {}
      }
      setTurnstileToken("");
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["public-slots"],
      }),
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
      setErrorMessage("يرجى إدخال اسم المريض الثلاثي بشكل صحيح");
      return;
    }
    const cleanPhone = patientPhone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setErrorMessage("يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)");
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setErrorMessage("يرجى إكمال اختبار التحقق الأمني ضد البوتات.");
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
      cf_turnstile_token: turnstileToken || undefined,
    });
  };

  if (isClinicLoading) {
    return (
      <div
        className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-400 gap-3"
        dir="rtl"
      >
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
        <span className="text-sm font-medium">جاري فتح بوابة العيادة...</span>
      </div>
    );
  }

  if (isClinicError || !clinic) {
    return (
      <div
        className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 text-center text-slate-300"
        dir="rtl"
      >
        <div className="w-16 h-16 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">
          العيادة غير موجودة أو الرابط غير متاح
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          تأكد من صحة الرابط أو تواصل مع إدارة العيادة للحصول على رابط الحجز
          الرسمي.
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 bg-white/5 border border-white/10 text-teal-400 text-xs font-bold rounded-xl hover:bg-white/10 transition"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  let whatsappClean = (
    clinic.whatsapp_number ||
    clinic.phone_number ||
    ""
  ).replace(/\D/g, "");
  if (whatsappClean.startsWith("00")) whatsappClean = whatsappClean.slice(2);
  if (whatsappClean.startsWith("01")) whatsappClean = "2" + whatsappClean;
  const whatsappHref = whatsappClean ? `https://wa.me/${whatsappClean}` : null;

  // 🌟 شاشة النجاح وتأكيد الحجز
  if (bookingSuccess) {
    return (
      <div
        className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden"
        dir="rtl"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="bg-[#0d1527]/90 backdrop-blur-2xl border border-teal-500/30 max-w-lg w-full rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative">
          <div className="w-16 h-16 bg-teal-500/15 text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-xs font-bold text-teal-400 tracking-wider uppercase">
              تم تسجيل طلب الحجز بنجاح
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              أهلاً بك، {bookingSuccess.patient_name}
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              تم إرسال طلب موعدك إلى{" "}
              <strong className="text-white">{clinic.name}</strong>. سيقوم مكتب
              الاستقبال بمراجعته والتواصل معك لتأكيد الحجز.
            </p>
          </div>

          <div className="bg-[#070b14]/80 border border-white/10 rounded-2xl p-4 text-xs text-right space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">العيادة:</span>
              <span className="text-white font-bold">{clinic.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الموعد المطلوب:</span>
              <span className="text-teal-300 font-mono font-bold">
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
                  },
                )}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
              <span className="text-slate-400">طريقة السداد:</span>
              <span className="text-emerald-400 font-bold">
                في مقر العيادة عند الحضور
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تواصل عبر واتساب</span>
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
              className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs transition"
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
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative selection:bg-teal-500 selection:text-slate-950"
      dir="rtl"
    >
      {/* إضاءات محيطية فخمة في الخلفية */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 🌟 1. النافبار الزجاجي الثابت */}
      <header className="border-b border-white/10 bg-[#070b14]/75 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {clinic.logo_url ? (
              <img
                src={clinic.logo_url}
                alt={clinic.name}
                className="w-11 h-11 rounded-xl object-cover border border-teal-500/30 shadow-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center font-black text-lg">
                {clinic.name?.[0] || "ع"}
              </div>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                {clinic.name}
              </h1>
              <p className="text-[11px] text-teal-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>بوابة الحجز الإلكتروني المعتمدة</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {clinic.phone_number && (
              <a
                href={`tel:${clinic.phone_number}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs transition font-mono"
                dir="ltr"
              >
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                <span>{clinic.phone_number}</span>
              </a>
            )}
            <a
              href="#booking-section"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition"
            >
              احجز موعدك الآن
            </a>
          </div>
        </div>
      </header>

      {/* 🌟 2. محتوى الصفحة التسويقية والحجز */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 w-full space-y-10 relative z-10">
        {/* Hero Banner الفاخر */}
        <section className="relative rounded-3xl overflow-hidden border border-teal-500/25 bg-[#0d1527]/80 backdrop-blur-2xl shadow-2xl">
          {clinic.cover_url && (
            <div className="absolute inset-0 opacity-25">
              <img
                src={clinic.cover_url}
                alt="غلاف العيادة"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#0d1527]/80 to-transparent" />
            </div>
          )}

          <div className="relative p-6 sm:p-10 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>رعاية طبية متكاملة لطب وجراحة وتجميل الأسنان</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {clinic.hero_title || clinic.name}
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {clinic.hero_subtitle || clinic.bio}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
                {clinic.address && (
                  <div className="inline-flex items-center gap-1.5 bg-[#070b14]/70 border border-white/10 px-3.5 py-2 rounded-xl">
                    <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>
                      {clinic.city ? `${clinic.city} - ` : ""}
                      {clinic.area ? `${clinic.area} - ` : ""}
                      {clinic.address}
                    </span>
                  </div>
                )}

                {clinic.google_maps_url && (
                  <a
                    href={clinic.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 px-3.5 py-2 rounded-xl font-bold transition"
                  >
                    <span>الموقع على خرائط جوجل</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* روابط السوشيال ميديا */}
              {(clinic.facebook_url ||
                clinic.instagram_url ||
                clinic.tiktok_url) && (
                <div className="flex items-center gap-3 pt-1 text-xs">
                  {clinic.facebook_url && (
                    <a
                      href={clinic.facebook_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
                    >
                      Facebook
                    </a>
                  )}
                  {clinic.instagram_url && (
                    <a
                      href={clinic.instagram_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
                    >
                      Instagram
                    </a>
                  )}
                  {clinic.tiktok_url && (
                    <a
                      href={clinic.tiktok_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition"
                    >
                      TikTok
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* كارت سريع لمواعيد العمل الأسبوعية */}
            {workingHours.length > 0 && (
              <div className="bg-[#070b14]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 min-w-[260px] space-y-2.5">
                <h3 className="text-xs font-bold text-teal-400 flex items-center gap-1.5 pb-2 border-b border-white/10">
                  <Clock className="w-4 h-4" />
                  <span>مواعيد العمل الرسمية</span>
                </h3>
                <div className="space-y-1.5 text-xs">
                  {workingHours.map((wh) => (
                    <div
                      key={wh.weekday}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-slate-300 font-medium">
                        {ARABIC_DAYS[wh.weekday]}
                      </span>
                      {wh.is_closed ? (
                        <span className="text-rose-400 text-[11px] font-bold">
                          عطلة أسبوعية
                        </span>
                      ) : (
                        <span className="text-slate-200 font-mono text-[11px]">
                          {wh.open_time?.slice(0, 5)} -{" "}
                          {wh.close_time?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 🌟 3. معرض صور العيادة وحالات (قبل وبعد) */}
        {gallery.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-teal-400" />
                  <span>معرض العيادة ونتائج الحالات (قبل وبعد)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  لقطات حقيقية من تجهيزات العيادة ونتائج علاج وتجميل الأسنان
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0d1527]/75 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl group flex flex-col justify-between"
                >
                  {item.category === "before_after" && item.before_image_url ? (
                    <div className="grid grid-cols-2 gap-0.5 bg-slate-950 relative h-52">
                      <div className="relative overflow-hidden">
                        <img
                          src={item.before_image_url}
                          alt="قبل العلاج"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-rose-300 text-[10px] font-bold">
                          قبل
                        </span>
                      </div>
                      <div className="relative overflow-hidden">
                        <img
                          src={item.image_url}
                          alt="بعد العلاج"
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-teal-500 text-slate-950 text-[10px] font-black">
                          بعد ✨
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-52 overflow-hidden bg-slate-950">
                      <img
                        src={item.image_url}
                        alt={item.caption || clinic.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  {item.caption && (
                    <div className="p-3 text-xs text-slate-200 font-medium text-center border-t border-white/5">
                      {item.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🌟 4. قسم الحجز الذكي (Smart Booking Engine) */}
        <section id="booking-section" className="scroll-mt-20">
          <form
            onSubmit={handleSubmitBooking}
            className="bg-[#0d1527]/85 backdrop-blur-2xl border border-teal-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-7"
          >
            <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-400" />
                  <span>احجز موعدك الآن أونلاين</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {clinic.booking_settings?.booking_instructions ||
                    "اختر الخدمة والطبيب والوقت المناسب لك، والدفع يتم نقداً في العيادة."}
                </p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                مواعيد متاحة حسب آخر تحديث
              </span>
            </div>

            {/* الخطوة 1: اختيار الخدمة */}
            <div className="space-y-2.5">
              <label className="block text-xs sm:text-sm font-bold text-teal-300">
                1. اختر نوع الكشف أو الخدمة المطلوبة:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                <div
                  onClick={() => {
                    setSelectedService("");
                    setSelectedSlot(null);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    selectedService === ""
                      ? "bg-teal-500/15 border-teal-400 text-teal-200 shadow-lg shadow-teal-500/10"
                      : "bg-[#070b14]/70 border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div>
                    <p className="font-bold text-white">كشف واستشارة عامة</p>
                    <span className="text-[11px] text-slate-400">
                      فحص شامل وتشخيص مبدئي
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
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      selectedService === svc.id
                        ? "bg-teal-500/15 border-teal-400 text-teal-200 shadow-lg shadow-teal-500/10"
                        : "bg-[#070b14]/70 border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white">{svc.description}</p>
                      <span className="text-[11px] text-teal-400/90 font-semibold">
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

            {/* الخطوة 2: اختيار الطبيب */}
            <div className="space-y-2.5">
              <label className="block text-xs sm:text-sm font-bold text-teal-300">
                2. اختر الطبيب المعالج:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoctor(doc.id);
                      setSelectedSlot(null);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      selectedDoctor === doc.id
                        ? "bg-teal-500/15 border-teal-400 text-teal-200 shadow-lg shadow-teal-500/10"
                        : "bg-[#070b14]/70 border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center font-bold">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">
                          د. {doc.name}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          جراحة وتجميل الأسنان
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

            {/* الخطوة 3: اختيار التاريخ والوقت المتاح */}
            <div className="space-y-3">
              <label className="block text-xs sm:text-sm font-bold text-teal-300">
                3. اختر تاريخ وتوقيت الموعد:
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
                  className="bg-[#070b14] border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-teal-400 cursor-pointer"
                />
                <span className="text-xs text-slate-400">
                  {selectedDoctor
                    ? "اختر الوقت المناسب من المواعيد المتاحة بالأسفل"
                    : "👈 يرجى اختيار الطبيب أولاً لإظهار الأوقات المتاحة"}
                </span>
              </div>

              {selectedDoctor && (
                <div className="pt-2">
                  {isSlotsFetching ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                      <span>جاري فحص جدول الطبيب والكراسي المتاحة...</span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-4 bg-[#070b14]/80 border border-amber-500/30 rounded-2xl text-center text-xs text-amber-300">
                      {slotsData?.reason ||
                        "جميع المواعيد محجوزة في هذا اليوم، يرجى اختيار يوم آخر أو طبيب آخر."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                      {availableSlots.map((slot, index) => {
                        const isSelected = selectedSlot?.iso === slot.iso;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2.5 px-2 text-center rounded-xl border text-xs font-mono font-bold transition-all ${
                              isSelected
                                ? "bg-teal-500 text-slate-950 border-teal-300 shadow-lg shadow-teal-500/30 scale-[1.03]"
                                : "bg-[#070b14]/80 border-white/10 text-slate-200 hover:border-teal-500/40 hover:bg-white/5"
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
            <div className="space-y-3.5 pt-4 border-t border-white/10">
              <label className="block text-xs sm:text-sm font-bold text-teal-300">
                4. بيانات المريض لتأكيد الحجز:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    الاسم بالكامل *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="محمد أحمد عبد الرحمن"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    رقم الموبايل (واتساب / اتصال) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01012345678"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full bg-[#070b14] border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-teal-400"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Honeypot ضد البوتات */}
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
                <label className="block text-xs text-slate-300 mb-1.5">
                  شكوى الأسنان أو ملاحظات للطبيب (اختياري)
                </label>
                <textarea
                  rows="2"
                  placeholder="مثال: ألم مع المشروبات الباردة، رغبة في تبييض الأسنان..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#070b14] border border-white/15 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {clinic.is_booking_enabled === false && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  الحجز الإلكتروني متوقف مؤقتاً لهذه العيادة. يرجى التواصل عبر
                  الهاتف أو الواتساب مباشرة.
                </span>
              </div>
            )}

            {turnstileSiteKey && (
              <div className="flex justify-center my-2">
                <div ref={turnstileRef} className="min-h-[65px]" />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  bookingMutation.isPending ||
                  clinic.is_booking_enabled === false
                }
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {bookingMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    <span>جاري تأكيد الحجز...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تأكيد حجز الموعد الآن</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 🌟 5. تقييمات وآراء المرضى (Testimonials) */}
        {testimonials.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>آراء وتجارب مرضانا</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-[#0d1527]/75 backdrop-blur-xl border border-white/10 space-y-3 shadow-lg"
                >
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    "{t.comment}"
                  </p>
                  <div className="text-xs font-bold text-teal-400 pt-2 border-t border-white/5">
                    — {t.patient_display_name}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🌟 6. الأسئلة الشائعة (FAQs Accordion) */}
        {faqs.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-teal-400" />
              <span>الأسئلة الشائعة</span>
            </h3>
            <div className="space-y-2.5">
              {faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl bg-[#0d1527]/75 backdrop-blur-xl border border-white/10 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full px-5 py-4 text-right flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:bg-white/5 transition"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-teal-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* 🌟 زر واتساب عائم (Floating WhatsApp Button) */}
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          title="تواصل مع العيادة عبر واتساب"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-full shadow-2xl shadow-emerald-500/30 transition-transform hover:scale-105"
        >
          <MessageCircle className="w-5 h-5 fill-slate-950" />
          <span className="text-xs hidden sm:inline">تواصل واتساب</span>
        </a>
      )}

      {/* الفوتر */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400 space-y-2 bg-[#050811]">
        <div>
          تعمل هذه البوابة بواسطة نظام{" "}
          <a
            href="https://curosta.com"
            target="_blank"
            rel="noreferrer"
            className="font-black text-teal-400 hover:underline"
          >
            CUROSTA
          </a>{" "}
          لإدارة عيادات ومراكز الأسنان
        </div>
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
          <Link to="/terms" className="hover:text-slate-300">
            شروط الاستخدام
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-slate-300">
            سياسة الخصوصية
          </Link>
        </div>
      </footer>
    </div>
  );
}
