import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ArrowRight, Sparkles, ShieldCheck, Radar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ROLE_HINTS = [
  { role: "Student", email: "student1@university.edu", pass: "student123" },
  { role: "Faculty", email: "faculty0.cse@university.edu", pass: "faculty123" },
  { role: "HOD", email: "hod.cse@university.edu", pass: "hod123" },
  { role: "Admin", email: "admin@university.edu", pass: "admin123" },
  { role: "Placement", email: "placement@university.edu", pass: "placement123" },
];

export default function Login() {
  const [email, setEmail] = useState("student1@university.edu");
  const [password, setPassword] = useState("student123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      const dest =
        user.role === "student" ? "/student" : user.role === "faculty" ? "/faculty" : "/admin";
      navigate(dest);
    } catch {
      setError("Invalid email or password. Try one of the demo accounts below.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left: narrative panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-900 px-14 py-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(14,165,164,0.35), transparent 40%), radial-gradient(circle at 85% 75%, rgba(124,92,252,0.3), transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <GraduationCap size={18} />
          </div>
          <span className="font-display text-sm font-semibold tracking-wide">UniVerse AI 2026</span>
        </div>

        <div className="relative max-w-md">
          <p className="stat-label mb-4 text-signal-teal">Autonomous University OS</p>
          <h1 className="font-display text-4xl font-semibold leading-[1.15]">
            Every student, modeled as a living digital twin.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            Attendance, academics, placement readiness and holistic growth — continuously
            analyzed by collaborating AI agents, explained in plain language, and turned into
            a daily plan. One record, entered once by faculty, powers the whole institution.
          </p>

          <div className="mt-9 grid grid-cols-3 gap-4">
            {[
              { icon: Radar, label: "Predictive risk detection" },
              { icon: Sparkles, label: "Explainable AI everywhere" },
              { icon: ShieldCheck, label: "Local-first & private" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <f.icon size={18} className="mb-3 text-signal-teal" />
                <p className="text-xs leading-snug text-white/80">{f.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">
          Runs entirely on-premise · CPU-only · Built for real university pilots
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fadeUp">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-white">
                <GraduationCap size={18} />
              </div>
              <span className="font-display text-sm font-semibold text-ink">UniVerse AI 2026</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-faint">Access your role-based portal.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">University email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary-500"
                placeholder="you@university.edu"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-signal-roseSoft px-3 py-2 text-sm text-signal-rose">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-line bg-primary-50/60 p-4">
            <p className="stat-label mb-2.5">Demo accounts (password shown)</p>
            <div className="space-y-1.5">
              {ROLE_HINTS.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    setEmail(r.email);
                    setPassword(r.pass);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-white"
                >
                  <span className="font-medium text-ink-soft">{r.role}</span>
                  <span className="font-mono text-ink-faint">{r.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
