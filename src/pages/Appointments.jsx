import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Search,
  UserPlus,
  Check,
  Loader2,
} from "lucide-react";

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export default function Appointments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  // حالة التحكم في الـ Combobox الذكي
  const [patientInput, setPatientInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // فورم حجز الميعاد
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_date: getCurrentDateTimeLocal(),
    notes: "",
  });

  // فورم إضافة مريض سريع
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
  });

  // 1. جلب المواعيد
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await api.get("/appointments");
      return res.data.appointments || [];
    },
  });

  // 2. جلب المرضى
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const res = await api.get("/patients");
      return res.data.patients || [];
    },
  });

  // 3. جلب الدكاترة
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const res = await api.get("/auth/doctors");
      return res.data.doctors || [];
    },
  });

  // 4. حجز الميعاد
  const createAppointmentMutation = useMutation({
    mutationFn: async (newAppointment) => {
      const res = await api.post("/appointments", newAppointment);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setIsModalOpen(false);
      setFormData({
        patient_id: "",
        doctor_id: "",
        appointment_date: getCurrentDateTimeLocal(),
        notes: "",
      });
      setPatientInput("");
    },
    onError: (err) => {
      alert(err.response?.data?.error || "حدث خطأ أثناء حجز الميعاد");
    },
  });

  // 5. إضافة مريض سريع
  const createPatientMutation = useMutation({
    mutationFn: async (patient) => {
      const res = await api.post("/patients", patient);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      // تثبيت المريض المضاف فوراً في خانة الحجز
      setFormData((prev) => ({ ...prev, patient_id: data.patient.id }));
      setPatientInput(data.patient.name);
      setIsNewPatientModalOpen(false);
      setIsDropdownOpen(false);
      setNewPatientData({ name: "", phone_number: "", gender: "Male" });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "فشل إضافة المريض");
    },
  });

  // 6. تحديث حالة الميعاد
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/appointments/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.patient_id) {
      alert("يرجى اختيار مريض من القائمة");
      return;
    }
    createAppointmentMutation.mutate(formData);
  };

  const handleQuickPatientSubmit = (e) => {
    e.preventDefault();
    createPatientMutation.mutate(newPatientData);
  };

  // فلترة المرضى حسب اللي بيتكتب في الخانة
  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientInput.toLowerCase()) ||
      p.phone_number.includes(patientInput)
  );

  // اختيار مريض من القائمة المنسدلة العائمة
  const handleSelectPatient = (patient) => {
    setFormData((prev) => ({ ...prev, patient_id: patient.id }));
    setPatientInput(patient.name);
    setIsDropdownOpen(false);
  };

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    const date = d.toLocaleDateString("en-GB");
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${date} - ${time}`;
  };

  const statusConfig = {
    scheduled: {
      label: "مجدول",
      bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    completed: {
      label: "مكتمل",
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    cancelled: {
      label: "ملغي",
      bg: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    no_show: {
      label: "لم يحضر",
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  };

  return (
    <div className="space-y-6">
      {/* الهيدر */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-blue-500" />
            جدول المواعيد
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            متابعة الحجوزات وتنظيم مواعيد العيادة
          </p>
        </div>

        <button
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              appointment_date: getCurrentDateTimeLocal(),
            }));
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>حجز ميعاد جديد</span>
        </button>
      </div>

      {/* جدول المواعيد */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span>جاري تحميل جدول المواعيد...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا توجد مواعيد محجوزة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 font-semibold">المريض</th>
                  <th className="py-4 px-6 font-semibold">الطبيب المعالج</th>
                  <th className="py-4 px-6 font-semibold">
                    تاريخ ووقت الميعاد
                  </th>
                  <th className="py-4 px-6 font-semibold">الحالة</th>
                  <th className="py-4 px-6 font-semibold text-center">
                    تحديث الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {appointments.map((apt) => (
                  <tr
                    key={apt.appointment_id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <p className="font-medium text-white">
                        {apt.patient_name}
                      </p>
                      <span
                        className="text-xs text-slate-400 font-mono"
                        dir="ltr"
                      >
                        {apt.patient_phone}
                      </span>
                    </td>

                    <td className="py-4 px-6 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span>{apt.doctor_name}</span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-slate-300 font-mono">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span dir="ltr">
                          {formatDateTime(apt.appointment_date)}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                          statusConfig[apt.status]?.bg ||
                          "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {statusConfig[apt.status]?.label || apt.status}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        {apt.status === "scheduled" && (
                          <>
                            <button
                              title="اكتمل الكشف"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: apt.appointment_id,
                                  status: "completed",
                                })
                              }
                              className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button
                              title="إلغاء الميعاد"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: apt.appointment_id,
                                  status: "cancelled",
                                })
                              }
                              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button
                              title="لم يحضر"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: apt.appointment_id,
                                  status: "no_show",
                                })
                              }
                              className="p-1.5 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors"
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {apt.status !== "scheduled" && (
                          <span className="text-xs text-slate-500">
                            تم الإغلاق
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة حجز ميعاد جديد */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                حجز ميعاد جديد
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 🌟 الـ Combobox الموحد: خانة بحث واختيار المريض معاً */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    المريض *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewPatientModalOpen(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ مريض جديد</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={patientInput}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setPatientInput(e.target.value);
                      setFormData((prev) => ({ ...prev, patient_id: "" })); // تصفير الاختيار لحين الضغط على اسم
                      setIsDropdownOpen(true);
                    }}
                    className={`w-full bg-slate-950 border ${
                      formData.patient_id
                        ? "border-emerald-500/50"
                        : "border-slate-700"
                    } rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors`}
                  />
                  {formData.patient_id && (
                    <Check className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                  )}
                </div>

                {/* القائمة العائمة الذكية (Dropdown List) */}
                {isDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {filteredPatients.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-xs">
                        لا يوجد مريض بهذا الاسم. اضغط على "+ مريض جديد" بالأعلى.
                      </div>
                    ) : (
                      filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-3 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between text-sm transition-colors"
                        >
                          <span className="font-medium text-white">
                            {p.name}
                          </span>
                          <span
                            className="text-xs text-slate-400 font-mono"
                            dir="ltr"
                          >
                            {p.phone_number}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* اختيار الدكتور */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  الطبيب المعالج *
                </label>
                <select
                  required
                  value={formData.doctor_id}
                  onChange={(e) =>
                    setFormData({ ...formData, doctor_id: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="">-- اختر الطبيب المعالج --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      د. {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* التاريخ والوقت */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  تاريخ ووقت الميعاد *
                </label>
                <input
                  type="datetime-local"
                  required
                  min={getCurrentDateTimeLocal()}
                  value={formData.appointment_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      appointment_date: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                />
              </div>

              {/* ملاحظات */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  ملاحظات الكشف
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="مثال: كشف أولي، فحص ألم في الفك..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {createAppointmentMutation.isPending
                    ? "جاري الحجز..."
                    : "تأكيد الحجز"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة مريض سريع */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              إضافة مريض سريعاً
            </h3>

            <form onSubmit={handleQuickPatientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  placeholder="محمد علي"
                  value={newPatientData.name}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={newPatientData.phone_number}
                  onChange={(e) =>
                    setNewPatientData({
                      ...newPatientData,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Male">ذكر</option>
                  <option value="Female">أنثى</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="flex-1 py-2 border border-slate-700 text-slate-400 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={createPatientMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-medium"
                >
                  {createPatientMutation.isPending
                    ? "جاري الإضافة..."
                    : "حفظ واختيار"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
