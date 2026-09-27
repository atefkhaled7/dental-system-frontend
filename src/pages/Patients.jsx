import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

export default function Patients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // فورم إضافة مريض جديد
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    gender: "Male",
    date_of_birth: "",
    medical_alerts: "",
  });

  // 1. جلب المرضى باستخدام useQuery (مع دعم البحث السريع)
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      const res = await api.get("/patients", {
        params: search ? { search } : {},
      });
      return res.data.patients || [];
    },
  });

  // 2. إضافة مريض جديد باستخدام useMutation
  const addPatientMutation = useMutation({
    mutationFn: async (newPatient) => {
      const res = await api.post("/patients", newPatient);
      return res.data;
    },
    onSuccess: () => {
      // تحديث كاش المرضى فوراً لمسح الداتا القديمة وسحب الجديد
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsModalOpen(false); // قفل النافذة
      setFormData({
        name: "",
        phone_number: "",
        gender: "Male",
        date_of_birth: "",
        medical_alerts: "",
      });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "حدث خطأ أثناء إضافة المريض");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addPatientMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* الهيدر العلوي وزرار الإضافة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-500" />
            سجل المرضى
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            إدارة ملفات المرضى وتاريخهم الطبي
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مريض جديد</span>
        </button>
      </div>

      {/* خانة البحث اللحظي */}
      <div className="relative max-w-md">
        <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-11 pl-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* جدول المرضى */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span>جاري تحميل بيانات المرضى...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            لا يوجد مرضى مسجلين حتى الآن. اضغط على "إضافة مريض جديد" للبدء.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 font-semibold">اسم المريض</th>
                  <th className="py-4 px-6 font-semibold">رقم الهاتف</th>
                  <th className="py-4 px-6 font-semibold">النوع</th>
                  <th className="py-4 px-6 font-semibold">
                    التنبيهات الطبية (حساسية/أمراض)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-white">
                      {patient.name}
                    </td>
                    <td className="py-4 px-6 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span dir="ltr">{patient.phone_number}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          patient.gender === "Female"
                            ? "bg-pink-500/10 text-pink-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        {patient.gender === "Female" ? "أنثى" : "ذكر"}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {patient.medical_alerts ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {patient.medical_alerts}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">لا يوجد</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة إضافة مريض جديد (Modal) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                إضافة مريض جديد
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  اسم المريض *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="محمد أحمد"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  رقم الهاتف *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder="01012345678"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    النوع
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    تاريخ الميلاد
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        date_of_birth: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  التنبيهات الطبية (حساسية بنج / أمراض مزمنة)
                </label>
                <textarea
                  rows="2"
                  value={formData.medical_alerts}
                  onChange={(e) =>
                    setFormData({ ...formData, medical_alerts: e.target.value })
                  }
                  placeholder="مثال: حساسية من البنسلين، مريض سكر..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
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
                  disabled={addPatientMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {addPatientMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ المريض"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
