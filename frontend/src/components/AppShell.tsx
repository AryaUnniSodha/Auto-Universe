import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CalendarCheck, BrainCircuit, Fingerprint, Target,
  BookOpen, Sparkles, Users, Building2, LogOut, GraduationCap, Briefcase,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const STUDENT_NAV = [
  { to: "/student", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/student/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/student/academic", label: "Academics", icon: BrainCircuit },
  { to: "/student/digital-twin", label: "Digital Twin", icon: Fingerprint },
  { to: "/student/placement", label: "Placement Prep", icon: Target },
  { to: "/student/syllabus", label: "Syllabus", icon: BookOpen },
  { to: "/student/mentor", label: "AI Mentor", icon: Sparkles },
];

const FACULTY_NAV = [{ to: "/faculty", label: "Faculty Console", icon: Users, end: true }];
const ADMIN_NAV = [{ to: "/admin", label: "University Digital Twin", icon: Building2, end: true }];
const HOD_DASHBOARD_NAV = [{ to: "/admin", label: "Department Digital Twin", icon: Building2, end: true }];
const PLACEMENT_NAV = [{ to: "/placement", label: "Placement Cell", icon: Briefcase, end: true }];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const nav =
    user?.role === "hod"
      ? [...FACULTY_NAV, ...HOD_DASHBOARD_NAV]
      : user?.role === "faculty"
      ? FACULTY_NAV
      : user?.role === "placement"
      ? PLACEMENT_NAV
      : user?.role === "admin"
      ? [...ADMIN_NAV, ...PLACEMENT_NAV]
      : STUDENT_NAV;

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-white">
            <GraduationCap size={18} />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-tight text-ink">UniVerse AI</p>
            <p className="stat-label leading-tight">2026</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary-700 text-white" : "text-ink-soft hover:bg-primary-50 hover:text-primary-700"
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line px-3 py-4">
          <div className="mb-2 rounded-lg bg-primary-50 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
            <p className="stat-label capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-faint transition-colors hover:bg-signal-roseSoft hover:text-signal-rose"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
