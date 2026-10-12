import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import Appointments from "./pages/Appointments";
import Invoices from "./pages/Invoices.jsx";
import LabOrders from "./pages/LabOrders";
import PaymentStatus from "./pages/PaymentStatus";
import Staff from "./pages/Staff";
import Clinics from "./pages/Clinics";
import NotFound from "./pages/NotFound";
import AuditLogs from "./pages/AuditLogs";
import PublicClinicProfile from "./pages/PublicClinicProfile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Services from "./pages/Services";
import Reports from "./pages/Reports";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

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
        <Routes>
          <Route path="/payment-status" element={<PaymentStatus />} />
          <Route path="/c/:slug" element={<PublicClinicProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* التوجيه الذكي: السوبر أدمن يذهب لإدارة العيادات، وأدوار العيادة للداشبورد */}
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
      </BrowserRouter>
    </ErrorBoundary>
  );
}
