import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";
import { Loader2 } from "lucide-react";

// تحميل كسول (React.lazy) لتصغير حجم حزمة التحميل الأولية للمتصفح
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetails = lazy(() => import("./pages/PatientDetails"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Invoices = lazy(() => import("./pages/Invoices.jsx"));
const LabOrders = lazy(() => import("./pages/LabOrders"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const Staff = lazy(() => import("./pages/Staff"));
const Clinics = lazy(() => import("./pages/Clinics"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const PublicClinicProfile = lazy(() => import("./pages/PublicClinicProfile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Services = lazy(() => import("./pages/Services"));
const Reports = lazy(() => import("./pages/Reports"));

// لودر مركزي أنيق يظهر أثناء جلب الكود الكسول للصفحة
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-teal-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin" />
      <span className="text-xs text-slate-400 font-medium">
        جاري تحميل الصفحة...
      </span>
    </div>
  );
}

// مكوّن لتوجيه الصفحة الرئيسية حسب الدور
function RoleBasedIndex() {
  const { user } = useAuth();
  if (user?.role === "SuperAdmin") {
    return <Navigate to="/clinics" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* المسارات العامة والخارجية */}
            <Route path="/payment-status" element={<PaymentStatus />} />
            <Route path="/c/:slug" element={<PublicClinicProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            {/* المسارات المحمية بلوحة التحكم */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* التوجيه الذكي: السوبر أدمن لإدارة العيادات، وأدوار العيادة للداشبورد */}
              <Route index element={<RoleBasedIndex />} />

              <Route path="patients" element={<Patients />} />
              <Route path="patients/:id" element={<PatientDetails />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="lab-orders" element={<LabOrders />} />
              <Route path="services" element={<Services />} />
              <Route path="staff" element={<Staff />} />

              <Route
                path="clinics"
                element={
                  <ProtectedRoute allowedRoles={["SuperAdmin"]}>
                    <Clinics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={["ClinicAdmin"]}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={["ClinicAdmin"]}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
