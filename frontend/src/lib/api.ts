import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("universe_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("universe_token");
      localStorage.removeItem("universe_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ---------- Types ----------
export type Role = "student" | "faculty" | "hod" | "placement" | "admin";

export interface AuthUser {
  user_id: number;
  role: Role;
  full_name: string;
}

export interface SubjectAttendance {
  course_id: number;
  course_code: string;
  course_name: string;
  attended: number;
  total: number;
  percentage: number;
  eligible: boolean;
  classes_to_eligibility: number;
  risk_level: string;
}

export interface AttendanceAnalytics {
  overall_percentage: number;
  overall_eligible: boolean;
  subjects: SubjectAttendance[];
  forecast: { week: number; projected_percentage: number }[];
  what_if_miss_next_n: { n: number; projections: { course_code: string; new_percentage: number; drops_below_threshold: boolean }[] };
  recommendations: string[];
  risk_level: string;
}

export interface SubjectPerformance {
  course_id: number;
  course_name: string;
  average_percentage: number;
  trend: string;
  mastery_level: string;
}

export interface AcademicAnalytics {
  current_cgpa: number;
  predicted_cgpa: number;
  confidence: number;
  semester_trend: { semester: number; cgpa: number }[];
  weak_subjects: SubjectPerformance[];
  strong_subjects: SubjectPerformance[];
  radar: Record<string, number>;
  explanations: string[];
  study_plan: { subject: string; focus: string; priority: string; estimated_minutes: number }[];
}

export interface DigitalTwin {
  generated_at: string;
  academic_score: number;
  attendance_score: number;
  skill_score: number;
  extracurricular_score: number;
  placement_readiness: number;
  overall_score: number;
  skill_graph: { nodes: { id: string; type: string; value: number }[]; edges: any[] };
  narrative: string;
}

export interface PlacementReadiness {
  readiness_score: number;
  aptitude_score: number;
  coding_score: number;
  communication_score: number;
  academic_score: number;
  predicted_salary_band: string;
  interview_probability: number;
  skill_gaps: string[];
  recommended_path: string[];
  company_fit: { tier: string; fit_score: number }[];
  explanations?: string[];
}

export interface MentorPlan {
  plan_type: string;
  generated_at: string;
  tasks: { title: string; subject: string; why: string; priority: string; minutes: number }[];
  rationale: string;
}

export interface SyllabusStatus {
  course_id: number;
  course_name: string;
  total_topics: number;
  completed: number;
  pending: number;
  percent_complete: number;
  estimated_completion_date: string | null;
  at_risk: boolean;
  alerts: string[];
  topics: { id: number; unit: string; topic: string; status: string; planned_hours: number }[];
}

export interface StudentProfile {
  id: number;
  roll_number: string;
  full_name: string;
  department: string | null;
  semester: number;
  cgpa: number;
  learning_style: string;
  placement_goal: string | null;
}

export interface EnrollmentSummary {
  course_id: number;
  code: string;
  name: string;
  semester: number;
}

export interface UniversityDashboard {
  scope: string;
  total_students: number;
  total_faculty: number;
  avg_attendance: number;
  avg_cgpa: number;
  at_risk_students: number;
  placement_readiness_avg: number;
  department_health: { department: string; avg_health_score: number; students: number }[];
  early_warnings: { student: string; roll_number: string; issue: string; department: string | null }[];
}

// ---------- Placement Cell ----------
export interface JobEventItem {
  id: number;
  title: string;
  company_name: string | null;
  event_type: string;
  event_date: string;
  description: string | null;
  min_cgpa: number;
  department_scope: string;
}

export interface TestForStudent {
  id: number;
  title: string;
  type: string;
  description: string | null;
  duration_minutes: number;
  due_date: string | null;
  question_count: number;
  status: "pending" | "completed";
  score: number | null;
  max_score: number | null;
}

export interface TestDetail {
  id: number;
  title: string;
  type: string;
  description: string | null;
  duration_minutes: number;
  questions: { question: string; options: string[] }[];
}

export interface TestStats {
  id: number;
  title: string;
  type: string;
  description: string | null;
  department_scope: string;
  semester_scope: number | null;
  duration_minutes: number;
  due_date: string | null;
  question_count: number;
  created_at: string;
  eligible_count: number;
  completed_count: number;
  avg_score: number | null;
}

export interface StudentRosterEntry {
  student_id: number;
  roll_number: string;
  full_name: string;
  department: string | null;
  semester: number;
  cgpa: number;
  placement_status: string;
  placed_company: string | null;
  placed_package_lpa: number | null;
  aptitude_score: number;
  coding_score: number;
  readiness_score: number;
}

export interface PlacementDashboard {
  total_students: number;
  placed_count: number;
  placement_rate: number;
  aptitude_completion_rate: number;
  coding_completion_rate: number;
  avg_readiness: number;
  upcoming_events_count: number;
  tests: TestStats[];
  recent_placements: { student: string; roll_number: string; company: string; package_lpa: number; placed_at: string }[];
}
