/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
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
  Stethoscope,
  FileText,
  AlertTriangle,
  Loader2,
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

  // Debounce للبحث لمنع الريكويستات الزائدة مع كل حرف
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
        ? formatToDateTimeLocal(initialDate)
        : formatToDateTimeLocal(new Date());

      setAppointmentDate(initialFormatted);
      setErrorMessage("");
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

  // دالة اختيار مريض موجود
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery(patient.name);
    setIsDropdownOpen(false);
  };

  // دالة إلغاء تحديد المريض
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
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      handleClose();
    },
    onError: (err) => {
      const msg =
        err.response?.data?.error ||
        "حدث خطأ أثناء حجز الموعد، يرجى المحاولة ثانية";
      setErrorMessage(msg);
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
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!doctorId) {
      setErrorMessage("يرجى اختيار الطبيب المعالج");
      return;
    }

    if (!appointmentDate) {
      setErrorMessage("يرجى تحديد تاريخ ووقت الموعد");
      return;
    }

    const apptDateObj = new Date(appointmentDate);
    if (isNaN(apptDateObj.getTime())) {
      setErrorMessage("صيغة تاريخ ووقت الموعد غير صالحة");
      return;
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < 5 || duration > 480) {
      setErrorMessage("مدة الكشف يجب أن تكون بين 5 و 480 دقيقة");
      return;
    }

    const payload = {
      doctor_id: doctorId,
      appointment_date: apptDateObj.toISOString(),
      duration_minutes: duration,
      notes: notes.trim() || null,
    };

    if (selectedPatient) {
      payload.patient_id = selectedPatient.id;
    } else {
      if (!patientSearchQuery.trim() || patientSearchQuery.trim().length < 2) {
        setErrorMessage("اسم المريض الجديد مطلوب ويجب ألا يقل عن حرفين");
        return;
      }
      if (patientSearchQuery.trim().length > 100) {
        setErrorMessage("اسم المريض يجب ألا يتجاوز 100 حرف");
        return;
      }
      if (
        !newPatientData.phone_number ||
        newPatientData.phone_number.trim().length < 10
      ) {
        setErrorMessage(
          "رقم هاتف المريض الجديد مطلوب ويجب ألا يقل عن 10 أرقام",
        );
        return;
      }

      payload.new_patient = {
        name: patientSearchQuery.trim(),
        phone_number: newPatientData.phone_number.trim(),
        gender: newPatientData.gender,
        date_of_birth: newPatientData.date_of_birth || null,
        medical_alerts: newPatientData.medical_alerts.trim() || null,
      };
    }

    bookMutation.mutate(payload);
  };

  if (!isOpen) return null;

  const isNewPatientMode =
    !selectedPatient && patientSearchQuery.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0d1527] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#070b14]/50">
          <div className="flex items-center gap-2 text-teal-400">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-100">حجز كشف جديد</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-5 text-right"
        >
          {/* تنبيه الخطأ */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. قسم بيانات المريض */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
              المريض <span className="text-rose-400">*</span>
            </label>

            {selectedPatient ? (
              // بطاقة المريض المختار
              <div className="flex items-center justify-between p-3.5 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">
                      {selectedPatient.name}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-teal-400" />
                      {selectedPatient.phone_number}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedPatient}
                  className="text-xs text-slate-400 hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors"
                >
                  تغيير المريض
                </button>
              </div>
            ) : (
              // حقل البحث الذكي
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
                    placeholder="اكتب اسم المريض أو رقم الهاتف للبحث..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 text-sm"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                </div>

                {/* القائمة المنسدلة للنتائج */}
                {isDropdownOpen && debouncedSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-[#070b14] border border-slate-800 rounded-xl shadow-xl z-20 divide-y divide-slate-800/50">
                    {isSearchingPatients ? (
                      <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                        <span>جاري البحث في قاعدة البيانات...</span>
                      </div>
                    ) : filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-3 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-200">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {p.phone_number}
                            </p>
                          </div>

                          {p.medical_alerts && (
                            <span className="text-[11px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20">
                              تنبيه طبي
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        لا يوجد مريض مسجل بهذا الاسم. سيتم إنشاؤه كمريض جديد
                        تلقائياً 👇
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* الحقول الإضافية إذا كان مريضاً جديداً */}
            {isNewPatientMode && (
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-3.5 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 mb-1">
                  <UserPlus className="w-4 h-4" />
                  <span>إكمال بيانات المريض الجديد ({patientSearchQuery})</span>
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
                      className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-lg text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
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
                      className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-lg text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
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
                      className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-lg text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      تنبيهات طبية (حساسية، أمراض مزمنة...)
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
                      placeholder="مثال: حساسية بنسلين، ضغط، سكر..."
                      className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-lg text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. اختيار الطبيب المعالج */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              الطبيب المعالج <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
              >
                <option value="">-- اختر الطبيب --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    د. {doc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. تاريخ ووقت الموعد + المدة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                تاريخ ووقت الموعد <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                مدة الكشف (بالدقائق)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-24 px-3 py-2.5 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none text-center"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        Number(durationMinutes) === mins
                          ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                          : "bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800"
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
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              ملاحظات أو سبب الزيارة (اختياري)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: فحص دوري، ألم في الضرس السفلي، حشو..."
              className="w-full px-3 py-2 bg-[#070b14] border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-teal-500/50 focus:outline-none resize-none"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={bookMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-900/30 transition-all disabled:opacity-50"
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
