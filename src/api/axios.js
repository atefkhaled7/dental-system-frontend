import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. انتهاء الجلسة أو التوكن غير صالح
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // 2. محاولة كتابة/تعديل والاشتراك منتهي (Read-Only Mode)
    if (error.response && error.response.status === 402) {
      const errorMessage =
        error.response.data?.error ||
        "انتهت الفترة التجريبية. النظام حالياً في وضع القراءة فقط، يرجى تجديد الاشتراك لمتابعة الإضافة والتعديل.";
      alert(errorMessage);
      // تنبيه: لا نقوم بعمل Logout هنا إطلاقاً، يظل المستخدم داخل حسابه
      return Promise.reject(error);
    }

    // 3. الحساب معطل أو العيادة مجمدة من قبل إدارة المنصة
    if (error.response?.status === 403) {
      const errorMessage =
        error.response.data?.error || "تم رفض الوصول لعدم وجود صلاحية كافية";

      // نخرجه فقط لو الحساب اتوقف أو اتجمد يدويًا
      if (
        error.response.data?.code === "CLINIC_DEACTIVATED" ||
        errorMessage.includes("تم إيقاف") ||
        errorMessage.includes("تجميد")
      ) {
        alert(errorMessage);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
