import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import StudentOverview from "@/pages/student/Overview";
import Attendance from "@/pages/student/Attendance";
import Academic from "@/pages/student/Academic";
import DigitalTwinPage from "@/pages/student/DigitalTwinPage";
import Placement from "@/pages/student/Placement";
import Syllabus from "@/pages/student/Syllabus";
import Mentor from "@/pages/student/Mentor";
import FacultyConsole from "@/pages/faculty/FacultyConsole";
import UniversityDashboardPage from "@/pages/admin/UniversityDashboardPage";
import PlacementConsole from "@/pages/placement/PlacementConsole";

function RequireAuth({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === "student" ? "/student"
      : user.role === "faculty" || user.role === "hod" ? "/faculty"
      : user.role === "placement" ? "/placement"
      : "/admin";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "student") return <Navigate to="/student" replace />;
  if (user.role === "faculty" || user.role === "hod") return <Navigate to="/faculty" replace />;
  if (user.role === "placement") return <Navigate to="/placement" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route
              path="/student"
              element={
                <RequireAuth roles={["student"]}>
                  <StudentOverview />
                </RequireAuth>
              }
            />
            <Route path="/student/attendance" element={<RequireAuth roles={["student"]}><Attendance /></RequireAuth>} />
            <Route path="/student/academic" element={<RequireAuth roles={["student"]}><Academic /></RequireAuth>} />
            <Route path="/student/digital-twin" element={<RequireAuth roles={["student"]}><DigitalTwinPage /></RequireAuth>} />
            <Route path="/student/placement" element={<RequireAuth roles={["student"]}><Placement /></RequireAuth>} />
            <Route path="/student/syllabus" element={<RequireAuth roles={["student"]}><Syllabus /></RequireAuth>} />
            <Route path="/student/mentor" element={<RequireAuth roles={["student"]}><Mentor /></RequireAuth>} />

            <Route
              path="/faculty"
              element={
                <RequireAuth roles={["faculty", "hod"]}>
                  <FacultyConsole />
                </RequireAuth>
              }
            />

            <Route
              path="/admin"
              element={
                <RequireAuth roles={["admin", "hod"]}>
                  <UniversityDashboardPage />
                </RequireAuth>
              }
            />

            <Route
              path="/placement"
              element={
                <RequireAuth roles={["placement", "admin"]}>
                  <PlacementConsole />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
