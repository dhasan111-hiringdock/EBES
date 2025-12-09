import { Routes, Route, Navigate } from "react-router";
import RecruitmentManagerLayout from "@/react-app/components/recruitment-manager/RecruitmentManagerLayout";
import RMDashboard from "@/react-app/components/recruitment-manager/RMDashboard";
import RMRoles from "@/react-app/components/recruitment-manager/RMRoles";
import RMTeamManagement from "@/react-app/components/recruitment-manager/RMTeamManagement";

export default function RecruitmentManagerDashboard() {
  return (
    <RecruitmentManagerLayout>
      <Routes>
        <Route path="/" element={<RMDashboard />} />
        <Route path="/analytics" element={<RMDashboard />} />
        <Route path="/roles" element={<RMRoles />} />
        <Route path="/team" element={<RMTeamManagement />} />
        <Route path="*" element={<Navigate to="/rm" replace />} />
      </Routes>
    </RecruitmentManagerLayout>
  );
}
