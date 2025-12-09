import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import Login from "@/react-app/pages/Login";
import AdminDashboard from "@/react-app/pages/AdminDashboard";
import AccountManagerDashboard from "@/react-app/pages/AccountManagerDashboard";
import RecruitmentManagerDashboard from "@/react-app/pages/RecruitmentManagerDashboard";
import RecruiterDashboard from "@/react-app/pages/RecruiterDashboard";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/am/*"
          element={
            <ProtectedRoute allowedRoles={['account_manager']}>
              <AccountManagerDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/rm/*"
          element={
            <ProtectedRoute allowedRoles={['recruitment_manager']}>
              <RecruitmentManagerDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/recruiter/*"
          element={
            <ProtectedRoute allowedRoles={['recruiter']}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
