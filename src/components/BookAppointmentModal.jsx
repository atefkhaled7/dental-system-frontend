/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Search,
  UserPlus,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";

// دالة آمنة لتحويل أي تاريخ أو ISO String لصيغة input datetime-local (YYYY-MM-DDTHH:mm)
const formatToDateTimeLocal = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function BookAppointmentModal({
  isOpen,
  onClose,
  initialDoctorId = "",
  initialDate = "",
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 1. جلب قائمة الأطباء النشطين
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await api.get("/auth/doctors");
      return res.data?.doctors || [];
    },
    enabled: isOpen,
  });

  // 2. جلب مدة الكشف الافتراضية للعيادة
  const { data: clinicSettings } = useQuery({
    queryKey: ["clinic-duration-settings"],
    queryFn: async () => {
      const res = await api.get("/appointments/settings/duration");
      return res.data;
    },
    enabled: isOpen,
  });

  // حالة الفورم
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Debounce للبحث لمنع الريكويستات الزائدة
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(patientSearchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [patientSearchQuery]);

  // بيانات المريض الجديد (لو مش مسجل)
  const [newPatientData, setNewPatientData] = useState({
    phone_number: "",
    gender: "Male",
    date_of_birth: "",
    medical_alerts: "",
  });

  // جلب المرضى بالبحث المباشر من السيرفر
  const { data: patientsData, isFetching: isSearchingPatients } = useQuery({
    queryKey: ["patients-autocomplete", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const res = await api.get("/patients", {
        params: {
          search: debouncedSearch,
          page: 1,
          limit: 8,
        },
      });
      return res.data?.patients || [];
    },
    enabled: isOpen && !selectedPatient && debouncedSearch.length > 0,
    staleTime: 30000,
  });

  const filteredPatients = patientsData || [];

  // بيانات الموعد
  const [doctorId, setDoctorId] = useState(initialDoctorId || "");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [canOverrideConflict, setCanOverrideConflict] = useState(false);
  const dropdownRef = useRef(null);

  // تحديث القيم الابتدائية عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      if (clinicSettings?.default_appointment_duration) {
        setDurationMinutes(clinicSettings.default_appointment_duration);
      }

      if (initialDoctorId) {
        setDoctorId(initialDoctorId);
      }

      const initialFormatted = initialDate
        ? typeof initialDate === "string" && initialDate.length === 16
          ? initialDate
          : formatToDateTimeLocal(initialDate)
        : formatToDateTimeLocal(new Date());

      setAppointmentDate(initialFormatted);
      setErrorMessage("");
      setCanOverrideConflict(false);
    }
  }, [isOpen, clinicSettings, initialDoctorId, initialDate]);

  // إغلاق قائمة البحث عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery(patient.name);
    setIsDropdownOpen(false);
  };

  const handleClearSelectedPatient = () => {
    setSelectedPatient(null);
    setPatientSearchQuery("");
  };

  // Mutation الحجز
  const bookMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/appointments", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      handleClose();
    },
    onError: (err) => {
      const msg =
        err.response?.data?.error ||
        "حدث خطأ أثناء حجز الموعد، يرجى المحاولة ثانية";
      setErrorMessage(msg);

      if (
        err.response?.status === 409 &&
        err.response?.data?.can_override === true
      ) {
        setCanOverrideConflict(true);
      } else {
        setCanOverrideConflict(false);
      }
    },
  });

  const handleClose = () => {
    setSelectedPatient(null);
    setPatientSearchQuery("");
    setDebouncedSearch("");
    setNewPatientData({
      phone_number: "",
      gender: "Male",
      date_of_birth: "",
      medical_alerts: "",
    });
    setDoctorId("");
    setAppointmentDate("");
    setNotes("");
    setErrorMessage("");
    setCanOverrideConflict(false);
    onClose();
  };

  const buildPayload = (allowOverride = false) => {
    if (!doctorId) {
      setErrorMessage("يرجى اختيار الطبيب المعالج");
      return null;
    }

    if (!appointmentDate) {
      setErrorMessage("يرجى تحديد تاريخ ووقت الموعد");
      return null;
    }

    const apptDateObj = new Date(appointmentDate);
    if (isNaN(apptDateObj.getTime())) {
      setErrorMessage("صيغة تاريخ ووقت الموعد غير صالحة");
      return null;
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < 5 || duration > 480) {
      setErrorMessage("مدة الكشف يجب أن تكون بين 5 و 480 دقيقة");
      return null;
    }

    const payload = {
      doctor_id: doctorId,
      appointment_date: apptDateObj.toISOString(),
      duration_minutes: duration,
      notes: notes.trim() || null,
      allow_override: allowOverride,
    };

    if (selectedPatient) {
      payload.patient_id = selectedPatient.id;
    } else {
      if (!patientSearchQuery.trim() || patientSearchQuery.trim().length < 2) {
        setErrorMessage("اسم المريض الجديد مطلوب ويجب ألا يقل عن حرفين");
        return null;
      }
      if (patientSearchQuery.trim().length > 100) {
        setErrorMessage("اسم المريض يجب ألا يتجاوز 100 حرف");
        return null;
      }
      if (
        !newPatientData.phone_number ||
        newPatientData.phone_number.trim().length < 10
      ) {
        setErrorMessage(
          "رقم هاتف المريض الجديد مطلوب ويجب ألا يقل عن 10 أرقام",
        );
        return null;
      }

      payload.new_patient = {
        name: patientSearchQuery.trim(),
        phone_number: newPatientData.phone_number.trim(),
        gender: newPatientData.gender,
        date_of_birth: newPatientData.date_of_birth || null,
        medical_alerts: newPatientData.medical_alerts.trim() || null,
      };
    }

    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setCanOverrideConflict(false);
    const payload = buildPayload(false);
    if (payload) {
      bookMutation.mutate(payload);
    }
  };

  const handleForceOverrideBooking = () => {
    const payload = buildPayload(true);
    if (payload) {
      bookMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  const isNewPatientMode =
    !selectedPatient && patientSearchQuery.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04070e]/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* كارت المودال الزجاجي الفخم */}
      <div className="relative w-full max-w-2xl bg-[#0d1527]/85 backdrop-blur-2xl border border-teal-500/25 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* إضاءة خلفية ناعمة داخل الزجاج */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#070b14]/60 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 text-teal-400">
            <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                حجز موعد كشف جديد
              </h2>
              <p className="text-[11px] text-slate-400">
                محمي بمحرك فحص التعارضات وتزامن الكراسي الذكي
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className="relative p-6 overflow-y-auto space-y-5 text-right"
          dir="rtl"
        >
          {/* تنبيه الخطأ أو التعارض مع زر التجاوز للمدير */}
          {errorMessage && (
            <div className="p-4 bg-rose-500/15 backdrop-blur-md border border-rose-500/35 rounded-xl text-rose-200 text-sm space-y-3 shadow-lg shadow-rose-950/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block">{errorMessage}</span>
                </div>
              </div>

              {canOverrideConflict && user?.role === "ClinicAdmin" && (
                <div className="pt-2.5 border-t border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-amber-300 flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    بصفتك مدير العيادة، يمكنك فرض الحجز وتجاوز هذا التعارض:
                  </span>
                  <button
                    type="button"
                    disabled={bookMutation.isPending}
                    onClick={handleForceOverrideBooking}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shrink-0 shadow-md"
                  >
                    تجاوز التعارض وتأكيد الحجز
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1. قسم بيانات المريض */}
          <div className="space-y-3">
            <label className="block text-xs sm:text-sm font-semibold text-slate-300">
              المريض <span className="text-rose-400">*</span>
            </label>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3.5 bg-teal-500/10 backdrop-blur-md border border-teal-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold">
                    {selectedPatient.name?.charAt(0) || (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-100 text-sm">
                        {selectedPatient.name}
                      </h4>
                      {selectedPatient.alert_level === "critical" && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                          <AlertOctagon className="w-3 h-3" /> تنبيه حرج
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono"
                      dir="ltr"
                    >
                      <Phone className="w-3.5 h-3.5 text-teal-400" />
                      {selectedPatient.phone_number}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedPatient}
                  className="text-xs text-slate-300 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/15 border border-white/10 transition-colors"
                >
                  تغيير المريض
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={(e) => {
                      setPatientSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="ابحث باسم المريض أو رقم الهاتف (أو اكتب اسماً جديداً)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#070b14]/80 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-500/15 text-sm transition-all"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>

                {isDropdownOpen && debouncedSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-[#090f1d]/95 backdrop-blur-xl border border-teal-500/25 rounded-xl shadow-2xl z-20 divide-y divide-white/5">
                    {isSearchingPatients ? (
                      <div className="p-3.5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                        <span>جاري البحث في ملفات المرضى...</span>
                      </div>
                    ) : filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-3 hover:bg-teal-500/10 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-100">
                              {p.name}
                            </p>
                            <p
                              className="text-xs text-slate-400 font-mono"
                              dir="ltr"
                            >
                              {p.phone_number}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {p.alert_level === "critical" ? (
                              <span className="text-[11px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-semibold">
                                تنبيه حرج
                              </span>
                            ) : p.alert_level === "moderate" ||
                              p.medical_alerts ? (
                              <span className="text-[11px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                تنبيه طبي
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-teal-300 bg-teal-500/5">
                        غير مسجل مسبقاً — سيتم إنشاء ملف جديد باسم "
                        {patientSearchQuery}" تلقائياً 👇
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* الحقول الإضافية إذا كان مريضاً جديداً */}
            {isNewPatientMode && (
              <div className="p-4 bg-[#070b14]/60 backdrop-blur-md border border-teal-500/20 rounded-xl space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                  <UserPlus className="w-4 h-4" />
                  <span>بيانات المريض الجديد ({patientSearchQuery})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      رقم الهاتف <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newPatientData.phone_number}
                      onChange={(e) =>
                        setNewPatientData({
                          ...newPatientData,
                          phone_number: e.target.value,
                        })
                      }
                      placeholder="01xxxxxxxxx"
                      className="w-full px-3 py-2 bg-[#0d1527]/90 border border-white/10 rounded-lg text-slate-100 text-sm font-mono focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      النوع
                    </label>
                    <select
                      value={newPatientData.gender}
                      onChange={(e) =>
                        setNewPatientData({
                          ...newPatientData,
                          gender: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0d1527]/90 border border-white/10 rounded-lg text-slate-100 text-sm focus:border-teal-400 focus:outline-none"
                    >
                      <option value="Male">ذكر</option>
                      <option value="Female">أنثى</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      تاريخ الميلاد (اختياري)
                    </label>
                    <input
                      type="date"
                      value={newPatientData.date_of_birth}
                      onChange={(e) =>
                        setNewPatientData({
                          ...newPatientData,
                          date_of_birth: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0d1527]/90 border border-white/10 rounded-lg text-slate-100 text-sm font-mono focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      تنبيهات طبية سريعة
                    </label>
                    <input
                      type="text"
                      value={newPatientData.medical_alerts}
                      onChange={(e) =>
                        setNewPatientData({
                          ...newPatientData,
                          medical_alerts: e.target.value,
                        })
                      }
                      placeholder="حساسية بنسلين، سيولة دم، سكر..."
                      className="w-full px-3 py-2 bg-[#0d1527]/90 border border-white/10 rounded-lg text-slate-100 text-sm focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. اختيار الطبيب المعالج */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
              الطبيب المعالج <span className="text-rose-400">*</span>
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#070b14]/80 border border-white/10 rounded-xl text-slate-100 text-sm focus:border-teal-400 focus:outline-none transition-colors"
            >
              <option value="">-- اختر الطبيب --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  د. {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. تاريخ ووقت الموعد + المدة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                تاريخ ووقت الموعد <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#070b14]/80 border border-white/10 rounded-xl text-slate-100 text-sm font-mono focus:border-teal-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                مدة الكشف (بالدقائق)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-20 px-2.5 py-2.5 bg-[#070b14]/80 border border-white/10 rounded-xl text-slate-100 text-sm font-mono focus:border-teal-400 focus:outline-none text-center"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        Number(durationMinutes) === mins
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm"
                          : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200"
                      }`}
                    >
                      {mins} د
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. ملاحظات الكشف */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
              ملاحظات أو سبب الزيارة (اختياري)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: ألم بالضرس السفلي، جلسة تنظيف، متابعة تقويم..."
              className="w-full px-3.5 py-2 bg-[#070b14]/80 border border-white/10 rounded-xl text-slate-100 text-sm focus:border-teal-400 focus:outline-none resize-none"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={bookMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {bookMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحجز...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد حجز الموعد</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
