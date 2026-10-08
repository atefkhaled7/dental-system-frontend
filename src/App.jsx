import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/payment-status" element={<PaymentStatus />} />
        <Route path="/c/:slug" element={<PublicClinicProfile />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientDetails />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="lab-orders" element={<LabOrders />} />
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
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
