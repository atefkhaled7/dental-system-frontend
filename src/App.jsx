import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails"; // 👈 استدعاء الصفحة الجديدة
import Appointments from "./pages/Appointments";
import Invoices from "./pages/Invoices.jsx";
import LabOrders from "./pages/LabOrders";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
          <Route path="patients/:id" element={<PatientDetails />} />{" "}
          {/* 👈 المسار الجديد */}
          <Route path="appointments" element={<Appointments />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="lab-orders" element={<LabOrders />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
