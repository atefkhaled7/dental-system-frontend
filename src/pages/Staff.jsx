import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  UserCheck,
  UserX,
  Loader2,
  X,
  Mail,
  Lock,
  User as UserIcon,
  Check,
  AlertTriangle,
  Edit2,
  UserCircle,
} from "lucide-react";

export default function Staff() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const isClinicAdmin = user?.role === "ClinicAdmin";

  // التبويب النشط (لو مش أدمن يفتح حسابه مباشرة)
  const [activeTab, setActiveTab] = useState(
    isClinicAdmin ? "staff" : "profile"
  );

  // المودالات
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editNameModal, setEditNameModal] = useState({
    isOpen: false,
    member: null,
    name: "",
  });
  const [resetPasswordModal, setResetPasswordModal] = useState({
    isOpen: false,
    member: null,
    newPassword: "",
  });

  // فورم حسابي الشخصي
  const [profileName, setProfileName] = useState(user?.name || "");
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Doctor",
  });

  // 1. جلب طاقم العيادة (للأدمن فقط)
  const {
    data: staff = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["clinic-staff", user?.clinic_id],
    queryFn: async () => {
      const res = await api.get("/staff");
      return res.data.staff || [];
    },
    enabled: isClinicAdmin && activeTab === "staff",
  });

  // 2. إضافة موظف جديد بواسطة الأدمن
  const addStaffMutation = useMutation({
    mutationFn: async (payload) => (await api.post("/staff", payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-staff"] });
      setIsAddModalOpen(false);
      setAddForm({ name: "", email: "", password: "", role: "Doctor" });
      showToast("تمت إضافة الموظف بنجاح", "success");
    },
    onError: (err) =>
      showToast(err.response?.data?.error || "فشل إضافة الموظف", "error"),
  });

  // 3. تعديل اسم موظف بواسطة الأدمن
  const updateStaffNameMutation = useMutation({
    mutationFn: async ({ id, name }) =>
      (await api.patch(`/staff/${id}/name`, { name })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-staff"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setEditNameModal({ isOpen: false, member: null, name: "" });
      showToast("تم تعديل اسم الموظف بنجاح", "success");
    },
    onError: (err) =>
      showToast(err.response?.data?.error || "فشل تعديل الاسم", "error"),
  });

  // 4. تعطيل / تفعيل حساب موظف
  const toggleStatusMutation = useMutation({
    mutationFn: async (id) =>
      (await api.patch(`/staff/${id}/toggle-status`)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clinic-staff"] });
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      showToast(data.message, "success");
    },
    onError: (err) =>
      showToast(err.response?.data?.error || "فشل تعديل حالة الحساب", "error"),
  });

  // 5. إعادة تعيين باسورد موظف بواسطة الأدمن
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, new_password }) =>
      (await api.patch(`/staff/${id}/reset-password`, { new_password })).data,
    onSuccess: () => {
      setResetPasswordModal({ isOpen: false, member: null, newPassword: "" });
      showToast("تمت إعادة تعيين كلمة المرور بنجاح", "success");
    },
    onError: (err) =>
      showToast(err.response?.data?.error || "فشل تعيين كلمة المرور", "error"),
  });

  // 6. تعديل الاسم الشخصي للمستخدم الحالي
  const updateMyProfileMutation = useMutation({
    mutationFn: async (name) =>
      (await api.patch("/auth/profile", { name })).data,
    onSuccess: (data) => {
      updateUser(data.user);
      showToast("تم تحديث اسمك بنجاح", "success");
    },
    onError: (err) =>
      showToast(err.response?.data?.error || "فشل تعديل الاسم", "error"),
  });

  // 7. تغيير الباسورد الشخصي للمستخدم الحالي
  const changeMyPasswordMutation = useMutation({
    mutationFn: async (payload) =>
      (await api.patch("/auth/change-password", payload)).data,
    onSuccess: () => {
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      showToast("تم تغيير كلمة المرور بنجاح", "success");
    },
    onError: (err) =>
      showToast(err.response?.data?.error || "فشل تغيير كلمة المرور", "error"),
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();

    if (addForm.password.length < 6) {
      showToast("كلمة المرور يجب أن لا تقل عن 6 أحرف", "error");
      return;
    }

    addStaffMutation.mutate({
      name: addForm.name,
      email: addForm.email,
      password: addForm.password,
      role: addForm.role,
    });
  };
  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {/* 🌟 Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl border text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-[#180a0f]/95 border-rose-800/80 text-rose-200"
              : "bg-[#071916]/95 border-teal-500/40 text-teal-200"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Check className="w-5 h-5 text-teal-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 الهيدر وشريط التبويبات الفخم */}
      <div className="bg-[#0d1527] border border-teal-500/20 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                إدارة الحسابات وطاقم العيادة
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                التحكم في الأطباء وموظفي الاستقبال وإعدادات حسابك الشخصي
              </p>
            </div>
          </div>

          {isClinicAdmin && activeTab === "staff" && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-medium text-xs transition-colors shadow-md shadow-teal-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف جديد</span>
            </button>
          )}
        </div>

        {/* أزرار التبديل بين طاقم العيادة وحسابي الشخصي */}
        <div className="flex border-t border-slate-800 pt-3 gap-3">
          {isClinicAdmin && (
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "staff"
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>طاقم العيادة ({staff.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "profile"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCircle className="w-4 h-4" />
            <span>بيانات حسابي الشخصي</span>
          </button>
        </div>
      </div>

      {/* 🌟 1. جدول طاقم العيادة (للمدير فقط) */}
      {activeTab === "staff" && isClinicAdmin && (
        <div className="bg-[#0d1527] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="py-16 flex justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#060a13] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-5 font-medium">الموظف</th>
                    <th className="py-3.5 px-5 font-medium">
                      البريد الإلكتروني
                    </th>
                    <th className="py-3.5 px-5 font-medium">الدور الوظيفي</th>
                    <th className="py-3.5 px-5 font-medium">حالة الحساب</th>
                    <th className="py-3.5 px-5 font-medium text-center">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {staff.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm flex items-center gap-2">
                              {member.name}
                              {member.id === user?.id && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-400 font-normal">
                                  أنت
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-slate-500 font-mono">
                              انضم:{" "}
                              {new Date(member.created_at).toLocaleDateString(
                                "ar-EG"
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td
                        className="py-3.5 px-5 font-mono text-slate-400"
                        dir="ltr"
                      >
                        {member.email}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium ${
                            member.role === "ClinicAdmin"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                              : member.role === "Doctor"
                              ? "bg-teal-500/10 text-teal-300 border-teal-500/20"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {member.role === "ClinicAdmin"
                            ? "مدير العيادة"
                            : member.role === "Doctor"
                            ? "طبيب معالج"
                            : "استقبال"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                            <UserCheck className="w-3 h-3" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium">
                            <UserX className="w-3 h-3" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {member.id !== user?.id &&
                            member.role !== "ClinicAdmin" && (
                              <>
                                {/* زر تعديل الاسم */}
                                <button
                                  title="تعديل اسم الموظف"
                                  onClick={() =>
                                    setEditNameModal({
                                      isOpen: true,
                                      member,
                                      name: member.name,
                                    })
                                  }
                                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* زر تعطيل / تفعيل */}
                                <button
                                  title={
                                    member.is_active
                                      ? "تعطيل الحساب"
                                      : "تفعيل الحساب"
                                  }
                                  onClick={() =>
                                    toggleStatusMutation.mutate(member.id)
                                  }
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    member.is_active
                                      ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                  }`}
                                >
                                  {member.is_active ? (
                                    <UserX className="w-4 h-4" />
                                  ) : (
                                    <UserCheck className="w-4 h-4" />
                                  )}
                                </button>

                                {/* زر Reset Password */}
                                <button
                                  title="إعادة تعيين كلمة المرور"
                                  onClick={() =>
                                    setResetPasswordModal({
                                      isOpen: true,
                                      member,
                                      newPassword: "",
                                    })
                                  }
                                  className="p-1.5 hover:bg-slate-800 text-teal-400 rounded-lg transition-colors"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>
                              </>
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
      )}

      {/* 🌟 2. بيانات حسابي الشخصي (متاحة لكل المستخدمين) */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* كارت تعديل الاسم والبريد الثابت */}
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <UserIcon className="w-4 h-4 text-teal-400" />
              <span>المعلومات الشخصية</span>
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                البريد الإلكتروني (ثابت لا يتغير)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full bg-[#060a13] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-mono cursor-not-allowed"
                dir="ltr"
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMyProfileMutation.mutate(profileName);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  الاسم الشخصي *
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <button
                type="submit"
                disabled={updateMyProfileMutation.isPending}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {updateMyProfileMutation.isPending
                  ? "جاري الحفظ..."
                  : "حفظ تعديل الاسم"}
              </button>
            </form>
          </div>

          {/* كارت تغيير كلمة المرور */}
          <div className="bg-[#0d1527] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <KeyRound className="w-4 h-4 text-teal-400" />
              <span>تغيير كلمة المرور</span>
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();

                if (passwordForm.new_password.length < 6) {
                  showToast(
                    "كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف",
                    "error"
                  );
                  return;
                }

                if (
                  passwordForm.new_password !== passwordForm.confirm_password
                ) {
                  showToast(
                    "كلمة المرور الجديدة وتأكيدها غير متطابقين",
                    "error"
                  );
                  return;
                }

                changeMyPasswordMutation.mutate({
                  current_password: passwordForm.current_password,
                  new_password: passwordForm.new_password,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  كلمة المرور الحالية *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      current_password: e.target.value,
                    })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="لا تقل عن 6 أحرف"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      new_password: e.target.value,
                    })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  تأكيد كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirm_password: e.target.value,
                    })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={changeMyPasswordMutation.isPending}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-500/30 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {changeMyPasswordMutation.isPending
                  ? "جاري التغيير..."
                  : "تحديث كلمة المرور"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 3. مودال تعديل اسم الموظف (للأدمن) */}
      {editNameModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-teal-500/30 max-w-sm w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">تعديل اسم الموظف</h3>
              <button
                onClick={() =>
                  setEditNameModal({ isOpen: false, member: null, name: "" })
                }
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateStaffNameMutation.mutate({
                  id: editNameModal.member.id,
                  name: editNameModal.name,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  الاسم الجديد
                </label>
                <input
                  type="text"
                  required
                  value={editNameModal.name}
                  onChange={(e) =>
                    setEditNameModal({ ...editNameModal, name: e.target.value })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setEditNameModal({ isOpen: false, member: null, name: "" })
                  }
                  className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={updateStaffNameMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-xl text-xs font-semibold"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 4. مودال إضافة موظف (Doctor / Receptionist) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-teal-500/30 max-w-md w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-400" />
                إضافة موظف جديد
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  الاسم بالكامل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="د. سارة أحمد"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  required
                  placeholder="doctor@clinic.com"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  كلمة مرور الحساب *   
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="لا تقل عن 6 أحرف"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  الدور الوظيفي *
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm({ ...addForm, role: e.target.value })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="Doctor">طبيب معالج (Doctor)</option>
                  <option value="Receptionist">
                    موظف استقبال (Receptionist)
                  </option>
                </select>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addStaffMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-xl text-xs font-semibold"
                >
                  حفظ الموظف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 5. مودال Reset Password بواسطة الأدمن */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1527] border border-teal-500/30 max-w-sm w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-teal-400" />
                تعيين كلمة مرور جديدة
              </h3>
              <button
                onClick={() =>
                  setResetPasswordModal({
                    isOpen: false,
                    member: null,
                    newPassword: "",
                  })
                }
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate({
                  id: resetPasswordModal.member.id,
                  new_password: resetPasswordModal.newPassword,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  كلمة المرور الجديدة *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={resetPasswordModal.newPassword}
                  onChange={(e) =>
                    setResetPasswordModal({
                      ...resetPasswordModal,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full bg-[#060a13] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setResetPasswordModal({
                      isOpen: false,
                      member: null,
                      newPassword: "",
                    })
                  }
                  className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-xl text-xs font-semibold"
                >
                  تأكيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
